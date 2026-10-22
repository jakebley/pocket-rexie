// Living-scene behaviour director (see docs/LIVING_SCENE.md). Pure and seeded: no timers, no React, no Date.now().
// `step(state, pet, inputs, nowMs, opts)` returns a new Scene. Behaviour ticks every 125 ms; every random choice
// comes from rng(pet.seed, tick bucket), so the same (seed, clock) always produces the same picture.
import type { Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import type { Food } from '../core/types';

export const TICK_MS = 125;
/** The home scene is a 48x48 grid; sprites stay 16x16, drawn 1:1. */
export const SCENE_N = 48;
export const MAX_X = 32;
export const BED_X = 8; // pet x on the bed; the mat is drawn at x=10
/** Poop spots (left edge of the 5x5 glyph), filled right to left so mess accumulates from the right edge. */
export const POOP_X = [41, 35, 29] as const;

const INK_CACHE = new Map<string, number>();
/**
 * Columns the species' ink reaches from the sprite's left edge, for either facing, over all its frames
 * (computed once per species). It is measured from the sprite box edge rather than as a bare occupied
 * width so a mirrored sprite with a left margin cannot reach into a poop.
 */
export function inkWidth(speciesId: string): number {
  let w = INK_CACHE.get(speciesId);
  if (w === undefined) {
    const sp = SPECIES.find((q) => q.id === speciesId);
    let lo = 99, hi = -1, size = 16;
    for (const f of sp ? sp.frames : []) {
      for (const row of f) {
        size = Math.max(size, row.length);
        for (let i = 0; i < row.length; i++) if (row[i] === 'X') { lo = Math.min(lo, i); hi = Math.max(hi, i); }
      }
    }
    w = hi < 0 ? size : Math.max(hi + 1, size - lo);
    INK_CACHE.set(speciesId, w);
  }
  return w;
}
/** x of the leftmost poop on the ground for a poop mask (Infinity when none). */
export function leftmostPoopX(mask: number): number {
  let m = Infinity;
  for (let i = 0; i < POOP_X.length; i++) if (mask & (1 << i)) m = Math.min(m, POOP_X[i]);
  return m;
}
/** Furthest-right sprite x the wandering pet may use: min(32, leftmostPoopX - inkWidth - 1), at least 0. */
export function maxXFor(speciesId: string, mask: number): number {
  return Math.max(0, Math.min(MAX_X, leftmostPoopX(mask) - inkWidth(speciesId) - 1));
}
const MAX_CATCHUP = 80; // ticks (10 s); a longer gap (tab was hidden, clock jump) resyncs instead of replaying
const HOP = [0, -5, -6, -5, 0];
const SPEED: Record<string, number> = { egg: 0, baby: 3.3, child: 4.5, teen: 5.2, adult: 4.5, ultimate: 3.8, ghost: 0 };

export type SceneName =
  | 'idle' | 'walk' | 'look' | 'hop' | 'sit' | 'eat' | 'poop' | 'dance' | 'droop' | 'shiver' | 'sweat' | 'sneeze'
  | 'sleep' | 'stretch' | 'react' | 'greet' | 'train' | 'battle' | 'play';
export const SCENE_STATES: SceneName[] = [
  'idle', 'walk', 'look', 'hop', 'sit', 'eat', 'poop', 'dance', 'droop', 'shiver', 'sweat', 'sneeze',
  'sleep', 'stretch', 'react', 'greet', 'train', 'battle', 'play',
];

export type FoodKind = Food | 'snack';
export type SceneEvent =
  | { kind: 'fed'; food: FoodKind }
  | { kind: 'snack' }
  | { kind: 'cleaned' }
  | { kind: 'medicine' }
  | { kind: 'trained' }
  | { kind: 'battle'; win: boolean }
  | { kind: 'played'; wins: number }
  | { kind: 'climate'; cool: boolean }
  | { kind: 'light'; on: boolean }
  | { kind: 'petted' }
  | { kind: 'evolved' }
  | { kind: 'hatched' }
  | { kind: 'greet' }
  | { kind: 'tapGround'; x: number }
  | { kind: 'tapSky' };

export type Weather = 'clear' | 'cloudy' | 'rain';
export interface Prop { g: string; x: number; y: number; n?: number; side?: number }
export interface Pop { g: 'heart' | 'smile' | 'note' | 'spark' | 'dot'; x: number; y: number; age: number; life: number }
export interface Act {
  kind: string; t: number; ph: number; pt: number;
  fx: number; fy: number; tx: number; glyph: string; side: number; win: boolean; n: number; foe: number; foeX: number;
}

export interface Scene {
  seed: number; bucket: number; nowMs: number;
  state: SceneName; x: number; facing: 1 | -1; t: number; left: number; target: number | null; lookUp: boolean; slow: boolean;
  act: Act | null; queue: SceneEvent[]; props: Prop[]; pops: Pop[];
  flash: number; shift: number; pdx: number; pdy: number; sneezeIn: number;
  poopMask: number; limit: number; still: boolean; dim: boolean;
  hour: number; minute: number; dayKey: number; weather: Weather;
}

export interface SceneInputs {
  events?: SceneEvent[];
  /** local hour 0..23 (defaults to the device clock at nowMs) */
  hour?: number; minute?: number; dayKey?: number;
  /** true/false forces rain on/off; null/undefined = by the day's weather roll */
  rain?: boolean | null;
}
export interface SceneOpts { reducedMotion?: boolean }

// ---------- helpers ----------
function mix(a: number, b: number, c: number): number {
  let x = (a ^ Math.imul(b | 0, 0x9e3779b1) ^ Math.imul(c | 0, 0x85ebca6b)) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
/** rng(seed, tick): a fresh stream per tick bucket. */
export function mkRng(seed: number, tk: number): () => number {
  let n = 0;
  return () => mix(seed, tk, ++n);
}
export const hash01 = (a: number, b: number, c = 0) => mix(a, b, c);
export const popcount = (m: number) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1));

