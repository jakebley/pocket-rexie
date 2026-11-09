// Biome backgrounds (docs/BIOMES.md). The meadow scene (sky, sun, clouds, ground band, tufts, butterfly) is drawn for every
// family; a biome adds scenery UNDER it (drawBackdrop) and floor props over empty pixels (drawFore), and the palette re-colours
// the shared layers (palette.ts REMAP). Scenery uses Technicolor-only layer codes (Layer.BARK and up), which Traditional renders
// unlit, so Traditional stays today's minimal scene plus a few tiny cues (WAVE, HOLE, PEAK).
// Static art is painted once per (biome, phase, rain) into a cached 64x64 layer grid and blitted; only the animated bits
// (bubbles, fireflies, gears, LEDs, grass sway, ...) are drawn per frame, without allocating.
import { Layer } from './layers';
import { Buf } from './pixel';
import type { Biome } from './biomes';
import { GROUND_Y, SCENE_N, TICK_MS, phaseOf, type Phase, type Scene } from './scene';

type Legend = Record<string, number>;
const N = SCENE_N;

// ---------- tiny drawing helpers ----------
function spr(b: Buf, rows: string[], x: number, y: number, lg: Legend) {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) { const l = lg[r[i]]; if (l) b.set(x + i, y + j, l); }
  }
}
function disc(b: Buf, cx: number, cy: number, r: number, l: number) {
  const r2 = r * r + 0.5;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) b.set(x, y, l);
  }
}
const hline = (b: Buf, x0: number, x1: number, y: number, l: number) => { for (let x = x0; x <= x1; x++) b.set(x, y, l); };
const vline = (b: Buf, x: number, y0: number, y1: number, l: number) => { for (let y = y0; y <= y1; y++) b.set(x, y, l); };
/** Triangle / cone: apex at (ax, ay), widening by `slope` columns per row down to baseY. */
function cone(b: Buf, ax: number, ay: number, baseY: number, slope: number, l: number, topHalf = 0) {
  for (let y = ay; y <= baseY; y++) {
    const hw = topHalf + (y - ay) * slope;
    hline(b, Math.round(ax - hw), Math.round(ax + hw), y, l);
  }
}
/** A leaf: a lens along the spine (x0,y0)-(x1,y1) with half-width hw; the midrib is drawn in `rib`. */
function leaf(b: Buf, x0: number, y0: number, x1: number, y1: number, hw: number, l: number, rib: number) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  const minX = Math.floor(Math.min(x0, x1) - hw), maxX = Math.ceil(Math.max(x0, x1) + hw);
  const minY = Math.floor(Math.min(y0, y1) - hw), maxY = Math.ceil(Math.max(y0, y1) + hw);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const t = ((x - x0) * dx + (y - y0) * dy) / L2;
    if (t < 0 || t > 1) continue;
    const d = Math.abs((x - x0) * dy - (y - y0) * dx) / L;
    if (d <= hw * Math.pow(Math.sin(Math.PI * t), 0.7)) b.set(x, y, d < 0.7 ? rib : l);
  }
}
const tickOf = (s: Scene) => (s.still ? 0 : Math.floor(s.nowMs / TICK_MS));
const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };

// ---------- static caches ----------
type Painter = (b: Buf, phase: Phase, rain: boolean) => void;
const CACHE = new Map<string, Uint8Array>();
function blit(b: Buf, biome: Biome, part: string, phase: Phase, rain: boolean, paint: Painter | undefined, backOnly: boolean) {
  if (!paint) return;
  const key = `${biome}|${part}|${phase}|${rain ? 1 : 0}`;
  let src = CACHE.get(key);
  if (!src) { const t = new Buf(N); paint(t, phase, rain); src = t.px; CACHE.set(key, src); }
  const px = b.px;
  if (backOnly) { for (let i = 0; i < src.length; i++) if (src[i] && !px[i]) px[i] = src[i]; }
  else for (let i = 0; i < src.length; i++) if (src[i]) px[i] = src[i];
}

