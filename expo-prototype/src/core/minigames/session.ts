// One play of one game, from the ready screen to the result: the pure state machine the UI (and the tests) drive.
//   ready -> play -> over (a short "time up" beat) -> result
// The A / B / C buttons and taps become GameInput here, so the UI never needs to know a game's rules.
import { SPECIES_BY_ID, speciesName, type Pet } from '../pet';
import { applyReward, type RewardResult } from './rewards';
import type { ScoreStore } from './scores';
import { NO_INPUT, type GameDef, type GameInput, type GameParams, type MiniGame, type Rank } from './types';

export type SessionPhase = 'ready' | 'play' | 'over' | 'result';
export const OVER_MS = 1200;

export interface SessionResult {
  gameId: string;
  score: number;
  rank: Rank;
  recordSpecies: boolean;
  recordOverall: boolean;
  previous: number | null;
  reward: RewardResult;
  winLine: string;
  petName: string;
  speciesName: string;
}

export interface Session {
  def: GameDef;
  params: GameParams;
  seed: number;
  phase: SessionPhase;
  game: MiniGame | null;
  overMs: number;
  pending: GameInput;
  result: SessionResult | null;
}

export function newSession(def: GameDef, params: GameParams, seed: number): Session {
  return { def, params, seed, phase: 'ready', game: null, overMs: 0, pending: { ...NO_INPUT }, result: null };
}

export type Exit = 'none' | 'menu' | 'home';
export type Button = 'a' | 'b' | 'c';

function start(s: Session) {
  s.game = s.def.init(s.seed, s.params);
  s.phase = 'play';
  s.pending = { ...NO_INPUT };
}

/** A hardware button. Returns where the session wants to go next (the UI changes screen) or 'none'. */
export function pressButton(s: Session, b: Button): Exit {
  switch (s.phase) {
    case 'ready':
      if (b === 'b') start(s);
      else if (b === 'c') return 'menu';
      return 'none';
    case 'play':
      if (b === 'a') s.pending.left = true;
      else if (b === 'b') s.pending.act = true;
      else if (s.def.usesRight) s.pending.right = true;
      else return 'menu';
      return 'none';
    case 'over': return 'none';
    case 'result': return b === 'c' ? 'home' : 'menu';
  }
}

/** A tap on the screen: side -1 = left half, +1 = right half. */
export function tapSide(s: Session, side: -1 | 1): Exit {
  if (s.phase === 'ready') { start(s); return 'none'; }
  if (s.phase === 'result') return 'menu';
  if (s.phase === 'play') { if (side < 0) s.pending.left = true; else s.pending.right = true; }
  return 'none';
}
/** A tap on a row the game declared in tapRows. */
export function tapPick(s: Session, i: number) {
  if (s.phase === 'play') s.pending.pick = i;
}

/** Advance by dtMs. Returns true on the step the result becomes ready (the caller then settles). */
export function tickSession(s: Session, dtMs: number): boolean {
  if (s.phase === 'play' && s.game) {
    const input = s.pending;
    s.pending = { ...NO_INPUT };
    s.game.step(input, dtMs);
    if (s.game.done) { s.phase = 'over'; s.overMs = 0; }
  } else if (s.phase === 'over') {
    s.overMs += dtMs;
    if (s.overMs >= OVER_MS) { s.phase = 'result'; return true; }
  }
  return false;
}

/** Score the finished game: high scores, then the pet's reward (capped per day). Mutates the pet and the store. */
export function settleSession(s: Session, pet: Pet, store: ScoreStore, now: number): SessionResult {
  const game = s.game!;
  const rank = game.rank;
  const spName = speciesName(pet);
  const sub = store.submit(s.def.id, { score: game.score, rank, name: pet.name, species: pet.species, speciesName: SPECIES_BY_ID[pet.species]?.name ?? spName, date: now });
  const reward = applyReward(pet, rank, now);
  s.result = {
    gameId: s.def.id, score: game.score, rank, recordSpecies: sub.recordSpecies, recordOverall: sub.recordOverall, previous: sub.previous,
    reward, winLine: s.params.theme.wins[rank], petName: pet.name, speciesName: spName,
  };
  return s.result;
}

/** Run a whole game with a scripted player (tests, bots, the sheet tool). `decide` sees the live game state. */
export function playOut(def: GameDef, params: GameParams, seed: number, decide: (game: MiniGame, tMs: number) => GameInput, stepMs = 50): MiniGame {
  const game = def.init(seed, params);
  let t = 0;
  while (!game.done && t <= def.maxMs + 5000) { game.step(decide(game, t), stepMs); t += stepMs; }
  return game;
}
