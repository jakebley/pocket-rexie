// Real 96 renderer frames of the biome backdrops for the per-biome sheets (tools/biomes96-sheets.sh). Used with
//   DUMP=biomes96-dump.ts [SCEN=base|anim|pos|empty] node tools/shading-sheets.js out.png "title" species ...
// base: day dusk night rain dark day dark night; anim: not still, three clock times (day, dusk, night); pos: pet left / right (day, night);
// empty: the same as base but with the pet far to the right (scenery check)
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
interface Sc { label: string; hour: number; dark: boolean; rain?: boolean; scene?: Partial<Scene> }
const SCEN: Record<string, Sc[]> = {
  base: [
    { label: 'day', hour: 12, dark: false }, { label: 'dusk', hour: 19, dark: false }, { label: 'night', hour: 23, dark: false },
    { label: 'rain', hour: 12, dark: false, rain: true }, { label: 'dark day', hour: 12, dark: true }, { label: 'dark night', hour: 23, dark: true },
  ],
  anim: [
    { label: 'day a', hour: 12, dark: false, scene: { still: false, nowMs: T + 0 } }, { label: 'day b', hour: 12, dark: false, scene: { still: false, nowMs: T + 2500 } },
    { label: 'dusk a', hour: 19, dark: false, scene: { still: false, nowMs: T + 1000 } }, { label: 'dusk b', hour: 19, dark: false, scene: { still: false, nowMs: T + 3500 } },
    { label: 'night a', hour: 23, dark: false, scene: { still: false, nowMs: T + 1500 } }, { label: 'night b', hour: 23, dark: false, scene: { still: false, nowMs: T + 5000 } },
  ],
  pos: [
    { label: 'day L', hour: 12, dark: false, scene: { x: 0 } }, { label: 'day R', hour: 12, dark: false, scene: { x: 30 } },
    { label: 'night L', hour: 23, dark: false, scene: { x: 0 } }, { label: 'night R', hour: 23, dark: false, scene: { x: 30 } },
    { label: 'dawn', hour: 6, dark: false }, { label: 'dark dusk', hour: 19, dark: true },
  ],
};
const sc = SCEN[process.env.SCEN || 'base'];
const out: unknown[] = [];
for (const id of ids) {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error('unknown species ' + id);
  for (const v of sc) {
    const pet: Pet = newPet(T, { seed: 7 });
    forceSpecies(pet, id);
    pet.named = true; pet.hunger = 3; pet.happy = 3; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
    const sc0 = initScene(pet, T, v.hour);
    const s: Scene = { ...sc0, state: 'idle', x: 12, facing: 1, still: true, dim: false, weather: v.rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour: v.hour, minute: 0, t: 0, nowMs: T + 4200, ...v.scene };
    const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: s, look: 'technicolor' });
    const frame = buildFrame(r, { mode: 'technicolor', dark: v.dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    out.push({ id, fam: sp.family, stage: sp.stage, label: v.label, frame, ground: screenColors('technicolor', v.dark).ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
