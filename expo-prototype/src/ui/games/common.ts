// Shared drawing helpers for the game painters: family glyphs, the pet sprite scaled to fit a box, the biome backdrop and ground.
import { SPECIES_BY_ID, type Pet } from '../../core/pet';
import type { Glyph, Tone } from '../../core/minigames/themes';
import { Layer } from '../layers';
import { drawBackdrop, drawFore } from '../biomeDraw';
import { biomeOf } from '../biomes';
import { Buf } from '../pixel';
import { initScene, type Scene } from '../scene';
import { shadedPetLayers } from '../shading';

/** Theme tones as layer codes. Shared layers (< 43) print as ink in Traditional; the biome palettes leave these ones alone. */
export const TONE_LAYER: Record<Tone, number> = {
  red: Layer.HEART, rust: Layer.FOOD_MEAT, orange: Layer.BALL, yellow: Layer.FOOD_PASTA, gold: Layer.SPARK, green: Layer.FOOD_VEG,
  pink: Layer.SNACK, blue: Layer.WATER_DROP, ice: Layer.SNOW, cyan: Layer.WAVE, brown: Layer.TOOL, dbrown: Layer.POOP,
  purple: Layer.MAT, white: Layer.GLINT, grey: Layer.PEAK, ink: Layer.INK,
};
/** Scenery layers (Technicolor only): glyph detail pixels are dark / light in colour and unlit holes in Traditional. */
const DETAIL_DARK = Layer.CABLE;
const DETAIL_LIGHT = Layer.DAISY;

/** Draw a 7x7 family glyph with its top-left at x,y. A 1px halo of unlit pixels keeps it readable over any backdrop. */
export function drawGlyph(b: Buf, gl: Glyph, x: number, y: number, halo = true) {
  drawGlyphMark(b, gl, x, y, halo, 'none', 0);
}
/** A glyph with a mark around it: 'danger' = a dotted red aura (a checker ring, so it reads in Traditional too), 'prize' = twinkling sparks. */
export function drawGlyphMark(b: Buf, gl: Glyph, x: number, y: number, halo: boolean, mark: 'none' | 'danger' | 'prize', ms: number) {
  const main = TONE_LAYER[gl.main], acc = TONE_LAYER[gl.acc ?? gl.main];
  const px = Math.round(x), py = Math.round(y);
  if (halo) {
    for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) {
      if (gl.rows[j][i] === '.') continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(px + i + dx, py + j + dy, 0);
    }
  }
  for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) {
    const c = gl.rows[j][i];
    if (c === '#') b.set(px + i, py + j, main);
    else if (c === 'a') b.set(px + i, py + j, acc);
    else if (c === 'o') b.set(px + i, py + j, DETAIL_DARK);
    else if (c === 'w') b.set(px + i, py + j, DETAIL_LIGHT);
  }
  if (mark === 'danger') {
    // dotted aura two pixels out, on the pixels the halo left clear
    for (let j = -2; j < gl.rows.length + 2; j++) for (let i = -2; i < gl.rows[0].length + 2; i++) {
      const edge = i === -2 || j === -2 || i === gl.rows[0].length + 1 || j === gl.rows.length + 1;
      if (edge && (i + j + (Math.floor(ms / 250) % 2) + 40) % 2 === 0) b.set(px + i, py + j, Layer.ALERT);
    }
  } else if (mark === 'prize') {
    const k = Math.floor(ms / 220) % 2;
    const w = gl.rows[0].length, h = gl.rows.length;
    const pts = k ? [[-2, 1], [w + 1, h - 2]] : [[w + 1, 1], [-2, h - 2]];
    for (const [i, j] of pts) { b.set(px + i, py + j, Layer.SPARK); b.set(px + i - 1, py + j, Layer.SPARK); b.set(px + i + 1, py + j, Layer.SPARK); b.set(px + i, py + j - 1, Layer.SPARK); b.set(px + i, py + j + 1, Layer.SPARK); }
  }
}
/** The same glyph at scale k (blocks), no halo. */
export function drawGlyphScaled(b: Buf, gl: Glyph, x: number, y: number, k: number) {
  const main = TONE_LAYER[gl.main], acc = TONE_LAYER[gl.acc ?? gl.main];
  for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) {
    const c = gl.rows[j][i];
    const l = c === '#' ? main : c === 'a' ? acc : c === 'o' ? DETAIL_DARK : c === 'w' ? DETAIL_LIGHT : 0;
    if (l) b.rect(x + i * k, y + j * k, k, k, l);
  }
}

// ---------- the pet sprite, scaled to fit ----------
type Rows = string[];
const fitCache = new Map<string, { rows: Rows; codes: Uint8Array; w: number; h: number }>();

