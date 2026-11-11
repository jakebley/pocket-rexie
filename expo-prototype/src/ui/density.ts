// Interface density per look: the ONE place the pixel-drawn chrome (text font, icon set, buttons, icon rows) reads its pixel metrics.
//
// Traditional keeps the chunky 3x5 font, 8x8 icons and 2pt-bordered buttons. Technicolor gets the finer interface in a later phase
// (docs/RESOLUTION.md "Interface chrome": about 5x7 font, 16x16 icons, pixel-drawn buttons and sheets). PixelText, PixelButton,
// IconBitmap and Toy's icon rows already read `density(mode)`, so that agent switches font, icon set and button style per look by editing
// the TECHNICOLOR entry below (add a font to `fonts`, icons to `icons`) and nothing else at the call sites. Both entries are identical today.
import { FONT, ICONS, gridFor, type GridN, type Look } from './pixel';

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
  /** largest / smallest label pixel size in the icon row (points per font pixel) */
  labelPsMax: number;
}

const FONT_3X5: FontDef = { id: '3x5', glyphs: FONT, w: 3, h: 5, adv: 4 };

const TRADITIONAL: Density = {
  look: 'traditional', grid: gridFor('traditional'), font: FONT_3X5, icons: ICONS, iconSize: 8, iconFill: 0.74,
  iconRowMin: 48, border: 2, btnMinH: 48, labelPsMax: 2,
};
/** Phase 1: same chrome as Traditional (only the LCD is finer). The chrome agent changes this entry. */
const TECHNICOLOR: Density = { ...TRADITIONAL, look: 'technicolor', grid: gridFor('technicolor') };

export const density = (look: Look): Density => (look === 'technicolor' ? TECHNICOLOR : TRADITIONAL);

/** Width of a string in font pixels for a density (the pixel.ts textWidth is the 3x5 case). */
export const textWidthD = (d: Density, s: string) => (s.length === 0 ? 0 : s.length * d.font.adv - 1);
