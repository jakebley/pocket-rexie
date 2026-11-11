// Bug garden at 96x96: a hazy thicket far off, giant leaves with midribs and side veins, big flower heads with petals on tall stems, dew drops that
// glint, a spotted toadstool, a ladybug crawling on a leaf, and tall grass blades that sway. Static art is cached per (phase, rain); the blades,
// glints and the ladybug are drawn per frame. The sun and clouds stay behind the leaves (occlude).
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, disc, ellipse, hline, leaf, line, occlude, px, rnd, tickOf, vline } from './kitB';

const FAR = L.HILL, LEAF = L.LEAF_BIG, LEAF_HI = L.MOSS, VEIN = L.FERN, RIB = L.CANOPY, STEM = L.CLOVER, PET1 = L.CORAL_A, PET2 = L.CORAL_B, EYE = L.DAISY_C, DEW = L.DEW;

/** A bloom: `n` petals from a polar outline, pale tips, darker valleys between petals, a seeded centre. */
function flower(b: Buf, cx: number, cy: number, r: number, petal: number, valley: number, rot: number) {
  const n = 8;
  for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - rot;
    const c = Math.cos((n * a) / 2), R = r * (0.62 + 0.38 * Math.abs(c));
    if (d > R) continue;
    let l = petal;
    if (d > R - 1.2 && Math.abs(c) > 0.5) l = L.DAISY; // pale tips
    else if (Math.abs(c) < 0.2 && d > r * 0.35) l = valley; // seam between two petals
    b.set(x, y, l);
  }
  disc(b, cx, cy, Math.max(2, r * 0.36), EYE);
  b.set(cx - 1, cy - 1, L.DAISY);
  for (let k = 0; k < 6; k++) b.set(cx + Math.round(Math.cos(k * 1.1) * 1.8), cy + Math.round(Math.sin(k * 1.1) * 1.8), L.BARK);
}
function dew(b: Buf, x: number, y: number) { b.set(x, y, DEW); b.set(x + 1, y, DEW); b.set(x, y + 1, DEW); b.set(x + 1, y + 1, L.CLOUD_SHADE); }
function toadstool(b: Buf, cx: number, base: number, r: number) {
  b.rect(cx - 2, base - r, 4, r, L.DAISY); vline(b, cx + 1, base - r, base - 1, L.CLOUD_SHADE); b.set(cx - 2, base - 3, L.CLOUD_SHADE);
  ellipse(b, cx, base - r - 1, r + 2, r * 0.8, L.SHROOM);
  hline(b, cx - r - 1, cx + r + 1, base - r + 1, L.BARK);
  for (const [dx, dy] of [[-r + 1, -2], [1, -r * 0.7], [r - 2, -1], [-2, -1]]) disc(b, cx + dx, base - r - 1 + Math.round(dy), 1, L.DAISY);
  for (let k = -r; k < r; k += 2) b.set(cx + k, base - r - 1 - Math.round(r * 0.8) + 1 + Math.abs(k) % 2, L.CLOUD_SHADE);
}

function back(b: Buf) {
  // hazy thicket on the horizon: stacked blade tips in a pale tone
  for (let x = 0; x < N; x++) {
    const h = 20 + Math.round(5 * Math.sin(x / 7) + 3 * Math.sin(x / 2.6 + 1) + (x % 3) * 1.4);
    vline(b, x, GY - h, GY - 1, FAR);
    if (x % 4 === 0) { vline(b, x, GY - h - 3, GY - h, FAR); }
  }
  for (let i = 0; i < 40; i++) { const x = Math.floor(rnd(i + 1) * N), y = 58 + Math.floor(rnd(i + 50) * 26); b.set(x, y, i % 2 ? LEAF_HI : STEM); }
  // tall stems behind the leaves, each carrying a bloom
  line(b, 13, GY, 13, 36, STEM); line(b, 14, GY, 14, 36, STEM); line(b, 85, GY, 85, 34, STEM); line(b, 84, GY, 84, 34, STEM);
  leaf(b, 14, 66, 24, 56, 2.6, LEAF, RIB); leaf(b, 84, 62, 74, 54, 2.6, LEAF, RIB);
  flower(b, 13, 34, 10, PET1, L.YARN, 0.3);
  flower(b, 85, 30, 11, PET2, L.PLANET_SHADE, 0.1);
  // giant leaves: left and right, shaded sides, midrib, side veins; and a small one low on the left
  leaf(b, 2, 94, 34, 50, 11.5, LEAF, RIB, VEIN, LEAF_HI);
  leaf(b, 95, 92, 62, 52, 10.5, LEAF, RIB, VEIN, LEAF_HI);
  leaf(b, 26, 92, 10, 66, 4.5, RIB, LEAF, VEIN);
  // curled leaf tips and notches
  px(b, [[34, 49], [35, 50], [33, 49]], RIB); px(b, [[62, 51], [61, 52], [63, 51]], RIB);
  // dew on the leaves
  for (const [x, y] of [[14, 70], [22, 62], [10, 80], [80, 68], [86, 78], [72, 62], [30, 56]]) dew(b, x, y);
  // a toadstool and a small one in front of the right leaf
  toadstool(b, 84, GY, 6); toadstool(b, 74, GY, 3);
}