// ---------- woods (fox) ----------
const FERN = ['....g....', '.g..g..g.', '..g.g.g..', 'g.ggggg.g', '.ggggggg.', '...ggg...'];
const SHROOM = ['.rrr.', 'rwrrr', '..w..', '..w..'];
const woodsBack: Painter = (b) => {
  // left and right trunks with roots, knots and moss
  b.rect(0, 12, 4, 48, Layer.BARK); b.rect(0, 56, 6, 4, Layer.BARK); b.rect(4, 58, 3, 2, Layer.BARK);
  b.rect(59, 8, 5, 52, Layer.BARK); b.rect(57, 56, 7, 4, Layer.BARK); b.rect(55, 58, 2, 2, Layer.BARK);
  for (const [x, y] of [[1, 24], [1, 25], [61, 30], [61, 31], [60, 46]]) b.set(x, y, Layer.CAVE);
  for (const [x, y] of [[3, 30], [3, 31], [2, 31], [3, 44], [59, 18], [59, 19], [60, 19], [59, 40]]) b.set(x, y, Layer.MOSS);
  // canopy: leaf masses at the corners and a ragged edge along the top right
  for (const [cx, cy, r] of [[3, 20, 6], [9, 25, 4], [2, 29, 4], [36, 1, 4], [42, 0, 4], [49, 1, 4], [56, 2, 5], [62, 5, 6], [60, 26, 6], [56, 32, 4], [62, 34, 4]]) disc(b, cx, cy, r, Layer.CANOPY);
  for (let i = 0; i < 26; i++) b.set(Math.floor(rnd(i) * 12), 14 + Math.floor(rnd(i + 40) * 20), Layer.FERN);
  for (let i = 0; i < 26; i++) b.set(52 + Math.floor(rnd(i + 80) * 12), Math.floor(rnd(i + 120) * 38), Layer.FERN);
};
const woodsFore: Painter = (b) => {
  spr(b, FERN, 9, 54, { g: Layer.FERN }); spr(b, FERN, 28, 55, { g: Layer.FERN }); spr(b, FERN, 46, 54, { g: Layer.FERN });
  spr(b, SHROOM, 19, 55, { r: Layer.SHROOM, w: Layer.DAISY }); spr(b, SHROOM, 40, 56, { r: Layer.SHROOM, w: Layer.DAISY }); spr(b, SHROOM, 36, 57, { r: Layer.SHROOM, w: Layer.DAISY });
  hline(b, 11, 16, 58, Layer.MOSS); hline(b, 10, 17, 59, Layer.MOSS); hline(b, 34, 41, 59, Layer.MOSS); hline(b, 36, 40, 58, Layer.MOSS);
  for (const x of [5, 13, 23, 31, 33, 45, 52, 58]) b.set(x, 59, Layer.LITTER);
  for (const x of [8, 28, 50, 20, 42]) { b.set(x, 58, Layer.LITTER); b.set(x + 1, 59, Layer.LITTER); }
  b.set(24, 59, Layer.SHROOM); b.set(55, 59, Layer.SHROOM);
};
function woodsLive(b: Buf, s: Scene, phase: Phase) {
  if (phase !== 'dusk' && phase !== 'night') return;
  const T = tickOf(s);
  for (let i = 0; i < 8; i++) {
    if (((T >> 2) + i * 3) % 6 === 0) continue;
    const x = Math.round(8 + i * 7 + 4 * Math.sin(T / 9 + i));
    const y = Math.round(34 + ((i * 5) % 18) + 3 * Math.cos(T / 11 + i * 2));
    b.set(x, y, Layer.FIREFLY);
    if (i % 3 === 0) b.set(x + 1, y, Layer.FIREFLY);
  }
}

