// Color modes: the Traditional monochrome LCD and the muted, nostalgic Technicolor palette.
// Spec and rationale: docs/COLOR_MODES.md. Hex values are the design; tune by eye.
import { ALL_LAYERS, LAYER_COUNT, Layer, type Line } from './layers';
import { ALWAYS_DARK, type Biome } from './biomes';
import type { Phase } from './scene';
import { A_FIRST, biomeAColors } from './biome96/colorsA'; // biomes A (96 slot colours, layers 95..127)

export type ColorMode = 'traditional' | 'technicolor';
export const COLOR_MODES: ColorMode[] = ['traditional', 'technicolor'];
export const isColorMode = (v: unknown): v is ColorMode => v === 'traditional' || v === 'technicolor';

export interface PaletteCtx { mode: ColorMode; dark: boolean; line?: Line; /** per-family body colour; wins over `line` */ bodyHex?: string; /** the scene sky is the night sky (ink-like layers flip light) */ night?: boolean; /** biome scenery and remaps (default: the dino meadow) */ biome?: Biome; phase?: Phase; rain?: boolean }
export interface ScreenColors { ground: string; ink: string }

// ---------- color math ----------
const hex2rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** a blended `t` (0..1) of the way toward b */
export function mixHex(a: string, b: string, t: number): string {
  const x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex(x.map((v, i) => v + (y[i] - v) * t));
}
// HSL helpers for the shading ramp (hue shifts, not just darkening)
function rgb2hsl(h: string): [number, number, number] {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hue = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, sat, l];
}
function hsl2hex(hue: number, s: number, l: number): string {
  const hh = (((hue % 360) + 360) % 360) / 360, q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return rgb2hex([f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]);
}
/** move hue `a` toward `b` by at most `deg` along the short way */
function hueToward(a: number, b: number, deg: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return a + Math.max(-deg, Math.min(deg, d));
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export interface ShadeRamp { hi: string; shade: string; deep: string; belly: string; accent: string; accentDark: string; accentLight: string; glint: string }
/** Four-tone body ramp (highlight warm and light, base, shadow cool and darker, deep underside) plus belly and accent tones, all derived from one body colour. */
export function shadeRamp(body: string, dark = false): ShadeRamp {
  const [h, s, l] = rgb2hsl(body);
  const gray = s < 0.12; // neutral bodies keep a neutral ramp but still lean warm / cool
  // lightness in HSL is not luminance (yellows are bright already), so each step is checked by contrast and pushed until it reads
  const step = (c: string, ref: string, ratio: number, toward: string): string => {
    for (let i = 0; i < 8 && (luminance(toward) > luminance(ref) ? luminance(c) < (luminance(ref) + 0.05) * ratio - 0.05 : luminance(c) > (luminance(ref) + 0.05) / ratio - 0.05); i++) c = mixHex(c, toward, 0.14);
    return c;
  };
  const hi = step(hsl2hex(hueToward(h, 48, 12), clamp01(s * 0.92), clamp01(l + (dark ? 0.1 : 0.12))), body, 1.14, '#FFFAE6');
  const shade = step(hsl2hex(hueToward(h, 252, 12), Math.min(0.6, clamp01(s * 0.92 + (gray ? 0.04 : 0))), clamp01(l * 0.8)), body, 1.2, '#1C1830');
  const deep = step(hsl2hex(hueToward(h, 258, 22), Math.min(0.46, clamp01(s * 0.8 + 0.03)), clamp01(l * 0.62)), shade, 1.22, '#1C1830');
  const belly = mixHex(mixHex(body, '#F6EBCB', dark ? 0.42 : 0.55), hi, 0.15);
  const ah = h < 200 ? h + 34 : h - 34;
  const accent = hsl2hex(ah, clamp01(Math.max(s * 0.95, 0.34)), clamp01(Math.min(0.58, Math.max(0.36, l + (l > 0.5 ? -0.06 : 0.06)))));
  const accentDark = mixHex(deep, body, 0.3);
  const accentLight = mixHex(body, dark ? '#E4DCC4' : '#F7EDD2', dark ? 0.62 : 0.78);
  return { hi, shade, deep, belly, accent, accentDark, accentLight, glint: dark ? '#E8E0CC' : '#FFFBEA' };
}

function luminance(h: string): number {
  const [r, g, b] = hex2rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio, 1..21 */
export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------- screen (outside the scene) ----------
const SCREEN: Record<ColorMode, Record<'light' | 'dark', ScreenColors>> = {
  traditional: { light: { ground: '#B5C19A', ink: '#2B3320' }, dark: { ground: '#1E2418', ink: '#B5C19A' } },
  technicolor: { light: { ground: '#EAE2CB', ink: '#34384A' }, dark: { ground: '#20243A', ink: '#E4DCC4' } },
};
export const screenColors = (mode: ColorMode, dark: boolean): ScreenColors => SCREEN[mode][dark ? 'dark' : 'light'];

// ---------- Technicolor, light appearance ("day") ----------
const T_LIGHT: Record<number, string> = {
  [Layer.INK]: '#34384A',
  [Layer.OUTLINE]: '#34384A',
  [Layer.SUN]: '#E2B94B', [Layer.MOON]: '#EDE6C8', [Layer.STAR]: '#F2EBCF', [Layer.CLOUD]: '#F1EDE0', [Layer.RAIN]: '#587C94',
  [Layer.GRASS]: '#7C9C63', [Layer.GROUND]: '#A98F67', [Layer.DIRT]: '#8F7752',
  [Layer.FLOWER_A]: '#C9707A', [Layer.FLOWER_B]: '#E0B84F',
  [Layer.HEART]: '#A8453F', [Layer.SMILE]: '#98701C', [Layer.POOP]: '#8D6A47',
  [Layer.FOOD_MEAT]: '#A9573E', [Layer.FOOD_VEG]: '#6F9A5B', [Layer.FOOD_PASTA]: '#D8B65D', [Layer.SNACK]: '#C98AA0',
  [Layer.TOOL]: '#9A7B52', [Layer.BALL]: '#C0634F', [Layer.SPARK]: '#F0D77A', [Layer.BUBBLE]: '#34384A',
  [Layer.WATER_DROP]: '#6FA3B8', [Layer.SNOW]: '#BFD8E2', [Layer.MAT]: '#8E6F8F', [Layer.BUTTERFLY]: '#C98AA0', [Layer.ALERT]: '#B8392E',
  // biome cues and scenery (docs/BIOMES.md)
  [Layer.WAVE]: '#D5F0F0', [Layer.HOLE]: '#4A3A2A', [Layer.PEAK]: '#6A5E6E',
  [Layer.BARK]: '#6E5238', [Layer.CANOPY]: '#4C7544', [Layer.LITTER]: '#B8793F', [Layer.MOSS]: '#7FA356', [Layer.SHROOM]: '#C4503C', [Layer.FIREFLY]: '#F4EA7A', [Layer.FERN]: '#5E9150',
  [Layer.WATER_LIGHT]: '#93DAE0', [Layer.AIR_BUBBLE]: '#D8F4F4', [Layer.SEAWEED]: '#2F8F6A', [Layer.CORAL_A]: '#E8826E', [Layer.CORAL_B]: '#B77FC0', [Layer.SAND]: '#E6D6A4',
  [Layer.HILL]: '#6F98B4', [Layer.WALL]: '#D8C6AA', [Layer.ROOF]: '#8C5A52', [Layer.WINDOW]: '#F4D06A', [Layer.WOOD]: '#C9B48C', [Layer.YARN]: '#D66F8E',
  [Layer.TWINKLE]: '#F2C84E', [Layer.CLOUD_SHADE]: '#DCE6F2', [Layer.EMBER]: '#FF9A3C', [Layer.ASH]: '#8A8284', [Layer.ROCK]: '#6E6560', [Layer.CRAG]: '#8F8092', [Layer.CAVE]: '#3A3038', [Layer.LAVA]: '#F2663A',
  [Layer.GRIDLINE]: '#5CC8C4', [Layer.PANEL]: '#6A7794', [Layer.GEAR]: '#9AA4B8', [Layer.LED_A]: '#6CF08C', [Layer.LED_B]: '#F2605A', [Layer.SCREEN]: '#7CE4F0', [Layer.CABLE]: '#2E3446',
  [Layer.STALAC]: '#54665C', [Layer.GLOW_SHROOM]: '#5FF0C0', [Layer.PUDDLE]: '#3F8074', [Layer.DEW]: '#D4EEF6',
  [Layer.STARFIELD]: '#C8D0F0', [Layer.PLANET]: '#C98A9E', [Layer.PLANET_SHADE]: '#8A5A86', [Layer.CRATER]: '#4A4C6A', [Layer.CRYSTAL]: '#7CF0E4', [Layer.HULL]: '#A8B0C8',
  [Layer.BURROW]: '#3A2C20', [Layer.CLOVER]: '#82B055', [Layer.CARROT]: '#E98A36', [Layer.DAISY]: '#F6F2E4', [Layer.DAISY_C]: '#F0C640', [Layer.LEAF_BIG]: '#5FA64C',
};

// ---------- biomes ----------
type Remap = Partial<Record<number, string>>;
/** Shared layers (sun, clouds, grass, ...) re-coloured to what they stand for in each biome. The pixels are the meadow's; only the colour changes. */
const REMAP: Partial<Record<Biome, Remap>> = {
  woods: { [Layer.GRASS]: '#5F8A4E', [Layer.GROUND]: '#8A6E48', [Layer.DIRT]: '#6E5638', [Layer.FLOWER_A]: '#C9553F', [Layer.FLOWER_B]: '#E6D8B0', [Layer.CLOUD]: '#DDE6D6' },
  underwater: {
    [Layer.SUN]: '#EAF8EA', [Layer.MOON]: '#DCECF8', [Layer.STAR]: '#CDEBF4', [Layer.CLOUD]: '#A8DCE2', [Layer.RAIN]: '#CFEAF0',
    [Layer.GRASS]: '#35956C', [Layer.GROUND]: '#D8C58F', [Layer.DIRT]: '#BBA874', [Layer.FLOWER_A]: '#E8826E', [Layer.FLOWER_B]: '#C58AC4', [Layer.BUTTERFLY]: '#F0A060',
  },
  sky: { [Layer.GRASS]: '#4F8A4A', [Layer.GROUND]: '#8A6A44', [Layer.DIRT]: '#6E5236', [Layer.FLOWER_A]: '#E89AB0', [Layer.FLOWER_B]: '#F2D878', [Layer.CLOUD]: '#FFFFFF' },
  yard: { [Layer.GROUND]: '#B79B6E', [Layer.DIRT]: '#957B54' },
  clouds: {
    [Layer.SUN]: '#F6DFA0', [Layer.MOON]: '#F4EEFF', [Layer.STAR]: '#FFFFFF', [Layer.CLOUD]: '#FFFFFF', [Layer.RAIN]: '#A9B6DE',
    [Layer.GRASS]: '#DDD6F0', [Layer.GROUND]: '#F6F2FD', [Layer.DIRT]: '#CFC6E6', [Layer.FLOWER_A]: '#F2A6C8', [Layer.FLOWER_B]: '#F6E08A', [Layer.BUTTERFLY]: '#9FD0F0',
  },
  ember: {
    [Layer.SUN]: '#FF9A4A', [Layer.MOON]: '#F0A070', [Layer.STAR]: '#FFB060', [Layer.CLOUD]: '#6E5E5E', [Layer.RAIN]: '#A09490',
    [Layer.GRASS]: '#8A5A3A', [Layer.GROUND]: '#4A3C3C', [Layer.DIRT]: '#32282A', [Layer.FLOWER_A]: '#E8602E', [Layer.FLOWER_B]: '#F0B040', [Layer.BUTTERFLY]: '#FF8A4A',
  },
  warren: { [Layer.GROUND]: '#9A7B55', [Layer.DIRT]: '#7C6044', [Layer.HILL]: '#9DBAA4', [Layer.SAND]: '#C2D2A6', [Layer.MOSS]: '#A6C46C', [Layer.ROCK]: '#8C8170', [Layer.HOLE]: '#80603E', [Layer.CLOVER]: '#7DA85A' },
  crags: {
    [Layer.SUN]: '#F0A850', [Layer.CLOUD]: '#BCABA2', [Layer.RAIN]: '#7C8A98', [Layer.GRASS]: '#7E7A58', [Layer.GROUND]: '#7A6E64', [Layer.DIRT]: '#5A5048',
    [Layer.FLOWER_A]: '#D8683C', [Layer.FLOWER_B]: '#E8B848', [Layer.BUTTERFLY]: '#E88050',
    [Layer.PEAK]: '#AEA2AC', [Layer.WALL]: '#C2B6B8', [Layer.STALAC]: '#4F454C', [Layer.ROCK]: '#6F6560', [Layer.CRAG]: '#988A98', [Layer.ASH]: '#8E8688',
  },
  workshop: {
    [Layer.SUN]: '#F6E6A0', [Layer.MOON]: '#E8EEF4', [Layer.STAR]: '#7CE0C8', [Layer.CLOUD]: '#C8CED8', [Layer.RAIN]: '#8AB4D0',
    [Layer.GRASS]: '#7A88A6', [Layer.GROUND]: '#5A6684', [Layer.DIRT]: '#3E465C', [Layer.FLOWER_A]: '#E86060', [Layer.FLOWER_B]: '#F0C850', [Layer.BUTTERFLY]: '#6FD0E0',
    [Layer.PANEL]: '#667392', [Layer.WALL]: '#8794B2', [Layer.ROOF]: '#B0764E', [Layer.LITTER]: '#D79A68', [Layer.BARK]: '#6E4A38', [Layer.WOOD]: '#9A7A58', [Layer.HOLE]: '#6A5040', [Layer.CLOUD_SHADE]: '#C4D0E2', [Layer.CABLE]: '#2A3044',
  },
  swamp: {
    [Layer.SUN]: '#C8E8A0', [Layer.MOON]: '#B8D8C0', [Layer.STAR]: '#8CF0C0', [Layer.CLOUD]: '#5E7C70', [Layer.RAIN]: '#6CC0A0',
    [Layer.GRASS]: '#4F7A3E', [Layer.GROUND]: '#3C4A34', [Layer.DIRT]: '#2A3628', [Layer.FLOWER_A]: '#7CE0B0', [Layer.FLOWER_B]: '#B8E86C', [Layer.BUTTERFLY]: '#B8F070',
    [Layer.ROCK]: '#3E5248', [Layer.CRAG]: '#5E7666', [Layer.CAVE]: '#18262A', [Layer.STALAC]: '#2F4238', [Layer.MOSS]: '#6C9A52', [Layer.FERN]: '#3A6644', [Layer.CLOUD_SHADE]: '#A6CDB8', [Layer.PUDDLE]: '#2D6C66', [Layer.LITTER]: '#6E5E3C', [Layer.BARK]: '#5A4634',
  },
  garden: { [Layer.GRASS]: '#5C9A44', [Layer.GROUND]: '#8E7048', [Layer.DIRT]: '#6E5636', [Layer.HILL]: '#93BC86', [Layer.MOSS]: '#8CC25E', [Layer.FERN]: '#4A8A48', [Layer.CANOPY]: '#3C7440', [Layer.ROCK]: '#8A806E', [Layer.CLOUD_SHADE]: '#E4EED8', [Layer.BARK]: '#6A5034', [Layer.YARN]: '#C85F72', [Layer.PLANET_SHADE]: '#8A5A98' },
  space: {
    [Layer.SUN]: '#FFE7A0', [Layer.MOON]: '#E8E4F6', [Layer.STAR]: '#FFFFFF', [Layer.CLOUD]: '#6D5CA6', [Layer.RAIN]: '#9CE8F0',
    [Layer.GRASS]: '#8C8EAA', [Layer.GROUND]: '#6E7090', [Layer.DIRT]: '#52546E', [Layer.FLOWER_A]: '#6CF0D8', [Layer.FLOWER_B]: '#F08AD0', [Layer.BUTTERFLY]: '#FFD870',
    [Layer.CRAG]: '#C8B2F0', [Layer.ROCK]: '#5A5C7C',
    [Layer.HILL]: '#352E72', [Layer.SAND]: '#42368A', [Layer.CLOUD_SHADE]: '#7A76B4', [Layer.CORAL_A]: '#D8A0A8', [Layer.STALAC]: '#4A4C6A', [Layer.WINDOW]: '#FFE08A',
  },
};
/** Layers that glow: they keep their colour at dusk and night instead of sinking into the shade. */
const GLOWS = new Set<number>([
  Layer.SUN, Layer.MOON, Layer.STAR, Layer.SPARK, Layer.WATER_LIGHT, Layer.FIREFLY, Layer.WINDOW, Layer.LAVA, Layer.EMBER, Layer.LED_A, Layer.LED_B,
  Layer.SCREEN, Layer.GLOW_SHROOM, Layer.TWINKLE, Layer.AIR_BUBBLE, Layer.WAVE, Layer.GRIDLINE, Layer.STARFIELD, Layer.CRYSTAL,
]);
const SCENERY_OLD = new Set<number>([Layer.GRASS, Layer.GROUND, Layer.DIRT, Layer.FLOWER_A, Layer.FLOWER_B, Layer.CLOUD, Layer.BUTTERFLY]);
const isScenery = (l: number) => l >= Layer.WAVE || SCENERY_OLD.has(l);
/** Phase shade of non-glowing scenery: [colour, amount]. Night also sinks per biome (underwater goes deep blue). */
const SHADE_NIGHT = 0.42;
const SHADE_NIGHT_TINT: Partial<Record<Biome, string>> = { underwater: '#0C2A52', swamp: '#0C1A18', workshop: '#141830', ember: '#1A0C10', space: '#0A0C26' };
function shadeFor(ctx: PaletteCtx): [string, number] | null {
  if (ctx.phase === 'night') return [SHADE_NIGHT_TINT[ctx.biome ?? 'meadow'] ?? '#101830', SHADE_NIGHT];
  if (ctx.rain && (ctx.phase === 'day' || ctx.phase === 'dusk')) return [ctx.biome === 'underwater' ? '#0E3A5E' : '#5A6A78', ctx.biome === 'underwater' ? 0.3 : 0.14];
  if (ctx.phase === 'dusk') return ['#8A4A6A', 0.14];
  if (ctx.phase === 'dawn') return ['#E8A878', 0.08];
  return null;
}

// Per biome and phase: dawn, day, dusk, night and rain sky; plus the fill under the ground band.
const SKY_BIOME: Record<Exclude<Biome, 'meadow'>, Record<Phase | 'rain', string>> = {
  woods: { dawn: '#C9C79C', day: '#9DB88E', dusk: '#B08A78', night: '#1F2B3A', rain: '#8A9C94' },
  underwater: { dawn: '#6AB0C2', day: '#5FB8CC', dusk: '#5496B2', night: '#0F3566', rain: '#58A0B2' },
  sky: { dawn: '#F0C9A8', day: '#8FC8F0', dusk: '#E0A088', night: '#27345E', rain: '#8E9EAE' },
  yard: { dawn: '#E6CBA9', day: '#B3D0DC', dusk: '#D2A08C', night: '#2A3558', rain: '#9CAAB2' },
  clouds: { dawn: '#F0D4DC', day: '#C3D2F2', dusk: '#D8BCE4', night: '#3A3E7A', rain: '#B1B8D4' },
  ember: { dawn: '#74423E', day: '#6C3A3A', dusk: '#7A3234', night: '#2C1620', rain: '#523638' },
  warren: { dawn: '#E3C9A9', day: '#AACBD4', dusk: '#D0A38F', night: '#2F3A5A', rain: '#9AA8B0' },
  crags: { dawn: '#E2B496', day: '#C9B6A2', dusk: '#C9785A', night: '#251D30', rain: '#A9A1AB' },
  workshop: { dawn: '#4F5B76', day: '#56627C', dusk: '#4E5872', night: '#262B40', rain: '#56627C' },
  swamp: { dawn: '#2E4A42', day: '#2F4C44', dusk: '#2A403C', night: '#16262A', rain: '#28403E' },
  garden: { dawn: '#E3D2A8', day: '#B5D8A0', dusk: '#D0A78F', night: '#26364A', rain: '#9DB0A0' },
  space: { dawn: '#3A2E72', day: '#231E56', dusk: '#34226A', night: '#0A0C2A', rain: '#1E2150' },
};
const SOIL_BIOME: Record<Exclude<Biome, 'meadow'>, string> = {
  woods: '#7A6444', underwater: '#BCA874', sky: '#7C5E3C', yard: '#B9A27A', clouds: '#E4DEF2', ember: '#3A2E30',
  warren: '#9A7B55', crags: '#625850', workshop: '#3C445A', swamp: '#2C3A2A', garden: '#6E5A3E', space: '#44466A',
};
/** Does the biome's backdrop read as dark in this phase (HUD glyphs and rim light use the night palette)? */
export const darkSky = (biome: Biome, phase: Phase): boolean => phase === 'night' || ALWAYS_DARK.has(biome);
const BODY: Record<Line, string> = {
  meat: '#C27358', veggie: '#6E9A6B', pasta: '#D1A94A', neglect: '#8A8F96', baby: '#E7DCC0',
};
const SKY: Record<Phase | 'rain', string> = { dawn: '#E3C9A9', day: '#A9C9D6', dusk: '#D0A38F', night: '#2F3A5A', rain: '#9AA8B0' };
const SOIL_LIGHT = '#CDBF9E';

// ---------- Technicolor, dark appearance ----------
const DARK_BLEND = 0.18; // light value blended toward the ground so it sits comfortably on dark
const DARK_OVERRIDE: Record<number, string> = {
  [Layer.OUTLINE]: '#D6CEB6', [Layer.INK]: '#E4DCC4', [Layer.BUBBLE]: '#E4DCC4',
  // small HUD glyphs are lifted so they glow on the deep dark sky
  [Layer.HEART]: '#F29E94', [Layer.SMILE]: '#E6C25C', [Layer.ALERT]: '#F08A7A', [Layer.RAIN]: '#8FB2C8',
};
// Light appearance at night: dark ink would vanish on the night sky, so ink-like and HUD layers flip light.
const NIGHT_OVERRIDE: Record<number, string> = {
  [Layer.INK]: '#E4DCC4', [Layer.BUBBLE]: '#E4DCC4', [Layer.HEART]: '#E0847A', [Layer.ALERT]: '#EE8678', [Layer.SMILE]: '#E6C25C',
};
const DARK_SKY_BLEND = 0.68;
const DARK_BODY_BLEND = 0.44;
const DARK_BODY_BLEND_BABY = 0.62; // the pale eggshell body needs to sink further to stay apart from the light outline
const DARK_SKY_NIGHT = '#1B2240';

const cache = new Map<string, string[]>();
/** Layer-indexed color table (index = layer code) for one context. Index 0 (unlit) is the screen ground. */
export function paletteTable(ctx: PaletteCtx): string[] {
  const biome = ctx.biome ?? 'meadow';
  const key = `${ctx.mode}|${ctx.dark}|${ctx.line ?? ''}|${ctx.bodyHex ?? ''}|${ctx.night ? 'n' : ''}|${biome}|${ctx.phase ?? ''}${ctx.rain ? 'r' : ''}`;
  let t = cache.get(key);
  if (t) return t;
  const sc = screenColors(ctx.mode, ctx.dark);
  t = new Array<string>(LAYER_COUNT + 1).fill(sc.ink);
  t[0] = sc.ground;
  if (ctx.mode === 'technicolor') {
    const g = sc.ground;
    const tone = (light: string) => (ctx.dark ? mixHex(light, g, DARK_BLEND) : light);
    const remap = REMAP[biome];
    const shade = biome === 'meadow' ? null : shadeFor(ctx);
    const slots = ctx.phase ? biomeAColors(biome, ctx.phase, !!ctx.rain) : undefined; // biome slot layers (95..) carry their own phase colours
    for (const l of ALL_LAYERS) {
      let c = (l >= A_FIRST ? slots?.[l] : undefined) ?? remap?.[l] ?? T_LIGHT[l] ?? T_LIGHT[Layer.INK];
      if (shade && isScenery(l) && !GLOWS.has(l) && !(l >= A_FIRST && slots)) c = mixHex(c, shade[0], shade[1]);
      t[l] = ctx.dark && DARK_OVERRIDE[l] ? DARK_OVERRIDE[l] : !ctx.dark && ctx.night && NIGHT_OVERRIDE[l] ? NIGHT_OVERRIDE[l] : ctx.dark && l >= A_FIRST + 6 && slots ? mixHex(c, g, 0.4) : tone(c); // biome tones sink further on the dark appearance (glow slots 95..100 keep their light)
    }
    const body = ctx.bodyHex ?? BODY[ctx.line ?? 'baby'] ?? BODY.baby;
    t[Layer.BODY] = ctx.dark ? mixHex(body, g, ctx.line === 'baby' || !ctx.line ? DARK_BODY_BLEND_BABY : DARK_BODY_BLEND) : body;
    // against the night sky a dark outline vanishes: rim-light it (only bodies dark enough to stand apart from a light rim; the rest keep the dark outline and read against the sky)
    if (ctx.night && !ctx.dark && contrast(t[Layer.BODY], '#E4DCC4') >= 3) t[Layer.OUTLINE] = '#E4DCC4';
    // a mid-tone body on a mid-dark backdrop (the workshop) can leave the dark outline too close to the sky: lift it to a dim cream
    if (ctx.night && !ctx.dark && ctx.phase && t[Layer.OUTLINE] === T_LIGHT[Layer.OUTLINE] && contrast(t[Layer.OUTLINE], skyFor(ctx, ctx.phase, !!ctx.rain, biome)) < 2.6) t[Layer.OUTLINE] = '#CFC7AE';
    const ramp = shadeRamp(t[Layer.BODY], ctx.dark);
    t[Layer.BODY_LIGHT] = ramp.hi;
    t[Layer.SHADE] = ramp.shade; t[Layer.DEEP] = ramp.deep; t[Layer.BELLY] = ramp.belly;
    t[Layer.ACCENT] = ramp.accent; t[Layer.ACCENT_DARK] = ramp.accentDark; t[Layer.ACCENT_LIGHT] = ramp.accentLight; t[Layer.GLINT] = ramp.glint;
    // eyes: an opaque dark pupil with a bright catch-light; on a very dark body the ring around it turns cream so the eye still reads
    const pupil = ctx.dark ? '#12141F' : '#1E2030';
    t[Layer.EYE_FILL] = pupil; t[Layer.EYE_SHINE] = '#FFFBEA';
    t[Layer.EYE] = luminance(t[Layer.BODY]) < 0.09 ? '#E4DCC4' : pupil;
    // rim light: the outline on the lit side. On a dark sky it glows; on a light sky it is the ink softened toward the body.
    const darkBackdrop = ctx.dark || !!ctx.night;
    t[Layer.RIM] = darkBackdrop ? mixHex(mixHex(t[Layer.OUTLINE], ramp.hi, 0.3), '#FFF8E4', 0.4) : mixHex(t[Layer.OUTLINE], t[Layer.BODY], 0.12);
  }
  cache.set(key, t);
  return t;
}

/** Color of one layer. Traditional: every lit layer is the ink. */
export function colorFor(layer: number, ctx: PaletteCtx): string {
  return paletteTable(ctx)[layer] ?? screenColors(ctx.mode, ctx.dark).ink;
}

/** Technicolor sky behind the scene by local phase and weather (rain overrides day and dusk). */
export function skyFor(ctx: PaletteCtx, phase: Phase, rain: boolean, biome: Biome = 'meadow'): string {
  const k: Phase | 'rain' = rain && (phase === 'day' || phase === 'dusk') ? 'rain' : phase;
  if (biome !== 'meadow') {
    const c = SKY_BIOME[biome][k];
    if (!ctx.dark) return c;
    return mixHex(c, screenColors(ctx.mode, true).ground, ALWAYS_DARK.has(biome) ? 0.3 : k === 'night' ? 0.4 : 0.6);
  }
  if (ctx.dark) return k === 'night' ? DARK_SKY_NIGHT : mixHex(SKY[k], screenColors(ctx.mode, true).ground, DARK_SKY_BLEND);
  return SKY[k];
}
/** Technicolor fill under the ground band. */
export function soilFor(ctx: PaletteCtx, biome: Biome = 'meadow'): string {
  if (biome !== 'meadow') return ctx.dark ? mixHex(SOIL_BIOME[biome], screenColors(ctx.mode, true).ground, 0.55) : SOIL_BIOME[biome];
  return ctx.dark ? mixHex(SOIL_LIGHT, screenColors(ctx.mode, true).ground, 0.55) : SOIL_LIGHT;
}
/** Lights-off darkening of final colors (whole sky) and the extra dither darkening. */
export const DIM_SKY = 0.4;
export const DIM_DITHER = 0.38;
export const darken = (c: string, k: number) => mixHex(c, '#0B0D18', k);