function fore(b: Buf) {
  // soil band with crumbs, small stones and a twig
  for (let x = 0; x < N; x++) {
    b.set(x, GY, x % 4 === 0 ? STEM : L.GROUND); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, L.GROUND); b.set(x, GY + 3, x % 2 ? L.DIRT : L.GROUND);
  }
  for (let x = 0; x < N; x++) for (let y = GY + 4; y < N; y++) b.set(x, y, (x * 5 + y * 9) % 8 === 0 ? L.BARK : (x + y) % 5 === 0 ? L.GROUND : L.DIRT);
  for (const [x, y, w] of [[9, GY + 4, 4], [30, GY + 6, 5], [52, GY + 5, 4], [66, GY + 3, 3], [88, GY + 5, 5]] as number[][]) { hline(b, x, x + w, y, L.ROCK); hline(b, x + 1, x + w - 1, y - 1, L.CLOUD_SHADE); }
  line(b, 34, GY - 1, 43, GY - 3, L.BARK); line(b, 38, GY - 2, 41, GY - 5, L.BARK);
  for (const [x, y] of [[26, GY - 1], [27, GY - 1], [60, GY - 1], [61, GY - 1], [62, GY - 1], [15, GY - 1]]) b.set(x, y, L.ROCK);
  for (const x of [20, 55]) { vline(b, x, GY - 5, GY - 1, STEM); b.set(x - 1, GY - 4, LEAF_HI); b.set(x + 1, GY - 3, LEAF_HI); b.set(x, GY - 6, LEAF_HI); }
}

const BLADES: [number, number, number][] = [[1, 24, 0], [4, 19, 1], [7, 14, 0], [10, 9, 1], [13, 6, 0], [28, 6, 1], [41, 5, 0], [51, 7, 1], [58, 6, 0], [68, 5, 1], [90, 13, 0], [93, 20, 1], [95, 25, 0], [87, 8, 1]];
function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s);
  const amp = c.rain ? 0.8 : 1.5;
  for (const [x, h, tone] of BLADES) {
    for (let k = 0; k < h; k++) {
      const off = Math.round(Math.sin(T / 12 + x * 0.6) * amp * (k / h) * (k / h) * 1.7);
      b.set(x + off, GY - 1 - k, k >= h - 3 ? LEAF_HI : tone ? STEM : LEAF);
      if (k < h - 6 && h > 10) b.set(x + off + 1, GY - 1 - k, tone ? LEAF : VEIN);
    }
  }
  // a dew glint blinks on the leaves in turn
  const g = (T >> 3) % 8;
  const spots: [number, number][] = [[14, 70], [22, 62], [10, 80], [80, 68], [86, 78], [72, 62], [30, 56]];
  if (g < spots.length) { const [x, y] = spots[g]; px(b, [[x - 1, y], [x + 2, y], [x, y - 1], [x + 1, y + 2]], L.DAISY); }
  // the ladybug walks up the left leaf's midrib and back
  const cyc = 160, u = (T >> 1) % cyc, f = u < cyc / 2 ? u / (cyc / 2) : 2 - u / (cyc / 2);
  const bx = Math.round(8 + f * 22), by = Math.round(86 - f * 34);
  b.rect(bx, by, 4, 3, L.SHROOM); b.set(bx + 1, by, L.CABLE); b.set(bx + 2, by + 2, L.CABLE); hline(b, bx, bx + 3, by - 1, L.CABLE);
  b.set(bx + (T % 2), by + 3, L.CABLE);
  // a bee passes by day
  if (c.phase === 'day' || c.phase === 'dawn') {
    const w = (T >> 1) % 150;
    if (w < 70) { const x = Math.round(-6 + w * 1.5), y = Math.round(40 + Math.sin(w / 5) * 4); b.rect(x, y, 4, 2, L.TWINKLE); b.set(x + 1, y, L.CABLE); b.set(x + 2, y + 1, L.CABLE); b.set(x + 1, y - 1, L.DAISY); b.set(x + 2, y - 1, L.DAISY); }
  }
}

export const garden96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('garden', 'back', c.phase, c.rain, back)),
  fore: (c) => {
    occlude(c.b, cachedPart('garden', 'back', c.phase, c.rain, back));
    blit(c.b, cachedPart('garden', 'fore', c.phase, c.rain, fore));
    live(c.b, c);
  },
};