// ---------- underwater (fish) ----------
const CORAL_A = ['.X...X...', '.X...X.X.', 'XX..XX.X.', '.XX.X.XX.', '..XXXXX..', '...XXX...', '...XXX...', '...XXX...'];
const CORAL_B = ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'X.X.X.X.X', '...XXX...', '...XXX...'];
const waterBack: Painter = (b, phase, rain) => {
  const beams = rain ? [] : phase === 'night' ? [34] : phase === 'dusk' ? [14, 40] : phase === 'dawn' ? [10, 36] : [6, 26, 46];
  for (const x0 of beams) for (let y = 0; y < 58; y++) {
    const w = 2 + (y >> 4);
    for (let i = 0; i < w; i++) { const x = x0 + (y >> 1) + i; if (((x + y) & 1) === 0) b.set(x, y, Layer.WATER_LIGHT); }
  }
  spr(b, CORAL_A, 33, 52, { X: Layer.CORAL_A }); spr(b, CORAL_B, 44, 54, { X: Layer.CORAL_B }); spr(b, CORAL_A.slice(2), 11, 54, { X: Layer.CORAL_B });
  spr(b, CORAL_B.slice(3), 54, 56, { X: Layer.CORAL_A });
};
const waterFore: Painter = (b) => {
  for (const x of [6, 20, 49]) { hline(b, x, x + 2, 58, Layer.ROCK); hline(b, x - 1, x + 3, 59, Layer.ROCK); }
  for (const x of [13, 27, 41, 57]) { hline(b, x, x + 4, 59, Layer.SAND); hline(b, x + 1, x + 3, 58, Layer.SAND); }
  b.set(30, 58, Layer.CORAL_A); b.set(29, 59, Layer.CORAL_A); b.set(31, 59, Layer.CORAL_A);
};
function waterLive(b: Buf, s: Scene, _phase: Phase) {
  const T = tickOf(s);
  // surface shimmer line is the Traditional cue; Technicolor adds a second, fainter wave and rain ripples
  for (let x = 0; x < N; x++) if ((x + (T >> 2)) % 6 < 3) b.set(x, 17 + (((x + (T >> 2)) % 12) < 6 ? 0 : 1), Layer.WAVE);
  if (s.weather === 'rain') {
    for (let i = 0; i < 3; i++) {
      const w = 2 + ((T >> 1) + i * 4) % 7, cx = 12 + i * 20;
      hline(b, cx - w, cx - w + 1, 19 + (i & 1), Layer.WATER_LIGHT); hline(b, cx + w - 1, cx + w, 19 + (i & 1), Layer.WATER_LIGHT);
      hline(b, cx - 1, cx + 1, 21 + (i & 1), Layer.WATER_LIGHT);
    }
  }
  // seaweed
  const strands: [number, number][] = [[3, 16], [21, 12], [50, 18], [61, 14]];
  strands.forEach(([x, h], i) => {
    for (let k = 0; k < h; k++) {
      const xx = x + Math.round(Math.sin(T / 10 + k * 0.45 + i) * 1.6 * (k / h));
      b.set(xx, 59 - k, Layer.SEAWEED);
      if (k % 4 < 2) b.set(xx + 1, 59 - k, Layer.SEAWEED);
    }
  });
  // bubbles
  const BX = [6, 17, 29, 41, 53, 60];
  for (let i = 0; i < BX.length; i++) {
    const y = 58 - (((T * (1 + (i % 3))) >> 1) + i * 11) % 54;
    const x = BX[i] + Math.round(Math.sin(T / 9 + i) * 1.5);
    b.set(x + 1, y, Layer.AIR_BUBBLE); b.set(x, y + 1, Layer.AIR_BUBBLE); b.set(x + 2, y + 1, Layer.AIR_BUBBLE); b.set(x + 1, y + 2, Layer.AIR_BUBBLE);
    if (i % 2) b.set(x + 4, y - 5, Layer.AIR_BUBBLE);
  }
}

// ---------- open sky (bird) ----------
const nestRows = ['..ww..ww..', '.LLLLLLLL.', 'LLLLLLLLLL'];
const skyBack: Painter = (b) => {
  for (let x = 0; x < N; x++) {
    const h = Math.round(6 + 2.5 * Math.sin(x / 7) + 1.5 * Math.sin(x / 3.1 + 1));
    vline(b, x, 59 - h, 59, Layer.HILL);
  }
  for (const [cx, cy, r] of [[5, 59, 6], [17, 60, 5], [31, 59, 6], [58, 59, 6], [64, 57, 4]]) disc(b, cx, cy, r, Layer.CANOPY);
  for (let i = 0; i < 24; i++) { const x = Math.floor(rnd(i) * 64), y = 54 + Math.floor(rnd(i + 9) * 5); b.set(x, y, Layer.MOSS); }
};
const skyFore: Painter = (b) => {
  spr(b, nestRows, 41, 57, { w: Layer.DAISY, L: Layer.LITTER });
  for (const x of [8, 24, 54]) { b.set(x, 59, Layer.CANOPY); b.set(x + 1, 58, Layer.CANOPY); b.set(x + 2, 58, Layer.CANOPY); b.set(x + 3, 59, Layer.CANOPY); }
  for (const x of [14, 30, 36, 60]) b.set(x, 59, Layer.BARK);
};
function skyLive(b: Buf, s: Scene) {
  const d = s.still ? 0 : s.nowMs / 1000;
  // two big drifting clouds, soft blue-white
  const wrap = (v: number, span: number) => ((v % span) + span) % span - 20;
  for (const [x0, y, sp, sc] of [[s.seed % 64, 25, 0.5, 1], [(s.seed * 3) % 64 + 20, 44, 0.8, 0.8]] as const) {
    const x = wrap(x0 + d * sp, 100);
    disc(b, x + 8 * sc, y, 5 * sc, Layer.CLOUD_SHADE); disc(b, x + 15 * sc, y - 3 * sc, 6 * sc, Layer.CLOUD_SHADE); disc(b, x + 23 * sc, y, 5 * sc, Layer.CLOUD_SHADE);
    b.rect(Math.round(x + 8 * sc), Math.round(y), Math.round(15 * sc), Math.round(5 * sc), Layer.CLOUD_SHADE);
  }
}

