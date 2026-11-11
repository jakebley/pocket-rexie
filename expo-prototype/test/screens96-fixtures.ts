// Shared fixtures of the 96x96 text-screen tests and the sheet tool: one rich pet per family and every text screen as a ScreenCtx.
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { newSession, type Session } from '../src/core/minigames/session';
import { paramsFor } from '../src/core/minigames/tuning';
import type { ScoreData } from '../src/core/minigames/scores';
import { GAME_ENTRIES } from '../src/ui/games/registry';
import { TICK_MS } from '../src/ui/scene';
import type { ScreenCtx } from '../src/ui/screens';
import type { Entitlements } from '../src/core/entitlements';

export const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
export const PLUS: Entitlements = { plus: true, previewPlus: false };

/** An adult of the family with a half-filled Dex, mid-way care numbers and a legacy. */
export function richPet(family: string, opts: { stage?: 'teen' | 'adult' | 'ultimate' | 'baby' } = {}): Pet {
  const all = SPECIES.filter((s) => s.family === family);
  const stage = opts.stage ?? 'teen';
  const sp = all.filter((s) => s.stage === stage && s.evolutions.length)[1] ?? all.filter((s) => s.stage === stage)[0];
  const p = newPet(T0 - 3 * 86400000, { seed: 11, family });
  forceSpecies(p, sp.id);
  p.name = 'Rexie'; p.named = true;
  p.dex = all.filter((s, i) => s.stage === 'baby' || s.stage === 'child' || i % 2 === 0 || s.id === sp.id).map((s) => s.id);
  p.lastTick = T0; p.birth = T0 - 3 * 86400000 - 5 * 3600000;
  p.hunger = 3; p.happy = 2; p.weight = 21; p.smarts = 36; p.discipline = 40; p.careMistakes = 2; p.wins = 3; p.battles = 5;
  p.stageMistakes = 1; p.stageMeat = 3; p.stageVeg = 1; p.stagePasta = 2; p.stageTrain = 2; p.stageWins = 1; p.stageSmarts = 9;
  p.generation = 3;
  p.legacy = Array.from({ length: 11 }, (_, i) => `Pal${i + 1} the ${all[i % all.length].name}: ${i + 2}d, ${i % 2 ? 'old age' : 'starved'}`);
  return p;
}

export function scoresFor(p: Pet): ScoreData {
  const out: ScoreData = {};
  GAME_ENTRIES.forEach((e, i) => {
    const mine = { score: 8 + i * 5, rank: 'silver' as const, name: p.name, species: p.species, speciesName: 'Mine', date: T0 };
    const other = SPECIES.find((s) => s.family === p.family && s.stage === 'adult' && s.id !== p.species) ?? SPECIES[0];
    out[e.def.id] = { overall: { score: 20 + i * 7, rank: 'gold', name: 'Ziggy', species: other.id, speciesName: other.name, date: T0 }, species: { [p.species]: mine } };
  });
  return out;
}

export function sessionFor(p: Pet, gameIdx: number, phase: 'ready' | 'result'): Session {
  const def = GAME_ENTRIES[gameIdx % GAME_ENTRIES.length].def;
  const s = newSession(def, paramsFor(p, def.id), 5);
  if (phase === 'result') {
    s.phase = 'result';
    s.result = {
      gameId: def.id, score: 128, rank: 'silver', recordSpecies: true, recordOverall: false, previous: 90,
      reward: { rank: 'silver', rewarded: true, capped: false, lines: ['HAPPY +1', 'SMARTS +3'], message: '' } as never, winLine: s.params.theme.wins.silver, petName: p.name, speciesName: 'Mine',
    };
  }
  return s;
}

export interface Fx { name: string; ctx: ScreenCtx }
const base = (p: Pet): ScreenCtx => ({ pet: p, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', ent: PLUS, scores: scoresFor(p) });

/** Every text screen (and a few pages / selections) for one family. */
export function fixtures(family: string): Fx[] {
  const p = richPet(family);
  const ghost = richPet(family); ghost.stage = 'ghost'; ghost.causeOfDeath = 'starved on a stormy night'; ghost.diedAt = T0;
  const fam = FAMILIES.find((f) => f.id === family)!;
  const other = FAMILIES.find((f) => f.id !== family && !f.isFree) ?? FAMILIES[1];
  const out: Fx[] = [
    { name: 'feed', ctx: { ...base(p), mode: 'feed', feedSel: 1 } },
    { name: 'feed-cancel', ctx: { ...base(p), mode: 'feed', feedSel: 4 } },
    { name: 'stats-care', ctx: { ...base(p), mode: 'stats', statsPage: 0 } },
    { name: 'stats-growth', ctx: { ...base(p), mode: 'stats', statsPage: 1 } },
    { name: 'stats-growth2', ctx: { ...base(p), mode: 'stats', statsPage: 1, tick: 6 } },
    { name: 'stats-legacy', ctx: { ...base(p), mode: 'stats', statsPage: 2 } },
    { name: 'stats-legacy2', ctx: { ...base(p), mode: 'stats', statsPage: 3 } },
    { name: 'dex-0', ctx: { ...base(p), mode: 'dex', dexPage: 0, dexFamily: fam.id } },
    { name: 'dex-2', ctx: { ...base(p), mode: 'dex', dexPage: 2, dexFamily: fam.id, tick: 4 } },
    { name: 'dex-5', ctx: { ...base(p), mode: 'dex', dexPage: 5, dexFamily: fam.id } },
    { name: 'dex-locked', ctx: { ...base(p), mode: 'dex', dexFamily: other.id, ent: undefined } },
    { name: 'dex-other', ctx: { ...base(p), mode: 'dex', dexFamily: other.id, dexPage: 1 } },
    { name: 'ghost', ctx: { ...base(ghost) } },
    { name: 'evo-a', ctx: { ...base(p), evo: { from: p.species, to: SPECIES.find((s) => s.family === family && s.stage === 'adult')!.id, until: Date.now() + 1e9 }, tick: 0 } },
    { name: 'evo-b', ctx: { ...base(p), evo: { from: p.species, to: SPECIES.find((s) => s.family === family && s.stage === 'adult')!.id, until: Date.now() + 1e9 }, tick: 1 } },
  ];
  for (const sel of [0, 4, 6]) out.push({ name: `playmenu-${sel}`, ctx: { ...base(p), mode: 'playmenu', playSel: sel } });
  GAME_ENTRIES.forEach((_, i) => {
    out.push({ name: `scores-${i}`, ctx: { ...base(p), mode: 'scores', scoresPage: i } });
    out.push({ name: `ready-${i}`, ctx: { ...base(p), mode: 'game', session: sessionFor(p, i, 'ready') } });
    out.push({ name: `result-${i}`, ctx: { ...base(p), mode: 'game', session: sessionFor(p, i, 'result') } });
  });
  return out;
}
