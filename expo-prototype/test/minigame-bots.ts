// Scripted players for the mini-game tests: a CATCH bot with adjustable skill. Deterministic (seeded), no Math.random.
import { makeRng } from '../src/core/minigames/rng';
import type { CatchState } from '../src/core/minigames/games/catch';
import { ITEM } from '../src/core/minigames/games/catch';
import type { GameInput, MiniGame } from '../src/core/minigames/types';

export interface Skill {
  /** ms between noticing something and the button press (a human reaction); also how long the bot waits before re-planning */
  react: number;
  /** px of aiming error per item */
  noise: number;
  /** chance per step that the bot does nothing */
  miss: number;
  /** speed of the pet in px/s (from the params) */
  vp: number;
  /** dodge bad items */
  careful: boolean;
}
export const SKILLS: Record<string, Omit<Skill, 'vp'>> = {
  perfect: { react: 0, noise: 0, miss: 0, careful: true },
  good: { react: 250, noise: 2, miss: 0.1, careful: true },
  okay: { react: 450, noise: 4, miss: 0.25, careful: true },
  casual: { react: 650, noise: 6, miss: 0.4, careful: false },
};

export function catchBot(skill: Skill, seed: number) {
  const rng = makeRng(seed * 7919 + 1);
  const think = catchThink(skill, rng);
  // commands reach the game `react` ms after the bot decided them (human reaction time)
  const queue: { at: number; inp: GameInput }[] = [];
  const period = Math.max(50, Math.round(skill.react / 2 / 50) * 50);
  return (game: MiniGame, t: number): GameInput => {
    const s = game.state as CatchState;
    const inp: GameInput = { left: false, right: false, act: false };
    const nowDecision = t % period === 0;
    if (s.stun <= 0 && nowDecision && !rng.chance(skill.miss)) {
      const c = think(s);
      if (c.left || c.right || c.act) queue.push({ at: t + skill.react, inp: c });
    }
    while (queue.length && queue[0].at <= t) { const q = queue.shift()!; inp.left ||= q.inp.left; inp.right ||= q.inp.right; inp.act ||= q.inp.act; }
    return inp;
  };
}

function catchThink(skill: Skill, rng: ReturnType<typeof makeRng>) {
  const aim = new Map<number, number>();
  return (s: CatchState): GameInput => {
    const inp: GameInput = { left: false, right: false, act: false };
    const seen = s.items;
    const hw = s.petW / 2 - 1 + ITEM / 2 - 1;
    const bads = seen.filter((i) => i.kind === 'bad');
    const goods = seen.filter((i) => i.kind !== 'bad').filter((g) => {
      if (!skill.careful) return true;
      return !bads.some((b) => Math.abs(b.arrival - g.arrival) < 350 && Math.abs(b.x - g.x) < s.petW + 2);
    });
    // pick the soonest good item that can still be reached
    let target: number | null = null;
    for (const g of goods.sort((a, b) => a.arrival - b.arrival)) {
      const tLeft = (g.arrival - s.t) / 1000 + (s.petW / g.vy) * 0.4;
      if (Math.abs(g.x - s.petX) - hw * 0.5 <= skill.vp * Math.max(0, tLeft) + 1) {
        if (!aim.has(g.id)) aim.set(g.id, (rng.next() * 2 - 1) * skill.noise);
        target = g.x + (aim.get(g.id) ?? 0);
        break;
      }
    }
    if (target === null) {
      // nothing to chase: step out of the way of a bad item above the pet
      if (skill.careful) {
        const threat = bads.find((b) => Math.abs(b.x - s.petX) < s.petW + 2 && b.arrival - s.t < 900);
        if (threat) return threat.x < s.petX ? { ...inp, right: s.dir !== 1 } : { ...inp, left: s.dir !== -1 };
      }
      if (s.dir !== 0) inp.act = true;
      return inp;
    }
    const diff = target - s.petX;
    const stepPx = skill.vp * 0.05;
    if (Math.abs(diff) <= Math.max(1, stepPx)) { if (s.dir !== 0) inp.act = true; }
    else if (diff < 0) { if (s.dir !== -1) inp.left = true; }
    else if (s.dir !== 1) inp.right = true;
    return inp;
  };
}