// ---------- backyard (cat) ----------
const yardBack: Painter = (b, phase) => {
  // neighbour's house: roof, wall, chimney, windows (lit at dusk and night)
  for (let y = 25; y < 35; y++) hline(b, Math.round(55 - (y - 24) * 1.5), 63, y, Layer.ROOF);
  b.rect(60, 21, 3, 7, Layer.BARK);
  b.rect(41, 35, 23, 6, Layer.WALL);
  const lit = phase === 'dusk' || phase === 'night';
  const win = lit ? Layer.WINDOW : Layer.HILL;
  b.rect(46, 36, 4, 3, win); b.rect(56, 36, 4, 3, win);
  if (lit) { b.set(45, 37, Layer.WINDOW); b.set(60, 37, Layer.WINDOW); vline(b, 48, 36, 38, Layer.WOOD); vline(b, 58, 36, 38, Layer.WOOD); }
  // wooden fence: pointed planks and two rails
  for (let x = 0; x < N; x += 5) {
    b.rect(x, 41, 4, 19, Layer.WOOD);
    b.set(x, 41, 0); b.set(x + 3, 41, 0); b.rect(x + 1, 40, 2, 1, Layer.WOOD);
  }
  hline(b, 0, N - 1, 46, Layer.BARK); hline(b, 0, N - 1, 54, Layer.BARK);
  for (let x = 2; x < N; x += 5) { b.set(x, 46, Layer.CAVE); b.set(x, 54, Layer.CAVE); }
};
const yardFore: Painter = (b) => {
  // garden bed with bushes and blooms, a flowerpot and a ball of yarn
  hline(b, 27, 52, 59, Layer.BARK); hline(b, 28, 51, 58, Layer.LITTER);
  for (const cx of [32, 39, 46]) disc(b, cx, 55, 3, Layer.CANOPY);
  for (const [x, y, l] of [[31, 54, Layer.CORAL_A], [39, 53, Layer.DAISY], [46, 54, Layer.CORAL_B], [36, 56, Layer.CORAL_A], [43, 56, Layer.DAISY]] as [number, number, number][]) b.set(x, y, l);
  spr(b, ['.gg.', 'gggg', 'LLLL', '.LL.', '.LL.'], 56, 55, { g: Layer.CANOPY, L: Layer.LITTER });
  b.set(57, 55, Layer.DAISY); b.set(59, 55, Layer.CORAL_A);
  disc(b, 6, 56, 3, Layer.YARN);
  for (const [x, y] of [[5, 54], [6, 55], [7, 56], [4, 57], [6, 58]]) b.set(x, y, Layer.CORAL_B);
  hline(b, 9, 14, 59, Layer.YARN); b.set(8, 58, Layer.YARN);
};