/** Crop a 32x32 sprite to its ink and box-filter it down to fit w x h (never up). Returns rows of 'X' and '.'. */
export function fitRows(src: Rows, boxW: number, boxH: number): Rows {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  src.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'X') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
  if (x1 < 0) return ['X'];
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const s = Math.min(boxW / bw, boxH / bh, 1);
  const w = Math.max(1, Math.round(bw * s)), h = Math.max(1, Math.round(bh * s));
  const out: Rows = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const sx0 = x0 + (x * bw) / w, sx1 = x0 + ((x + 1) * bw) / w, sy0 = y0 + (y * bh) / h, sy1 = y0 + ((y + 1) * bh) / h;
      let lit = 0, tot = 0;
      for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++) for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
        const wgt = (Math.min(xx + 1, sx1) - Math.max(xx, sx0)) * (Math.min(yy + 1, sy1) - Math.max(yy, sy0));
        if (wgt <= 0) continue;
        tot += wgt; if (src[yy]?.[xx] === 'X') lit += wgt;
      }
      line += tot > 0 && lit / tot >= 0.42 ? 'X' : '.';
    }
    out.push(line);
  }
  return out;
}

export interface PetArt { rows: Rows; codes: Uint8Array; w: number; h: number }
/** The species sprite scaled to fit a w x h box, shaded like the home scene (Traditional prints it as plain ink). */
export function petArt(species: string, boxW: number, boxH: number, blink: boolean, flip: boolean): PetArt | null {
  const sp = SPECIES_BY_ID[species];
  if (!sp) return null;
  const key = `${species}|${boxW}|${boxH}|${blink ? 1 : 0}|${flip ? 1 : 0}`;
  let a = fitCache.get(key);
  if (!a) {
    let rows = fitRows(sp.hiFrames[blink && sp.hiFrames[1] ? 1 : 0], boxW, boxH);
    if (flip) rows = rows.map((r) => [...r].reverse().join(''));
    a = { rows, codes: shadedPetLayers(rows, sp.family), w: rows[0].length, h: rows.length };
    if (fitCache.size > 400) fitCache.clear();
    fitCache.set(key, a);
  }
  return a;
}
/** Draw the pet with its feet at footY and its centre at cx. Returns the art box. */
export function drawPetFit(b: Buf, species: string, cx: number, footY: number, boxW: number, boxH: number, o: { blink?: boolean; flip?: boolean; dx?: number; dy?: number } = {}) {
  const a = petArt(species, boxW, boxH, !!o.blink, !!o.flip);
  if (!a) return null;
  const x = Math.round(cx - a.w / 2) + (o.dx ?? 0), y = footY - a.h + 1 + (o.dy ?? 0);
  // clear the biome scenery behind the silhouette so the pet reads against any backdrop
  for (let j = -1; j <= a.h; j++) for (let i = -1; i <= a.w; i++) {
    const near = (xx: number, yy: number) => a.rows[yy]?.[xx] === 'X';
    if (near(i, j) || near(i - 1, j) || near(i + 1, j) || near(i, j - 1) || near(i, j + 1)) b.set(x + i, y + j, 0);
  }
  b.layers(a.codes, a.w, x, y);
  return { x, y, w: a.w, h: a.h };
}

// ---------- backdrop ----------
export const FIELD_GROUND = 59;
/** The family's biome behind the game (always a clear day, so items stay readable), with a ground band at the bottom. */
export function paintField(b: Buf, pet: Pet, ms: number) {
  const biome = biomeOf(pet);
  const base = initScene(pet, ms, 12);
  const sc: Scene = { ...base, nowMs: ms, weather: 'clear', dim: false, still: false, hour: 12, minute: 0, poopMask: 0, props: [], pops: [] };
  drawBackdrop(b, sc, biome);
  b.rect(0, FIELD_GROUND + 1, b.n, 2, Layer.GROUND);
  b.as(Layer.DIRT, () => { for (let x = 0; x < b.n; x += 2) b.set(x, FIELD_GROUND + 3); for (let x = 1; x < b.n; x += 4) b.set(x, FIELD_GROUND + 4); });
  drawFore(b, sc, biome);
}

/** The strip along the top: two short texts and a bar. The scenery is cleared behind it so the text reads. */
export function paintHud(b: Buf, left: string, right: string, fill: number) {
  b.rect(0, 0, b.n, 8, 0);
  b.text(left, 1, 1);
  const w = right.length * 4 - 1;
  b.text(right, b.n - w - 1, 1);
  b.rect(0, 7, Math.max(0, Math.min(b.n, Math.round(b.n * fill))), 1, Layer.INK);
}

/** 5x5 star for the favourite game. */
export const STAR5 = ['..X..', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'];
