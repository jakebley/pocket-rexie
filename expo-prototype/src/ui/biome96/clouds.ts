// Cloud realm (spirits) at 96: a banded pastel sky gradient, a faint rainbow, stars that twinkle by day, tiny floating isles, layered
// puffy cloud banks with sunlit pink fringes and a thick cloud floor, and rising dust sparkles.
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { CLOUDS } from './colorsA';
import { ball, dither, ell, hline, N, px, rnd, stat, tickOf, vline, rect, line, bayer } from './kit';

const K = CLOUDS.c;
const G = 90;

/** a row of puffs along y: highlight on the top left, shade below, an optional sunlit pink fringe */
function puffs(b: Buf, y: number, r: number, seed: number, hi: number, mid: number, shade: number, fringe = 0, fill = true) {
  const step = r * 1.25;
  for (let x = -r; x < N + r; x += step) {
    const i = Math.round(x / step), rr = r * (0.75 + rnd(seed + i) * 0.5), yy = y - rnd(seed + i + 30) * r * 0.9;
    ball(b, x, yy, rr, rr * 0.82, shade, mid, hi);
    if (fringe) for (let a = 0; a < 5; a++) { const ang = Math.PI * (1.1 + a * 0.18); px(b, x + Math.cos(ang) * rr * 0.95, yy + Math.sin(ang) * rr * 0.8, fringe); }
  }
  if (fill) rect(b, 0, Math.round(y), N, G - Math.round(y) + 6, mid);
}
function back(b: Buf) {
  // sky gradient: dithered transitions between the bands
  const edges: [number, number][] = [[40, K.band1], [54, K.band2], [66, K.band3], [77, K.band4]];
  for (const [e, l] of edges) for (let y = e - 3; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y >= e + 3 ? 1 : (y - (e - 3)) / 6;
    if (bayer(x, y, k)) b.set(x, y, l);
  }
  // rainbow: thin dithered arcs
  const arcs = [K.rbRed, K.rbYel, K.rbGrn, K.rbBlu];
  arcs.forEach((l, i) => {
    const R = 66 - i * 2.6;
    for (let x = 0; x < N; x++) { const dx = x - 44; if (Math.abs(dx) >= R) continue; const y = Math.round(106 - Math.sqrt(R * R - dx * dx)); if (y > 24 && y < 78 && (x + i) % 2 === 0) b.set(x, y, l); if (y > 24 && y < 78 && (x + i) % 3 !== 0) b.set(x, y + 1, l); }
  });
  // floating isles
  for (const [cx, cy] of [[78, 52], [12, 60]] as const) {
    ell(b, cx, cy, 8, 3, K.isle);
    for (let k = 0; k < 6; k++) vline(b, cx - 6 + k * 2, cy + 2, cy + 3 + ((k * 7) % 3 + 2), K.isleDark);
    hline(b, cx - 6, cx + 6, cy - 1, K.isleGrass); hline(b, cx - 4, cx + 4, cy - 2, K.isleGrass);
    ell(b, cx - 2, cy - 5, 2.4, 3, K.isleTree); vline(b, cx - 2, cy - 2, cy - 1, K.isleDark);
    ell(b, cx + 3, cy - 4, 1.8, 2.2, K.isleTree);
  }
  // wisps
  for (const [x, y, l] of [[56, 30, 14], [70, 33, 10], [60, 38, 16], [4, 46, 12]] as const) { hline(b, x, x + l, y, K.cloudMid); hline(b, x + 3, x + l - 2, y + 1, K.cloudShade); }
  // banks: far (deep), middle, and the floor in front
  puffs(b, 78, 9, 3, K.cloudMid, K.cloudShade, K.cloudDeep, 0);
  puffs(b, 83, 8, 19, K.cloudHi, K.cloudMid, K.cloudShade, K.cloudPink);
}
function fore(b: Buf) {
  // the floor: big overlapping puffs; pink on the lit edge, soft shade underneath
  puffs(b, 91, 7, 51, K.cloudHi, K.cloudMid, K.cloudShade, 0);
  rect(b, 0, 93, N, 3, K.cloudShade);
  for (let x = 0; x < N; x++) { b.set(x, 95, K.cloudDeep); if (x % 3 === 0) b.set(x, 94, K.cloudDeep); }
  for (let i = 0; i < 10; i++) { const x = Math.floor(rnd(i + 70) * N); hline(b, x, x + 3, 92 + (i % 2), K.cloudHi); }
}
const TW: [number, number][] = [[20, 28], [34, 34], [46, 26], [8, 40], [58, 50], [30, 56], [88, 62], [16, 60], [64, 18], [74, 40], [52, 44]];
function live(c: Ctx96) {
  const { b, s } = c;
  const T = tickOf(s);
  TW.forEach(([x, y], i) => {
    const ph = ((T >> 2) + i * 3) % 6;
    if (ph === 0) return;
    const big = i % 3 === 0;
    px(b, x, y, K.star);
    if (big && ph !== 1) { px(b, x - 1, y, K.star); px(b, x + 1, y, K.star); px(b, x, y - 1, K.star); px(b, x, y + 1, K.star); if (ph === 3 || ph === 4) { px(b, x - 2, y, K.starW); px(b, x + 2, y, K.starW); px(b, x, y - 2, K.starW); px(b, x, y + 2, K.starW); } }
    else if (ph === 3) { px(b, x - 1, y, K.starW); px(b, x + 1, y, K.starW); }
  });
  // dust sparkles rise from the floor
  for (let i = 0; i < 7; i++) {
    const u = ((T * (1 + (i % 2) * 0.5) * 0.4 + i * 11) % 50);
    px(b, 8 + i * 13 + Math.sin(T / 9 + i) * 3, 88 - u, K.dust);
  }
}
export const clouds96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'back', back); live(c); },
  fore: (c) => { stat(c, 'fore', fore); },
};
void dither; void line; void ball;
