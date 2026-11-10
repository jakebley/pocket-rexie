// CATCH (reflex, 30 s): items fall from the sky, the pet slides left and right under them. Catch the family's good items,
// dodge the bad ones. Controls: A = slide left, C = slide right (the pet keeps sliding until a wall or B), B = stop.
// Tuning: the pet's speed and size come from its body type, stage, weight and health; luck adds bonus items.
// Fair play: every good item is placed so that a HEALTHY pet of the same body type could reach it after the one before
// (see `reach`), and a bad item is never put on top of a good one, whatever the pet's stage.
import { makeRng, type Rng } from '../rng';
import { TICK_MS, makeTicker, rankOf, type GameDef, type GameInput, type GameParams, type MiniGame, type Thresholds } from '../types';

export const CATCH_MS = 30000;
export const CATCH_W = 64;
/** last row of the field: the pet stands on it */
export const CATCH_GROUND = 59;
export const ITEM = 7;
export const CATCH_THRESHOLDS: Thresholds = { bronze: 12, silver: 22, gold: 30 };

/** px per second of a pet with speed multiplier 1 */
export const BASE_SPEED = 36;
export const FALL_FROM = 21; // px/s at the start
export const FALL_TO = 31; // px/s at the end
export const SPAWN_FROM = 850; // ms between items at the start
export const SPAWN_TO = 560;
export const BAD_FROM = 0.18;
export const BAD_TO = 0.28;
export const BONUS_CHANCE = 0.08; // x luck
export const STUN_MS = 600;
export const BAD_PENALTY = 2;
export const BONUS_POINTS = 3;

export type ItemKind = 'good' | 'bonus' | 'bad';
export interface CatchItem {
  id: number;
  /** centre x */
  x: number;
  /** top y */
  y: number;
  vy: number;
  kind: ItemKind;
  /** index into the theme's good / bad list */
  glyph: number;
  /** ms (game time) at which it reaches the pet's head */
  arrival: number;
}
export interface CatchPop { x: number; y: number; age: number; kind: ItemKind; pts: number }
export interface CatchState {
  /** ms played */
  t: number;
  duration: number;
  /** pet centre x, hitbox size and the row of its head */
  petX: number; petW: number; petH: number; petTop: number;
  dir: -1 | 0 | 1;
  face: 1 | -1;
  /** ms left of the stun after a bad item */
  stun: number;
  /** ms left of the happy flash after a catch */
  cheer: number;
  items: CatchItem[];
  pops: CatchPop[];
  points: number;
  caught: number;
  hits: number;
  missed: number;
}

