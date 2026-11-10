// ECHO (memory, Simon-style): the pet shows a pattern of the family's symbols, the player repeats it. 12 rounds, patterns of 3 up to 8.
//
// CONTROLS (the 3 physical buttons are enough, and so are taps):
//   five pad slots sit in a row: A, A+B, B, B+C, C. The buttons A, B, C play the pads of the same name directly.
//   The two in-between pads are CHORDS: press the two neighbouring buttons together (within 100 ms) for A+B or B+C.
//   Rounds 1-3 use only A, B, C (3 pads). Round 4 unlocks A+B (4 pads), round 7 unlocks B+C (5 pads).
//   A tap on a pad picks it directly (taps on the stage are ignored, so a stray tap never costs a mistake).
// Memory is the point, not speed: the player has plenty of time per symbol (a long idle just counts as a mistake).
// Tuning: the body type's memory modifier, the pet's smarts and its growth stage add display time per symbol (and patience).
// Mistakes: one retry per run (the same pattern is shown again, the streak is lost); a second mistake ends the run.
// Score: every cleared round gives its pattern length x a streak bonus (+10% per round cleared in a row, up to +50%).
import { makeRng, type Rng } from '../rng';
import { TICK_MS, makeTicker, rankOf, type GameDef, type GameInput, type GameParams, type MiniGame, type Thresholds } from '../types';

export const ECHO_ROUNDS = 12;
/** pattern length of each round: 3 up to 8 */
export const ECHO_LENGTHS = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];
/** first round (0-based) in which a slot unlocks: slots are 0 = A, 1 = A+B, 2 = B, 3 = B+C, 4 = C */
export const ECHO_UNLOCK_AB = 3;
export const ECHO_UNLOCK_BC = 6;
export const ECHO_THRESHOLDS: Thresholds = { bronze: 14, silver: 38, gold: 78 };
export const SLOT_NAMES = ['A', 'AB', 'B', 'BC', 'C'] as const;
/** the tone of each slot, low to high from left to right (Hz) */
export const SLOT_NOTES = [523, 622, 740, 880, 1047];

export const CHORD_TICKS = 2; // a press waits this many ticks (100 ms) for its chord partner (only when chord pads are in play)
export const INTRO_MS = 900;
export const LEAD_MS = 500; // pause between the banner and the first symbol
export const OK_MS = 900;
export const OOPS_MS = 1100;
export const PAD_FLASH_MS = 220;
export const IDLE_BASE = 4200; // ms the player may take per symbol before it counts as a mistake
export const STREAK_STEP = 0.1;
export const STREAK_CAP = 5;

/** the slots in play for a round, left to right */
export function activeSlots(round: number): number[] {
  const s = [0];
  if (round >= ECHO_UNLOCK_AB) s.push(1);
  s.push(2);
  if (round >= ECHO_UNLOCK_BC) s.push(3);
  s.push(4);
  return s;
}

/** Where the pads sit on the 64 grid (shared with the painter and the tap rows). */
export const PAD_Y = 47;
export const PAD_H = 16;
export function padRects(k: number): { x: number; y: number; w: number; h: number }[] {
  const gap = 2;
  const w = Math.floor((60 - gap * (k - 1)) / k);
  const x0 = Math.floor((64 - (w * k + gap * (k - 1))) / 2);
  return Array.from({ length: k }, (_, i) => ({ x: x0 + i * (w + gap), y: PAD_Y, w, h: PAD_H }));
}

/**
 * The patterns of a whole run, from the seed alone (so the same seed always shows the same patterns, whatever the player does).
 * Rules: only slots that are unlocked in that round; no slot three times in a row; never the same pattern twice in a row;
 * the round that unlocks a new pad uses it at least once.
 */
