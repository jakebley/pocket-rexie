// Deterministic drawing cases shared by the golden generator and test/color.ts.
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { Buf } from '../src/ui/pixel';
import { SCENE_N, SCENE_STATES, TICK_MS, initScene, type Scene } from '../src/ui/scene';
import { drawScene } from '../src/ui/sceneDraw';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';

export const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);

export interface Case { name: string; draw: () => Buf }

function variantScene(p: Pet, state: Scene['state'], facing: 1 | -1, v: number): Scene {
  const base = initScene(p, T0, 12);
  return {
    ...base, state, facing, t: v % 8, x: facing === 1 ? 0 : 32, lookUp: v === 3, nowMs: T0 + v * 700 + 41, still: false,
    weather: v === 0 ? 'rain' : v === 3 ? 'cloudy' : 'clear', dim: v === 4, poopMask: v === 2 ? 7 : v === 5 ? 3 : 0,
    hour: [5, 12, 19, 23, 23, 9][v],
    props: v % 2 === 0 ? [{ g: 'food:meat', x: 40, y: 40, n: 1, side: 1 }, { g: 'foe', x: 30, y: 44, n: 3 }, { g: 'broom', x: 5, y: 51 }, { g: 'syringe', x: 12, y: 30 }, { g: 'ball', x: 20, y: 40 }] : [{ g: 'food:veggie', x: 20, y: 44 }, { g: 'food:pasta', x: 30, y: 44 }, { g: 'food:snack', x: 40, y: 44 }, { g: 'dumbbell', x: 4, y: 50 }, { g: 'spark', x: 40, y: 20 }, { g: 'shell', x: 10, y: 20 }],
    pops: [{ g: 'heart', x: 12, y: 20, age: 2, life: 10 }, { g: 'note', x: 30, y: 18, age: 0, life: 6 }, { g: 'dot', x: 3, y: 50, age: 0, life: 3 }, { g: 'smile', x: 50, y: 24, age: 1, life: 6 }, { g: 'spark', x: 50, y: 10, age: 1, life: 6 }],
    flash: v === 5 ? 1 : 0,
  };
}

const STATES = SCENE_STATES;

export function sceneCases(): Case[] {
  const out: Case[] = [];
  for (const sp of SPECIES) {
    for (const facing of [1, -1] as const) {
      for (let v = 0; v < 6; v++) {
        const state = STATES[(v * 5 + sp.id.length + (facing === 1 ? 0 : 3)) % STATES.length];
        out.push({
          name: `${sp.id}/${facing}/${v}/${state}`,
          draw: () => {
            const p = newPet(T0, { seed: 31 }); forceSpecies(p, sp.id); p.named = true;
            p.call = (['hungry', 'bored', 'poop', 'sick', 'naughty', 'light', 'hot', 'cold'] as const)[v + (facing === 1 ? 0 : 2)] ?? null;
            p.poops = 2; p.temp = v % 2 ? 2 : -2; p.sick = v === 1; p.hunger = v % 5; p.happy = (v + 2) % 5;
            if (v === 4) { p.asleep = true; p.lightOn = false; }
            const b = new Buf(SCENE_N); drawScene(b, variantScene(p, state, facing, v), p); return b;
          },
        });
      }
    }
  }
  return out;
}

export function screenCases(): Case[] {
  const out: Case[] = [];
  const mk = (stage?: string) => { const p = newPet(T0, { seed: 9 }); forceSpecies(p, 'rawr'); p.named = true; p.name = 'Rexie'; if (stage) p.stage = stage as any; return p; };
  const base = (p: Pet, mode: ScreenCtx['mode'], extra: Partial<ScreenCtx> = {}): ScreenCtx => ({ pet: p, tick: 3, mode, feedSel: 1, play: null, statsPage: 0, dexPage: 0, evo: null, scene: null, ...extra });
  for (let pg = 0; pg < 3; pg++) out.push({ name: `stats${pg}`, draw: () => renderScreen(base(mk(), 'stats', { statsPage: pg })).buf });
  for (let pg = 0; pg < 3; pg++) out.push({ name: `dex${pg}`, draw: () => renderScreen(base(mk(), 'dex', { dexPage: pg })).buf });
  for (let i = 0; i < 5; i++) out.push({ name: `feed${i}`, draw: () => renderScreen(base(mk(), 'feed', { feedSel: i })).buf });
  for (const phase of ['guess', 'reveal'] as const) for (const sel of [0, 1] as const) {
    out.push({ name: `play-${phase}-${sel}`, draw: () => renderScreen(base(mk(), 'play', { play: { round: 2, shown: 4, won: 1, phase, sel, revealed: 7, correct: true } })).buf });
  }
  out.push({ name: 'ghost', draw: () => { const p = mk('ghost'); p.causeOfDeath = 'STARVATION' as any; return renderScreen(base(p, 'home')).buf; } });
  out.push({ name: 'egg', draw: () => renderScreen(base(mk('egg'), 'home')).buf });
  return out;
}

export const lit = (b: Buf): number[] => Array.from(b.px, (v) => (v ? 1 : 0));
