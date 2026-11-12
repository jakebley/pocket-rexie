import { SPECIES } from '../expo-prototype/src/core/speciesData';
import { shadedPetLayers } from '../expo-prototype/src/ui/shading';
import { scale3x } from '../expo-prototype/src/ui/pixel';
// default: the 32x32 hiFrames (Traditional / 64 grid) -> Tests/ShadingGolden.swift
// `96`:   the 48x48 Scale3x frames (Technicolor / 96 grid)  -> Tests/ShadingGolden96.swift
const flip = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
const out: string[] = [];
const big = process.argv[2] === '96';
for (const sp of SPECIES) (big ? sp.frames.map(scale3x) : sp.hiFrames).forEach((fr, fi) => [fr, flip(fr)].forEach((rows, m) => {
  const L = shadedPetLayers(rows, sp.family);
  let h = 0x811c9dc5;
  for (const v of L) { h ^= v; h = Math.imul(h, 0x01000193) >>> 0; }
  out.push(`${sp.id}|${fi}|${m}|${h.toString(16)}`);
}));
console.log(out.join('\n'));
