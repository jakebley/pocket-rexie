// Layer codes stored in the framebuffer. 0 is "unlit". Traditional mode renders every non-zero code as ink;
// Technicolor maps each code to a palette color (see palette.ts and docs/COLOR_MODES.md).
// (An `as const` object rather than `const enum`: it works the same under tsc, esbuild and Babel.)
export const Layer = {
  OFF: 0,
  INK: 1, BODY: 2, OUTLINE: 3, SUN: 4, MOON: 5, STAR: 6, CLOUD: 7, RAIN: 8, GRASS: 9, GROUND: 10, DIRT: 11,
  FLOWER_A: 12, FLOWER_B: 13, HEART: 14, SMILE: 15, POOP: 16, FOOD_MEAT: 17, FOOD_VEG: 18, FOOD_PASTA: 19, SNACK: 20,
  TOOL: 21, SPARK: 22, BUBBLE: 23, WATER_DROP: 24, SNOW: 25, MAT: 26, BUTTERFLY: 27, ALERT: 28,
  /** soft top-left highlight on the pet body */
  BODY_LIGHT: 29,
  /** the play ball (own tone, tools stay wooden) */
  BALL: 30,
} as const;
export type LayerCode = (typeof Layer)[keyof typeof Layer];
export const LAYER_COUNT = 31;
/** OR-ed onto a code by the lights-off dither: the pixel is drawn darker in Technicolor (still non-zero, so ink in Traditional). */
export const DIM_FLAG = 0x80;
export const LAYER_MASK = 0x7f;
export const ALL_LAYERS: number[] = Array.from({ length: LAYER_COUNT - 1 }, (_, i) => i + 1);

export type Line = 'baby' | 'meat' | 'veggie' | 'pasta' | 'neglect' | 'hunter' | 'forager' | 'riverside' | 'stray';
export type Rows = string[];

/**
 * Split a sprite into pet layers: OUTLINE = lit pixel with an unlit 4-neighbour (or on the grid edge),
 * BODY_LIGHT = interior pixel whose upper or left neighbour is outline, otherwise BODY. Returns one code per cell (0 = unlit).
 */
export function petLayers(rows: Rows): Uint8Array {
  const h = rows.length, w = rows[0]?.length ?? 0;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] === 'X';
  const out = new Uint8Array(w * h);
  const outline = (x: number, y: number) => on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    out[y * w + x] = outline(x, y) ? Layer.OUTLINE : (outline(x, y - 1) || outline(x - 1, y)) ? Layer.BODY_LIGHT : Layer.BODY;
  }
  return out;
}
