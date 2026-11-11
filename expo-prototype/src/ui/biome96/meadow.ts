// Meadow (dino) at 96: layered hazy hills with tiny far trees, a barn and a fence, a field band, a finer ground with individual grass
// blades, flowers, stones and fireflies at dusk. Static art cached; grass sway, drifting seeds and fireflies per frame.
import { FRAME_MS } from '../pose';
import { Layer } from '../layers';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { MEADOW } from './colorsA';
import { clump, ball, disc, ell, hline, line, N, px, rnd, spr, stat, tickOf, vline, ridge } from './kit';

const K = MEADOW.c;
const G = 90;
const farTop = (x: number) => 63 + 5 * Math.sin(x / 14 + 0.5) + 2.5 * Math.sin(x / 5.1 + 1);
const midTop = (x: number) => 72 + 4.5 * Math.sin(x / 10 + 2) + 2 * Math.sin(x / 3.6);
const nearTop = (x: number) => 83 + 2 * Math.sin(x / 7 + 1) + Math.sin(x / 2.3);

const BARN = ['....RRRR....', '..RRRRRRRR..', 'RRRRRRRRRRRR', '.bbbbbbbbbb.', '.bbbwbbwbbb.', '.bbbbDDbbbb.', '.bbbbDDbbbb.'];
function tree(b: import('../pixel').Buf, x: number, y: number, r: number, seed: number) {
  vline(b, x, y - 1, y + 2 + (r >> 1), K.trunk); if (r > 3) vline(b, x + 1, y, y + 2 + (r >> 1), K.trunk);
  clump(b, x, y - r + 1, r, seed, K.treeDark, K.treeMid, K.treeLight, 6);
}

function back(b: import('../pixel').Buf) {
  ridge(b, (x) => 52 + 6 * Math.abs(Math.sin(x / 17 + 1)) + 2 * Math.sin(x / 4.3), G, K.mount);
  ridge(b, farTop, G, K.hillFar);
  for (let i = 0; i < 9; i++) { const x = 4 + i * 11 + ((i * 5) % 4); tree(b, x, Math.round(farTop(x)) + 1, 2, 10 + i * 7); }
  spr(b, BARN, 70, Math.round(farTop(76)) - 1, { R: K.barnRoof, b: K.barn, w: K.white, D: K.trunk });
  ridge(b, midTop, G, K.hillMid, K.hillNear);
  // crop rows on the middle hill
  for (let x = 20; x < 58; x++) { const t = Math.round(midTop(x)); for (let y = t + 3; y < G - 4; y += 4) if ((x + y) % 5 !== 0) b.set(x, y, K.hillNear); }
  // fence along the right shoulder
  for (let x = 60; x < N; x += 5) { const t = Math.round(midTop(x)); vline(b, x, t - 3, t + 1, K.fence); b.set(x, t - 3, K.fenceDark); }
  for (let x = 60; x < N; x++) { b.set(x, Math.round(midTop(x)) - 2, K.fence); }
  // shaded hollows
  for (let x = 0; x < N; x++) { const t = Math.round(midTop(x)); if (x % 3 !== 0) b.set(x, t + 1, K.hillShade); }
  tree(b, 6, Math.round(midTop(6)) + 3, 5, 3); tree(b, 90, Math.round(midTop(90)) + 3, 5, 11); tree(b, 12, Math.round(midTop(12)) + 5, 4, 29);
}

