// Backyard (cat) at 96: a neighbour's house with a shingled roof, a brick chimney that smokes, windows that light up at dusk and night
// and a door with a porch lamp, a picket fence made of single boards with rails and nails, a garden bed with flowers, a flowerpot
// and a ball of yarn. Static art cached; smoke and a flickering window per frame.
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import type { Phase } from '../scene';
import { YARD } from './colorsA';
import { ball, clump, dither, ell, hline, line, N, px, rnd, spr, stat, tickOf, vline, rect } from './kit';

const K = YARD.c;
const G = 90;
const WIN: [number, number][] = [[52, 44], [67, 44]];

function house(b: Buf, phase: Phase) {
  // walls with siding lines
  rect(b, 46, 40, 50, 24, K.wall);
  for (let y = 43; y < 62; y += 3) hline(b, 46, 95, y, K.wallShade);
  vline(b, 46, 40, 63, K.wallShade); hline(b, 46, 95, 40, K.trim);
  // roof: shallow gable from the apex at x 76 down to the eaves, shingle rows with offset joints
  for (let y = 24; y < 41; y++) {
    const half = Math.round((y - 24) * 1.9 + 1), a = 76 - half, z = Math.min(95, 76 + half);
    hline(b, Math.max(44, a), z, y, K.roof);
    const row = y - 24;
    if (row % 3 === 2) hline(b, Math.max(44, a), z, y, K.roofDark);
    else for (let x = Math.max(44, a); x <= z; x++) if ((x + (row >> 1) * 3) % 6 === 0) b.set(x, y, K.roofDark);
    if (row % 3 === 0 && a >= 44) { b.set(a, y, K.roofLight); b.set(a + 1, y, K.roofLight); }
  }
  hline(b, 44, 95, 41, K.roofDark); hline(b, 44, 95, 42, K.roofDark);
  // chimney
  rect(b, 56, 18, 7, 22, K.brick);
  for (let y = 19; y < 40; y += 3) { hline(b, 56, 62, y, K.brickDark); for (let x = 57 + ((y / 3) & 1) * 2; x < 63; x += 4) b.set(x, y + 1, K.brickDark); }
  rect(b, 55, 16, 9, 3, K.trim); hline(b, 55, 63, 18, K.wallShade);
  // windows: glass by day, warm light at dusk and night
  const lit = phase === 'dusk' || phase === 'night';
  for (const [x, y] of WIN) {
    rect(b, x - 1, y - 1, 11, 12, K.trim);
    rect(b, x, y, 9, 10, lit ? K.window : K.glass);
    if (lit) { rect(b, x, y + 6, 9, 4, K.windowHi); } else { hline(b, x + 1, x + 3, y + 1, K.trim); hline(b, x + 1, x + 2, y + 2, K.trim); }
    vline(b, x + 4, y, y + 9, K.trim); hline(b, x, x + 8, y + 4, K.trim);
    hline(b, x - 2, x + 10, y + 11, K.woodDark); hline(b, x - 2, x + 10, y + 12, K.wallShade);
    // curtains
    vline(b, x, y, y + 5, K.pink); vline(b, x + 1, y, y + 3, K.pink); vline(b, x + 8, y, y + 5, K.pink); vline(b, x + 7, y, y + 3, K.pink);
  }
  // door with a little window and a porch lamp
  rect(b, 82, 45, 10, 18, K.trim); rect(b, 83, 46, 8, 17, K.door);
  rect(b, 85, 48, 4, 4, lit ? K.window : K.glass); hline(b, 83, 90, 56, K.woodDark); px(b, 89, 56, K.yellow);
  rect(b, 93, 46, 2, 3, lit ? K.porch : K.wallShade);
  if (lit) dither(b, 90, 42, 6, 10, 0.35, K.porch);
  // foundation row
  hline(b, 46, 95, 63, K.woodDark);
}
function fence(b: Buf) {
  // rails behind the boards
  rect(b, 0, 66, N, 3, K.woodDark); rect(b, 0, 80, N, 3, K.woodDark);
  for (let x0 = 1; x0 < N; x0 += 6) {
    const top = 58 + (x0 / 6) % 3 === 0 ? 0 : 0;
    for (let y = 58 + top; y < G; y++) {
      if (y === 58 + top) { b.set(x0 + 1, y, K.wood); b.set(x0 + 2, y, K.wood); continue; }
      if (y === 59 + top) { hline(b, x0, x0 + 3, y, K.wood); continue; }
      hline(b, x0, x0 + 3, y, K.wood);
      b.set(x0, y, K.woodLight);
      b.set(x0 + 3, y, K.woodDark);
    }
    // grain streaks and a knot
    for (let i = 0; i < 3; i++) { const y = 62 + Math.floor(rnd(x0 * 3 + i) * 24); vline(b, x0 + 1 + (i & 1), y, y + 3 + i, K.woodDark); }
    if (x0 % 4 === 1) { px(b, x0 + 2, 74, K.woodDark); px(b, x0 + 1, 75, K.woodDark); }
    // nails on the rails
    for (const ry of [67, 81]) { px(b, x0 + 1, ry, K.woodLight); px(b, x0 + 2, ry, K.soilDark); }
  }
  hline(b, 0, N - 1, 69, K.soilDark); hline(b, 0, N - 1, 83, K.soilDark);
}
function fore(b: Buf) {
  // grass strip and soil with a couple of stones
  hline(b, 0, N - 1, G, K.grassDark);
  for (let x = 0; x < N; x++) { b.set(x, G, K.grass); if (x % 2) b.set(x, G + 1, K.grassDark); else b.set(x, G + 1, K.grass); }
  rect(b, 0, G + 2, N, 4, K.soil);
  for (let i = 0; i < 40; i++) { const x = Math.floor(rnd(i + 11) * N), y = G + 2 + Math.floor(rnd(i + 51) * 4); hline(b, x, x + 1 + (i % 2), y, i % 3 ? K.soilDark : K.wood); }
  for (const x of [28, 51, 74]) { ell(b, x, G + 3, 3, 1.4, K.woodLight); hline(b, x - 2, x + 3, G + 4, K.woodDark); }
  // tall grass at the fence foot
  for (let x = 0; x < N; x += 2) { const h = 2 + Math.floor(rnd(x + 5) * 5); vline(b, x, G - h, G - 1, rnd(x) > 0.5 ? K.grass : K.grassDark); b.set(x, G - h, K.grassLight); }
  // garden bed on the right: a timber frame, soil, bushes and blooms
  rect(b, 58, G - 6, 36, 6, K.soil); hline(b, 57, 94, G - 7, K.woodDark); hline(b, 57, 94, G - 1, K.woodDark); vline(b, 57, G - 7, G - 1, K.woodDark); vline(b, 94, G - 7, G - 1, K.woodDark);
  for (let x = 59; x < 94; x += 3) px(b, x, G - 4 + (x % 2), K.soilDark);
  for (const cx of [66, 78, 89]) clump(b, cx, G - 11, 6, cx, K.bush, K.grass, K.grassLight, 6);
  const blooms: [number, number, number][] = [[62, G - 15, K.pink], [70, G - 9, K.yellow], [74, G - 17, K.white], [82, G - 8, K.pink], [86, G - 16, K.purple], [91, G - 11, K.yellow], [66, G - 18, K.purple], [80, G - 15, K.yellow]];
  for (const [x, y, c] of blooms) { vline(b, x, y + 2, G - 7, K.grassDark); px(b, x - 1, y + 1, c); px(b, x + 1, y + 1, c); px(b, x, y, c); px(b, x, y + 2, c); px(b, x, y + 1, K.yellow); }
  // flowerpot with a small plant at the left
  spr(b, ['.ggg.', 'ggGgg', '.gGg.', '.ppp.', 'pPPPp', '.PPP.', '.PPP.', 'ppppp'], 3, G - 8, { g: K.grassLight, G: K.grass, p: K.pot, P: K.soil });
  px(b, 5, G - 9, K.pink); px(b, 4, G - 10, K.pink); px(b, 6, G - 10, K.pink); px(b, 5, G - 11, K.pink);
  // ball of yarn with a loose thread
  ball(b, 40, G - 3, 4, 4, K.yarnDark, K.yarn, K.pink);
  line(b, 37, G - 5, 42, G - 2, K.yarnDark); line(b, 38, G - 2, 43, G - 5, K.yarnDark);
  for (let x = 44; x < 56; x++) px(b, x, G - 1 + Math.round(Math.sin(x / 2) * 0.8), K.yarn);
}
function live(c: Ctx96) {
  const { b, s, phase } = c;
  const T = tickOf(s), t = s.still ? 0 : s.nowMs / 1000;
  // chimney smoke: puffs rise, widen and drift right
  const puffs = phase === 'night' ? 3 : 5;
  for (let i = 0; i < puffs; i++) {
    const u = ((t * 4 + i * 9) % 44) / 44, y = Math.round(15 - u * 18), x = Math.round(59 + u * 10 + Math.sin(t + i * 2) * 1.2), r = 1.3 + u * 2.2;
    if (u < 0.8) ell(b, x, y, r, r * 0.8, K.smoke);
  }
  // the window next to the door flickers at night (a television)
  if (phase === 'night' || phase === 'dusk') {
    const f = (T >> 1) % 5;
    for (let i = 0; i < 9; i++) { if ((i + f) % 3 === 0) b.set(WIN[1][0] + i, WIN[1][1] + 7, K.glass); }
    px(b, WIN[0][0] + 4, WIN[0][1] + 5 + (f & 1), K.windowHi);
  }
}
export const yard96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'house', (b, ph) => house(b, ph)); stat(c, 'fence', fence); live(c); },
  fore: (c) => { stat(c, 'fore', fore); },
};
