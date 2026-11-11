// Shared drawing helpers for the 96x96 (Technicolor) mini-game painters: 10x10 family glyphs, the pet sprite fitted to a box, the field backdrop
// (the family's finer 96 biome), the HUD strip and small text effects. Game rules stay in 64-space logic units; `g96` converts them to cells.
import { SPECIES_BY_ID, type Pet } from '../../core/pet';
import type { Glyph } from '../../core/minigames/themes';
import { G10 } from '../art96';
import { biomeOf } from '../biomes';
import { DIM_FLAG, LAYER_MASK, Layer, SCENERY_FROM } from '../layers';
import { Buf, GRID_TECH, scale3xCached, textWidth } from '../pixel';
import { initScene, type Scene } from '../scene';
import { drawBackdrop96, g96, GROUND_Y96 } from '../sceneDraw96';
import { shadedPetLayers } from '../shading';
import { TONE_LAYER, fitRows } from './common';

export { g96 };
export const N96 = GRID_TECH;
/** the row the pet's feet stand on in a field (logic row 59) and the first ground row */
export const FEET96 = g96(59);
export const GROUND96 = GROUND_Y96;
/** height of the HUD strip along the top */
export const HUD96_H = 11;

// scenery-layer details inside glyphs (Technicolor): dark and light
const DETAIL_DARK = Layer.CABLE;
const DETAIL_LIGHT = Layer.DAISY;

/** Light tones get a dark outline, dark tones a cream one, so a glyph reads over any backdrop (CABLE and DAISY keep their polarity on dark skies, INK does not). */
const LIGHT_TONES = new Set(['white', 'yellow', 'gold', 'ice', 'pink', 'cyan', 'orange', 'green']);
const glyphLayer = (gl: Glyph, c: string): number => (c === '#' ? TONE_LAYER[gl.main] : c === 'a' ? TONE_LAYER[gl.acc ?? gl.main] : c === 'o' ? DETAIL_DARK : c === 'w' ? DETAIL_LIGHT : 0);

/** A 10x10 glyph with its top-left at x,y. The halo clears a 1px ring so it reads over any backdrop. */
export function drawGlyph96(b: Buf, gl: Glyph, x: number, y: number, halo = true) {
  drawGlyphMark96(b, gl, x, y, halo, 'none', 0);
}
/** A glyph with a mark: 'danger' = a dotted red aura, 'prize' = twinkling sparks. */
export function drawGlyphMark96(b: Buf, gl: Glyph, x: number, y: number, halo: boolean, mark: 'none' | 'danger' | 'prize', ms: number) {
  const px = Math.round(x), py = Math.round(y);
  const h = gl.rows.length, w = gl.rows[0].length;
  if (halo) {
    const ring = LIGHT_TONES.has(gl.main) ? Layer.CABLE : Layer.DAISY;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (gl.rows[j][i] === '.') continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(px + i + dx, py + j + dy, ring);
    }
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const l = glyphLayer(gl, gl.rows[j][i]);
    if (l) b.set(px + i, py + j, l);
  }
  if (mark === 'danger') {
    const ph = Math.floor(ms / 250) % 2;
    for (let j = -3; j < h + 3; j++) for (let i = -3; i < w + 3; i++) {
      const edge = i === -3 || j === -3 || i === w + 2 || j === h + 2;
      const corner = (i === -3 || i === w + 2) && (j === -3 || j === h + 2);
      if (edge && !corner && (i + j + ph + 60) % 2 === 0) b.set(px + i, py + j, Layer.ALERT);
    }
  } else if (mark === 'prize') {
    const k = Math.floor(ms / 220) % 2;
    const pts = k ? [[-3, 2], [w + 2, h - 3]] : [[w + 2, 2], [-3, h - 3]];
    for (const [i, j] of pts) { for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) b.set(px + i + dx, py + j + dy, Layer.SPARK); }
  }
}
/** The same glyph at scale k (blocks), no halo. */
export function drawGlyphScaled96(b: Buf, gl: Glyph, x: number, y: number, k: number, ring = false) {
  if (ring) {
    const rl = LIGHT_TONES.has(gl.main) ? Layer.CABLE : Layer.DAISY;
    for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) if (gl.rows[j][i] !== '.') b.rect(x + i * k - 1, y + j * k - 1, k + 2, k + 2, rl);
  }
  for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) {
    const l = glyphLayer(gl, gl.rows[j][i]);
    if (l) b.rect(x + i * k, y + j * k, k, k, l);
  }
}
/** The glyph as a one-colour silhouette (every lit cell in `layer`), for pads that light up. */
export function drawGlyphFlat96(b: Buf, gl: Glyph, x: number, y: number, k: number, layer: number) {
  for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) if (gl.rows[j][i] !== '.') b.rect(x + i * k, y + j * k, k, k, layer);
}

