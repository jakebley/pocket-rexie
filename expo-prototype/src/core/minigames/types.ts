// The mini-game contract. Pure TypeScript: no rendering, no clocks, no Math.random (see docs/PLAY.md).
//
// HOW TO ADD A GAME (one new core file, one new painter file, one registry line each side of the work):
//   1. src/core/minigames/games/<id>.ts   export a GameDef (below); read `params` for the species tuning and theme.
//   2. src/ui/games/<id>.ts               export `entry: GameEntry` = { def, paint } (paint draws the state into the 64x64 Buf).
//   3. src/ui/games/registry.ts           add ONE line inside the GAME_ENTRIES array (marked slots, so parallel branches do not conflict).
// Nothing else changes: the Play menu, the game screen, scores, rewards and the high-score screen are all driven by the GameDef.
import type { Stage } from '../types';
import type { FamilyTheme } from './themes';
import type { Tuning } from './tuning';

/** The ids the species tuning table (tuning.ts) can name as a favourite. A game with another id still works; it just is nobody's favourite. */
export const GAME_IDS = ['hilo', 'catch', 'dash', 'echo'] as const;
export type GameId = (typeof GAME_IDS)[number];

export type Rank = 'none' | 'bronze' | 'silver' | 'gold';
export const RANKS: Rank[] = ['none', 'bronze', 'silver', 'gold'];
export const rankLabel = (r: Rank) => (r === 'none' ? 'TRY AGAIN' : r.toUpperCase());

/**
 * What the player did since the last step. Every field is an EDGE (a press), so the same code serves buttons, taps and bots:
 *   left / right: the A button or a tap on the left half / the C button or a tap on the right half of the screen
 *   act:          the B button (jump, flap, confirm, stop)
 *   pick:         a direct choice of option n (a tap on a menu-like row or symbol); optional
 * A game that wants "hold to move" can keep its own direction state (CATCH does: press left, the pet keeps sliding left until B or a wall).
 */
export interface GameInput { left: boolean; right: boolean; act: boolean; pick?: number }
export const NO_INPUT: GameInput = { left: false, right: false, act: false };

/** Everything a game may depend on: the pet's body type, family and condition, already reduced to numbers. */
export interface GameParams {
  family: string;
  species: string;
  stage: Stage;
  /** reaction kind of the species ("fennec", "mech", ...) */
  kind: string;
  theme: FamilyTheme;
  /** speed / size / luck / memory modifiers with stage, weight and health folded in */
  tuning: Tuning;
  /** 1.25 when this game is the pet's favourite, else 1; the game multiplies its final score by it */
  scoreMul: number;
  /** the pet's smarts (0..100); ECHO uses it for pattern length */
  smarts: number;
}

export interface Hud { left: string; right: string }

export interface MiniGame<S = unknown> {
  readonly id: string;
  /** a read-only snapshot a painter can draw (do not mutate) */
  readonly state: S;
  readonly done: boolean;
  /** the final (or running) score, favourite multiplier included */
  readonly score: number;
  /** the rank the score has reached so far */
  readonly rank: Rank;
  /** two short strings for the HUD strip (for example "SCORE 12" and "0:21") */
  readonly hud: Hud;
  /** 0..1, how far through the game is (drives the bar under the HUD strip) */
  readonly progress: number;
  /** optional: the word on the "game over" banner (default TIME UP), at most 7 characters */
  readonly overLabel?: string;
  /** optional: a sound for the UI to play when `seq` changes ('note' = a beep at `note` Hz, 'bad' = the wrong sound) */
  readonly sfx?: { seq: number; kind: 'note' | 'bad'; note: number };
  /** advance by dtMs of game time (any chunking gives the same game: games run on a fixed internal tick) */
  step(input: GameInput, dtMs: number): void;
}

export interface Thresholds { bronze: number; silver: number; gold: number }
export const rankOf = (score: number, t: Thresholds): Rank => (score >= t.gold ? 'gold' : score >= t.silver ? 'silver' : score >= t.bronze ? 'bronze' : 'none');

export interface GameDef<S = any> {
  id: string;
  /** menu name, 14 characters at most, upper case */
  name: string;
  /** what the score counts, for the high-score screen ("CAUGHT", "WINS", ...) */
  unit: string;
  thresholds: Thresholds;
  /** B starts the game, C is the right button; false = C quits (the guessing game uses A and B only) */
  usesRight: boolean;
  /** button hints for the message line, e.g. "A: left | B: stop | C: right" */
  hint: string;
  /** rules shown on the ready screen, at most 3 lines of 16 characters, may use the family theme nouns */
  rules(theme: FamilyTheme): string[];
  /** rows a tap can pick directly (cells of the 64 grid), if the game is menu-like; taps elsewhere act as left/right halves */
  tapRows?: (state: S) => { y: number; h: number; x?: number; w?: number }[];
  /** the longest a game can run, for tests and bots (ms) */
  maxMs: number;
  init(seed: number, params: GameParams): MiniGame<S>;
}

/** Fixed-tick helper: games call `tick(dtMs)` and get their `fn` run once per TICK_MS of accumulated time. */
export const TICK_MS = 50;
export function makeTicker(fn: () => void) {
  let acc = 0;
  return (dtMs: number) => {
    acc += dtMs;
    while (acc >= TICK_MS) { acc -= TICK_MS; fn(); }
  };
}
