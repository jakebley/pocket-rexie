// Bunny meadow with a burrow at 96x96: far and near hills with a fence and round bushes, a dug mound with the burrow mouth (eyes glint in the
// dark), a carrot patch, daisies, clover patches and tall grass blades that sway. Static art is cached per (phase, rain); the grass and the
// burrow's eyes are drawn per frame.
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, disc, ellipse, hline, line, occlude, px, rnd, spr, tickOf, vline } from './kitB';

// layer roles in this biome (palette.ts REMAP.warren)
const FAR = L.HILL, FAR_HI = L.SAND, NEAR = L.CLOVER, NEAR_DK = L.CANOPY, NEAR_HI = L.MOSS, BLADE = L.LEAF_BIG, BLADE_DK = L.FERN;
const SOIL = L.LITTER, SOIL_DK = L.BARK, HOLE = L.BURROW, RIM = L.HOLE, FENCE = L.WOOD, PEBBLE = L.ROCK;

const farY = (x: number) => 62 + 3 * Math.sin(x / 11 + 1) + 1.6 * Math.sin(x / 4.3);
const nearY = (x: number) => 72 + 2.6 * Math.sin(x / 15 + 2.4) + 1.2 * Math.sin(x / 6 + 1);
const MX = 78; // burrow mound centre
/** half width of the mound at row y */
const mw = (y: number) => { const u = (GY - y) / 34; return Math.round(28 * Math.sqrt(Math.max(0, 1 - u * u * 0.98))); };

