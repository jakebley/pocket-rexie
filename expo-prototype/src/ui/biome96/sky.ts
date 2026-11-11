// Open sky (bird) at 96: far mountains, hazy and green hills with field patches, layered cloud banks, drifting clouds and far birds,
// and a branch floor with leaf sprigs and a twig nest holding speckled eggs. The clouds, birds and a feather move.
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { SKYB } from './colorsA';
import { ball, clump, disc, ell, hline, leaf, line, N, px, rnd, stat, vline, ridge, rect } from './kit';

const K = SKYB.c;
const G = 90;

/** A puffy bank: a row of balls with shaded undersides, along y with the given amplitude. */
function bank(b: Buf, y: number, seed: number, r: number, hi: number, mid: number, shade: number) {
  const n = Math.ceil(N / (r * 1.3)) + 1;
  for (let i = 0; i < n; i++) {
    const x = i * r * 1.3 - 3, rr = r * (0.7 + rnd(seed + i) * 0.5), yy = y - rnd(seed + i + 40) * r * 0.7;
    ball(b, x, yy, rr, rr * 0.8, shade, mid, hi);
  }
  rect(b, 0, Math.round(y) + 1, N, G - Math.round(y) - 1, mid);
}
function back(b: Buf) {
  ridge(b, (x) => 50 + 7 * Math.abs(Math.sin(x / 19 + 0.6)) + 2.5 * Math.sin(x / 4.1), G, K.mount);
  for (let x = 0; x < N; x++) { const t = Math.round(50 + 7 * Math.abs(Math.sin(x / 19 + 0.6)) + 2.5 * Math.sin(x / 4.1)); if (t < 54 && x % 2 === 0) { b.set(x, t, K.mountLight); b.set(x + 1, t + 1, K.mountLight); b.set(x, t + 1, K.mountLight); } }
  ridge(b, (x) => 62 + 4 * Math.sin(x / 11 + 1) + 2 * Math.sin(x / 3.3), G, K.hillFar);
  const gt = (x: number) => 70 + 3.5 * Math.sin(x / 8 + 3) + 1.5 * Math.sin(x / 2.9);
  ridge(b, gt, G, K.hillMid, K.treeLight);
  // field patches and tiny trees on the green hill
  for (let x = 0; x < N; x++) { const t = Math.round(gt(x)); for (let y = t + 2; y < G - 6; y++) { const q = ((x >> 3) + (y >> 2)); if (q % 2 === 0 && (x + y) % 3) b.set(x, y, K.fieldA); else if (q % 3 === 1) b.set(x, y, K.fieldB); } }
  for (let i = 0; i < 12; i++) { const x = 4 + i * 8 + (i % 3); clump(b, x, Math.round(gt(x)) - 1, 3, i * 9, K.treeDark, K.tree, K.treeLight, 3); }
  // one cloud bank in front of the hills, with a lighter wisp above
  bank(b, 83, 1, 7, K.cloudHi, K.cloudMid, K.cloudShade);
  for (const [x, y, l] of [[56, 28, 9], [68, 29, 5], [76, 27, 10], [60, 34, 13], [76, 35, 8]] as const) { hline(b, x, x + l, y, K.cloudMid); hline(b, x + 2, x + l - 2, y + 1, K.cloudMid); }
}
function sprig(b: Buf, x: number, y: number, dir: number, len: number, seed: number) {
  line(b, x, y, x + dir * len * 0.6, y - len, K.branchDark); line(b, x + 1, y, x + 1 + dir * len * 0.6, y - len, K.branch);
  const tx = x + dir * len * 0.6, ty = y - len;
  clump(b, tx, ty, 6, seed * 17 + 3, K.treeDark, K.tree, K.treeLight, 6);
  clump(b, x + dir * len * 0.3, y - len * 0.5, 4, seed * 5 + 1, K.treeDark, K.tree, K.treeLight, 4);
  leaf(b, tx, ty, tx + dir * 8, ty + 2, 2.2, K.tree, K.treeDark);
}
function fore(b: Buf) {
  // the branch: lit top, shaded belly, grain, knots, bark ridges
  for (let y = G - 1; y < 96; y++) {
    const l = y === G - 1 ? K.branchLight : y === G ? K.branchLight : y < 93 ? K.branch : y < 95 ? K.bark : K.branchDark;
    hline(b, 0, N - 1, y, l);
  }
  for (let i = 0; i < 60; i++) { const x = Math.floor(rnd(i) * N), y = G + 1 + Math.floor(rnd(i + 60) * 5); hline(b, x, x + 2 + (i % 4), y, i % 2 ? K.branchDark : K.branchLight); }
  for (const x of [20, 55, 88]) { ell(b, x, G + 3, 2.4, 2, K.branchDark); ell(b, x + 0.3, G + 3, 1.2, 1, K.bark); }
  // sprigs rising at both edges
  sprig(b, 2, G - 1, 1, 22, 0); sprig(b, 15, G - 1, 1, 11, 1); sprig(b, 94, G - 1, -1, 24, 2); sprig(b, 84, G - 1, -1, 12, 1); sprig(b, 40, G - 1, 1, 6, 0);
  // nest with eggs: a woven bowl, a rim of twigs, three speckled eggs
  const nx = 55, ny = G - 8;
  ell(b, nx + 12, ny + 6, 13, 5.5, K.strawDark);
  for (let i = 0; i < 26; i++) { const x = nx + i - 1, d = Math.abs(x - (nx + 12)) / 13; if (d < 1) { const y = ny + 3 + Math.round(d * d * 4); px(b, x, y, i % 2 ? K.strawLight : K.straw); } }
  for (const ex of [nx + 7, nx + 12, nx + 17]) { ell(b, ex, ny + 2, 2.4, 3.2, K.egg); px(b, ex - 1, ny + 1, K.eggSpot); px(b, ex + 1, ny + 3, K.eggSpot); px(b, ex, ny, K.cloudHi); px(b, ex - 1, ny + 3, K.eggSpot); }
  for (let y = 0; y < 5; y++) for (let x = 0; x < 25; x++) { const dx = (x - 12) / 12.5, dy = (y - 1.5) / 3.2; if (dx * dx + dy * dy < 1 && dy > -0.2) px(b, nx + x - 0, ny + 4 + y, (x + y) % 3 === 0 ? K.strawLight : (x * 3 + y) % 4 === 0 ? K.strawDark : K.straw); }
  for (let i = 0; i < 9; i++) line(b, nx + 1 + i * 3, ny + 8, nx + i * 3 + (i % 2 ? 4 : -2), ny + 3 - (i % 3), i % 2 ? K.strawLight : K.strawDark);
}
function cloud(b: Buf, x: number, y: number, sc: number) {
  const r = (v: number) => v * sc;
  ball(b, x + r(8), y, r(5), r(4), K.cloudShade, K.cloudMid, K.cloudHi);
  ball(b, x + r(15), y - r(3), r(6), r(5), K.cloudShade, K.cloudMid, K.cloudHi);
  ball(b, x + r(23), y, r(5), r(4), K.cloudShade, K.cloudMid, K.cloudHi);
  rect(b, Math.round(x + r(8)), Math.round(y), Math.round(r(15)), Math.round(r(4.2)), K.cloudMid);
  hline(b, Math.round(x + r(6)), Math.round(x + r(25)), Math.round(y + r(4.5)), K.cloudShade);
}
const V = [['x.x', '.x.'], ['xxx', '...']];
function live(c: Ctx96) {
  const { b, s } = c;
  const d = s.still ? 0 : s.nowMs / 1000;
  const wrap = (v: number, span: number) => ((v % span) + span) % span - 24;
  cloud(b, wrap(s.seed % 64 + d * 0.9, 130), 36, 1.1);
  cloud(b, wrap(((s.seed * 3) % 64) + 50 + d * 1.4, 130), 58, 0.85);
  // far birds: three small Vs flapping
  const fl = s.still ? 0 : Math.floor(s.nowMs / 400) % 2;
  for (let i = 0; i < 3; i++) {
    const x = Math.round(wrap(20 + i * 17 + d * 2.2, 150)), y = 48 + i * 5 + Math.round(Math.sin(d / 2 + i) * 2);
    V[(fl + i) % 2].forEach((r, j) => { for (let k = 0; k < r.length; k++) if (r[k] === 'x') px(b, x + k, y + j, K.farBird); });
  }
  // a feather drifts down
  const u = (d * 3 + 20) % 80, fx = Math.round(20 + Math.sin(d / 1.7) * 9 + (u * 0.4)), fy = Math.round(18 + u * 0.8);
  if (!s.still || true) { line(b, fx, fy, fx + 2, fy + 1, K.feather); px(b, fx + 3, fy + 1, K.cloudShade); }
  void disc; void vline; void px;
}
export const sky96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => { stat(c, 'back', back); live(c); },
  fore: (c) => { stat(c, 'fore', fore); },
};
