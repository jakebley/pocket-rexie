// Woods (fox) at 96: hazy far trunks, big bark trunks with grooves, knots and moss, leaf-cluster canopy with hanging vines, light
// rays, a forest floor of ferns, mushrooms, moss, stones and leaf litter. Fireflies at dusk and night, falling leaves by day.
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { WOODS } from './colorsA';
import { ball, clump, dither, ell, hline, leaf, line, N, px, rnd, spr, stat, tickOf, vline } from './kit';

const K = WOODS.c;
const G = 90;

/** A bark trunk between x0..x1 (inclusive) from y0 down to the floor; the flare near the bottom widens it. */
function trunk(b: Buf, x0: number, x1: number, y0: number, seed: number, flare: 'l' | 'r') {
  for (let y = y0; y < G; y++) {
    const f = Math.max(0, y - 78) * 0.45;
    const a = Math.round(flare === 'r' ? x0 : x0 - f), z = Math.round(flare === 'r' ? x1 + f : x1);
    hline(b, a, z, y, K.trunk);
    b.set(a, y, K.trunkLight); if (z - a > 4) b.set(a + 1, y, K.trunkLight);
    b.set(z, y, K.trunkDark); if (z - a > 4) b.set(z - 1, y, K.trunkDark);
  }
  // bark grooves: vertical dark strokes that start and stop
  for (let i = 0; i < 16; i++) {
    const x = x0 + 2 + Math.floor(rnd(seed + i) * (x1 - x0 - 3)), ys = y0 + Math.floor(rnd(seed + i + 30) * (G - y0 - 14)), len = 5 + Math.floor(rnd(seed + i + 60) * 14);
    for (let y = ys; y < Math.min(G, ys + len); y++) b.set(x + (y % 9 === 0 ? 1 : 0), y, K.trunkDark);
    if (i % 2) vline(b, x + 1, ys + 1, Math.min(G - 1, ys + len - 3), K.trunkLight);
  }
  // knot hole
  const kx = Math.round((x0 + x1) / 2), ky = y0 + 26 + (seed % 7);
  ell(b, kx, ky, 2.2, 3.2, K.trunkDark); ell(b, kx + 0.4, ky + 0.8, 1.2, 2, K.soilDark);
  hline(b, kx - 2, kx + 2, ky - 4, K.trunkLight);
  // moss patches on the shaded side
  for (let i = 0; i < 4; i++) {
    const my = y0 + 12 + i * 14 + Math.floor(rnd(seed + i + 90) * 6), mx = x1 - 3 - Math.floor(rnd(seed + i + 77) * 3);
    ell(b, mx, my, 2.6, 3.4, K.mossDark); ell(b, mx - 0.5, my - 0.7, 1.6, 2.4, K.moss);
    px(b, mx + 2, my + 4, K.moss);
  }
}

function frond(b: Buf, x: number, y: number, len: number, dirx: number, curve: number, dark: number, mid: number, light: number) {
  let cx = x, cy = y, ang = -Math.PI / 2 + dirx * 0.55;
  const n = len;
  for (let i = 0; i < n; i++) {
    ang += curve * 0.07;
    cx += Math.cos(ang); cy += Math.sin(ang);
    b.set(Math.round(cx), Math.round(cy), dark);
    const w = Math.max(1, Math.round((1 - i / n) * 3.2));
    if (i > 1 && i % 2 === 0) for (let k = 1; k <= w; k++) {
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      b.set(Math.round(cx + nx * k), Math.round(cy + ny * k + k * 0.4), k === w ? light : mid);
      b.set(Math.round(cx - nx * k), Math.round(cy - ny * k + k * 0.4), k === w ? light : mid);
    }
  }
}
function vine(b: Buf, x: number, y0: number, len: number, seed: number) {
  let x1 = x;
  for (let i = 0; i < len; i++) {
    x1 = x + Math.round(Math.sin(i / 5 + seed) * 1.6);
    b.set(x1, y0 + i, K.vine);
    if (i % 5 === 3) { const d = (i / 5 + seed) % 2 < 1 ? 1 : -1; leaf(b, x1, y0 + i, x1 + d * 4, y0 + i + 2, 1.4, K.leafMid, K.leafLight); }
  }
  ell(b, x1, y0 + len + 1, 1, 1.6, K.leafLight);
}
const SHROOM = ['..rrr..', '.rrwrr.', 'rwrrrwr', '..sss..', '..sss..', '..sss..'];
const SHROOM_S = ['.rrr.', 'rwrrr', '.sss.', '.sss.'];