// ---------- cloud realm (spirits) and ember realm ----------
const TWINKLES: [number, number][] = [[20, 18], [34, 22], [46, 17], [8, 28], [52, 34], [28, 34], [60, 42], [16, 42], [38, 12], [24, 46]];
const cloudsBack: Painter = (b) => {
  for (const [cx, cy, r] of [[6, 50, 5], [14, 52, 6], [24, 51, 5], [40, 52, 6], [50, 50, 5], [58, 52, 6]]) disc(b, cx, cy, r, Layer.CLOUD_SHADE);
  b.rect(4, 52, 58, 8, Layer.CLOUD_SHADE);
};
const cloudsFore: Painter = (b) => {
  for (const cx of [4, 14, 27, 38, 50, 60]) disc(b, cx, 60, 3, Layer.CLOUD_SHADE);
  for (let x = 0; x < N; x += 3) b.set(x, 63, Layer.CLOUD_SHADE);
};
function cloudsLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  TWINKLES.forEach(([x, y], i) => {
    if (((T >> 2) + i * 3) % 6 === 0) return;
    b.set(x, y, Layer.TWINKLE);
    if (i % 3 === 0) { b.set(x - 1, y, Layer.TWINKLE); b.set(x + 1, y, Layer.TWINKLE); b.set(x, y - 1, Layer.TWINKLE); b.set(x, y + 1, Layer.TWINKLE); }
  });
}
const SPIRES_L = [22, 24, 21, 17, 14, 11, 8, 6, 3];
const SPIRES_R = [3, 6, 9, 14, 12, 18, 23, 20, 22];
const emberBack: Painter = (b, phase) => {
  for (let y = 48; y < 60; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 0 && (x * 7 + y * 3) % 11 < (y - 46)) b.set(x, y, Layer.EMBER);
  SPIRES_L.forEach((h, x) => vline(b, x, 59 - h - 6, 59, Layer.ROCK));
  SPIRES_R.forEach((h, i) => vline(b, 55 + i, 59 - h - 6, 59, Layer.ROCK));
  for (const [x, y] of [[2, 44], [3, 50], [5, 54], [58, 40], [60, 48], [61, 52]]) b.set(x, y, Layer.LAVA);
  void phase;
};
const emberFore: Painter = (b) => {
  for (const [cx, r] of [[12, 2], [24, 3], [36, 2], [47, 3]] as [number, number][]) disc(b, cx, 60, r, Layer.ROCK);
  for (let x = 3; x < N; x += 7) { b.set(x, 62, Layer.LAVA); b.set(x + 1, 63, Layer.LAVA); }
};
function emberLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  for (let i = 0; i < 7; i++) {
    const y = 58 - ((((T * (1 + (i % 2))) >> 1) + i * 8) % 50);
    b.set(Math.round(i * 9 + 3 + Math.sin(T / 7 + i) * 2), y, Layer.EMBER);
  }
  for (let i = 0; i < 8; i++) b.set((i * 8 + (T >> 2)) % N, 18 + (((T >> 1) + i * 13) % 40), Layer.ASH);
}

// ---------- warren (bunny) ----------
const CARROT = ['g.g', '.g.', 'CCC', 'CCC', '.C.', '.C.'];
const DAISY = ['.w.', 'wcw', '.w.', '.g.', '.g.', '.g.'];
const CLOVER = ['.g.g.', 'ggggg', '.ggg.', '..g..'];
const warrenBack: Painter = (b) => {
  // earth mound with the burrow mouth (HOLE is the Traditional cue: just the outline)
  for (let y = 48; y < 60; y++) { const hw = 3 + (y - 48) * 0.65; hline(b, Math.round(54 - hw), Math.round(54 + hw), y, Layer.LITTER); }
  const spans: [number, number][] = [[52, 55], [51, 56], [50, 57], [50, 57], [50, 57], [50, 57], [50, 57]];
  spans.forEach(([x0, x1], i) => hline(b, x0, x1, 53 + i, Layer.BURROW));
  hline(b, 52, 55, 52, Layer.HOLE); b.set(51, 53, Layer.HOLE); b.set(56, 53, Layer.HOLE);
  vline(b, 49, 54, 59, Layer.HOLE); vline(b, 58, 54, 59, Layer.HOLE); b.set(50, 53, Layer.HOLE); b.set(57, 53, Layer.HOLE);
};
const warrenFore: Painter = (b) => {
  spr(b, CARROT, 24, 54, { g: Layer.CLOVER, C: Layer.CARROT }); spr(b, CARROT, 11, 55, { g: Layer.CLOVER, C: Layer.CARROT });
  spr(b, DAISY, 3, 54, { w: Layer.DAISY, c: Layer.DAISY_C, g: Layer.CLOVER }); spr(b, DAISY, 33, 53, { w: Layer.DAISY, c: Layer.DAISY_C, g: Layer.CLOVER }); spr(b, DAISY, 42, 54, { w: Layer.DAISY, c: Layer.DAISY_C, g: Layer.CLOVER });
  spr(b, CLOVER, 17, 56, { g: Layer.CLOVER }); spr(b, CLOVER, 38, 57, { g: Layer.CLOVER }); spr(b, CLOVER, 29, 57, { g: Layer.MOSS });
};
function warrenLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  const X = [1, 2, 7, 15, 22, 36, 46, 61], H = [11, 9, 7, 8, 6, 8, 9, 10];
  X.forEach((x, i) => {
    for (let k = 0; k < H[i]; k++) b.set(x + Math.round(Math.sin(T / 12 + x) * 1.4 * (k / H[i])), 59 - k, k % 3 === 0 ? Layer.MOSS : Layer.CLOVER);
  });
}