// ---------- text ----------
/** Text with a 1-cell unlit outline so it reads over scenery. */
export function textHalo(b: Buf, s: string, x: number, y: number, layer: number, scale = 1) {
  b.as(Layer.CABLE, () => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) b.text(s, x + dx, y + dy, scale); });
  b.as(layer, () => b.text(s, x, y, scale));
}
/** Centered text with a halo. */
export function textHaloC(b: Buf, s: string, cx: number, y: number, layer: number, scale = 1) {
  const w = textWidth(s, scale) - scale;
  textHalo(b, s, Math.round(cx - w / 2), y, layer, scale);
}

// ---------- the pet sprite, fitted to a box ----------
export interface PetArt96 { rows: string[]; codes: Uint8Array; w: number; h: number }
const cache = new Map<string, PetArt96>();
const inkSize = (rows: string[]) => {
  let x0 = 999, x1 = -1, y0 = 999, y1 = -1;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'X') { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } });
  return x1 < 0 ? { w: 1, h: 1 } : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
/**
 * The species sprite fitted to a w x h box. Small boxes use the crisp 32x32 art (cropped to its ink, scaled down only), boxes a good deal larger than
 * that sprite use the 48x48 Scale3x art (so a big pet keeps its blocky edges). The shading is the home scene's.
 */