export function clockOf(nowMs: number): { hour: number; minute: number; dayKey: number } {
  const d = new Date(nowMs);
  return { hour: d.getHours(), minute: d.getMinutes(), dayKey: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() };
}
export function weatherOf(seed: number, dayKey: number): Weather {
  const r = Math.floor(mix(seed, dayKey, 77) * 10);
  return r <= 1 ? 'rain' : r <= 4 ? 'cloudy' : 'clear';
}
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export const phaseOf = (hour: number): Phase => (hour >= 5 && hour <= 7 ? 'dawn' : hour >= 8 && hour <= 17 ? 'day' : hour >= 18 && hour <= 20 ? 'dusk' : 'night');

function popFn(): Pop[] { return []; }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function initScene(pet: Pet, nowMs: number, hour?: number): Scene {
  const r = mkRng(pet.seed, 0);
  const c = clockOf(nowMs);
  const sc: Scene = {
    seed: pet.seed, bucket: Math.floor(nowMs / TICK_MS) - 1, nowMs,
    state: pet.asleep ? 'sleep' : 'idle', x: pet.asleep ? BED_X : 6 + Math.floor(r() * 19), facing: r() < 0.5 ? 1 : -1,
    t: 0, left: 16 + Math.floor(r() * 16), target: null, lookUp: false, slow: false,
    act: null, queue: [], props: [], pops: popFn(),
    flash: 0, shift: 0, pdx: 0, pdy: 0, sneezeIn: 48 + Math.floor(r() * 32),
    poopMask: (1 << Math.min(3, pet.poops)) - 1, limit: MAX_X, still: false, dim: !pet.lightOn,
    hour: hour ?? c.hour, minute: c.minute, dayKey: c.dayKey, weather: weatherOf(pet.seed, c.dayKey),
  };
  sc.limit = maxXFor(pet.species, sc.poopMask);
  sc.x = Math.min(sc.x, sc.limit);
  return sc;
}

function cloneScene(s: Scene): Scene {
  return {
    ...s,
    act: s.act ? { ...s.act } : null,
    queue: s.queue.slice(),
    props: [],
    pops: s.pops.map((p) => ({ ...p })),
  };
}

function setState(s: Scene, name: SceneName, left?: number) {
  if (s.state !== name) { s.state = name; s.t = 0; }
  if (left !== undefined) s.left = left;
}
function pop(s: Scene, g: Pop['g'], x: number, y: number, life = 8) { s.pops.push({ g, x, y, age: 0, life }); }

