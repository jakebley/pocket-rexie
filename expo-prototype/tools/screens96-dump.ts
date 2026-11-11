// Real renderer frames of the text screens at 96 (native layout) and the old 3/2 upscale, for tools/screens96-sheets.js.
//   node tools/screens96-sheets.js out.png "title" family:screen ...   (screen names: see test/screens96-fixtures.ts)
import { buildFrame, bodyOf, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { LAYOUT96 } from '../src/ui/layout96';
import { renderScreen } from '../src/ui/screens';
import { fixtures } from '../test/screens96-fixtures';

declare const require: (m: string) => any;
declare const process: { argv: string[]; env: Record<string, string | undefined> };
const { writeFileSync } = require('fs');
const saved = { ...LAYOUT96 };
const out: unknown[] = [];
const dark = process.env.DARK === '1';
for (const spec of process.argv.slice(3)) {
  const [fam, scr] = spec.split(':');
  const fx = fixtures(fam).find((f) => f.name === scr);
  if (!fx) throw new Error('no fixture ' + spec);
  for (const variant of (process.env.OLD === '0' ? ['new'] : ['old', 'new'])) {
    for (const k of Object.keys(LAYOUT96)) delete (LAYOUT96 as Record<string, unknown>)[k];
    if (variant === 'new') Object.assign(LAYOUT96, saved);
    const r = renderScreen(fx.ctx);
    const frame = buildFrame(r, { mode: 'technicolor', dark, line: lineOf(fx.ctx.pet), bodyHex: bodyOf(fx.ctx.pet) });
    out.push({ id: spec, label: variant, frame, ground: screenColors('technicolor', dark).ground });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
