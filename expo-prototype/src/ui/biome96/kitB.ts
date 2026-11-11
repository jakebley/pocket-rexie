// Drawing kit for the 96x96 biome painters (set B: warren, crags, workshop, swamp, garden, space).
// Static art is painted once per (biome, part, phase, rain) into a cached 96x96 layer grid and blitted; only animated bits are drawn per frame.
import { Layer } from '../layers';
import { Buf } from '../pixel';
import { TICK_MS, type Phase, type Scene } from '../scene';

export const N = 96;
/** first ground row at 96 */
export const GY = 90;

export const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
export const tickOf = (s: Scene) => (s.still ? 0 : Math.floor(s.nowMs / TICK_MS));

// ---------- primitives ----------
export const hline = (b: Buf, x0: number, x1: number, y: number, l: number) => { for (let x = x0; x <= x1; x++) b.set(x, y, l); };
export const vline = (b: Buf, x: number, y0: number, y1: number, l: number) => { for (let y = y0; y <= y1; y++) b.set(x, y, l); };
export const px = (b: Buf, pts: number[][], l: number) => { for (const [x, y] of pts) b.set(x, y, l); };
/** Bresenham line. */
export function line(b: Buf, x0: number, y0: number, x1: number, y1: number, l: number) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), e = dx + dy, x = x0, y = y0;
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  for (;;) {
    b.set(x, y, l);
    if (x === x1 && y === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x += sx; }
    if (e2 <= dx) { e += dx; y += sy; }
  }
}
export function disc(b: Buf, cx: number, cy: number, r: number, l: number) {
  const r2 = r * r + 0.5;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) b.set(x, y, l);
  }
}
export function ellipse(b: Buf, cx: number, cy: number, rx: number, ry: number, l: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x - cx) / rx, v = (y - cy) / ry;
    if (u * u + v * v <= 1.02) b.set(x, y, l);
  }
}
/** Ring (outline of a disc). */
export function ring(b: Buf, cx: number, cy: number, r: number, l: number, th = 1) {
  const o = r * r + 0.5, i = (r - th) * (r - th) + 0.5;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d <= o && d >= i) b.set(x, y, l);
  }
}
/** A convex or concave polygon fill (even-odd scanline). */
export function poly(b: Buf, pts: number[][], l: number) {
  let y0 = 999, y1 = -999;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) b.set(x, y, l);
  }
}
/** Sprite from rows; `lg` maps characters to layers (missing / '.' = skipped). */
export function spr(b: Buf, rows: string[], x: number, y: number, lg: Record<string, number>) {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) { const l = lg[r[i]]; if (l) b.set(x + i, y + j, l); }
  }
}
/** A lens-shaped leaf along a spine with a midrib and side veins. */
export function leaf(b: Buf, x0: number, y0: number, x1: number, y1: number, hw: number, body: number, rib: number, vein = 0, light = 0) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  const minX = Math.floor(Math.min(x0, x1) - hw), maxX = Math.ceil(Math.max(x0, x1) + hw);
  const minY = Math.floor(Math.min(y0, y1) - hw), maxY = Math.ceil(Math.max(y0, y1) + hw);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const t = ((x - x0) * dx + (y - y0) * dy) / L2;
    if (t < 0 || t > 1) continue;
    const sd = ((x - x0) * dy - (y - y0) * dx) / L; // signed distance from the spine
    const d = Math.abs(sd);
    const w = hw * Math.pow(Math.sin(Math.PI * t), 0.75);
    if (d > w) continue;
    let l = body;
    if (light && sd < 0 && d > w * 0.45) l = light; // the lit side of the blade
    if (vein && d > 1 && d < w - 0.5 && Math.abs(((t * L) % 6) - Math.abs(sd) * 0.8 - 1) < 0.55) l = vein;
    if (d < 0.75) l = rib;
    b.set(x, y, l);
  }
}

// ---------- caches ----------
const CACHE = new Map<string, Uint8Array>();
/** The static layer grid of one part of a biome, painted once per (phase, rain). */
export function cachedPart(biome: string, part: string, phase: Phase, rain: boolean, paint: (b: Buf, phase: Phase, rain: boolean) => void): Uint8Array {
  const key = `${biome}|${part}|${phase}|${rain ? 1 : 0}`;
  let src = CACHE.get(key);
  if (!src) { const t = new Buf(N); paint(t, phase, rain); src = t.px; CACHE.set(key, src); }
  return src;
}
/** Number of cached static grids (tests: the static layer is cached, not repainted per frame). */
export const cacheSize = () => CACHE.size;
export function blit(b: Buf, src: Uint8Array, onlyEmpty = false) {
  const p = b.px;
  if (onlyEmpty) { for (let i = 0; i < src.length; i++) if (src[i] && !p[i]) p[i] = src[i]; } else for (let i = 0; i < src.length; i++) if (src[i]) p[i] = src[i];
}
const SKY_CODES = new Set<number>([Layer.SUN, Layer.MOON, Layer.STAR, Layer.CLOUD, Layer.BUTTERFLY]);
/** Clear the sky's sun, moon, stars and clouds where `back` has scenery in front (the sun sets behind the crags); rain stays in front. */
export function occlude(b: Buf, back: Uint8Array) {
  const p = b.px;
  for (let i = 0; i < back.length; i++) if (back[i] && SKY_CODES.has(p[i] & 0x7f)) p[i] = back[i];
}
/** Remove the outdoor sky (sun, moon, stars, clouds, dawn bands, rain) in front of the first `rows` rows; for caves, workshops and space. */
export function clearSky(b: Buf, back: Uint8Array | null, rows = GY) {
  const p = b.px, a = rows * N;
  for (let i = 0; i < a; i++) {
    const l = p[i] & 0x7f;
    if (SKY_CODES.has(l) || l === Layer.RAIN) p[i] = back ? back[i] : 0;
  }
}
