// Shared drawing kit for the 96x96 biome painters (biomes A). Static art is painted once per (biome, part, phase, rain) into a cached
// 96x96 layer grid and blitted; animated bits are drawn per frame without allocating.
import { Buf } from '../pixel';
import { TICK_MS, type Phase, type Scene } from '../scene';
import type { Ctx96 } from '../biome96';

export const N = 96;
export type Paint = (b: Buf, phase: Phase, rain: boolean) => void;

const CACHE = new Map<string, Uint8Array>();
let builds = 0;
/** How many static layers have been painted so far (tests: drawing the same scene twice must not paint again). */
export const staticBuilds = () => builds;
/** Blit a cached static layer (painted on first use) over the buffer; lit cells overwrite what is there. */
export function stat(c: Ctx96, part: string, paint: Paint) {
  const key = `${c.biome}|${part}|${c.phase}|${c.rain ? 1 : 0}`;
  let src = CACHE.get(key);
  if (!src) { const t = new Buf(N); paint(t, c.phase, c.rain); src = t.px; CACHE.set(key, src); builds++; }
  const px = c.b.px;
  for (let i = 0; i < src.length; i++) if (src[i]) px[i] = src[i];
}

export const tickOf = (s: Scene) => (s.still ? 0 : Math.floor(s.nowMs / TICK_MS));
/** deterministic pseudo-random in [0, 1) */
export const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- primitives ----------
export function px(b: Buf, x: number, y: number, l: number) { b.set(Math.round(x), Math.round(y), l); }
export function hline(b: Buf, x0: number, x1: number, y: number, l: number) { for (let x = x0; x <= x1; x++) b.set(x, y, l); }
export function vline(b: Buf, x: number, y0: number, y1: number, l: number) { for (let y = y0; y <= y1; y++) b.set(x, y, l); }
export function rect(b: Buf, x: number, y: number, w: number, h: number, l: number) { b.rect(x, y, w, h, l); }
export function line(b: Buf, x0: number, y0: number, x1: number, y1: number, l: number) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    b.set(x0, y0, l);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
export function ell(b: Buf, cx: number, cy: number, rx: number, ry: number, l: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / (rx + 0.3), dy = (y - cy) / (ry + 0.3);
    if (dx * dx + dy * dy <= 1) b.set(x, y, l);
  }
}
export const disc = (b: Buf, cx: number, cy: number, r: number, l: number) => ell(b, cx, cy, r, r, l);
/** A lit ball: light from the top left. */
export function ball(b: Buf, cx: number, cy: number, rx: number, ry: number, dark: number, mid: number, light: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / (rx + 0.3), dy = (y - cy) / (ry + 0.3);
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    const k = dx * 0.55 + dy * 0.85;
    b.set(x, y, k < -0.35 && d < 0.8 ? light : k > 0.3 ? dark : mid);
  }
}
/** Sprite from rows; legend maps a character to a layer. */
export function spr(b: Buf, rows: string[], x: number, y: number, lg: Record<string, number>, flip = false) {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) { const l = lg[flip ? r[r.length - 1 - i] : r[i]]; if (l) b.set(x + i, y + j, l); }
  }
}
/** Fill below a height function: top(x) is the first row filled; down to `to` (exclusive). */
export function ridge(b: Buf, top: (x: number) => number, to: number, l: number, edge?: number) {
  for (let x = 0; x < N; x++) {
    const t = Math.round(top(x));
    vline(b, x, t, to - 1, l);
    if (edge) b.set(x, t, edge);
  }
}
/** Ordered dither: set cell when the 4x4 Bayer threshold is below k (0..1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number, k: number) => BAYER[(y & 3) * 4 + (x & 3)] < k * 16;
export function dither(b: Buf, x0: number, y0: number, w: number, h: number, k: number, l: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (bayer(x, y, k)) b.set(x, y, l);
}
/** A leaf: a lens along the spine (x0,y0)-(x1,y1) with half-width hw; the midrib is drawn in `rib`. */
export function leaf(b: Buf, x0: number, y0: number, x1: number, y1: number, hw: number, l: number, rib: number) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  const minX = Math.floor(Math.min(x0, x1) - hw), maxX = Math.ceil(Math.max(x0, x1) + hw);
  const minY = Math.floor(Math.min(y0, y1) - hw), maxY = Math.ceil(Math.max(y0, y1) + hw);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const t = ((x - x0) * dx + (y - y0) * dy) / L2;
    if (t < 0 || t > 1) continue;
    const d = Math.abs((x - x0) * dy - (y - y0) * dx) / L;
    if (d <= hw * Math.pow(Math.sin(Math.PI * t), 0.7)) b.set(x, y, d < 0.6 && rib ? rib : l);
  }
}
/** A clump of foliage: overlapping little balls shaded dark / mid / light. */
export function clump(b: Buf, cx: number, cy: number, r: number, seed: number, dark: number, mid: number, light: number, n = 7) {
  for (let i = 0; i < n; i++) {
    const a = rnd(seed + i) * 6.283, d = rnd(seed + i + 50) * r * 0.55;
    ball(b, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.45 + rnd(seed + i + 90) * 0.25), r * (0.4 + rnd(seed + i + 90) * 0.2), dark, mid, light);
  }
}