export function makePatterns(seed: number): number[][] {
  const rng = makeRng(seed * 31 + 7);
  const out: number[][] = [];
  for (let r = 0; r < ECHO_ROUNDS; r++) {
    const slots = activeSlots(r);
    const fresh = r === ECHO_UNLOCK_AB ? 1 : r === ECHO_UNLOCK_BC ? 3 : -1;
    for (let attempt = 0; ; attempt++) {
      const p = genPattern(rng, slots, ECHO_LENGTHS[r]);
      if (fresh >= 0 && !p.includes(fresh) && attempt < 50) continue;
      if (r > 0 && p.join() === out[r - 1].join() && attempt < 50) continue;
      out.push(p);
      break;
    }
  }
  return out;
}
function genPattern(rng: Rng, slots: number[], len: number): number[] {
  const p: number[] = [];
  while (p.length < len) {
    const n = p.length;
    const banned = n >= 2 && p[n - 1] === p[n - 2] ? p[n - 1] : -1;
    const opts = slots.filter((s) => s !== banned);
    p.push(opts[rng.int(opts.length)]);
  }
  return p;
}

export type EchoPhase = 'intro' | 'show' | 'input' | 'ok' | 'oops' | 'end';
export type EchoMood = 'idle' | 'talk' | 'nod' | 'shrug' | 'cheer';
export interface EchoState {
  t: number;
  phase: EchoPhase;
  /** ms in the current phase */
  phaseMs: number;
  /** current round, 0-based */
  round: number;
  rounds: number;
  pattern: number[];
  /** every round's pattern (a painter must not draw the ones to come) */
  patterns: number[][];
  active: number[];
  /** slot lit by the pet right now, -1 for none; index of it in the pattern */
  lit: number;
  litIndex: number;
  /** symbols of the pattern shown so far, and matched so far by the player */
  shown: number;
  entered: number;
  /** the last pad the player pressed and how long ago (ms), -1 slot for none */
  pressed: number;
  pressedMs: number;
  /** was the last press wrong (the pad flashes the alarm layer) */
  wrong: boolean;
  /** the slot the player should have pressed, shown after a mistake */
  expected: number;
  idleMs: number;
  idleMax: number;
  litMs: number;
  gapMs: number;
  retries: number;
  streak: number;
  points: number;
  cleared: number;
  mistakes: number;
  mood: EchoMood;
  moodMs: number;
  /** a sound event for the UI: a new seq means play it */
  sfx: { seq: number; kind: 'note' | 'bad'; note: number };
  /** the run is over and the player cleared every round */
  won: boolean;
  finished: boolean;
}

export const STAGE_MEMORY: Record<string, number> = { baby: 120, child: 70, teen: 30, adult: 0, ultimate: 0, egg: 0, ghost: 0 };

/** Extra ms each symbol stays lit for this pet: memory (body type), smarts and growth stage. */
export function memoryBonus(p: GameParams): number {
  return Math.round(p.tuning.memory * 0.6 + p.smarts * 1.5 + (STAGE_MEMORY[p.stage] ?? 0));
}
export const litFor = (round: number, bonus: number) => Math.round(Math.max(320, 700 - 40 * round) + bonus);
export const gapFor = (round: number) => Math.round(Math.max(140, 260 - 12 * round));
export const idleFor = (p: GameParams) => Math.round(IDLE_BASE + p.tuning.memory * 2);
export const roundPoints = (len: number, streak: number) => len * (1 + STREAK_STEP * Math.min(streak, STREAK_CAP));

class Echo implements MiniGame<EchoState> {
  readonly id = 'echo';
  state: EchoState;
  private mul: number;
  private bonus: number;
  private idle: number;
  private ticker: (dt: number) => void;
  private pending: GameInput = { left: false, right: false, act: false };
  /** chord buffer: buttons seen and ticks waited */
  private buf = { a: false, b: false, c: false, age: -1 };
  private lastK = -1;

  constructor(seed: number, p: GameParams) {
    this.mul = p.scoreMul;
    this.bonus = memoryBonus(p);
    this.idle = idleFor(p);
    const patterns = makePatterns(seed);
    this.state = {
      t: 0, phase: 'intro', phaseMs: 0, round: 0, rounds: ECHO_ROUNDS, pattern: patterns[0], patterns, active: activeSlots(0),
      lit: -1, litIndex: -1, shown: 0, entered: 0, pressed: -1, pressedMs: 0, wrong: false, expected: -1, idleMs: 0, idleMax: this.idle,
      litMs: litFor(0, this.bonus), gapMs: gapFor(0), retries: 1, streak: 0, points: 0, cleared: 0, mistakes: 0,
      mood: 'idle', moodMs: 0, sfx: { seq: 0, kind: 'note', note: 0 }, won: false, finished: false,
    };
    this.ticker = makeTicker(() => this.tick());
  }

