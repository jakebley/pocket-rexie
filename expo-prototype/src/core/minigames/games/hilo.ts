// HI-LO: the original guessing game (5 rounds, higher or lower), ported into the mini-game structure with the same rules and pacing.
// A (left) switches between HIGHER and LOWER, B (act) chooses, a tap on a row chooses it directly; C quits.
import { makeRng } from '../rng';
import { rankOf, type GameDef, type GameInput, type GameParams, type MiniGame, type Thresholds } from '../types';

/** Shape kept identical to the old PlayState so the original screen painter and its golden test cases still apply. */
export interface HiLoState {
  round: number; shown: number; won: number;
  phase: 'guess' | 'reveal'; sel: 0 | 1;
  revealed: number | null; correct: boolean | null;
}
export const HILO_ROUNDS = 5;
export const HILO_REVEAL_MS = 1400;
export const HILO_THRESHOLDS: Thresholds = { bronze: 3, silver: 4, gold: 5 };
/** HI-LO rows (cells of the 64 grid); the painter and the tap layer both use these. */
export const HILO_ROWS = [{ y: 30, h: 9 }, { y: 41, h: 9 }] as const;

class HiLo implements MiniGame<HiLoState> {
  readonly id = 'hilo';
  state: HiLoState;
  done = false;
  private rng;
  private timer = 0;
  private mul: number;
  constructor(seed: number, p: GameParams) {
    this.rng = makeRng(seed);
    this.mul = p.scoreMul;
    this.state = { round: 1, shown: this.shown(), won: 0, phase: 'guess', sel: 0, revealed: null, correct: null };
  }
  /** shown digits stay in 2..8 so both HIGHER and LOWER can win */
  private shown() { return 2 + this.rng.int(7); }
  get score() { return Math.floor(this.state.won * this.mul + 1e-9); }
  get rank() { return rankOf(this.score, HILO_THRESHOLDS); }
  get progress() { return Math.min(1, (this.state.round - 1 + (this.state.phase === 'reveal' ? 1 : 0)) / HILO_ROUNDS); }
  get hud() { return { left: `ROUND ${this.state.round}/${HILO_ROUNDS}`, right: `WINS ${this.state.won}` }; }
  private guess() {
    const s = this.state;
    if (s.phase !== 'guess') return;
    let rev = 1 + this.rng.int(9);
    while (rev === s.shown) rev = 1 + this.rng.int(9);
    const correct = s.sel === 0 ? rev > s.shown : rev < s.shown;
    this.state = { ...s, phase: 'reveal', revealed: rev, correct, won: s.won + (correct ? 1 : 0) };
    this.timer = HILO_REVEAL_MS;
  }
  step(input: GameInput, dtMs: number) {
    if (this.done) return;
    const s = this.state;
    if (s.phase === 'guess') {
      if (input.pick === 0 || input.pick === 1) { this.state = { ...s, sel: input.pick }; this.guess(); return; }
      if (input.left || input.right) this.state = { ...s, sel: s.sel === 0 ? 1 : 0 };
      if (input.act) this.guess();
      return;
    }
    this.timer -= dtMs;
    if (this.timer <= 0) {
      if (s.round >= HILO_ROUNDS) this.done = true;
      else this.state = { round: s.round + 1, shown: this.shown(), won: s.won, phase: 'guess', sel: s.sel, revealed: null, correct: null };
    }
  }
}

export const hiloGame: GameDef<HiLoState> = {
  id: 'hilo', name: 'HI-LO', unit: 'WINS', thresholds: HILO_THRESHOLDS, usesRight: false,
  hint: 'A: higher/lower | B: choose | C: quit',
  rules: () => ['GUESS IF THE NEXT', 'NUMBER IS HIGHER', 'OR LOWER. 5 ROUNDS'],
  tapRows: () => [...HILO_ROWS],
  maxMs: HILO_ROUNDS * HILO_REVEAL_MS + 2000,
  init: (seed, params) => new HiLo(seed, params),
};
