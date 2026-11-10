// DASH (timing, 40 s): the pet runs, hops, swims or flies along a scrolling course of the family's obstacles. One input (A, B or a tap) jumps.
// The course speeds up from the first step to the last. Score = distance + bonus items floating over the obstacles + near misses + streaks.
// A hit stuns the pet: the world slows, the streak breaks and a few points are lost, but nobody is eliminated.
//
// Fair play (test/dash.ts proves it with a perfect bot for every body type and stage):
//   * the course is a function of the seed and of the pet's body type and stage only. Sickness and weight lower the jump, never the course;
//   * every obstacle (or pair that a single jump has to cover) is generated against the HEALTHY jump arc of the same body type and stage:
//     the time the pet is above it must exceed the time it overlaps it by MARGIN_TICKS, and a jump centred on one group lands in time
//     for a jump centred on the next (landing slack);
//   * big and heavy kinds have a wider hitbox but a bigger, longer jump and wider gaps; small quick kinds start faster and have tight gaps.
import { makeRng, type Rng } from '../rng';
import type { Glyph } from '../themes';
import type { Tuning } from '../tuning';
import { TICK_MS, makeTicker, rankOf, type GameDef, type GameInput, type GameParams, type MiniGame, type Thresholds } from '../types';

export const DASH_MS = 40000;
export const DASH_COUNT_MS = 1800;
export const DASH_W = 64;
/** the pet's feet row; the obstacles stand on it too */
export const DASH_GROUND = 59;
/** the pet's centre column */
export const DASH_PET_X = 14;
export const DASH_THRESHOLDS: Thresholds = { bronze: 30, silver: 58, gold: 84 };

export const V_START = 36; // px/s at the first step (before the body type factor)
export const V_END = 60;
export const DIST_PER_POINT = 90; // px of course per point
export const STUN_MS = 650;
export const INVUL_MS = 1500;
export const STUN_SLOW = 0.35;
export const HIT_PENALTY = 8;
export const NEAR_MISS_PX = 2; // clearance (px) over an obstacle that counts as a close call
export const NEAR_MISS_POINTS = 2;
export const STREAK_EVERY = 5;
export const STREAK_POINTS = 3;
export const ITEM_POINTS = 1;
export const BONUS_POINTS = 5;
export const BONUS_CHANCE = 0.1; // x luck
export const JUMP_BUFFER_MS = 150;
/** after touching down the pet needs a beat before it can jump again (a perfectly spaced course allows for it; hammering the button does not) */
export const LAND_LAG_MS = 100;
/** ticks of slack the generator keeps between "time above the obstacle" and "time overlapping it" */
export const MARGIN_TICKS = 3;
export const LAND_SLACK_S = 0.2;
export const ITEM_SIZE = 7;
/** the usual wait (s) from one group to the next at the start; small kinds, whose jump is short, still get a tight course, big ones never less than their jump needs */
export const PACE_S = 0.95;

/** the verb on the jump button for each way of getting about */
export const JUMP_VERB: Record<string, string> = { RUN: 'HOP', HOP: 'HOP', SWIM: 'LEAP', FLY: 'FLAP', SLIDE: 'LEAP', FLOAT: 'RISE', ROLL: 'HOP' };