/** Move toward tx at `speed` cells/s. Returns true when there (or when reduced motion forbids moving). */
function moveToward(s: Scene, tx: number, speed: number): boolean {
  tx = clamp(tx, 0, s.limit);
  if (s.still) return true;
  const d = tx - s.x;
  const stepLen = speed * (TICK_MS / 1000) * (s.slow ? 0.5 : 1);
  if (Math.abs(d) <= stepLen) { s.x = tx; return true; }
  s.x += Math.sign(d) * stepLen;
  s.facing = d > 0 ? 1 : -1;
  return false;
}

// ---------- events ----------
function intake(s: Scene, e: SceneEvent, pet: Pet, rnd: () => number) {
  const idle = !s.act;
  switch (e.kind) {
    case 'petted':
      pop(s, 'heart', Math.round(s.x) + 7, 25, 10);
      if (idle && !pet.asleep) startAct(s, 'petted', pet, rnd);
      return;
    case 'tapGround':
      if (idle && !pet.asleep) { startAct(s, 'tapGround', pet, rnd); s.act!.tx = clamp(Math.round(e.x - 8), 0, s.limit); }
      return;
    case 'tapSky':
      if (idle && !pet.asleep) startAct(s, 'tapSky', pet, rnd);
      return;
    case 'greet':
      s.act = null; s.queue = [];
      startAct(s, 'greet', pet, rnd);
      return;
    case 'light':
      if (e.on) s.flash = 1;
      if (pet.asleep) return;
      s.queue.push(e);
      break;
    default:
      if (pet.asleep) return;
      s.queue.push(e);
  }
  if (s.queue.length > 8) s.queue.shift();
}

function startAct(s: Scene, kind: string, pet: Pet, rnd: () => number, e?: SceneEvent) {
  const a: Act = { kind, t: 0, ph: 0, pt: 0, fx: 0, fy: 14, tx: 0, glyph: '', side: 1, win: false, n: 0, foe: 0, foeX: 56 };
  s.act = a; s.lookUp = false; s.target = null;
  switch (kind) {
    case 'fed': case 'snack': {
      const food = e && e.kind === 'fed' ? e.food : 'snack';
      a.glyph = food;
      a.side = s.x <= 16 ? 1 : -1;
      if (s.still) { a.side = s.facing; a.tx = s.x; a.fx = a.side === 1 ? s.x + 14 : s.x - 3; }
      else {
        a.fx = a.side === 1 ? 36 : 4; a.tx = a.side === 1 ? a.fx - 14 : a.fx + 3;
        a.tx = clamp(a.tx, 0, s.limit); // poops shorten the pet's range; the food drops where it can still reach it
        a.fx = a.side === 1 ? a.tx + 14 : a.fx;
      }
      a.fx = clamp(Math.round(a.fx), 0, 43);
      break;
    }
    case 'battle': a.win = e?.kind === 'battle' ? e.win : false; a.foe = Math.floor(rnd() * SPECIES.length); a.side = s.x <= 16 ? 1 : -1; a.foeX = a.side === 1 ? 56 : -12; break;
    case 'played': a.win = e?.kind === 'played' ? e.wins >= 3 : false; break;
    case 'climate': a.win = e?.kind === 'climate' ? e.cool : true; break;
    case 'light': a.win = e?.kind === 'light' ? e.on : false; break;
    case 'poop': {
      const idx = (s.poopMask & 1) === 0 ? 0 : (s.poopMask & 2) === 0 ? 1 : 2;
      a.n = idx;
      a.tx = clamp(POOP_X[idx] - inkWidth(pet.species) - 1, 0, MAX_X); // just left of the spot, not onto it
      break;
    }
    case 'greet': {
      if (!s.still) { const left = rnd() < 0.5; s.x = left ? 0 : s.limit; s.facing = left ? 1 : -1; }
      a.tx = 9 + Math.floor(rnd() * 8);
      break;
    }
    case 'hatched': break;
  }
}

