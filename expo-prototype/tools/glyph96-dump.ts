// Dumps the 96 glyph sets for tools/glyph96-sheets.js
import { THEMES96, THEMES96 as T } from '../src/core/minigames/themes96';
declare const require: (m: string) => any;
declare const process: { argv: string[] };
void T;
const out = Object.values(THEMES96).map((t) => ({ family: t.family, groups: [t.good, [t.bonus], t.bad, t.obstacles, t.symbols] }));
require('fs').writeFileSync(process.argv[2], JSON.stringify(out));