// ---------- crags (dragon) ----------
const cragsBack: Painter = (b, phase) => {
  const hot = phase === 'dusk' || phase === 'night';
  cone(b, 50, 28, 59, 0.55, Layer.ROCK, 3);             // volcano (darker)
  cone(b, 14, 26, 59, 0.9, Layer.CRAG);                  // front crag
  for (let y = 26; y < 60; y++) hline(b, 14 + Math.round((y - 26) * 0.2), Math.round(14 + (y - 26) * 0.9), y, Layer.ROCK); // shaded right flank
  for (let y = 26; y <= 35; y++) { b.set(Math.round(14 - (y - 26) * 0.9), y, Layer.PEAK); b.set(Math.round(14 + (y - 26) * 0.9), y, Layer.PEAK); }
  // volcano crater, lava streams, glow
  hline(b, 47, 53, 28, Layer.LAVA); hline(b, 48, 52, 29, Layer.LAVA);
  for (let y = 30; y < 40; y++) if (y % 2 === 0) b.set(49 + (y >> 3), y, Layer.LAVA);
  for (let y = 30; y < 35; y++) if (y % 2) b.set(52, y, Layer.LAVA);
  if (hot) for (let y = 21; y < 28; y++) for (let x = 41; x < 60; x++) if ((x + y) % 2 === 0 && Math.abs(x - 50) + (27 - y) * 1.3 < 12) b.set(x, y, Layer.EMBER);
  // cave mouth
  const arch: [number, number][] = [[11, 16], [10, 17], [9, 18]];
  arch.forEach(([x0, x1], i) => hline(b, x0, x1, 46 + i, Layer.CAVE));
  for (let y = 49; y < 60; y++) hline(b, 8, 19, y, Layer.CAVE);
  if (hot) { b.set(13, 57, Layer.EMBER); b.set(14, 58, Layer.EMBER); b.set(15, 57, Layer.EMBER); }
};
const cragsFore: Painter = (b, phase) => {
  for (const [cx, r] of [[30, 2], [44, 3], [58, 2]] as [number, number][]) disc(b, cx, 60, r, Layer.ROCK);
  for (const x of [24, 36]) { hline(b, x, x + 2, 58, Layer.CRAG); hline(b, x - 1, x + 3, 59, Layer.CRAG); }
  if (phase === 'night') for (let x = 2; x < N; x += 6) { b.set(x, 62, Layer.LAVA); b.set(x + 1, 62, Layer.LAVA); b.set(x + 3, 63, Layer.LAVA); }
  else if (phase === 'dusk') for (let x = 5; x < N; x += 12) b.set(x, 62, Layer.LAVA);
};
function cragsLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  for (let i = 0; i < 3; i++) {
    const u = ((T >> 1) + i * 9) % 27;
    disc(b, 49 + u * 0.5 + i, 24 - u * 0.5, 1 + (u >> 3), Layer.ASH);
  }
}