  get done() { return this.state.finished; }
  get score() { return Math.floor(Math.max(0, this.state.points) * this.mul + 1e-9); }
  get rank() { return rankOf(this.score, ECHO_THRESHOLDS); }
  get progress() { return Math.min(1, this.state.cleared / this.state.rounds); }
  get hud() { return { left: `RND ${Math.min(this.state.rounds, this.state.round + 1)}`, right: `SCORE ${this.score}` }; }
  get overLabel() { return this.state.won ? 'CLEARED' : 'OOPS'; }
  get sfx() { return this.state.sfx; }

  step(input: GameInput, dtMs: number) {
    if (this.done) return;
    this.pending.left ||= input.left; this.pending.right ||= input.right; this.pending.act ||= input.act;
    if (input.pick !== undefined) this.pending.pick = input.pick;
    this.ticker(dtMs);
  }

  private tick() {
    const s = this.state;
    const inp = this.pending;
    this.pending = { left: false, right: false, act: false };
    s.t += TICK_MS;
    s.phaseMs += TICK_MS;
    if (s.moodMs > 0) { s.moodMs -= TICK_MS; if (s.moodMs <= 0) { s.mood = 'idle'; s.moodMs = 0; } }
    if (s.pressed >= 0) { s.pressedMs += TICK_MS; if (s.pressedMs > PAD_FLASH_MS) { s.pressed = -1; s.wrong = false; } }
    switch (s.phase) {
      case 'intro':
        if (s.phaseMs >= INTRO_MS) this.go('show');
        break;
      case 'show': this.tickShow(); break;
      case 'input': this.tickInput(inp); break;
      case 'ok':
        if (s.phaseMs >= OK_MS) this.nextRound();
        break;
      case 'oops':
        if (s.phaseMs >= OOPS_MS) {
          if (this.lost) this.finish(false);
          else this.go('intro'); // the retry: same round, same pattern
        }
        break;
      case 'end':
        if (s.phaseMs >= 700) s.finished = true;
        break;
    }
  }

  private lost = false;

  private go(phase: EchoPhase) {
    const s = this.state;
    s.phase = phase; s.phaseMs = 0;
    s.lit = -1; s.litIndex = -1;
    if (phase === 'show') { s.shown = 0; this.lastK = -1; s.mood = 'talk'; s.moodMs = 0; s.expected = -1; }
    if (phase === 'intro') { s.entered = 0; s.shown = 0; s.expected = -1; s.wrong = false; s.pressed = -1; }
    if (phase === 'input') { s.entered = 0; s.idleMs = 0; this.buf = { a: false, b: false, c: false, age: -1 }; s.mood = 'idle'; s.moodMs = 0; }
  }

  private tickShow() {
    const s = this.state;
    const el = s.phaseMs - LEAD_MS;
    const period = s.litMs + s.gapMs;
    if (el < 0) { s.lit = -1; return; }
    const k = Math.floor(el / period);
    if (k >= s.pattern.length) {
      if (el - s.pattern.length * period >= 300) this.go('input');
      s.lit = -1;
      return;
    }
    const r = el - k * period;
    if (r < s.litMs) {
      s.lit = s.pattern[k]; s.litIndex = k;
      if (k !== this.lastK) {
        this.lastK = k;
        s.shown = k + 1;
        s.sfx = { seq: s.sfx.seq + 1, kind: 'note', note: SLOT_NOTES[s.lit] };
        s.mood = 'talk'; s.moodMs = 180;
      }
    } else s.lit = -1;
  }