export function petArt96(species: string, boxW: number, boxH: number, blink: boolean, flip: boolean): PetArt96 | null {
  const sp = SPECIES_BY_ID[species];
  if (!sp) return null;
  const key = `${species}|${boxW}|${boxH}|${blink ? 1 : 0}|${flip ? 1 : 0}`;
  let a = cache.get(key);
  if (!a) {
    const f = blink && sp.hiFrames[1] ? 1 : 0;
    const hi = sp.hiFrames[f];
    const ink = inkSize(hi);
    const big = boxW > ink.w * 1.12 || boxH > ink.h * 1.12;
    let rows = fitRows(big ? scale3xCached(sp.frames[blink && sp.frames[1] ? 1 : 0]) : hi, boxW, boxH);
    if (flip) rows = rows.map((r) => [...r].reverse().join(''));
    a = { rows, codes: shadedPetLayers(rows, sp.family), w: rows[0].length, h: rows.length };
    if (cache.size > 600) cache.clear();
    cache.set(key, a);
  }
  return a;
}
/** Draw the pet with its feet on row footY and its centre at cx. Clears a 1-cell ring of scenery around it. Returns the art box. */
export function drawPetFit96(b: Buf, species: string, cx: number, footY: number, boxW: number, boxH: number, o: { blink?: boolean; flip?: boolean; dx?: number; dy?: number } = {}) {
  const a = petArt96(species, boxW, boxH, !!o.blink, !!o.flip);
  if (!a) return null;
  const x = Math.max(0, Math.min(b.n - a.w, Math.round(cx - a.w / 2) + (o.dx ?? 0))), y = footY - a.h + 1 + (o.dy ?? 0); // the walls clamp it: a sprite never loses a column
  const on = (xx: number, yy: number) => a.rows[yy]?.[xx] === 'X';
  for (let j = -1; j <= a.h; j++) for (let i = -1; i <= a.w; i++) {
    if (!(on(i, j) || on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) continue;
    const xx = x + i, yy = y + j;
    if (xx < 0 || yy < 0 || xx >= b.n || yy >= b.n) continue;
    const idx = yy * b.n + xx;
    if ((b.px[idx] & LAYER_MASK) >= SCENERY_FROM) b.px[idx] &= DIM_FLAG;
    if (on(i, j)) b.px[idx] = 0;
  }
  b.layers(a.codes, a.w, x, y);
  return { x, y, w: a.w, h: a.h };
}
/** A flat shadow on the ground row under a body (cx, half width hw). */
export function groundShadow(b: Buf, cx: number, hw: number, y = GROUND96) {
  b.as(Layer.DIRT, () => { for (let i = -hw; i <= hw; i++) { if (Math.abs(i) >= hw - 1 && (i + hw) % 2) continue; b.set(Math.round(cx) + i, y + 1); } });
}

// ---------- backdrop and HUD ----------
/** The family's 96 biome behind the game: a clear day, with the ground band the pet stands on. `scenery: false` is the calm version (sky and plain ground). */
export function paintField96(b: Buf, pet: Pet, ms: number, scenery = true) {
  const base = initScene(pet, ms, 12);
  const sc: Scene = { ...base, nowMs: ms, weather: 'clear', dim: false, still: false, hour: 12, minute: 0, poopMask: 0, props: [], pops: [] };
  drawBackdrop96(b, sc, biomeOf(pet), scenery);
}

export interface HudOpts {
  /** a small centre text (a streak, a round) */
  mid?: string;
  /** hearts to show right of the centre: [full, total] */
  hearts?: [number, number];
  /** blink the right text (time running out) */
  urgent?: boolean;
  ms?: number;
}
/** The strip along the top of a field: a dark LCD panel with score on the left, time (or score) on the right, a progress bar underneath. */
export function paintHud96(b: Buf, left: string, right: string, fill: number, o: HudOpts = {}) {
  b.rect(0, 0, b.n, HUD96_H, Layer.CABLE);
  b.rect(0, HUD96_H - 3, b.n, 2, Layer.PANEL);
  b.rect(0, HUD96_H - 3, Math.max(0, Math.min(b.n, Math.round(b.n * fill))), 2, Layer.SPARK);
  b.rect(0, HUD96_H, b.n, 1, Layer.CABLE);
  const y = 2;
  b.as(Layer.GLINT, () => b.text(left, 2, y));
  const w = textWidth(right) - 1;
  const hot = o.urgent && Math.floor((o.ms ?? 0) / 300) % 2 === 0;
  b.as(hot ? Layer.ALERT : Layer.GLINT, () => b.text(right, b.n - w - 2, y));
  if (o.mid) b.as(Layer.SPARK, () => b.text(o.mid!, Math.round((b.n - (textWidth(o.mid!) - 1)) / 2), y));
  if (o.hearts) {
    const [full, total] = o.hearts;
    for (let i = 0; i < total; i++) mini(b, i < full ? G10.heartFull : G10.heartEmpty, 54 + i * 7, 1, Layer.HEART);
  }
}
/** a 10x10 glyph drawn at ~0.6: every other row and column skipped is ugly, so the HUD uses a 7x7 crop of the heart instead */
const HEART7 = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function mini(b: Buf, full: string[], x: number, y: number, layer: number) {
  const filled = full === G10.heartFull;
  HEART7.forEach((r, j) => [...r].forEach((c, i) => { if (c === 'X' && (filled || (j === 0 || j === 5 || i === 0 || i === 6 || (j === 1 && (i === 3 || i === 0)) || (i === 1 && j === 3) || (i === 5 && j === 3) || (j === 4 && (i === 2 || i === 4))))) b.set(x + i, y + j, layer); }));
}

// ---------- little UI pieces ----------
/** A filled rectangle with its four corners cut by one cell (the pixel-drawn rounded corner). */
export function roundRect(b: Buf, x: number, y: number, w: number, h: number, fill: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue;
    b.set(x + i, y + j, fill);
  }
}
/** A rounded panel: border layer around a fill layer (border 1 cell). */
export function panel(b: Buf, x: number, y: number, w: number, h: number, border: number, fill: number) {
  roundRect(b, x, y, w, h, border);
  roundRect(b, x + 1, y + 1, w - 2, h - 2, fill);
}