// ---------- workshop (bot) ----------
const workshopBackStatic: Painter = (b) => {
  // wall plates with rivets
  for (const [x, y, w, h] of [[2, 32, 20, 14], [24, 19, 19, 13], [46, 30, 16, 16]] as [number, number, number, number][]) {
    b.rect(x, y, w, h, Layer.PANEL);
    for (const [rx, ry] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) b.set(rx, ry, Layer.GEAR);
  }
  // monitor: dark frame, stand
  b.rect(47, 33, 14, 11, Layer.CABLE); b.rect(51, 44, 6, 2, Layer.CABLE); b.rect(49, 46, 10, 1, Layer.CABLE);
  // cables
  for (let x = 0; x < 26; x++) b.set(x, 24 + Math.round(5 * Math.sin((Math.PI * x) / 26)), Layer.CABLE);
  for (let x = 40; x < 64; x++) b.set(x, 18 + Math.round(6 * Math.sin((Math.PI * (x - 40)) / 24)), Layer.CABLE);
  vline(b, 30, 46, 52, Layer.CABLE);
};
const workshopFore: Painter = (b) => {
  for (let x = 0; x < N; x++) if (x % 8 < 5) b.set(x, 62, Layer.GRIDLINE);
  for (let x = 2; x < N; x += 8) { b.set(x, 63, Layer.GRIDLINE); b.set(x + 1, 63, Layer.GRIDLINE); }
  for (let x = 8; x < 30; x++) b.set(x, 58 + Math.round(Math.sin(x / 3.2)), Layer.CABLE);
  for (let x = 40; x < 52; x++) b.set(x, 59 - Math.round(Math.sin((x - 40) / 2.5)), Layer.CABLE);
};
function gear(b: Buf, cx: number, cy: number, r: number, ang: number) {
  for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 <= r * r + 1 && d2 >= (r - 1.4) * (r - 1.4)) b.set(cx + dx, cy + dy, Layer.GEAR);
  }
  for (let k = 0; k < 8; k++) b.set(Math.round(cx + Math.cos(ang + (k * Math.PI) / 4) * (r + 1.5)), Math.round(cy + Math.sin(ang + (k * Math.PI) / 4) * (r + 1.5)), Layer.GEAR);
  b.set(cx, cy, Layer.CABLE);
  for (let k = 0; k < 4; k++) b.set(Math.round(cx + Math.cos(ang + (k * Math.PI) / 2) * (r - 2)), Math.round(cy + Math.sin(ang + (k * Math.PI) / 2) * (r - 2)), Layer.CABLE);
}
function workshopLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  gear(b, 33, 25, 4, T / 9); gear(b, 40, 29, 3, -T / 7 + 0.4);
  // monitor scan lines
  b.rect(48, 34, 12, 9, Layer.SCREEN);
  for (let k = 0; k < 4; k++) hline(b, 49, 49 + 3 + ((k * 5 + (T >> 2) * 3) % 7), 35 + k * 2, Layer.CABLE);
  // blinking LEDs
  const leds: [number, number, number][] = [[46, 22, 0], [49, 22, 1], [52, 22, 2], [4, 28, 1], [7, 28, 0], [3, 36, 2], [10, 36, 1]];
  for (const [x, y, i] of leds) {
    const on = ((T >> 3) + i) % 3 !== 0;
    const l = on ? (i % 2 ? Layer.LED_B : Layer.LED_A) : Layer.CABLE;
    b.rect(x, y, 2, 2, l);
  }
}

// ---------- swamp (slime) ----------
const GSHROOM = ['.XXXXX.', 'XXXXXXX'];
const swampBack: Painter = (b, phase) => {
  vline(b, 0, 14, 59, Layer.STALAC); vline(b, 1, 20, 59, Layer.STALAC); vline(b, 2, 28, 59, Layer.STALAC);
  vline(b, 63, 10, 59, Layer.STALAC); vline(b, 62, 18, 59, Layer.STALAC); vline(b, 61, 30, 59, Layer.STALAC);
  for (const [x, len] of [[34, 8], [38, 4], [44, 12], [50, 7], [27, 5], [58, 6]] as [number, number][]) {
    for (let k = 0; k < len; k++) { const half = Math.round(((len - k) / len) * 2.4); hline(b, x - half, x + half, k, Layer.STALAC); }
  }
  for (const [x, y, big] of [[8, 54, 1], [24, 57, 0], [41, 56, 1], [55, 55, 0]] as [number, number, number][]) {
    spr(b, GSHROOM, x, y, { X: Layer.GLOW_SHROOM }); vline(b, x + 3, y + 2, 59, Layer.STALAC); if (big) vline(b, x + 2, y + 2, 59, Layer.STALAC);
    if (phase !== 'day') for (let dy = -2; dy < 4; dy++) for (let dx = -2; dx < 10; dx++) if ((dx + dy) % 2 === 0 && (dx < 0 || dx > 6 || dy < 0)) b.set(x + dx, y + dy, Layer.GLOW_SHROOM);
  }
};
const swampFore: Painter = (b) => {
  hline(b, 4, 16, 59, Layer.PUDDLE); hline(b, 6, 14, 58, Layer.PUDDLE); hline(b, 44, 58, 59, Layer.PUDDLE); hline(b, 46, 56, 58, Layer.PUDDLE);
  for (let x = 0; x < N; x += 2) b.set(x, 62, Layer.STALAC);
  for (let x = 1; x < N; x += 5) b.set(x, 63, Layer.PUDDLE);
  b.set(10, 58, Layer.DEW); b.set(51, 58, Layer.DEW);
};
function swampLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  [[44, 11], [50, 6], [34, 7]].forEach(([x, tip], i) => {
    const u = ((T >> 1) + i * 7) % 20, y = tip + Math.round((u * u) / 7);
    if (y < 58) { b.set(x, y, Layer.DEW); b.set(x, y + 1, Layer.DEW); }
    else if (u < 19 && x >= 44) { b.set(x - 1, 59, Layer.DEW); b.set(x + 1, 59, Layer.DEW); }
  });
}

