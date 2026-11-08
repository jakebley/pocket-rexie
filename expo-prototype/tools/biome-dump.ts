// Dumps the real renderer's frames (renderScreen + buildFrame) for biome contact sheets. Used by tools/biome-sheets.js:
//   tsx tools/biome-dump.ts out.json
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
const FAMS = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug'];
const ENTRIES: [string, string][] = FAMS.map((f) => [f, SPECIES.find((s) => s.family === f && s.stage === 'adult')!.id]);
ENTRIES.splice(6, 0, ['ember', 'spirits_emberhorn']);
const PHASES: Record<string, [number, boolean]> = { day: [12, false], dusk: [19, false], night: [23, false], rain: [12, true], dawn: [6, false] };

const out: unknown[] = [];
for (const [fam, id] of ENTRIES) {
  for (const mode of ['technicolor', 'traditional'] as const) for (const dark of [false, true]) for (const [ph, [hour, rain]] of Object.entries(PHASES)) {
    const pet = newPet(T, { seed: 7 });
    forceSpecies(pet, id);
    pet.named = true; pet.hunger = 3; pet.happy = 3; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
    const sc0 = initScene(pet, T, hour);
    const sc: Scene = { ...sc0, state: 'idle', x: 16, facing: 1, still: false, dim: false, weather: rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T + 4200 };
    const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc });
    const frame = buildFrame(r, { mode, dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    const sc2 = screenColors(mode, dark);
    out.push({ fam, id, mode, dark, ph, frame, ground: sc2.ground, ink: sc2.ink });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