function back(b: Buf) {
  // far hill with a lit rim and a few round bushes
  for (let x = 0; x < N; x++) {
    const y = Math.round(farY(x));
    for (let k = y; k < GY; k++) b.set(x, k, FAR);
    b.set(x, y, FAR_HI); if (x % 2 === 0) b.set(x, y + 1, FAR_HI);
  }
  for (const [x, r] of [[9, 4], [14, 3], [37, 4], [43, 3], [61, 3]] as [number, number][]) {
    const y = Math.round(farY(x)) + 1;
    vline(b, x, y - 1, y + 1, SOIL_DK);
    disc(b, x, y - r - 1, r, NEAR_DK); disc(b, x - 1, y - r - 2, r - 1.5, NEAR);
    b.set(x - 2, y - r - 3, NEAR_HI);
  }
  // near hill: darker turf, a dithered top edge, scattered blossoms
  for (let x = 0; x < N; x++) {
    const y = Math.round(nearY(x));
    for (let k = y; k < GY; k++) b.set(x, k, NEAR);
    b.set(x, y, NEAR_HI); if (x % 3 !== 1) b.set(x, y + 1, NEAR_HI);
    if (x % 5 === 2) b.set(x, y + 3, NEAR_DK);
  }
  for (let i = 0; i < 34; i++) {
    const x = Math.floor(rnd(i + 5) * N), y = Math.round(nearY(x)) + 4 + Math.floor(rnd(i + 60) * 8);
    if (y < GY - 2) b.set(x, y, i % 4 === 0 ? L.DAISY : i % 4 === 1 ? L.YARN : i % 4 === 2 ? NEAR_HI : NEAR_DK);
  }
  // a wooden fence on the near hill, left
  for (let x = 3; x <= 33; x += 6) {
    const y = Math.round(nearY(x));
    vline(b, x, y - 7, y + 1, FENCE); vline(b, x + 1, y - 7, y + 1, SOIL_DK); b.set(x, y - 8, FENCE);
  }
  for (let x = 3; x <= 34; x++) { const y = Math.round(nearY(x)); b.set(x, y - 5, FENCE); b.set(x, y - 2, FENCE); if (x % 6 < 2) { b.set(x, y - 5, SOIL_DK); b.set(x, y - 2, SOIL_DK); } }

  // the dug mound: a dome with a shaded right flank, turf on top, dug clods and a mouth
  for (let y = 56; y < GY; y++) {
    const hw = mw(y);
    for (let x = MX - hw; x <= MX + hw; x++) {
      const sh = (x - MX) / 28 + (GY - y) / 60;
      b.set(x, y, sh > 0.62 ? SOIL_DK : SOIL);
    }
  }
  // turf crown and dithered edge
  for (let y = 56; y < 64; y++) {
    const hw = mw(y);
    for (let x = MX - hw; x <= MX + hw; x++) if ((x + y) % 2 === 0 || y < 59) b.set(x, y, y < 60 ? NEAR_HI : NEAR);
  }
  // soil speckle, pebbles and roots
  for (let i = 0; i < 46; i++) {
    const x = MX - 22 + Math.floor(rnd(i + 200) * 44), y = 64 + Math.floor(rnd(i + 300) * 25);
    if (Math.abs(x - MX) < mw(y) - 2) b.set(x, y, i % 3 === 0 ? SOIL_DK : i % 3 === 1 ? FAR_HI : PEBBLE);
  }
  line(b, MX - 20, 80, MX - 14, 84, SOIL_DK); line(b, MX + 16, 74, MX + 10, 78, SOIL_DK);
  // the mouth: arch, dark inside, rim, a warm bounce on the floor, roots over the top
  for (let y = 72; y < GY; y++) {
    const hw = y < 80 ? Math.round(Math.sqrt(Math.max(0, 64 - (80 - y) * (80 - y)))) : 8;
    hline(b, MX - hw, MX + hw, y, HOLE);
  }
  for (let y = 71; y < GY; y++) {
    const hw = y < 80 ? Math.round(Math.sqrt(Math.max(0, 81 - (80 - y) * (80 - y)))) : 9;
    b.set(MX - hw, y, RIM); b.set(MX + hw, y, RIM);
    if (y < 72 || (y < 80 && hw < 8)) hline(b, MX - hw, MX + hw, y, RIM);
  }
  hline(b, MX - 6, MX + 6, 71, RIM);
  px(b, [[MX - 5, 72], [MX - 2, 72], [MX + 3, 72], [MX + 6, 72]], SOIL_DK);
  vline(b, MX - 4, 72, 75, SOIL_DK); vline(b, MX + 2, 72, 76, SOIL_DK); vline(b, MX + 5, 72, 74, SOIL_DK); b.set(MX + 2, 77, SOIL_DK);
  // a dark tunnel bend inside
  hline(b, MX - 6, MX + 6, 86, L.CAVE); hline(b, MX - 7, MX + 7, 88, L.CAVE);
  // the dug-out spoil heap in front of the mouth
  ellipse(b, MX - 15, GY - 1, 9, 3.4, SOIL); ellipse(b, MX - 17, GY - 2, 4, 1.8, FAR_HI);
  for (const [x, y] of [[MX - 21, GY - 3], [MX - 12, GY - 4], [MX - 9, GY - 2], [MX - 19, GY - 1]]) b.set(x, y, SOIL_DK);
  ellipse(b, MX + 14, GY - 1, 6, 2.4, SOIL); px(b, [[MX + 12, GY - 3], [MX + 17, GY - 2]], SOIL_DK);
}