export interface CatchDims { petW: number; petH: number; petTop: number; vp: number; refVp: number }
export function catchDims(p: GameParams): CatchDims {
  const petW = Math.max(12, Math.min(20, Math.round(8 + 7 * p.tuning.size)));
  const petH = petW;
  return { petW, petH, petTop: CATCH_GROUND - petH + 1, vp: BASE_SPEED * p.tuning.speed, refVp: BASE_SPEED * p.tuning.baseSpeed };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How far a healthy pet can get between two arrivals dtMs apart (a little slack for reaction and the time an item spends passing the head). */
export function reach(refVp: number, dtMs: number, petW: number, vy: number): number {
  const window = (petW / vy) * 1000 * 0.5;
  return refVp * Math.max(0, (dtMs + window - 120) / 1000) * 0.88 + petW / 2 + 1;
}

class Catch implements MiniGame<CatchState> {
  readonly id = 'catch';
  state: CatchState;
  private rng: Rng;
  private dims: CatchDims;
  private luck: number;
  private mul: number;
  private nextId = 1;
  private spawnIn = 600;
  /** the most recent good item placed (kept after it has been caught, so the path rules still know where the pet rests) */
  private lastGood: { x: number; arrival: number } | null = null;
  private ticker: (dt: number) => void;
  private pending: GameInput = { left: false, right: false, act: false };

  constructor(seed: number, private p: GameParams) {
    this.rng = makeRng(seed);
    this.dims = catchDims(p);
    this.luck = p.tuning.luck;
    this.mul = p.scoreMul;
    const d = this.dims;
    this.state = {
      t: 0, duration: CATCH_MS, petX: CATCH_W / 2, petW: d.petW, petH: d.petH, petTop: d.petTop, dir: 0, face: 1, stun: 0, cheer: 0,
      items: [], pops: [], points: 0, caught: 0, hits: 0, missed: 0,
    };
    this.ticker = makeTicker(() => this.tick());
  }

  get done() { return this.state.t >= this.state.duration; }
  get score() { return Math.floor(Math.max(0, this.state.points) * this.mul + 1e-9); }
  get rank() { return rankOf(this.score, CATCH_THRESHOLDS); }
  get progress() { return Math.min(1, this.state.t / this.state.duration); }
  get hud() {
    const left = Math.max(0, Math.ceil((this.state.duration - this.state.t) / 1000));
    return { left: `SCORE ${this.score}`, right: `0:${String(left).padStart(2, '0')}` };
  }

  step(input: GameInput, dtMs: number) {
    if (this.done) return;
    this.pending.left ||= input.left; this.pending.right ||= input.right; this.pending.act ||= input.act;
    this.ticker(dtMs);
  }

  private tick() {
    const s = this.state;
    const dt = TICK_MS;
    const inp = this.pending;
    this.pending = { left: false, right: false, act: false };
    if (s.stun <= 0) {
      if (inp.left) { s.dir = -1; s.face = -1; }
      if (inp.right) { s.dir = 1; s.face = 1; }
      if (inp.act) s.dir = 0;
    }
    s.t += dt;
    if (s.stun > 0) { s.stun -= dt; s.dir = 0; }
    if (s.cheer > 0) s.cheer -= dt;
    if (s.dir !== 0) {
      const half = this.dims.petW / 2;
      s.petX += s.dir * this.dims.vp * (dt / 1000);
      if (s.petX <= half) { s.petX = half; s.dir = 0; }
      if (s.petX >= CATCH_W - half) { s.petX = CATCH_W - half; s.dir = 0; }
    }
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && s.t < s.duration - 1500) this.spawn();
    this.moveItems(dt);
    for (const pop of s.pops) pop.age += dt;
    s.pops = s.pops.filter((q) => q.age < 700);
  }

  private prog() { return this.progress; }

  private spawn() {
    const s = this.state;
    const pr = this.prog();
    this.spawnIn = lerp(SPAWN_FROM, SPAWN_TO, pr) * this.rng.range(0.85, 1.15);
    const d = this.dims;
    const vy = lerp(FALL_FROM, FALL_TO, pr);
    const arrival = s.t + (d.petTop / vy) * 1000;
    const r = this.rng.next();
    const kind: ItemKind = r < lerp(BAD_FROM, BAD_TO, pr) ? 'bad' : this.rng.chance(BONUS_CHANCE * this.luck) ? 'bonus' : 'good';
    const lo = Math.ceil(ITEM / 2) + 1, hi = CATCH_W - lo;
    const goods = s.items.filter((i) => i.kind !== 'bad').sort((a, b) => a.arrival - b.arrival);
    const bads = s.items.filter((i) => i.kind === 'bad');
    const window = (d.petW / vy) * 1000;
    const m = d.petW / 2 + 3; // a bad item must stay this far from the path a pet takes between good items
    const clearOf = (a: number, b: number, x: number) => x < Math.min(a, b) - m || x > Math.max(a, b) + m;
    const prev: { x: number; arrival: number } | undefined = goods.filter((g) => g.arrival <= arrival).pop() ?? (this.lastGood && this.lastGood.arrival <= arrival ? this.lastGood : undefined);
    const next = goods.find((g) => g.arrival > arrival);
    let x = -1;
    if (kind === 'bad' && !prev) return; // no bad item before the pet has a good one to go for
    // good items: reachable from the previous one and the next one, clear of bad items on the path, and (while there is a choice)
    // not straight over the spot the pet stands on right now, so a pet that does not move catches nothing
    const goodOk = (cand: number, relaxed: boolean) => {
      const ref = prev ? prev.x : s.petX;
      const prevT = prev ? arrival - prev.arrival : 1200;
      if (Math.abs(cand - ref) > reach(d.refVp, prevT, d.petW, vy) + 0.01) return false;
      if (!relaxed && Math.abs(cand - s.petX) < d.petW * 0.9 + 2) return false;
      if (next && Math.abs(cand - next.x) > reach(d.refVp, next.arrival - arrival, d.petW, vy) + 0.01) return false;
      if (prev && bads.some((b) => b.arrival >= prev.arrival && b.arrival <= arrival && !clearOf(prev.x, cand, b.x))) return false;
      if (next && bads.some((b) => b.arrival > arrival && b.arrival <= next.arrival && !clearOf(cand, next.x, b.x))) return false;
      if (bads.some((b) => Math.abs(b.arrival - arrival) < window + 400 && Math.abs(b.x - cand) < d.petW + 4)) return false;
      return true;
    };
    for (let tries = 0; tries < 16 && x < 0; tries++) {
      if (kind !== 'bad') {
        const ref = prev ? prev.x : s.petX;
        const rr = reach(d.refVp, prev ? arrival - prev.arrival : 1200, d.petW, vy);
        // aim for the far end of what is reachable, mostly further away from where the pet stands; if that side is walled or blocked, try the other
        const away = this.rng.chance(0.75) === (ref >= s.petX) ? 1 : -1;
        for (const sign of [away, -away]) {
          const cand = Math.max(lo, Math.min(hi, ref + sign * rr * this.rng.range(0.45, 0.98)));
          if (goodOk(cand, tries >= 12)) { x = cand; break; }
        }
      } else {
        const ref = prev!.x;
        let cand = this.rng.range(lo, hi);
        // a trap close to the pet's path, but never on it
        if (tries < 8) cand = Math.max(lo, Math.min(hi, ref + (this.rng.chance(0.5) ? 1 : -1) * this.rng.range(d.petW + 5, d.petW * 2.6)));
        if (Math.abs(cand - ref) < d.petW + 5) continue;
        if (next && !clearOf(ref, next.x, cand)) continue;
        if (goods.some((o) => Math.abs(o.arrival - arrival) < window + 500 && Math.abs(o.x - cand) < d.petW + 5)) continue;
        x = cand;
      }
    }
    if (x < 0) return;
    const list = kind === 'bad' ? this.p.theme.bad : this.p.theme.good;
    const glyph = kind === 'bonus' ? 0 : this.rng.int(list.length);
    s.items.push({ id: this.nextId++, x, y: -ITEM, vy, kind, glyph, arrival });
    if (kind !== 'bad') this.lastGood = { x, arrival };
  }

  private moveItems(dt: number) {
    const s = this.state;
    const d = this.dims;
    const hw = d.petW / 2 - 1 + ITEM / 2 - 1;
    const keep: CatchItem[] = [];
    for (const it of s.items) {
      it.y += it.vy * (dt / 1000);
      const bottom = it.y + ITEM;
      if (bottom > s.petTop + 1 && it.y < CATCH_GROUND + 1 && Math.abs(it.x - s.petX) < hw) {
        this.collect(it);
        continue;
      }
      if (it.y > CATCH_GROUND) { if (it.kind !== 'bad') s.missed++; continue; }
      keep.push(it);
    }
    s.items = keep;
  }

  private collect(it: CatchItem) {
    const s = this.state;
    if (it.kind === 'bad') {
      s.points = Math.max(0, s.points - BAD_PENALTY);
      s.hits++;
      s.stun = STUN_MS; s.dir = 0;
      s.pops.push({ x: it.x, y: s.petTop - 2, age: 0, kind: 'bad', pts: -BAD_PENALTY });
    } else {
      const pts = it.kind === 'bonus' ? BONUS_POINTS : 1;
      s.points += pts;
      s.caught++;
      s.cheer = 400;
      s.pops.push({ x: it.x, y: s.petTop - 2, age: 0, kind: it.kind, pts });
    }
  }
}

export const catchGame: GameDef<CatchState> = {
  id: 'catch', name: 'CATCH', unit: 'POINTS', thresholds: CATCH_THRESHOLDS, usesRight: true,
  hint: 'A: left | B: stop | C: right',
  rules: (t) => [`CATCH ${t.goodNoun}`, `DODGE ${t.badNoun}`, 'A LEFT  C RIGHT'],
  maxMs: CATCH_MS + 2000,
  init: (seed, params) => new Catch(seed, params),
};
