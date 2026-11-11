// Ember realm (spirits on the imp, horn and soot lines) at 96: a glowing haze at the horizon, far volcanoes with lava streams and a
// smoking crater, rock spires with glowing cracks, a cracked floor with lava veins, rocks, ash drifts and bones. Embers rise, ash
// falls, the lava flickers and the smoke drifts.
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { EMBERS } from './colorsA';
import { ball, bayer, disc, ell, hline, line, N, px, rnd, stat, tickOf, vline, ridge, rect } from './kit';

const K = EMBERS.c;
const G = 90;

function spire(b: Buf, cx: number, w: number, h: number, seed: number, flip: number) {
  for (let y = G - h; y < G; y++) {
    const t = (y - (G - h)) / h, hw = w * (0.18 + t * 0.82) + Math.sin(y * 0.7 + seed) * 0.8;
    hline(b, Math.round(cx - hw), Math.round(cx + hw), y, K.rock);
    b.set(Math.round(cx - hw * flip), y, K.rockEdge); b.set(Math.round(cx - hw * flip) + flip, y, K.rockLight);
    b.set(Math.round(cx + hw * flip), y, K.rockDark); b.set(Math.round(cx + hw * flip) - flip, y, K.rockDark);
  }
  for (let i = 0; i < 5; i++) { const y = G - h + 6 + Math.floor(rnd(seed + i) * (h - 10)); const x = cx + Math.round((rnd(seed + i + 20) - 0.5) * w); vline(b, x, y, y + 3 + (i % 3), K.crack); }
}
function crackLine(b: Buf, x0: number, y0: number, x1: number, y1: number, l: number) {
  line(b, x0, y0, x1, y1, l);
}
function back(b: Buf) {
  // glow at the horizon: dither bands
  for (let y = 56; y < G; y++) for (let x = 0; x < N; x++) {
    const k = (y - 56) / 34;
    if (bayer(x, y, k)) b.set(x, y, k > 0.55 ? K.glowHaze2 : K.glowHaze);
  }
  // far volcano with a lava crater and streams
  const vtop = (x: number) => 54 + Math.abs(x - 66) * 0.55;
  ridge(b, (x) => x > 40 && x < 92 ? vtop(x) : 99, G, K.rockFar);
  ridge(b, (x) => x < 34 ? 64 + Math.abs(x - 12) * 0.5 : 99, G, K.rockFar2);
  hline(b, 62, 70, 54, K.lava); hline(b, 63, 69, 55, K.lavaHot);
  for (const [x0, x1] of [[63, 58], [68, 73], [66, 66]] as const) crackLine(b, x0, 56, x1, 76, K.lava);
  for (let x = 40; x < 92; x++) if (Math.round(vtop(x)) < 70 && x % 3 === 0) b.set(x, Math.round(vtop(x)), K.rockLight);
  // a far lava river
  for (let x = 0; x < N; x++) { const y = 82 + Math.round(Math.sin(x / 6) * 1.5); b.set(x, y, K.lava); if (x % 2) b.set(x, y + 1, K.emberDim); }
  // spires, big ones at the edges
  spire(b, 5, 8, 52, 1, 1); spire(b, 17, 6, 34, 4, 1); spire(b, 90, 8, 48, 7, -1); spire(b, 79, 5, 30, 9, -1); spire(b, 44, 5, 20, 12, 1);
  // glowing cracks in the spires
  for (const [x0, y0, x1, y1] of [[4, 52, 6, 62], [6, 62, 3, 70], [3, 70, 6, 80], [90, 48, 88, 58], [88, 58, 91, 66], [91, 66, 89, 76], [17, 66, 18, 74], [79, 66, 78, 72]] as const) crackLine(b, x0, y0, x1, y1, K.glowRock);
  // cinders on the spire tops
  for (const [x, y] of [[5, 40], [90, 44], [17, 58]]) { px(b, x, y, K.emberDim); px(b, x + 1, y + 1, K.ember); }
}
function fore(b: Buf) {
  // floor: dark ash soil with a ragged lit edge and lava veins
  rect(b, 0, G, N, 6, K.soil);
  for (let x = 0; x < N; x++) { b.set(x, G, x % 3 ? K.soilLight : K.rock); if (x % 4 === 0) b.set(x, G + 1, K.soilLight); }
  for (let i = 0; i < 46; i++) { const x = Math.floor(rnd(i + 5) * N), y = G + 2 + Math.floor(rnd(i + 55) * 4); hline(b, x, x + 1 + (i % 3), y, i % 3 ? K.soilDark : K.soilLight); }
  for (const x of [8, 30, 55, 80]) { for (let k = 0; k < 6; k++) b.set(x + (k % 2 ? 1 : 0) + (k >> 2), G + 1 + k * 0.9, K.crack); }
  // rocks and ash drifts
  for (const [x, r] of [[13, 4], [38, 3], [60, 5], [86, 3.5]] as const) { ball(b, x, G - 1, r + 1, r * 0.8, K.rockDark, K.rock, K.rockLight); hline(b, x - 2, x + 2, G - 1, K.rockDark); px(b, x + 1, G - 2 - r * 0.6, K.glowRock); }
  for (const [x, w] of [[24, 8], [70, 9], [48, 6]] as const) { ell(b, x, G - 1, w / 2, 2, K.ash); hline(b, x - w / 2 + 1, x + 1, G - 2, K.ashLight); hline(b, x, x + w / 2 - 1, G, K.ashDark); }
  // bones
  line(b, 44, G - 2, 50, G - 4, K.bone); px(b, 43, G - 3, K.bone); px(b, 43, G - 1, K.bone); px(b, 51, G - 5, K.bone); px(b, 51, G - 3, K.bone);
  disc(b, 92, G - 3, 2.2, K.bone); px(b, 91, G - 3, K.crack); px(b, 93, G - 3, K.crack);
}
const VEINS: [number, number][] = [[8, 92], [30, 93], [55, 92], [80, 93], [20, 94], [66, 94]];
function live(c: Ctx96) {
  const { b, s } = c;
  const T = tickOf(s), t = s.still ? 0 : s.nowMs / 1000;
  // lava veins in the floor flicker between orange and yellow
  VEINS.forEach(([x, y], i) => {
    const hot = ((T >> 1) + i) % 3 === 0;
    hline(b, x, x + 4, y, hot ? K.lavaHot : K.lava); px(b, x + 5, y + 1, K.emberDim); px(b, x - 1, y - 1, hot ? K.lava : K.emberDim);
  });
  // crater smoke drifts up and to the right
  for (let i = 0; i < 6; i++) {
    const u = ((t * 3 + i * 7) % 42) / 42, y = Math.round(52 - u * 34), x = Math.round(66 + u * 14 + Math.sin(t + i) * 2), r = 1.5 + u * 3;
    ell(b, x, y, r, r * 0.8, i % 2 ? K.smokeA : K.smokeB);
  }
  // rising embers
  for (let i = 0; i < 12; i++) {
    const u = ((T * (1 + (i % 3) * 0.5) * 0.5 + i * 13) % 66), y = Math.round(88 - u);
    const x = Math.round(i * 8 + 3 + Math.sin(T / 7 + i) * 2.5);
    b.set(x, y, u > 40 ? K.emberDim : K.ember); if (i % 4 === 0 && u < 40) b.set(x + 1, y, K.lavaHot);
  }
  // falling ash
  for (let i = 0; i < 10; i++) b.set((i * 9 + (T >> 2)) % N, 20 + (((T >> 1) + i * 13) % 66), i % 2 ? K.ash : K.ashLight);
}
export const ember96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'back', back); live(c); },
  fore: (c) => { stat(c, 'fore', fore); },
};
