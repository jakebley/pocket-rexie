// Pixel-drawn chrome geometry for the Technicolor interface (docs/RESOLUTION.md "Interface chrome"): buttons, tiles, panels, the title bar and the
// message line are built from a grid of small cells instead of CSS borders and radii. Pure data and maths (no React), so the tests and the Swift
// port read the same numbers. A box is wc x hc cells; every cell is one of: outside, border (1 cell of ink), face, inner highlight (1 cell, top and left),
// inner shadow (1 cell, bottom and right). The corners are stepped: the table below says how many cells each row of a corner is cut.
import { mixHex } from './palette';

/** Cells cut from the left (and right) end of the first rows of a box, per corner radius: a stepped, rounded pixel corner. */
export const CORNER_STEPS: Record<number, number[]> = { 0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1], 5: [5, 3, 2, 1, 1] };
export const MAX_CORNER = 5;

export const Cell = { Out: 0, Border: 1, Face: 2, Hi: 3, Sh: 4 } as const;
export type BoxStyle = 'raised' | 'down' | 'inset' | 'tile' | 'tileOn' | 'flat';

/** Largest corner radius a box of this size can carry (the stepped corner never meets the opposite one). */
export const cornerFor = (wc: number, hc: number, r: number) => Math.max(0, Math.min(r, MAX_CORNER, Math.floor((Math.min(wc, hc) - 1) / 2)));

const cache = new Map<string, Uint8Array>();
/** Classify the cells of a wc x hc box with corner radius r (clamped). Row-major, wc * hc entries. */
export function boxCells(wc: number, hc: number, r: number): Uint8Array {
  wc = Math.max(1, Math.round(wc)); hc = Math.max(1, Math.round(hc));
  const rr = cornerFor(wc, hc, r);
  const key = `${wc}x${hc}r${rr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const steps = CORNER_STEPS[rr];
  const inset = (y: number) => (y < steps.length ? steps[y] : y >= hc - steps.length ? steps[hc - 1 - y] : 0);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < wc && y < hc && x >= inset(y) && x < wc - inset(y);
  const out = new Uint8Array(wc * hc);
  const isBorder = (x: number, y: number) => inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1));
  for (let y = 0; y < hc; y++) for (let x = 0; x < wc; x++) {
    if (!inside(x, y)) continue;
    if (isBorder(x, y)) { out[y * wc + x] = Cell.Border; continue; }
    const up = isBorder(x, y - 1), left = isBorder(x - 1, y), down = isBorder(x, y + 1), right = isBorder(x + 1, y);
    let c: number = Cell.Face;
    if (up && right) c = Cell.Hi; else if (down && left) c = Cell.Sh; else if (up || left) c = Cell.Hi; else if (down || right) c = Cell.Sh;
    out[y * wc + x] = c;
  }
  cache.set(key, out);
  return out;
}

export interface BoxColors { border: string; face: string | null; hi: string | null; sh: string | null }
/** Colours of a box style for a theme (ground / ink as the toy's two screen colours). Depth is a 1-cell bevel, never a gradient: it stays a flat LCD toy. */
export function boxColors(style: BoxStyle, ground: string, ink: string, dark: boolean): BoxColors {
  const lighter = (c: string) => (dark ? mixHex(c, ink, 0.2) : mixHex(c, '#FFFFFF', 0.5));
  const darker = (c: string) => (dark ? mixHex(c, '#05060C', 0.45) : mixHex(c, ink, 0.2));
  switch (style) {
    case 'raised': { const face = mixHex(ground, ink, dark ? 0.1 : 0.07); return { border: ink, face, hi: lighter(face), sh: darker(face) }; }
    case 'inset': { const face = mixHex(ground, ink, dark ? 0.04 : 0.1); return { border: ink, face, hi: darker(face), sh: lighter(face) }; }
    case 'down': return { border: ink, face: ink, hi: mixHex(ink, '#05060C', dark ? 0.0 : 0.3), sh: mixHex(ink, ground, 0.22) };
    case 'tileOn': return { border: ink, face: ink, hi: null, sh: null };
    case 'tile': return { border: mixHex(ground, ink, 0.32), face: null, hi: null, sh: null };
    default: return { border: ink, face: null, hi: null, sh: null };
  }
}

/** SVG path data per colour for a box: horizontal runs of cells ("M x y h n v1 h-n z"), in cell units. */
export function boxPaths(wc: number, hc: number, r: number, colors: BoxColors): { color: string; d: string }[] {
  const cells = boxCells(wc, hc, r);
  wc = Math.max(1, Math.round(wc)); hc = Math.max(1, Math.round(hc));
  const by: Record<string, string> = {};
  const colorOf = (c: number): string | null => (c === Cell.Border ? colors.border : c === Cell.Face ? colors.face : c === Cell.Hi ? colors.hi ?? colors.face : c === Cell.Sh ? colors.sh ?? colors.face : null);
  for (let y = 0; y < hc; y++) {
    let x = 0;
    while (x < wc) {
      const col = colorOf(cells[y * wc + x]);
      if (!col) { x++; continue; }
      let n = 1;
      while (x + n < wc && colorOf(cells[y * wc + x + n]) === col) n++;
      by[col] = (by[col] ?? '') + `M${x} ${y}h${n}v1h-${n}z`;
      x += n;
    }
  }
  return Object.entries(by).map(([color, d]) => ({ color, d }));
}

/** Cells of a box for a size in points and a cell size in points (rounded; the box is stretched at most half a cell per side to fill its frame exactly). */
export const cellsFor = (points: number, cp: number) => Math.max(1, Math.round(points / cp));