const CARROT = ['..gg.gg..', '.g.gggg.g', '...gGg...', '...GGG...', '..CCCCC..', '..CcCCC..', '...CCC...'];
const DAISY = ['.w.', 'wcw', '.w.'];
const CLOVER3 = ['.gg.gg.', 'gGggGgg', '.ggGgg.', '..gGg..'];
function fore(b: Buf) {
  // ground band: turf edge over soil rows with pebbles and grass roots
  for (let x = 0; x < N; x++) {
    b.set(x, GY, x % 3 === 0 ? NEAR_HI : L.GROUND); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, L.GROUND);
    b.set(x, GY + 3, x % 2 === 0 ? L.DIRT : L.GROUND);
  }
  for (let x = 0; x < N; x++) for (let y = GY + 4; y < N; y++) if ((x * 7 + y * 13) % 11 === 0) b.set(x, y, L.DIRT); else if ((x * 5 + y * 3) % 17 === 0) b.set(x, y, SOIL);
  for (const [x, y] of [[6, 93], [27, 92], [47, 94], [64, 93], [88, 94], [37, 92]]) { hline(b, x, x + 2, y, PEBBLE); hline(b, x - 1, x + 3, y + 1, PEBBLE); b.set(x, y, FAR_HI); }
  // carrot patch: three rows of green fronds, orange shoulders in the soil
  const gl = { g: BLADE, G: BLADE_DK, C: L.CARROT, c: SOIL };
  spr(b, CARROT, 4, GY - 5, gl); spr(b, CARROT, 14, GY - 3, gl); spr(b, CARROT, 53, GY - 4, gl);
  // daisies on stems
  for (const [x, h] of [[24, 10], [43, 7], [69, 9], [90, 8], [60, 6]] as [number, number][]) {
    vline(b, x + 1, GY - h + 2, GY, BLADE); b.set(x + 2, GY - Math.floor(h / 2), BLADE); b.set(x + 3, GY - Math.floor(h / 2) - 1, BLADE);
    spr(b, DAISY, x, GY - h, { w: L.DAISY, c: L.DAISY_C });
    b.set(x + 1, GY - h - 1, L.DAISY); b.set(x - 1, GY - h + 1, L.DAISY); b.set(x + 3, GY - h + 1, L.DAISY);
  }
  // clover patches with a pink blossom
  for (const [x, y, p] of [[19, GY - 3, 0], [33, GY - 2, 1], [48, GY - 3, 0], [75, GY - 1, 1], [85, GY - 2, 0]] as [number, number, number][]) {
    spr(b, CLOVER3, x, y, { g: NEAR_HI, G: BLADE });
    if (p) { b.set(x + 3, y - 2, L.YARN); b.set(x + 2, y - 1, L.YARN); b.set(x + 4, y - 1, L.YARN); b.set(x + 3, y - 1, L.DAISY); vline(b, x + 3, y, y + 1, BLADE); }
  }
}

// tall grass: blade root x, height, tone
const BLADES: [number, number, number][] = [[1, 19, 0], [4, 14, 1], [8, 10, 0], [12, 7, 1], [28, 6, 1], [31, 9, 0], [39, 5, 1], [57, 8, 0], [66, 7, 1], [72, 6, 0], [92, 17, 1], [94, 21, 0], [89, 12, 0], [86, 8, 1], [51, 5, 0], [22, 5, 0]];
function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s);
  const rainy = c.rain;
  for (let i = 0; i < BLADES.length; i++) {
    const [x, h, tone] = BLADES[i];
    const amp = (rainy ? 0.9 : 1.6) * (h > 12 ? 1.2 : 1);
    for (let k = 0; k < h; k++) {
      const off = Math.round(Math.sin(T / 11 + x * 0.7) * amp * (k / h) * (k / h) * 1.6 + (k > h - 4 ? 0.5 * Math.sign(Math.sin(x)) : 0));
      b.set(x + off, GY - 1 - k, k >= h - 3 ? BLADE : (tone ? BLADE : BLADE_DK));
      if (k < h - 5 && h > 8) b.set(x + off + 1, GY - 1 - k, tone ? BLADE_DK : BLADE);
    }
  }
  // two eyes glint in the burrow, blinking now and then
  const ph = (T >> 3) % 24;
  if (ph < 18 && (c.phase === 'night' || c.phase === 'dusk' || ph < 10)) {
    const open = !(ph % 9 === 8);
    if (open) { b.set(MX - 3, 83, L.DAISY); b.set(MX + 3, 83, L.DAISY); b.set(MX - 3, 84, L.DAISY_C); b.set(MX + 3, 84, L.DAISY_C); }
  }
  // dandelion seeds drift past
  const d = (T >> 1) % 96;
  px(b, [[d, 60 - Math.round(Math.sin(d / 7) * 3)], [(d + 40) % 96, 52 + Math.round(Math.sin(d / 6) * 3)]], L.DAISY);
}

export const warren96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('warren', 'back', c.phase, c.rain, back)),
  fore: (c) => {
    occlude(c.b, cachedPart('warren', 'back', c.phase, c.rain, back));
    blit(c.b, cachedPart('warren', 'fore', c.phase, c.rain, fore));
    live(c.b, c);
  },
};