function back(b: Buf) {
  // far haze: thin trunks and foliage between the big trunks
  for (const [x, w] of [[26, 4], [47, 3], [63, 4], [74, 3]] as const) {
    for (let y = 28; y < G; y++) hline(b, x, x + w - 1, y, K.farTrunk);
  }
  for (const [cx, cy, r, s] of [[22, 38, 9, 1], [58, 30, 10, 2], [70, 44, 9, 3], [38, 28, 8, 4], [46, 48, 8, 9]] as const) clump(b, cx, cy, r, s * 11, K.farLeaf, K.farLeaf, K.farLeaf, 6);
  // light rays slanting down to the left
  for (const [x0, w] of [[56, 5], [67, 4], [44, 3]] as const) for (let y = 14; y < G; y++) {
    const xs = x0 - Math.round((y - 14) * 0.45);
    for (let i = 0; i < w; i++) if ((xs + i + y) % 2 === 0 && ((y >> 1) + i) % 5 !== 0) b.set(xs + i, y, K.ray);
  }
  // trunks
  trunk(b, 0, 12, 22, 5, 'r');
  trunk(b, 84, 95, 34, 17, 'l');
  // canopy: leaf clusters; a mass on the left under the hearts, the top middle and the right side
  const masses: [number, number, number][] = [[4, 26, 10], [12, 36, 8], [2, 42, 7], [18, 28, 6], [56, 2, 9], [66, 4, 10], [76, 3, 9], [86, 40, 9], [92, 48, 8], [80, 34, 7], [60, 11, 6], [72, 12, 7]];
  masses.forEach(([cx, cy, r], i) => clump(b, cx, cy, r, i * 13 + 5, K.leafDark, K.leaf, K.leafMid, 9));
  masses.forEach(([cx, cy, r], i) => { if (i % 2 === 0) clump(b, cx - 2, cy - 2, r * 0.6, i * 7, K.leaf, K.leafMid, K.leafHi, 5); });
  for (let i = 0; i < 26; i++) { const m = masses[i % masses.length]; px(b, m[0] + Math.round((rnd(i) - 0.5) * m[2] * 1.6), m[1] + Math.round((rnd(i + 40) - 0.5) * m[2] * 1.4), K.leafHi); }
  for (let i = 0; i < 12; i++) { const m = masses[(i * 5) % masses.length]; px(b, m[0] + Math.round((rnd(i + 90) - 0.4) * m[2] * 1.4), m[1] + m[2] * 0.5 + Math.round(rnd(i + 70) * 3), K.leafDark); }
  // hanging vines
  vine(b, 57, 12, 18, 0); vine(b, 68, 14, 24, 1.5); vine(b, 77, 13, 14, 3); vine(b, 20, 33, 18, 2); vine(b, 80, 41, 12, 4);
  // dapple on the far wall of trees
  for (const [x, y] of [[36, 52], [52, 60], [30, 70], [62, 74], [44, 82]]) { dither(b, x - 4, y - 2, 9, 5, 0.45, K.ray); }
}

