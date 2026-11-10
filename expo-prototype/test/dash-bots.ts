// Scripted DASH players for the tests and the sheet tool: a lookahead bot with adjustable skill. Deterministic (seeded).
import { dashGame, jumpFor, type DashState } from '../src/core/minigames/games/dash';
import { makeRng } from '../src/core/minigames/rng';
import type { Tuning } from '../src/core/minigames/tuning';
import { NO_INPUT, type GameInput, type MiniGame } from '../src/core/minigames/types';

export interface DashSkill {
  /** random timing error, in ticks (uniform +/-) */
  jitter: number;
  /** a constant lateness in ticks (positive = late) */
  late: number;
  /** chance to ignore a whole group of obstacles */
  miss: number;
}
export const DASH_SKILLS: Record<string, DashSkill> = {
  perfect: { jitter: 0, late: 0, miss: 0 },
  good: { jitter: 2, late: 0, miss: 0.04 },
  okay: { jitter: 3, late: 1, miss: 0.12 },
  casual: { jitter: 4, late: 1, miss: 0.25 },
};

/** Lookahead bot: jumps so the apex lands on the middle of the next group of obstacles. */
export function dashBot(tuning: Tuning, skill: DashSkill, seed: number) {
  const rng = makeRng(seed * 104729 + 3);
  const jump = jumpFor(tuning, false);
  const mid = Math.round(jump.airTicks / 2);
  const dt = 0.05;
  let target = -1; // id of the first obstacle of the group being handled
  let offset = 0;
  let skip = false;
  return (game: MiniGame): GameInput => {
    const s = game.state as DashState;
    if (s.cd > 0 || !s.grounded || s.stun > 0) return NO_INPUT;
    const left = s.petX - s.hbW / 2;
    const live = s.obstacles.filter((o) => !o.settled && !o.hit && o.x + o.hr > left).sort((a, b) => a.x - b.x);
    if (!live.length) return NO_INPUT;
    const grp = [live[0]];
    for (let i = 1; i < live.length; i++) { if (live[i].x + live[i].hl - (grp[grp.length - 1].x + grp[grp.length - 1].hr) < 12) grp.push(live[i]); else break; }
    if (grp[0].id !== target) {
      target = grp[0].id;
      offset = skill.late + (skill.jitter ? (rng.next() * 2 - 1) * skill.jitter : 0);
      skip = rng.chance(skill.miss);
    }
    if (skip) return NO_INPUT;
    const centre = (grp[0].x + grp[0].hl + grp[grp.length - 1].x + grp[grp.length - 1].hr) / 2 - s.petX;
    const ticks = centre / (s.speed * dt);
    return ticks <= mid + 0.5 + offset ? { left: false, right: false, act: true } : NO_INPUT;
  };
}
export const DASH_DEF = dashGame;
