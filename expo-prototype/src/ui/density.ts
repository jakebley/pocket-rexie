// Interface density per look: the ONE place the pixel-drawn chrome (text font, icon set, buttons, icon rows) reads its pixel metrics.
//
// Traditional keeps the chunky 3x5 font, 8x8 icons and 2pt-bordered CSS buttons exactly. Technicolor (docs/RESOLUTION.md "Interface chrome") gets the
// finer interface: a 5x7 font drawn at a smaller pixel, 16x16 icons, and buttons / tiles / panels / title bar / message line built from small
// pixel cells with stepped rounded corners and a 1-cell bevel (chrome96.ts) instead of CSS borders. PixelText, PixelButton, PixelBox, IconBitmap and
// Toy's icon rows all read `density(mode)`; switching a look's chrome means editing its entry here and nothing at the call sites.
import { FONT, GLYPHS, ICONS, gridFor, type GridN, type Look } from './pixel';
import { FONT5X7, FONT5X7_ADV, FONT5X7_H, FONT5X7_W } from './font5x7';
import { ICONS16 } from './icons16';

export interface FontDef {
  id: string;
  /** glyph bitmaps, rows of 'X' and '.' (all the same size) */
  glyphs: Record<string, string[]>;
  /** glyph box in font pixels */ w: number; h: number;
  /** pen advance per character in font pixels (glyph width plus one column of spacing) */ adv: number;
}
export interface Density {
  look: Look;
  /** the LCD grid of this look */
  grid: GridN;
  font: FontDef;
  /** the action icons: bitmaps of iconSize x iconSize */
  icons: Record<string, string[]>;
  iconSize: number;
  /** icon bitmap size as a fraction of its square tile */
  iconFill: number;
  /** minimum height of one icon row in points (the row grows with the tile; never assume the 8x8 icon size) */
  iconRowMin: number;
  /** button border width in points and minimum touch height */
  border: number;
  btnMinH: number;
  /** largest / smallest label pixel size in the icon row (points per font pixel, in the callers' units: see textScale) */
  labelPsMax: number;
  /** 'flat': CSS-bordered rectangles (Traditional). 'pixel': boxes drawn from cp-sized cells with stepped corners and a bevel (Technicolor). */
  chrome: 'flat' | 'pixel';
  /** points per chrome cell (border, bevel and corner step size) before snapping to whole device pixels */
  cp: number;
  /** callers give a font pixel size `ps` in 3x5-font points; the real size of one font pixel is ps * textScale (1 for Traditional) */
  textScale: number;
  /** corner radius in cells for buttons / tiles, and for big buttons (A B C) and cards */
  corner: number; cornerBig: number;
  /** pixel size multiplier of the big A / B / C labels (in callers' units) */
  bigLabelPs: number;
  /** small glyphs of the chrome by name, as bitmaps */
  glyphs: Record<'gear' | 'lock' | 'tick' | 'close', { rows: string[]; size: number }>;
}

const FONT_3X5: FontDef = { id: '3x5', glyphs: FONT, w: 3, h: 5, adv: 4 };

const FONT_5X7: FontDef = { id: '5x7', glyphs: FONT5X7, w: FONT5X7_W, h: FONT5X7_H, adv: FONT5X7_ADV };

const GEAR8 = ['...XX...', '.X.XX.X.', '..XXXX..', 'XXX..XXX', 'XXX..XXX', '..XXXX..', '.X.XX.X.', '...XX...'];
const CHECK7 = ['.......', '......X', '.....XX', 'X...XX.', 'XX.XX..', '.XXX...', '..X....'];
const CLOSE7 = ['X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X...X.', 'X.....X'];

const TRADITIONAL: Density = {
  look: 'traditional', grid: gridFor('traditional'), font: FONT_3X5, icons: ICONS, iconSize: 8, iconFill: 0.74,
  iconRowMin: 48, border: 2, btnMinH: 48, labelPsMax: 2,
  chrome: 'flat', cp: 2, textScale: 1, corner: 0, cornerBig: 0, bigLabelPs: 5,
  glyphs: { gear: { rows: GEAR8, size: 8 }, lock: { rows: GLYPHS.lock, size: 5 }, tick: { rows: CHECK7, size: 7 }, close: { rows: CLOSE7, size: 7 } },
};
const TECHNICOLOR: Density = {
  look: 'technicolor', grid: gridFor('technicolor'), font: FONT_5X7, icons: ICONS16, iconSize: 16, iconFill: 0.9,
  iconRowMin: 48, border: 1, btnMinH: 48, labelPsMax: 2,
  chrome: 'pixel', cp: 1.5, textScale: 0.62, corner: 3, cornerBig: 5, bigLabelPs: 6,
  glyphs: { gear: { rows: ICONS16.gear, size: 16 }, lock: { rows: ICONS16.lock, size: 16 }, tick: { rows: ICONS16.tick, size: 16 }, close: { rows: ICONS16.close, size: 16 } },
};

export const density = (look: Look): Density => (look === 'technicolor' ? TECHNICOLOR : TRADITIONAL);

/** Width of a string in font pixels for a density (the pixel.ts textWidth is the 3x5 case). */
export const textWidthD = (d: Density, s: string) => (s.length === 0 ? 0 : s.length * d.font.adv - 1);

/** Real size in points of one font pixel for a caller's `ps` (3x5-font points). */
export const fontPx = (d: Density, ps: number) => ps * d.textScale;
/** Width in points of a string drawn with caller size `ps`. */
export const textPoints = (d: Density, s: string, ps: number) => textWidthD(d, s) * fontPx(d, ps);
/** Largest label of a set, in font pixels. */
export const widestD = (d: Density, ss: string[]) => ss.reduce((m, s) => Math.max(m, textWidthD(d, s)), 0);

/**
 * Wrap a message into at most two lines that fit `avail` points and pick the pixel size (in the callers' ps units, between minPs and maxPs when it fits).
 * `snapDown` rounds a real font-pixel size down to whole device pixels (identity in tests). With the 3x5 font and textScale 1 this is exactly the
 * historical Traditional behaviour.
 */
export function fitLinesD(d: Density, text: string, avail: number, maxPs = 3, minPs = 2, snapDown: (px: number) => number = (v) => v, minPx = 0): { lines: string[]; ps: number } {
  const sc = d.textScale;
  const wpx = (s: string) => textWidthD(d, s);
  // one pixel size for the lines: Traditional keeps the historical floor of 1; a finer look snaps the real size down to whole device pixels
  const size = (maxP: number, widest: number) => (sc === 1 ? Math.max(1, Math.min(maxP, avail / widest)) : snapDown(Math.min(maxP * sc, avail / widest)) / sc);
  if (text.includes('\n')) {
    const lines = text.split('\n').slice(0, 2);
    return { lines, ps: size(maxPs, Math.max(...lines.map(wpx))) };
  }
  const one = size(maxPs, wpx(text));
  const fits = sc === 1 || wpx(text) * one * sc <= avail + 0.01; // a snapped-up size must not overflow
  if ((one >= minPs - 1e-9 && fits) || text.length < 2) return { lines: [text], ps: one };
  const per = Math.max(1, Math.floor((avail / Math.max(minPs * sc, minPx) + 1) / d.font.adv));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > per) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return { lines: lines.slice(0, 2), ps: size(minPs, Math.max(...lines.map(wpx))) };
}