export interface DashObstacle {
  id: number;
  /** left edge of the 7-wide glyph, screen px (moves left) */
  x: number;
  /** index into theme.obstacles: 0 low, 1 tall, 2 spiky */
  kind: number;
  /** hitbox: columns [x+hl, x+hr) and effective height above the ground */
  hl: number; hr: number; h: number;
  /** true once the pet has hit it (it stops counting) */
  hit: boolean;
  overlapped: boolean;
  /** smallest clearance (px of pet above the hitbox top) while the pet was beside it */
  minClear: number;
  settled: boolean;
}
export interface DashItem {
  id: number;
  /** centre column, centre height above the ground */
  x: number;
  hc: number;
  bonus: boolean;
  glyph: number;
}
export interface DashPop { x: number; y: number; age: number; text: string; kind: 'item' | 'bonus' | 'near' | 'streak' | 'hit' }
export interface DashState {
  /** ms played (after the countdown) */
  t: number;
  duration: number;
  /** ms of countdown left */
  cd: number;
  /** current course speed, px/s */
  speed: number;
  /** px travelled since GO (the score counts it) and the total scroll for the scenery */
  dist: number;
  scroll: number;
  petX: number; petW: number; petH: number;
  /** hitbox width, height */
  hbW: number; hbH: number;
  /** height of the pet's feet above the ground (px) and vertical speed (px/s) */
  hp: number; vy: number;
  grounded: boolean;
  /** ms since take-off (0 on the ground) */
  air: number;
  stun: number;
  invul: number;
  /** ms left of the little cheer after a pickup */
  cheer: number;
  jumpBuf: number;
  /** ms left of the landing lag */
  land: number;
  obstacles: DashObstacle[];
  items: DashItem[];
  pops: DashPop[];
  points: number;
  cleared: number;
  hits: number;
  near: number;
  streak: number;
  best: number;
  picked: number;
  jumps: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// geometry: obstacle hitboxes from their glyphs, the jump arc from the body type
// ---------------------------------------------------------------------------------------------------------------------
export interface ObstacleBox { hl: number; hr: number; h: number; left: number; right: number; ho: number }
const boxCache = new Map<string, ObstacleBox>();
/** The hitbox of a 7x7 obstacle glyph: forgiving (one column in from each side, one row off the top); `ho` is the true height. */
export function obstacleBox(gl: Glyph): ObstacleBox {
  const key = gl.rows.join('|');
  let b = boxCache.get(key);
  if (!b) {
    let l = 7, r = 0, top = 7;
    gl.rows.forEach((row) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x + 1); } });
    gl.rows.forEach((row, y) => { if (/[^.]/.test(row)) top = Math.min(top, y); });
    if (r === 0) { l = 2; r = 5; top = 4; }
    const wide = r - l >= 5;
    const ho = 7 - top;
    b = { left: l, right: r, hl: l + (wide ? 1 : 0), hr: r - (wide ? 1 : 0), ho, h: Math.max(2, ho - 1) };
    boxCache.set(key, b);
  }
  return b;
}

export interface DashDims { petW: number; petH: number; hbW: number; hbH: number }
export function dashDims(t: Tuning): DashDims {
  const petW = Math.max(12, Math.min(20, Math.round(8 + 7 * t.size)));
  return { petW, petH: petW, hbW: Math.max(5, Math.round(petW * 0.4)), hbH: Math.round(petW * 0.55) };
}

export interface Jump {
  v0: number; g: number;
  /** pet height after k ticks since take-off, k = 1 .. airTicks-1 (the pet lands on tick airTicks) */
  arc: number[];
  airTicks: number;
  apex: number;
}
const dt = TICK_MS / 1000;
/** The jump of a body type. `healthy` ignores weight and health (the reference the course is built against). */
export function jumpFor(t: Tuning, healthy: boolean): Jump {
  const s = t.size;
  let H = 21 + 9 * (s - 1);
  let T = 0.64 + 0.26 * (s - 1);
  const c = healthy ? 1 : Math.min(1, t.speed / t.baseSpeed);
  H *= c; T *= Math.sqrt(c);
  const g = (8 * H) / (T * T);
  const v0 = (4 * H) / T;
  const arc: number[] = [];
  let hp = 0, vy = v0;
  for (let k = 1; k < 60; k++) {
    hp += vy * dt - (g * dt * dt) / 2;
    vy -= g * dt;
    if (hp <= 0) return { v0, g, arc, airTicks: k, apex: Math.max(0, ...arc) };
    arc.push(hp);
  }
  return { v0, g, arc, airTicks: 60, apex: Math.max(0, ...arc) };
}
/** Number of ticks (and the first one) of a jump during which the pet is at or above height h. */
export function windowAbove(j: Jump, h: number): { first: number; count: number } {
  let first = -1, count = 0;
  j.arc.forEach((v, i) => { if (v >= h) { if (first < 0) first = i + 1; count++; } });
  return { first, count };
}
/** the body type's speed factor on the course: quick light kinds start faster, slow heavy ones start gentler */
export const courseFactor = (t: Tuning) => 1 + 0.4 * (t.baseSpeed - 1);
export const courseSpeed = (p: number, t: Tuning) => (V_START + (V_END - V_START) * Math.min(1, Math.max(0, p))) * courseFactor(t);

