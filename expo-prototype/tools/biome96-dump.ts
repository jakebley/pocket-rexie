// Frames of the Technicolor 96 home scene for the biome sheets (tools/biome96-sheets.sh): one entry per (species, phase label), 96 only.
//   DUMP=biome96-dump.ts [X=12] [T=0] node tools/shading-sheets.js out.png "title" species ...
import { forceSpecies, newPet } from '../src/core/pet';
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
const X = Number(process.env.X ?? 12), NOW = T + Number(process.env.T ?? 4200);
const V = [
  { label: 'dawn', hour: 6, dark: false, rain: false }, { label: 'day', hour: 12, dark: false, rain: false }, { label: 'dusk', hour: 19, dark: false, rain: false },
  { label: 'night', hour: 23, dark: false, rain: false }, { label: 'rain', hour: 12, dark: false, rain: true },
  { label: 'dark day', hour: 12, dark: true, rain: false }, { label: 'dark night', hour: 23, dark: true, rain: false },
];
const out: unknown[] = [];
for (const id of ids) {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error('unknown species ' + id);
  for (const v of V) {
    const pet = newPet(T, { seed: 7 });
    forceSpecies(pet, id);
    pet.named = true; pet.hunger = 3; pet.happy = 3; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
    const s: Scene = { ...initScene(pet, T, v.hour), state: 'idle', x: X, facing: 1, still: false, dim: false, weather: v.rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour: v.hour, minute: 0, t: 0, nowMs: NOW };
    const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: s, look: 'technicolor' });
    const frame = buildFrame(r, { mode: 'technicolor', dark: v.dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    out.push({ id, fam: sp.family, stage: sp.stage, label: v.label, frame, ground: screenColors('technicolor', v.dark).ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