function fore(b: Buf) {
  // floor: moss on top, soil below with litter
  hline(b, 0, N - 1, G, K.moss);
  for (let x = 0; x < N; x++) { b.set(x, G, (x % 5 === 0) ? K.mossDark : K.moss); if (x % 3 !== 0) b.set(x, G + 1, K.mossDark); }
  b.rect(0, G + 2, N, 4, K.soil);
  for (let i = 0; i < 50; i++) { const x = Math.floor(rnd(i + 300) * N), y = G + 2 + Math.floor(rnd(i + 340) * 4); hline(b, x, x + 1 + (i % 3), y, i % 3 ? K.soilDark : K.litterB); }
  for (let i = 0; i < 16; i++) { const x = Math.floor(rnd(i + 400) * N), y = G + 2 + (i % 3); px(b, x, y, i % 2 ? K.litterA : K.litterC); px(b, x + 1, y, K.litterA); }
  for (const x of [20, 52, 77]) { ell(b, x, G + 3, 3, 1.4, K.stone); hline(b, x - 2, x + 1, G + 2, K.trunkLight); hline(b, x, x + 3, G + 4, K.stoneDark); }
  // ferns in clumps at the edges and one small one in the middle
  for (const [x, s] of [[4, 0], [16, 1], [58, 2], [70, 0], [90, 1]] as const) {
    for (let k = 0; k < 4; k++) frond(b, x + k, G, 11 + ((k * 3 + s) % 5), (k - 1.5) * 0.9, k % 2 ? -1 : 1, K.fernDark, K.fern, K.fernLight);
  }
  frond(b, 38, G, 7, -0.7, 1, K.fernDark, K.fern, K.fernLight); frond(b, 40, G, 6, 0.8, -1, K.fernDark, K.fern, K.fernLight);
  // mushrooms
  const lg = { r: K.shroomRed, w: K.shroomSpot, s: K.shroomStem };
  spr(b, SHROOM, 24, G - 6, lg); spr(b, SHROOM_S, 32, G - 4, lg); spr(b, SHROOM_S, 20, G - 4, lg);
  spr(b, SHROOM, 78, G - 6, lg, true); spr(b, SHROOM_S, 85, G - 4, lg);
  // moss tufts and litter on the floor
  for (const x of [9, 44, 63, 82]) { hline(b, x, x + 5, G - 1, K.moss); hline(b, x + 1, x + 4, G - 2, K.mossDark); px(b, x + 2, G - 3, K.leafHi); }
  for (const x of [2, 29, 47, 66, 88]) { px(b, x, G - 1, K.litterA); px(b, x + 1, G - 1, K.litterC); px(b, x + 2, G - 2, K.litterB); }
  // a fallen branch
  line(b, 50, G - 1, 62, G - 3, K.trunk); line(b, 50, G - 2, 62, G - 4, K.trunkLight); px(b, 55, G - 5, K.leafMid); px(b, 56, G - 5, K.leafLight);
}

function live(c: Ctx96) {
  const { b, s, phase } = c;
  const T = tickOf(s);
  if (phase === 'dusk' || phase === 'night') {
    for (let i = 0; i < 12; i++) {
      if (((T >> 2) + i * 3) % 6 === 0) continue;
      const x = Math.round(6 + i * 7.5 + 5 * Math.sin(T / 9 + i)), y = Math.round(44 + ((i * 7) % 40) + 4 * Math.cos(T / 11 + i * 2));
      b.set(x, y, K.firefly); if (i % 3 === 0) b.set(x + 1, y, K.firefly);
    }
  } else if (c.phase === 'day' || c.phase === 'dawn') {
    // dust motes in the light rays and two leaves drifting down
    for (let i = 0; i < 6; i++) b.set(Math.round(40 + i * 5 + 2 * Math.sin(T / 12 + i * 2)), Math.round(26 + ((T / 3 + i * 17) % 50)), K.mote);
    for (let i = 0; i < 2; i++) {
      const y = Math.round(((T / 2 + i * 38) % 80) + 8), x = Math.round(30 + i * 30 + 5 * Math.sin(T / 7 + i * 3));
      px(b, x, y, K.litterA); px(b, x + 1, y, K.litterC); px(b, x, y + 1, K.litterB);
    }
  }
}

export const woods96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'back', back); },
  fore: (c) => { stat(c, 'fore', fore); live(c); },
};
void ball;