class Dash implements MiniGame<DashState> {
  readonly id = 'dash';
  state: DashState;
  private rng: Rng;
  private tuning: Tuning;
  private mul: number;
  private jump: Jump;
  private ref: Jump;
  private nextId = 1;
  /** centre column and half width of the last placed group, and the time gap (s) the next group wants after it */
  private lastCx = 22;
  private lastHalf = 0;
  private gapSec = 1.9;
  private ticker: (dt: number) => void;
  private pending: GameInput = { left: false, right: false, act: false };

  constructor(seed: number, private p: GameParams) {
    this.rng = makeRng(seed);
    this.tuning = p.tuning;
    this.mul = p.scoreMul;
    this.jump = jumpFor(p.tuning, false);
    this.ref = jumpFor(p.tuning, true);
    const d = dashDims(p.tuning);
    this.state = {
      t: 0, duration: DASH_MS, cd: DASH_COUNT_MS, speed: courseSpeed(0, p.tuning), dist: 0, scroll: 0,
      petX: DASH_PET_X, petW: d.petW, petH: d.petH, hbW: d.hbW, hbH: d.hbH, hp: 0, vy: 0, grounded: true, air: 0, stun: 0, invul: 0, cheer: 0, jumpBuf: 0, land: 0,
      obstacles: [], items: [], pops: [], points: 0, cleared: 0, hits: 0, near: 0, streak: 0, best: 0, picked: 0, jumps: 0,
    };
    this.ticker = makeTicker(() => this.tick());
  }

