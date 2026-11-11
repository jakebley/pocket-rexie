// Pets only: the shaded 32x32 sprite on the 64 grid next to the shaded 48x48 Scale3x sprite on the 96 grid (same JSON as shading-dump.ts).
//   tsx tools/pet96-dump.ts out.json species_a ...      (used with DUMP=pet96-dump.ts node tools/shading-sheets.js)
import { SPECIES } from '../src/core/speciesData';
import { Buf, scale3xCached } from '../src/ui/pixel';
import { bodyOf, buildFrame } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { shadedPetLayers } from '../src/ui/shading';
import type { Line } from '../src/ui/layers';

declare const require: (m: string) => any;
declare const process: { argv: string[] };
const { writeFileSync } = require('fs');
const ids = process.argv.slice(3);
const out: unknown[] = [];
for (const id of ids) {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error('unknown ' + id);
  for (const dark of [false, true]) for (const [n, label] of [[64, '32'], [96, '48']] as const) {
    const b = new Buf(n);
    const rows = n === 64 ? sp.hiFrames[0] : scale3xCached(sp.frames[0]);
    const sz = rows.length;
    b.layers(shadedPetLayers(rows, sp.family), sz, (n - sz) >> 1, n - sz - 4);
    const frame = buildFrame({ buf: b, dark: false, sky: { phase: 'day', rain: false, dim: false, biome: 'meadow' } }, { mode: 'technicolor', dark, line: sp.line as Line, bodyHex: bodyOf({ species: id } as any) });
    out.push({ id, fam: sp.family, stage: sp.stage, label: `${label}${dark ? ' dark' : ''}`, frame, ground: screenColors('technicolor', dark).ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
