import { SPECIES } from '../expo-prototype/src/core/speciesData';
import { shadedPetLayers } from '../expo-prototype/src/ui/shading';
const flip = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
const out: string[] = [];
for (const sp of SPECIES) sp.hiFrames.forEach((fr, fi) => [fr, flip(fr)].forEach((rows, m) => {
  const L = shadedPetLayers(rows, sp.family);
  let h = 0x811c9dc5;
  for (const v of L) { h ^= v; h = Math.imul(h, 0x01000193) >>> 0; }
  out.push(`${sp.id}|${fi}|${m}|${h.toString(16)}`);
}));
console.log(out.join('\n'));