  get done() { return this.state.t >= this.state.duration; }
  get score() { return Math.floor(Math.max(0, this.state.dist / DIST_PER_POINT + this.state.points) * this.mul + 1e-9); }
  get rank() { return rankOf(this.score, DASH_THRESHOLDS); }
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
    const inp = this.pending;
    this.pending = { left: false, right: false, act: false };
    if (s.cd > 0) {
      // countdown: the world idles past, the pet trots on the spot
      s.cd -= TICK_MS;
      s.scroll += 9 * dt;
      return;
    }
    if (inp.left || inp.right || inp.act) s.jumpBuf = JUMP_BUFFER_MS;
    const base = courseSpeed(this.progress, this.tuning);
    s.speed = s.stun > 0 ? base * STUN_SLOW : base;
    s.t += TICK_MS;
    if (s.stun > 0) s.stun -= TICK_MS;
    if (s.invul > 0) s.invul -= TICK_MS;
    if (s.cheer > 0) s.cheer -= TICK_MS;
    const move = s.speed * dt;
    s.dist += move; s.scroll += move;
    for (const o of s.obstacles) o.x -= move;
    for (const i of s.items) i.x -= move;
    this.lastCx -= move;
    // the pet
    if (s.jumpBuf > 0) s.jumpBuf -= TICK_MS;
    if (s.land > 0) s.land -= TICK_MS;
    if (s.grounded && s.jumpBuf > 0 && s.stun <= 0 && s.land <= 0) {
      s.grounded = false; s.vy = this.jump.v0; s.air = 0; s.jumpBuf = 0; s.jumps++;
    }
    if (!s.grounded) {
      s.air += TICK_MS;
      s.hp += s.vy * dt - (this.jump.g * dt * dt) / 2;
      s.vy -= this.jump.g * dt;
      if (s.hp <= 0) { s.hp = 0; s.vy = 0; s.grounded = true; s.air = 0; s.land = LAND_LAG_MS; }
    }
    this.collide();
    this.pickUp();
    this.spawn();
    for (const q of s.pops) q.age += TICK_MS;
    s.pops = s.pops.filter((q) => q.age < 800);
    s.obstacles = s.obstacles.filter((o) => o.x + 8 > 0);
    s.items = s.items.filter((i) => i.x > -6);
  }

  private pop(x: number, y: number, text: string, kind: DashPop['kind']) { this.state.pops.push({ x, y, age: 0, text, kind }); }

  private collide() {
    const s = this.state;
    const left = s.petX - s.hbW / 2, right = s.petX + s.hbW / 2;
    for (const o of s.obstacles) {
      if (o.settled) continue;
      const ol = o.x + o.hl, or = o.x + o.hr;
      if (or > left && ol < right) {
        o.overlapped = true;
        if (!o.hit) {
          o.minClear = Math.min(o.minClear, s.hp - o.h);
          if (s.hp < o.h - 1e-6) {
            o.hit = true;
            if (s.invul <= 0) this.hurt();
          }
        }
      } else if (or <= left) {
        o.settled = true;
        if (!o.hit && o.overlapped) this.clear(o);
      }
    }
  }

  private hurt() {
    const s = this.state;
    s.hits++; s.streak = 0;
    s.stun = STUN_MS; s.invul = INVUL_MS; s.jumpBuf = 0;
    const lost = Math.min(HIT_PENALTY, Math.max(0, s.points));
    s.points -= lost;
    this.pop(s.petX, DASH_GROUND - s.petH - 4, lost ? `-${lost}` : 'OUCH', 'hit');
  }

  private clear(o: DashObstacle) {
    const s = this.state;
    s.cleared++; s.streak++; s.best = Math.max(s.best, s.streak);
    if (o.minClear >= 0 && o.minClear <= NEAR_MISS_PX) {
      s.near++; s.points += NEAR_MISS_POINTS; s.cheer = 300;
      this.pop(s.petX + 4, DASH_GROUND - s.petH - 6, `+${NEAR_MISS_POINTS}`, 'near');
    }
    if (s.streak % STREAK_EVERY === 0) {
      s.points += STREAK_POINTS;
      this.pop(s.petX + 6, DASH_GROUND - s.petH - 12, `+${STREAK_POINTS}`, 'streak');
    }
  }

  private pickUp() {
    const s = this.state;
    const keep: DashItem[] = [];
    const hw = s.hbW / 2 + ITEM_SIZE / 2 - 2;
    const hh = s.hbH / 2 + ITEM_SIZE / 2 - 3;
    const pc = s.hp + s.hbH / 2;
    for (const it of s.items) {
      if (Math.abs(it.x - s.petX) < hw && Math.abs(it.hc - pc) < hh) {
        const pts = it.bonus ? BONUS_POINTS : ITEM_POINTS;
        s.points += pts; s.picked++; s.cheer = 400;
        this.pop(it.x, DASH_GROUND - it.hc - 8, `+${pts}`, it.bonus ? 'bonus' : 'item');
        continue;
      }
      keep.push(it);
    }
    s.items = keep;
  }

  // ---------- the course ----------
  /** the healthy pet's course speed where a group at screen column x will be when it arrives */
  private arrivalSpeed(x: number): number {
    const here = courseSpeed(this.progress, this.tuning);
    const eta = Math.max(0, x - DASH_PET_X) / Math.max(1, here);
    return courseSpeed(this.progress + (eta * 1000) / this.state.duration, this.tuning);
  }

  /** can the healthy jump clear a hitbox of height h and the given span, with `margin` ticks to spare? */
  private fits(h: number, spanPx: number, v: number, margin: number): boolean {
    const w = windowAbove(this.ref, h);
    if (w.count <= 0) return false;
    const overlapTicks = Math.ceil((spanPx + this.state.hbW) / (v * dt)) + 1;
    return w.count - overlapTicks >= margin;
  }

  private spawn() {
    const s = this.state;
    const th = this.p.theme;
    const pr = this.progress;
    for (let guard = 0; guard < 4; guard++) {
      const cx = this.lastCx + this.gapSec * this.arrivalSpeed(this.lastCx + 20);
      if (cx - 8 > DASH_W + 8) return;
      const v = this.arrivalSpeed(cx);
      // the group: one obstacle, or a pair that a single jump has to cover
      const w = [0.42, 0.3, 0.28 + 0.1 * pr];
      const r = this.rng.next() * (w[0] + w[1] + w[2]);
      let k = r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
      let boxA = obstacleBox(th.obstacles[k]);
      let pair = pr > 0.12 && this.rng.chance(0.25 + 0.2 * pr);
      const kindB = this.rng.int(3);
      // a single obstacle must fit the healthy arc; otherwise fall back to the lowest one, then to a breather
      if (!this.fits(boxA.h, boxA.hr - boxA.hl, v, MARGIN_TICKS)) {
        k = 0; boxA = obstacleBox(th.obstacles[0]); pair = false;
        if (!this.fits(boxA.h, boxA.hr - boxA.hl, v, MARGIN_TICKS)) { this.lastCx = cx; this.lastHalf = 0; this.gapSec = 0.4; continue; }
      }
      const group: { kind: number; off: number; box: ObstacleBox }[] = [{ kind: k, off: 0, box: boxA }];
      if (pair) {
        const boxB = obstacleBox(th.obstacles[kindB]);
        const off = boxA.hr + 1 + this.rng.int(3) - boxB.hl + 1; // 1..3 px of clear air between the hitboxes
        const span = off + boxB.hr - boxA.hl;
        if (this.fits(Math.max(boxA.h, boxB.h), span, v, MARGIN_TICKS + 1)) group.push({ kind: kindB, off, box: boxB });
      }
      const last = group[group.length - 1];
      const hitL = boxA.hl, hitR = last.off + last.box.hr; // relative to the group's x
      const spanW = hitR - hitL;
      const x0 = cx - (hitL + spanW / 2);
      // keep a visible gap behind the previous group
      if (cx - spanW / 2 < this.lastCx + this.lastHalf + 5) { this.lastCx = cx; this.lastHalf = 0; this.gapSec = 0.3; continue; }
      for (const g of group) {
        s.obstacles.push({
          id: this.nextId++, x: x0 + g.off, kind: g.kind, hl: g.box.hl, hr: g.box.hr, h: g.box.h, hit: false, overlapped: false, minClear: 99, settled: false,
        });
      }
      this.placeItems(cx, v);
      this.lastCx = cx; this.lastHalf = spanW / 2;
      // the wait before the next group: the jump's air time plus landing slack (wider for big kinds), then some air that shrinks as the course speeds up
      const size = this.tuning.size;
      const slack = LAND_SLACK_S + 0.1 * Math.max(0, size - 1) - 0.04 * Math.max(0, 1 - size);
      this.gapSec = Math.max(this.ref.airTicks * dt + slack, PACE_S) + this.rng.range(0, 0.9) * (1.0 - 0.6 * pr);
    }
  }

  private placeItems(cx: number, v: number) {
    const s = this.state;
    const luck = this.tuning.luck;
    const chance = Math.max(0.55, Math.min(0.9, 0.72 + 0.15 * (luck - 1)));
    if (!this.rng.chance(chance)) return;
    const mid = Math.max(1, Math.min(this.ref.arc.length, Math.round(this.ref.airTicks / 2))); // the apex tick, counted from take-off
    const spread = Math.max(2, Math.round(0.22 / dt));
    const offs = this.rng.chance(0.35) ? [-spread / 2, spread / 2] : [-spread, 0, spread];
    for (const o of offs) {
      const k = Math.max(1, Math.min(this.ref.arc.length, Math.round(mid + o)));
      const bonus = this.rng.chance(BONUS_CHANCE * luck) && o === 0;
      s.items.push({ id: this.nextId++, x: cx + o * dt * v, hc: this.ref.arc[k - 1] + s.hbH / 2, bonus, glyph: this.rng.int(this.p.theme.good.length) });
    }
  }
}

export const dashGame: GameDef<DashState> = {
  id: 'dash', name: 'DASH', unit: 'POINTS', thresholds: DASH_THRESHOLDS, usesRight: false,
  hint: 'A/B: jump | C: quit',
  rules: (t) => [`${t.move} AND DODGE`, `A/B/TAP: ${JUMP_VERB[t.move] ?? 'HOP'}`, `GRAB ${t.goodNoun}`],
  maxMs: DASH_MS + DASH_COUNT_MS + 2000,
  init: (seed, params) => new Dash(seed, params),
};
