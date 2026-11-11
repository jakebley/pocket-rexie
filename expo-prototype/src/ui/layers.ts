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
  // ---- pet shading (Technicolor tones; Traditional prints all of them as ink, see shading.ts) ----
  /** shadow side of the body (bottom-right, cool) */ SHADE: 31, /** deep underside shadow */ DEEP: 32, /** lighter belly / chest */ BELLY: 33,
  /** accent tip: analogous hue */ ACCENT: 34, /** accent tip: dark (socks, ear tips) */ ACCENT_DARK: 35, /** accent tip: cream (paws, tail tip, horns) */ ACCENT_LIGHT: 36,
  /** outline on the lit (top-left) side: rim light */ RIM: 37, /** dark ring of an eye hole */ EYE: 38, /** tiny specular glint / sheen */ GLINT: 39,
  // ---- biome cues (drawn in Traditional too, a few pixels each) ----
  /** fish: surface wave line */ WAVE: 40,
  /** bunny: burrow mouth outline */ HOLE: 41,
  /** dragon: a small far peak outline */ PEAK: 42,
  // ---- biome scenery (Technicolor only: Traditional renders these as unlit) ----
  BARK: 43, CANOPY: 44, LITTER: 45, MOSS: 46, SHROOM: 47, FIREFLY: 48, FERN: 49,
  WATER_LIGHT: 50, AIR_BUBBLE: 51, SEAWEED: 52, CORAL_A: 53, CORAL_B: 54, SAND: 55,
  HILL: 56, WALL: 57, ROOF: 58, WINDOW: 59, WOOD: 60, YARN: 61,
  TWINKLE: 62, CLOUD_SHADE: 63, EMBER: 64, ASH: 65, ROCK: 66, CRAG: 67, CAVE: 68, LAVA: 69,
  GRIDLINE: 70, PANEL: 71, GEAR: 72, LED_A: 73, LED_B: 74, SCREEN: 75, CABLE: 76,
  STALAC: 77, GLOW_SHROOM: 78, PUDDLE: 79, DEW: 80,
  BURROW: 81, CLOVER: 82, CARROT: 83, DAISY: 84, DAISY_C: 85, LEAF_BIG: 86,
  // ---- pet eyes (Technicolor only, like scenery: Traditional leaves the unlit eye hole unlit). Opaque pupil and catch-light that fill the hole ----
  EYE_FILL: 87, EYE_SHINE: 88,
  // ---- space biome (aliens): starfield, planet, moon pits, glowing crystals, saucer hull ----
  STARFIELD: 89, PLANET: 90, PLANET_SHADE: 91, CRATER: 92, CRYSTAL: 93, HULL: 94,
} as const;
export type LayerCode = (typeof Layer)[keyof typeof Layer];
// biomes A: slot layers 95..127 (colours per biome in biome96/colorsA.ts). Codes must stay < 128 (DIM_FLAG 0x80 shares the byte): the slots are PER-BIOME meanings, so other biome agents reuse the same codes.
export const LAYER_COUNT = 128;
/** First biome-scenery layer. Codes from here up are Technicolor-only (Traditional draws them unlit), except the cue layers. */
export const SCENERY_FROM = Layer.BARK;
/** Does Traditional mode draw this layer code? (Shared layers 1..30 and the three cues: yes. Scenery: no.) */
export const tradVisible = (l: number) => l < SCENERY_FROM;
/** OR-ed onto a code by the lights-off dither: the pixel is drawn darker in Technicolor (still non-zero, so ink in Traditional). */
export const DIM_FLAG = 0x80;
export const LAYER_MASK = 0x7f;
export const ALL_LAYERS: number[] = Array.from({ length: LAYER_COUNT - 1 }, (_, i) => i + 1);

export type Line = 'baby' | 'meat' | 'veggie' | 'pasta' | 'neglect';
export type Rows = string[];

/** Every code a pet sprite can carry (the scenery must never overwrite these). */
export const PET_LAYER_CODES: ReadonlySet<number> = new Set<number>([
  Layer.OUTLINE, Layer.BODY, Layer.BODY_LIGHT, Layer.SHADE, Layer.DEEP, Layer.BELLY, Layer.ACCENT, Layer.ACCENT_DARK, Layer.ACCENT_LIGHT, Layer.RIM, Layer.EYE, Layer.GLINT, Layer.EYE_FILL, Layer.EYE_SHINE,
]);

/**
 * The original flat split, kept as the reference for the lit pixel set (test/shading.ts); the renderer uses shading.ts.
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
