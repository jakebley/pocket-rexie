// Real renderer frames of the home scene at 64 (Technicolor today) and at 96, side by side. Used with
//   DUMP=res96-dump.ts [SCEN=base|hud|events|calls] node tools/shading-sheets.js out.png "title" species ...
//   (see tools/res96-sheets.sh). Output is the shading-dump.ts JSON: one entry per (species, label).
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { TICK_MS, initScene, type Scene } from '../src/ui/scene';
import { renderScreen } from '../src/ui/screens';

declare const require: (m: string) => any;
declare const process: { argv: string[]; env: Record<string, string | undefined> };
const { writeFileSync } = require('fs');
const T = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const ids = process.argv.slice(3);
interface Sc { label: string; hour: number; dark: boolean; rain?: boolean; scene?: Partial<Scene>; pet?: (p: Pet) => void }
const SCEN: Record<string, Sc[]> = {
  base: [
    { label: 'day', hour: 12, dark: false }, { label: 'dusk', hour: 19, dark: false }, { label: 'night', hour: 23, dark: false },
    { label: 'rain', hour: 12, dark: false, rain: true }, { label: 'dark day', hour: 12, dark: true }, { label: 'dark night', hour: 23, dark: true },
  ],
  hud: [
    { label: 'hungry', hour: 12, dark: false, pet: (p) => { p.hunger = 1; p.happy = 2; p.call = 'hungry'; } },
    { label: 'sick', hour: 12, dark: false, pet: (p) => { p.hunger = 4; p.happy = 4; p.sick = true; p.temp = 2; p.call = 'sick'; } },
    { label: 'poops', hour: 12, dark: false, scene: { poopMask: 7 }, pet: (p) => { p.call = 'poop'; p.poops = 3; } },
    { label: 'asleep', hour: 23, dark: false, scene: { state: 'sleep', dim: true }, pet: (p) => { p.asleep = true; p.lightOn = false; } },
    { label: 'cold', hour: 12, dark: false, scene: { state: 'shiver', t: 3 }, pet: (p) => { p.temp = -2; p.call = 'cold'; } },
    { label: 'dim', hour: 12, dark: false, scene: { dim: true } },
  ],
  events: [
    { label: 'eat', hour: 12, dark: false, scene: { state: 'eat', t: 1, props: [{ g: 'food:meat', x: 40, y: 51, n: 1, side: 1 }] } },
    { label: 'play', hour: 12, dark: false, scene: { state: 'play', t: 2, props: [{ g: 'ball', x: 44, y: 51 }] } },
    { label: 'train', hour: 12, dark: false, scene: { state: 'train', t: 2, props: [{ g: 'dumbbell', x: 42, y: 53 }] } },
    { label: 'battle', hour: 12, dark: false, scene: { state: 'battle', props: [{ g: 'foe', x: 40, y: 44, n: 40 }, { g: 'spark', x: 38, y: 30 }] } },
    { label: 'clean', hour: 12, dark: false, scene: { state: 'react', t: 1, poopMask: 1, props: [{ g: 'broom', x: 40, y: 51 }] } },
    { label: 'greet', hour: 12, dark: false, scene: { state: 'greet', t: 2, pops: [{ g: 'heart', x: 20, y: 16, age: 2, life: 10 }, { g: 'note', x: 40, y: 18, age: 0, life: 6 }, { g: 'smile', x: 30, y: 12, age: 0, life: 6 }] } },
  ],
  props: [
    { label: 'food', hour: 12, dark: false, scene: { props: [{ g: 'food:meat', x: 4, y: 51 }, { g: 'food:veggie', x: 18, y: 51 }, { g: 'food:pasta', x: 32, y: 51 }, { g: 'food:snack', x: 46, y: 51 }, { g: 'dot', x: 56, y: 40 }] } },
    { label: 'tools', hour: 12, dark: false, scene: { props: [{ g: 'broom', x: 4, y: 51 }, { g: 'dumbbell', x: 18, y: 53 }, { g: 'syringe', x: 34, y: 51 }, { g: 'ball', x: 48, y: 51 }, { g: 'shell', x: 8, y: 20 }, { g: 'glint', x: 30, y: 20 }, { g: 'dropS', x: 40, y: 20 }, { g: 'flakeS', x: 50, y: 20 }] } },
  ],
};
const sc = SCEN[process.env.SCEN || 'base'];
const out: unknown[] = [];
for (const id of ids) {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error('unknown species ' + id);
  for (const v of sc) for (const px of [64, 96] as const) {
    const pet = newPet(T, { seed: 7 });
    forceSpecies(pet, id);
    pet.named = true; pet.hunger = 3; pet.happy = 3; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
    v.pet?.(pet);
    const sc0 = initScene(pet, T, v.hour);
    const s: Scene = { ...sc0, state: 'idle', x: 12, facing: 1, still: true, dim: false, weather: v.rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour: v.hour, minute: 0, t: 0, nowMs: T + 4200, ...v.scene };
    const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: s, look: px === 96 ? 'technicolor' : undefined });
    const frame = buildFrame(r, { mode: 'technicolor', dark: v.dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    out.push({ id, fam: sp.family, stage: sp.stage, label: `${px} ${v.label}`, frame, ground: screenColors('technicolor', v.dark).ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