  private tickInput(inp: GameInput) {
    const s = this.state;
    s.idleMs += TICK_MS;
    if (inp.pick !== undefined) {
      const slot = s.active[inp.pick];
      if (slot !== undefined) this.press(slot);
    } else if (s.active.length === 3) {
      // no chords in play: every press counts at once
      if (inp.left) this.press(0);
      if (inp.act) this.press(2);
      if (inp.right) this.press(4);
    } else {
      const b = this.buf;
      b.a ||= inp.left; b.b ||= inp.act; b.c ||= inp.right;
      if (b.age < 0 && (b.a || b.b || b.c)) b.age = 0; else if (b.age >= 0) b.age++;
      const n = (b.a ? 1 : 0) + (b.b ? 1 : 0) + (b.c ? 1 : 0);
      if (b.age >= 0 && (n >= 2 || b.age >= CHORD_TICKS)) {
        const { a, b: bb, c } = b;
        this.buf = { a: false, b: false, c: false, age: -1 };
        if (a && bb && !c && s.active.includes(1)) this.press(1);
        else if (bb && c && !a && s.active.includes(3)) this.press(3);
        else {
          if (a) this.press(0);
          if (bb) this.press(2);
          if (c) this.press(4);
        }
      }
    }
    if (s.phase === 'input' && s.idleMs >= s.idleMax + (s.entered === 0 ? 1500 : 0)) this.mistake(-1);
  }

  private press(slot: number) {
    const s = this.state;
    if (s.phase !== 'input') return;
    s.pressed = slot; s.pressedMs = 0; s.wrong = false;
    const want = s.pattern[s.entered];
    s.sfx = { seq: s.sfx.seq + 1, kind: 'note', note: SLOT_NOTES[slot] };
    if (slot === want) {
      s.entered++; s.idleMs = 0;
      s.mood = 'nod'; s.moodMs = 260;
      if (s.entered >= s.pattern.length) this.clear();
    } else this.mistake(slot);
  }

  private clear() {
    const s = this.state;
    s.points += roundPoints(s.pattern.length, s.streak);
    s.streak++; s.cleared++;
    s.phase = 'ok'; s.phaseMs = 0; s.mood = 'cheer'; s.moodMs = OK_MS;
  }

  private mistake(slot: number) {
    const s = this.state;
    s.mistakes++;
    s.wrong = slot >= 0;
    if (slot < 0) s.pressed = -1;
    s.expected = s.pattern[s.entered];
    s.streak = 0;
    s.sfx = { seq: s.sfx.seq + 1, kind: 'bad', note: 0 };
    s.mood = 'shrug'; s.moodMs = OOPS_MS;
    if (s.retries > 0) s.retries--; else this.lost = true;
    s.phase = 'oops'; s.phaseMs = 0; s.lit = -1;
  }

  private nextRound() {
    const s = this.state;
    if (s.round + 1 >= s.rounds) { this.finish(true); return; }
    s.round++;
    s.pattern = s.patterns[s.round];
    s.active = activeSlots(s.round);
    s.litMs = litFor(s.round, this.bonus);
    s.gapMs = gapFor(s.round);
    s.idleMax = this.idle;
    this.go('intro');
  }

  private finish(won: boolean) {
    const s = this.state;
    s.won = won;
    s.phase = 'end'; s.phaseMs = 0;
    s.mood = won ? 'cheer' : 'shrug'; s.moodMs = 700;
    s.lit = -1;
    // a win gets a short beat for the pet to cheer; a loss already had its shrug in the 'oops' phase
    if (!won) s.finished = true;
  }
}

export const echoGame: GameDef<EchoState> = {
  id: 'echo', name: 'ECHO', unit: 'POINTS', thresholds: ECHO_THRESHOLDS, usesRight: true,
  hint: 'A B C: pads | A+B, B+C: more',
  rules: () => ['WATCH THE SIGNS', 'THEN COPY THEM', 'A B C + A&B B&C'],
  tapRows: (s) => {
    // the touch zones tile the whole screen (no gaps), so a stray tap never turns into an A or C press
    const rects = padRects(s.active.length);
    const zones = rects.map((r, i) => {
      const x0 = i === 0 ? 0 : r.x - 1, x1 = i === rects.length - 1 ? 64 : r.x + r.w + 1;
      return { x: x0, y: r.y, w: x1 - x0, h: 64 - r.y - 1 };
    });
    return [...zones, { x: 0, y: 0, w: 64, h: PAD_Y - 2 }];
  },
  // the longest a run can take: every symbol shown slowly and answered with the whole idle time
  maxMs: ECHO_LENGTHS.reduce((a, n) => a + n * (1200 + 1500 + IDLE_BASE + 1200), 0) + ECHO_ROUNDS * 3000 + 20000,
  init: (seed, params) => new Echo(seed, params),
};