// ---------- garden (bug) ----------
const gardenBack: Painter = (b) => {
  leaf(b, 0, 59, 19, 28, 5.5, Layer.LEAF_BIG, Layer.CANOPY);
  leaf(b, 63, 59, 45, 32, 5.5, Layer.LEAF_BIG, Layer.CANOPY);
  leaf(b, 12, 59, 3, 40, 3, Layer.CANOPY, Layer.LEAF_BIG);
  // flower heads on stems
  vline(b, 26, 44, 59, Layer.CLOVER); vline(b, 36, 49, 59, Layer.CLOVER);
  disc(b, 26, 40, 4.4, Layer.CORAL_A); disc(b, 26, 40, 2, Layer.DAISY_C);
  disc(b, 36, 46, 3.2, Layer.CORAL_B); disc(b, 36, 46, 1.2, Layer.DAISY_C);
  for (const [x, y] of [[23, 37], [29, 37], [23, 43], [29, 43]]) b.set(x, y, 0);
};
const gardenFore: Painter = (b) => {
  for (const x of [9, 22, 33, 50]) { hline(b, x, x + 2, 58, Layer.ROCK); hline(b, x - 1, x + 3, 59, Layer.ROCK); }
  for (let x = 1; x < N; x += 4) b.set(x, 62, Layer.BARK);
};
function gardenLive(b: Buf, s: Scene) {
  const T = tickOf(s);
  const X = [1, 4, 8, 13, 31, 55, 58, 62], H = [17, 14, 11, 8, 6, 12, 15, 18];
  X.forEach((x, i) => {
    for (let k = 0; k < H[i]; k++) b.set(x + Math.round(Math.sin(T / 14 + x) * 1.6 * (k / H[i])), 59 - k, i % 2 ? Layer.CLOVER : Layer.CANOPY);
  });
  [[8, 45], [12, 40], [53, 45], [49, 40], [5, 52]].forEach(([x, y], i) => {
    if (((T >> 3) + i) % 4 !== 0) { b.set(x, y, Layer.DEW); b.set(x + 1, y, Layer.DEW); b.set(x, y + 1, Layer.DEW); }
  });
}

// ---------- dispatch ----------
const STATIC_BACK: Partial<Record<Biome, Painter>> = {
  woods: woodsBack, underwater: waterBack, sky: skyBack, yard: yardBack, clouds: cloudsBack, ember: emberBack,
  warren: warrenBack, crags: cragsBack, workshop: workshopBackStatic, swamp: swampBack, garden: gardenBack,
};
const STATIC_FORE: Partial<Record<Biome, Painter>> = {
  woods: woodsFore, underwater: waterFore, sky: skyFore, yard: yardFore, clouds: cloudsFore, ember: emberFore,
  warren: warrenFore, crags: cragsFore, workshop: workshopFore, swamp: swampFore, garden: gardenFore,
};

/** Scenery behind the meadow layers (trees, hills, mountains, walls, water light...). Call on an empty buffer, before drawSky. */
export function drawBackdrop(b: Buf, s: Scene, biome: Biome) {
  if (biome === 'meadow') return;
  const phase = phaseOf(s.hour), rain = s.weather === 'rain';
  blit(b, biome, 'back', phase, rain, STATIC_BACK[biome], false);
  switch (biome) {
    case 'woods': woodsLive(b, s, phase); break;
    case 'underwater': waterLive(b, s, phase); break;
    case 'sky': skyLive(b, s); break;
    case 'clouds': cloudsLive(b, s); break;
    case 'ember': emberLive(b, s); break;
    case 'warren': warrenLive(b, s); break;
    case 'crags': cragsLive(b, s); break;
    case 'workshop': workshopLive(b, s); break;
    case 'swamp': swampLive(b, s); break;
    case 'garden': gardenLive(b, s); break;
  }
}
/** Floor props, painted only into pixels the meadow layers left unlit. Call after drawGround. */
export function drawFore(b: Buf, s: Scene, biome: Biome) {
  if (biome === 'meadow') return;
  blit(b, biome, 'fore', phaseOf(s.hour), s.weather === 'rain', STATIC_FORE[biome], true);
}
export { GROUND_Y };
