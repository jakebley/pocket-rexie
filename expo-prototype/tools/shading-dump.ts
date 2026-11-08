// Dumps real renderer frames (renderScreen + buildFrame) of chosen species for the shading contact sheets. Used by tools/shading-sheets.js:
//   tsx tools/shading-dump.ts out.json species_a species_b ...
import { forceSpecies, newPet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { TICK_MS, initScene, type Scene } from '../src/ui/scene';
import { renderScreen } from '../src/ui/screens';

declare const require: (m: string) => any;
declare const process: { argv: string[] };
const { writeFileSync } = require('fs');
const T = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const ids = process.argv.slice(3);
// [label, hour, rain, dark appearance]
const VARIANTS: [string, number, boolean, boolean][] = [['day', 12, false, false], ['dusk', 19, false, false], ['night', 23, false, false], ['dark day', 12, false, true], ['dark night', 23, false, true]];

const out: unknown[] = [];
for (const id of ids) {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error('unknown species ' + id);
  for (const [label, hour, rain, dark] of VARIANTS) {
    const pet = newPet(T, { seed: 7 });
    forceSpecies(pet, id);
    pet.named = true; pet.hunger = 3; pet.happy = 3; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
    const sc0 = initScene(pet, T, hour);
    const sc: Scene = { ...sc0, state: 'idle', x: 16, facing: 1, still: true, dim: false, weather: rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T + 4200 };
    const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc });
    const frame = buildFrame(r, { mode: 'technicolor', dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    const sc2 = screenColors('technicolor', dark);
    out.push({ id, fam: sp.family, stage: sp.stage, label, frame, ground: sc2.ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