function eventToAct(s: Scene, e: SceneEvent, pet: Pet, rnd: () => number) {
  switch (e.kind) {
    case 'fed': startAct(s, 'fed', pet, rnd, e); break;
    case 'snack': startAct(s, 'snack', pet, rnd, e); break;
    case 'cleaned': startAct(s, 'cleaned', pet, rnd, e); break;
    case 'medicine': startAct(s, 'medicine', pet, rnd, e); break;
    case 'trained': startAct(s, 'trained', pet, rnd, e); break;
    case 'battle': startAct(s, 'battle', pet, rnd, e); break;
    case 'played': startAct(s, 'played', pet, rnd, e); break;
    case 'climate': startAct(s, 'climate', pet, rnd, e); break;
    case 'light': startAct(s, 'light', pet, rnd, e); break;
    case 'evolved': startAct(s, 'evolved', pet, rnd, e); break;
    case 'hatched': startAct(s, 'hatched', pet, rnd, e); break;
    default: break;
  }
}

// ---------- scripted acts ----------
/** Returns true when the act is finished. Each tick it re-asserts the state/pose it wants. */
function runAct(s: Scene, pet: Pet, rnd: () => number): boolean {
  const a = s.act!;
  a.t++; a.pt++;
  const sp = SPEED[pet.stage] || 3;
  const hx = Math.round(s.x);
  switch (a.kind) {
    case 'fed': case 'snack': {
      if (a.ph === 0) {
        a.fy = Math.min(39, a.fy + 2);
        const arrived = moveToward(s, a.tx, sp * 1.2);
        if (!arrived) setState(s, 'walk'); else { s.facing = a.fx + 2 > s.x + 8 ? 1 : -1; setState(s, 'idle'); }
        s.props.push({ g: `food:${a.glyph}`, x: a.fx, y: a.fy, n: 0, side: a.side });
        if (a.fy >= 39 && arrived) { a.ph = 1; a.pt = 0; s.facing = a.fx + 2 > s.x + 8 ? 1 : -1; }
      } else if (a.ph === 1) {
        setState(s, 'eat');
        const bites = Math.min(3, Math.floor(a.pt / 4));
        if (a.pt % 4 === 0 && a.pt > 0) {
          const fxm = a.side === 1 ? a.fx : a.fx + 4;
          pop(s, 'dot', fxm + (a.side === 1 ? -1 : 1), 40, 4); pop(s, 'dot', fxm + (a.side === 1 ? -2 : 2), 38, 4);
        }
        if (bites < 3) s.props.push({ g: `food:${a.glyph}`, x: a.fx, y: 39, n: bites, side: a.side });
        if (a.pt >= 12) {
          a.ph = 2; a.pt = 0;
          pop(s, a.kind === 'snack' || a.glyph === 'snack' ? 'smile' : 'heart', hx + 7, 24, 10);
        }
      } else {
        setState(s, 'idle');
        if (a.pt >= 8) return true;
      }
      return false;
    }
    case 'cleaned': {
      const bx = -5 + a.pt * 5.4;
      if (a.ph === 0) {
        setState(s, 'idle');
        s.props.push({ g: 'broom', x: Math.floor(bx), y: 39 });
        for (let i = 0; i < 3; i++) pop(s, 'dot', Math.floor(bx) - 1 - Math.floor(rnd() * 4), 38 + Math.floor(rnd() * 6), 3);
        let m = s.poopMask;
        for (let i = 0; i < 3; i++) if (POOP_X[i] + 2 <= bx) m &= ~(1 << i);
        s.poopMask = m;
        if (bx > 52) { s.poopMask = 0; a.ph = 1; a.pt = 0; }
      } else {
        setState(s, 'hop');
        if (a.pt >= 10) return true;
      }
      return false;
    }
    case 'medicine': {
      const hxm = hx + (s.facing === 1 ? 11 : 0);
      if (a.ph === 0) {
        const u = a.pt / 8;
        s.props.push({ g: 'syringe', x: Math.round(47 - u * (47 - hxm)), y: Math.round(17 + u * 13 - 5 * Math.sin(Math.PI * u)) });
        setState(s, 'idle');
        if (a.pt >= 8) { a.ph = 1; a.pt = 0; }
      } else if (a.ph === 1) {
        setState(s, 'react');
        s.props.push({ g: 'syringe', x: hxm, y: 30 });
        if (a.pt === 1) { s.flash = 1; pop(s, 'spark', hxm - 3, 27, 4); pop(s, 'spark', hxm + 3, 31, 4); }
        if (a.pt >= 5) { a.ph = 2; a.pt = 0; pop(s, 'heart', hx + 7, 25, 10); }
      } else {
        setState(s, 'idle');
        if (a.pt >= 8) return true;
      }
      return false;
    }
    case 'trained': {
      setState(s, 'train');
      const dy = HOP[(a.t - 1) % 5];
      s.props.push({ g: 'dumbbell', x: hx + 5, y: 23 + dy });
      if ((a.t - 1) % 5 === 2) { pop(s, 'dot', hx + 1, 31, 3); pop(s, 'dot', hx + 14, 31, 3); }
      return a.t >= 16;
    }
    case 'battle': {
      const foeTarget = a.side === 1 ? 36 : 1;
      const foeSpr = foeSprite(a.foe);
      if (a.ph === 0) {
        setState(s, 'idle');
        s.facing = a.side === 1 ? 1 : -1;
        if (a.pt === 1 || a.pt === 3) s.flash = 1;
        if (a.pt >= 4) { a.ph = 1; a.pt = 0; }
      } else if (a.ph === 1) {
        setState(s, 'idle');
        a.foeX = Math.round(a.side === 1 ? 56 - (a.pt / 6) * (56 - foeTarget) : -12 + (a.pt / 6) * (foeTarget + 12));
        s.props.push({ g: 'foe', x: a.foeX, y: 36, n: foeSpr });
        if (a.pt >= 6) { a.ph = 2; a.pt = 0; }
      } else if (a.ph === 2) {
        setState(s, 'battle');
        const c = (a.pt - 1) % 6;
        s.pdx = c === 2 || c === 3 ? 3 : 0; // lunge
        const shake = c === 3 || c === 4 ? (a.pt % 2 ? 1 : -1) : 0;
        s.props.push({ g: 'foe', x: foeTarget + shake, y: 36, n: foeSpr });
        if (c === 3) { s.flash = 1; s.props.push({ g: 'spark', x: a.side === 1 ? hx + 15 : hx - 4, y: 29 }); }
        if (a.pt >= 18) { a.ph = 3; a.pt = 0; }
      } else {
        const fade = a.win ? a.pt < 5 && a.pt % 2 === 0 : a.pt < 13;
        setState(s, a.win ? 'dance' : 'droop');
        if (fade) s.props.push({ g: 'foe', x: foeTarget, y: 36, n: foeSpr });
        else if (!a.win && a.pt < 17) s.props.push({ g: 'foe', x: foeTarget + (a.side === 1 ? (a.pt - 12) * 4 : -(a.pt - 12) * 4), y: 36, n: foeSpr });
        if (a.win && a.pt % 5 === 1) pop(s, 'note', hx + (a.pt % 10 === 1 ? 2 : 11), 23, 6);
        if (a.pt >= 17) return true;
      }
      return false;
    }
    case 'played': {
      if (a.ph === 0) {
        const bx = 2 + a.pt * 1.5;
        const h = Math.abs(Math.sin((Math.PI * (a.pt % 9)) / 9)) * 12;
        s.props.push({ g: 'ball', x: Math.round(bx), y: Math.round(41 - h) });
        const arrived = moveToward(s, bx - 11, sp * 1.4);
        if (!arrived) setState(s, 'play'); else { setState(s, 'idle'); s.facing = 1; }
        if (a.pt >= 26) { a.ph = 1; a.pt = 0; }
      } else {
        s.props.push({ g: 'ball', x: 40, y: 41 });
        if (a.win) {
          setState(s, 'dance');
          if (a.pt % 5 === 1) pop(s, 'note', hx + (a.pt % 10 === 1 ? 2 : 11), 23, 6);
          if (a.pt >= 16) return true;
        } else {
          setState(s, 'sit');
          if (a.pt >= 10) return true;
        }
      }
      return false;
    }
    case 'climate': {
      if (a.ph === 0) {
        setState(s, 'stretch');
        if (a.win) {
          for (let k = 0; k < 2; k++) s.props.push({ g: 'puff', x: Math.round(-6 + a.pt * 3.9 - k * 18), y: 18 + k * 4 });
        } else {
          for (let k = 0; k < 3; k++) {
            if ((a.pt + k) % 2 === 0) s.props.push({ g: 'glint', x: Math.floor(rnd() * 44) + 1, y: 18 + Math.floor(rnd() * 4) });
          }
        }
        if (a.pt >= 14) { a.ph = 1; a.pt = 0; pop(s, 'smile', hx + 7, 25, 10); }
      } else {
        setState(s, 'idle');
        if (a.pt >= 7) return true;
      }
      return false;
    }
    case 'light': {
      if (a.win) { setState(s, 'stretch'); return a.pt >= 4; }
      if (a.ph === 0) {
        setState(s, 'stretch');
        if (a.pt >= 8) { a.ph = 1; a.pt = 0; }
      } else {
        setState(s, 'sit');
        if (a.pt >= 12) return true;
      }
      return false;
    }
    case 'petted': {
      setState(s, 'hop');
      return a.pt >= 5;
    }
    case 'evolved': {
      if (a.ph === 0) {
        setState(s, 'idle');
        if (a.pt >= 24) { a.ph = 1; a.pt = 0; }
      } else {
        setState(s, 'greet');
        if (a.pt === 1) pop(s, 'heart', hx + 7, 25, 10);
        if (a.pt >= 15) return true;
      }
      return false;
    }
    case 'hatched': {
      if (a.ph === 0) {
        setState(s, 'idle');
        const u = a.pt / 8;
        s.props.push({ g: 'shell', x: hx + 2 - Math.round(u * 3), y: Math.round(34 + u * 9), n: 0 });
        s.props.push({ g: 'shell', x: hx + 11 + Math.round(u * 3), y: Math.round(34 + u * 9), n: 1 });
        if (a.pt >= 9) { a.ph = 1; a.pt = 0; }
      } else {
        setState(s, 'hop');
        if (a.pt >= 15) return true;
      }
      return false;
    }
    case 'greet': {
      if (a.ph === 0) {
        const arrived = moveToward(s, a.tx, sp * 2);
        setState(s, 'walk');
        if (arrived) { a.ph = 1; a.pt = 0; s.facing = s.facing; }
      } else {
        setState(s, 'greet');
        if (a.pt >= 15) return true;
      }
      return false;
    }
    case 'poop': {
      if (a.ph === 0) {
        const arrived = moveToward(s, a.tx, sp);
        setState(s, arrived ? 'idle' : 'walk');
        if (arrived) { a.ph = 1; a.pt = 0; s.facing = -1; } // squat with the new spot behind it
      } else {
        setState(s, 'poop');
        if (a.pt === 8) {
          s.poopMask |= 1 << a.n;
          pop(s, 'dot', POOP_X[a.n] + 1, 22, 3); pop(s, 'dot', POOP_X[a.n] + 4, 22, 3);
        }
        if (a.pt >= 10) return true;
      }
      return false;
    }
    case 'tapGround': {
      if (a.ph === 0) {
        const arrived = moveToward(s, a.tx, sp);
        if (s.still) s.facing = a.tx + 8 > s.x + 8 ? 1 : a.tx + 8 < s.x + 8 ? -1 : s.facing;
        setState(s, arrived ? 'idle' : 'walk');
        if (arrived) { a.ph = 1; a.pt = 0; }
      } else {
        setState(s, 'look');
        if (a.pt >= 14) return true;
      }
      return false;
    }
    case 'tapSky': {
      setState(s, 'look');
      s.lookUp = true;
      return a.pt >= 16;
    }
  }
  return true;
}

