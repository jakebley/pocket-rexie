// Scripted ECHO players. Deterministic (seeded), no Math.random. They read the pattern from the game state (a stand-in for a good memory)
// and then answer it with a given reliability: `err` is the chance of a slip per symbol, growing with the pattern length.
import { makeRng } from '../src/core/minigames/rng';
import type { EchoState } from '../src/core/minigames/games/echo';
import type { GameInput, MiniGame } from '../src/core/minigames/types';

export interface EchoSkill {
  /** slip chance per symbol for a pattern of length 3; grows by `grow` for every symbol of extra length */
  err: number;
  grow: number;
  /** ms between answers */
  tempo: number;
  /** a chord press that fails (only one of the two buttons lands) */
  chordFail: number;
  /** presses blindly */
  random?: boolean;
}
export const ECHO_SKILLS: Record<string, EchoSkill> = {
  perfect: { err: 0, grow: 0, tempo: 300, chordFail: 0 },
  good: { err: 0.012, grow: 0.012, tempo: 450, chordFail: 0.01 },
  okay: { err: 0.035, grow: 0.025, tempo: 550, chordFail: 0.03 },
  casual: { err: 0.09, grow: 0.045, tempo: 700, chordFail: 0.06 },
  random: { err: 1, grow: 0, tempo: 300, chordFail: 0, random: true },
};

const BTN = (slot: number): GameInput => (slot === 0 ? { left: true, right: false, act: false } : slot === 2 ? { left: false, right: false, act: true } : slot === 4 ? { left: false, right: true, act: false }
  : slot === 1 ? { left: true, right: false, act: true } : { left: false, right: true, act: true });

export function echoBot(skill: EchoSkill, seed: number) {
  const rng = makeRng(seed * 104729 + 3);
  let nextAt = 0, lastPhase = '', lastRound = -1;
  return (game: MiniGame, t: number): GameInput => {
    const s = game.state as EchoState;
    const none: GameInput = { left: false, right: false, act: false };
    if (s.phase !== lastPhase || s.round !== lastRound) { if (s.phase === 'input') nextAt = t + 500; lastPhase = s.phase; lastRound = s.round; }
    if (s.phase !== 'input' || t < nextAt) return none;
    nextAt = t + skill.tempo;
    let slot = s.pattern[s.entered];
    if (skill.random) slot = s.active[rng.int(s.active.length)];
    else if (rng.chance(skill.err + skill.grow * (s.pattern.length - 3))) {
      const others = s.active.filter((x) => x !== slot);
      slot = others[rng.int(others.length)];
    } else if ((slot === 1 || slot === 3) && rng.chance(skill.chordFail)) slot = slot === 1 ? 0 : 4;
    return BTN(slot);
  };
}