const DAISY = ['.w.', 'wcw', '.w.'];
const POPPY = ['rrr', 'rdr', 'rrr'];
function flower(b: import('../pixel').Buf, x: number, h: number, kind: number) {
  vline(b, x + 1, G - h + 2, G - 1, K.blade);
  b.set(x, G - 3, K.blade); b.set(x + 2, G - 4, K.blade);
  if (kind === 0) spr(b, DAISY, x, G - h, { w: K.white, c: K.yellow });
  else if (kind === 1) spr(b, POPPY, x, G - h, { r: K.red, d: K.trunk });
  else { px(b, x + 1, G - h + 1, K.purple); px(b, x, G - h + 2, K.purple); px(b, x + 2, G - h + 2, K.purple); px(b, x + 1, G - h, K.purple); px(b, x + 1, G - h + 2, K.yellow); }
}
function fore(b: import('../pixel').Buf) {
  // near meadow band with blade texture
  ridge(b, nearTop, G, K.grassMid, K.grassLight);
  for (let i = 0; i < 70; i++) { const x = Math.floor(rnd(i) * N), y = Math.round(nearTop(x)) + 2 + Math.floor(rnd(i + 70) * 5); vline(b, x, y, y + 1, i % 3 ? K.grassDark : K.grassLight); }
  // bushes at both edges
  clump(b, 5, 83, 8, 5, K.treeDark, K.treeMid, K.treeLight, 9); clump(b, 91, 82, 8, 41, K.treeDark, K.treeMid, K.treeLight, 9);
  for (const [x, y] of [[3, 80], [8, 84], [90, 79], [94, 84]]) px(b, x, y, K.red);
  // ground band: sod edge and soil
  hline(b, 0, N - 1, G, K.grassDark);
  for (let x = 0; x < N; x++) { if (x % 3 !== 1) b.set(x, G + 1, K.grassMid); }
  b.rect(0, G + 2, N, 4, K.soil);
  for (let x = 0; x < N; x += 2) b.set(x + ((x >> 2) & 1), G + 2, K.soilLight);
  for (let i = 0; i < 40; i++) { const x = Math.floor(rnd(i + 200) * N), y = G + 3 + Math.floor(rnd(i + 240) * 3); hline(b, x, x + 1 + (i % 2), y, i % 3 ? K.soilDark : K.soilLight); }
  for (const x of [11, 33, 58, 79]) { ell(b, x, G + 4, 3, 1.3, K.stone); hline(b, x - 2, x + 1, G + 3, K.soilLight); hline(b, x, x + 3, G + 5, K.stoneDark); }
  // flowers and small stones in the grass
  [[2, 9, 0], [14, 7, 1], [22, 8, 2], [41, 6, 0], [50, 9, 1], [64, 7, 2], [74, 9, 0], [86, 6, 1], [92, 8, 2]].forEach(([x, h, k]) => flower(b, x, h, k));
  for (const x of [28, 47, 70]) { ball(b, x, G - 1, 2.6, 1.8, K.stoneDark, K.stone, K.soilLight); }
  // grass blades along the edge (static ones, the swaying tufts are live)
  for (let x = 1; x < N; x += 2) { const h = 2 + Math.floor(rnd(x + 500) * 4); vline(b, x, G - h, G - 1, rnd(x + 9) > 0.5 ? K.grassMid : K.grassDark); if (h > 3) b.set(x, G - h, K.grassLight); }
}

const TUFTS = [7, 19, 31, 44, 56, 68, 80, 92];
function live(c: Ctx96) {
  const { b, s, phase } = c;
  const sw = s.still ? 0 : Math.floor(s.nowMs / (FRAME_MS * 2));
  TUFTS.forEach((x, i) => {
    const lean = ((sw + i) % 2) * 2 - 1;
    for (const [dx, h] of [[0, 6], [2, 8], [4, 5], [-2, 4]] as const) {
      vline(b, x + dx, G - h + 2, G - 1, K.blade);
      b.set(x + dx + (dx % 4 ? lean : -lean), G - h + 1, K.grassLight);
      b.set(x + dx + (dx % 4 ? lean : -lean) * 2, G - h, K.grassLight);
    }
  });
  const T = tickOf(s);
  if (phase === 'day' || phase === 'dawn') {
    for (let i = 0; i < 4; i++) {
      const x = Math.round(((i * 29 + T * 0.35) % (N + 10)) - 5), y = Math.round(54 + i * 6 + Math.sin(T / 6 + i * 2) * 3);
      if (!s.still || i === 0) { b.set(x, y, K.glint); b.set(x + 1, y + 1, K.glint); }
    }
  } else {
    for (let i = 0; i < 9; i++) {
      if (((T >> 2) + i * 3) % 7 === 0) continue;
      const x = Math.round(6 + i * 10 + 4 * Math.sin(T / 9 + i)), y = Math.round(52 + ((i * 7) % 30) + 3 * Math.cos(T / 11 + i * 2));
      b.set(x, y, K.firefly); if (i % 3 === 0) b.set(x + 1, y, K.firefly);
    }
  }
}

export const meadow96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'back', back); },
  fore: (c) => { stat(c, 'fore', fore); live(c); },
};
void Layer; void disc; void line;