export function foeSprite(i: number): number { return ((i % SPECIES.length) + SPECIES.length) % SPECIES.length; }

// ---------- autonomy ----------
function pick<T>(rnd: () => number, items: [T, number][]): T {
  let total = 0;
  for (const it of items) total += it[1];
  let r = rnd() * total;
  for (const it of items) { r -= it[1]; if (r < 0) return it[0]; }
  return items[items.length - 1][0];
}
const between = (rnd: () => number, a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

function walkTarget(s: Scene, rnd: () => number): number {
  const lim = s.limit;
  let tx = Math.round(rnd() * lim);
  if (Math.abs(tx - s.x) < 4) tx = s.x < lim / 2 ? lim - Math.round(rnd() * 6) : Math.round(rnd() * 6);
  return clamp(tx, 0, lim);
}

function choose(s: Scene, pet: Pet, rnd: () => number) {
  s.lookUp = false; s.target = null; s.slow = false;
  const stage = pet.stage;
  const still = s.still;
  const happyDance = pet.happy === 4 && pet.hunger >= 3;
  type Pick = SceneName | 'walkslow' | 'pace' | 'lookup' | 'dance';
  let opt: Pick;

  if (pet.sick) {
    if (s.sneezeIn <= 0) { s.sneezeIn = between(rnd, 56, 80); opt = 'sneeze'; }
    else opt = pick<Pick>(rnd, [['shiver', 70], [still ? 'shiver' : 'walkslow', 30]]);
  } else if (pet.temp >= 2) {
    opt = pick<Pick>(rnd, [['sweat', 65], ['idle', 20], [still ? 'idle' : 'walkslow', 15]]);
  } else if (pet.temp <= -2) {
    opt = pick<Pick>(rnd, [['shiver', 65], ['idle', 20], [still ? 'idle' : 'walkslow', 15]]);
  } else if (pet.hunger <= 1) {
    opt = pick<Pick>(rnd, [[still ? 'idle' : 'pace', 55], ['lookup', 25], ['idle', 20]]);
  } else if (pet.happy <= 1) {
    opt = pick<Pick>(rnd, [['droop', 70], [still ? 'droop' : 'walkslow', 30]]);
  } else if (still) {
    opt = pick<Pick>(rnd, [['idle', 70], ['look', 20], ['sit', 10]]);
  } else if (happyDance && rnd() < 0.6) {
    opt = pick<Pick>(rnd, [['dance', 35], ['hop', 25]]);
  } else if (stage === 'baby') {
    opt = pick<Pick>(rnd, [['walk', 45], ['idle', 18], ['hop', 17], ['look', 10], ['sit', 10]]);
  } else if (stage === 'ultimate') {
    opt = pick<Pick>(rnd, [['walk', 30], ['idle', 45], ['look', 15], ['sit', 10]]);
  } else if (stage === 'adult') {
    opt = pick<Pick>(rnd, [['idle', 38], ['walk', 32], ['look', 15], ['sit', 11], ['hop', 4]]);
  } else {
    opt = pick<Pick>(rnd, [['idle', 35], ['walk', 30], ['look', 15], ['sit', 10], ['hop', 10]]);
  }
  if (pet.asleep) return;

  switch (opt) {
    case 'walk': s.target = walkTarget(s, rnd); setState(s, 'walk', 400); break;
    case 'walkslow': s.slow = true; s.target = walkTarget(s, rnd); setState(s, 'walk', 400); break;
    case 'pace': s.target = s.x > s.limit / 2 ? Math.min(4, s.limit) : Math.max(0, s.limit - 4); setState(s, 'walk', 400); break;
    case 'lookup': s.lookUp = true; setState(s, 'look', between(rnd, 12, 24)); if (rnd() < 0.5) s.facing = (s.facing * -1) as 1 | -1; break;
    case 'look': setState(s, 'look', between(rnd, 12, 24)); s.facing = rnd() < 0.5 ? 1 : -1; break;
    case 'hop': setState(s, 'hop', 5 * between(rnd, 1, 2)); break;
    case 'dance': setState(s, 'dance', 5 * between(rnd, 3, 4)); break;
    case 'sit': setState(s, 'sit', between(rnd, 24, 48)); break;
    case 'droop': setState(s, 'droop', between(rnd, 24, 48)); break;
    case 'sweat': setState(s, 'sweat', between(rnd, 24, 40)); break;
    case 'shiver': setState(s, 'shiver', between(rnd, 20, 36)); break;
    case 'sneeze': setState(s, 'sneeze', 6); s.flash = 1; break;
    default: setState(s, 'idle', between(rnd, 16, 48)); break;
  }
}

function tick(s: Scene, pet: Pet, tk: number) {
  const rnd = mkRng(pet.seed, tk);
  s.t++; s.props = []; s.pdx = 0; s.pdy = 0;
  if (s.flash > 0) s.flash--;
  if (s.sneezeIn > 0) s.sneezeIn--;
  if (s.shift > 0) s.shift--;
  s.pops = s.pops.filter((p) => ++p.age < p.life);
  s.dim = !pet.lightOn;
  const sp = SPEED[pet.stage] || 4.5;
  s.limit = maxXFor(pet.species, s.poopMask);

  if (pet.stage === 'egg' || pet.stage === 'ghost') {
    s.state = 'idle'; s.act = null; s.queue = []; s.poopMask = 0; return;
  }
  if (pet.asleep && s.act && s.act.kind !== 'greet' && s.act.kind !== 'light') s.act = null;
  if (!s.act && s.queue.length) eventToAct(s, s.queue.shift()!, pet, rnd);
  if (s.act) {
    if (runAct(s, pet, rnd)) { s.act = null; setState(s, 'idle', between(rnd, 6, 14)); }
    return;
  }

  // poop mask follows the engine; a rise while awake is animated
  let count = popcount(s.poopMask);
  if (pet.poops < count) { s.poopMask = (1 << Math.min(3, pet.poops)) - 1; count = popcount(s.poopMask); }
  if (pet.poops > count) {
    if (pet.asleep) s.poopMask = (1 << Math.min(3, pet.poops)) - 1;
    else if (count < 3) { startAct(s, 'poop', pet, rnd); runAct(s, pet, rnd); return; }
  }

  s.limit = maxXFor(pet.species, s.poopMask);
  // a pet beyond the new limit walks left before doing anything else
  if (!pet.asleep && !s.still && s.x > s.limit) {
    s.lookUp = false; s.target = null; s.slow = false;
    moveToward(s, s.limit, sp);
    setState(s, 'walk', 8);
    return;
  }

  if (pet.asleep) {
    if (s.state !== 'sleep') {
      s.lookUp = false; s.slow = false;
      const arrived = moveToward(s, BED_X, sp);
      if (arrived) setState(s, 'sleep', -1); else setState(s, 'walk', -1);
    } else if (s.t % 48 === 0 && pet.lightOn && rnd() < 0.15) {
      s.shift = 3;
    }
    if (s.shift > 0) s.pdx = 1;
    return;
  }
  if (s.state === 'sleep') { setState(s, 'stretch', 14); return; }

  if (s.state === 'walk' && s.target !== null) {
    const arrived = moveToward(s, s.target, sp);
    if (arrived || s.t > 400) {
      s.target = null; s.slow = false;
      setState(s, 'idle', pet.stage === 'ultimate' ? between(rnd, 24, 40) : between(rnd, 8, 24));
    }
    return;
  }
  if (s.left > 0) s.left--;
  if (s.left <= 0 || (s.state === 'walk' && s.target === null)) choose(s, pet, rnd);
}

// ---------- public ----------
export function step(prev: Scene, pet: Pet, inputs: SceneInputs, nowMs: number, opts: SceneOpts = {}): Scene {
  const s = cloneScene(prev);
  const c = clockOf(nowMs);
  s.hour = inputs.hour ?? c.hour;
  s.minute = inputs.minute ?? (inputs.hour !== undefined ? 0 : c.minute);
  s.dayKey = inputs.dayKey ?? c.dayKey;
  const base = weatherOf(pet.seed, s.dayKey);
  s.weather = inputs.rain === true ? 'rain' : inputs.rain === false ? (base === 'rain' ? 'cloudy' : base) : base;
  s.nowMs = nowMs;
  s.still = !!opts.reducedMotion;
  const target = Math.floor(nowMs / TICK_MS);
  if (s.seed !== pet.seed) s.seed = pet.seed;
  const r0 = mkRng(pet.seed, target ^ 0x5bd1e995);
  for (const e of inputs.events ?? []) intake(s, e, pet, r0);
  let from = s.bucket + 1;
  if (target - s.bucket > MAX_CATCHUP) { s.bucket = target - 8; from = target - 7; }
  for (let tk = from; tk <= target; tk++) tick(s, pet, tk);
  if (target > s.bucket) s.bucket = target;
  return s;
}
