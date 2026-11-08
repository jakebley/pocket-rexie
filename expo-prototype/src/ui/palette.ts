// Color modes: the Traditional monochrome LCD and the muted, nostalgic Technicolor palette.
// Spec and rationale: docs/COLOR_MODES.md. Hex values are the design; tune by eye.
import { ALL_LAYERS, Layer, type Line } from './layers';
import type { Phase } from './scene';

export type ColorMode = 'traditional' | 'technicolor';
export const COLOR_MODES: ColorMode[] = ['traditional', 'technicolor'];
export const isColorMode = (v: unknown): v is ColorMode => v === 'traditional' || v === 'technicolor';

export interface PaletteCtx { mode: ColorMode; dark: boolean; line?: Line; /** per-family body colour; wins over `line` */ bodyHex?: string; /** the scene sky is the night sky (ink-like layers flip light) */ night?: boolean }
export interface ScreenColors { ground: string; ink: string }

// ---------- color math ----------
const hex2rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** a blended `t` (0..1) of the way toward b */
export function mixHex(a: string, b: string, t: number): string {
  const x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex(x.map((v, i) => v + (y[i] - v) * t));
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
};
const BODY_LIGHT_TINT = 0.3; // BODY_LIGHT = body blended this far toward white
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
  const key = `${ctx.mode}|${ctx.dark}|${ctx.line ?? ''}|${ctx.bodyHex ?? ''}|${ctx.night ? 'n' : ''}`;
  let t = cache.get(key);
  if (t) return t;
  const sc = screenColors(ctx.mode, ctx.dark);
  t = new Array<string>(32).fill(sc.ink);
  t[0] = sc.ground;
  if (ctx.mode === 'technicolor') {
    const g = sc.ground;
    const tone = (light: string) => (ctx.dark ? mixHex(light, g, DARK_BLEND) : light);
    for (const l of ALL_LAYERS) {
      t[l] = ctx.dark && DARK_OVERRIDE[l] ? DARK_OVERRIDE[l] : !ctx.dark && ctx.night && NIGHT_OVERRIDE[l] ? NIGHT_OVERRIDE[l] : tone(T_LIGHT[l] ?? T_LIGHT[Layer.INK]);
    }
    const body = ctx.bodyHex ?? BODY[ctx.line ?? 'baby'] ?? BODY.baby;
    t[Layer.BODY] = ctx.dark ? mixHex(body, g, ctx.line === 'baby' || !ctx.line ? DARK_BODY_BLEND_BABY : DARK_BODY_BLEND) : body;
    // against the night sky a dark outline vanishes: rim-light it (only bodies dark enough to stand apart from a light rim; the rest keep the dark outline and read against the sky)
    if (ctx.night && !ctx.dark && contrast(t[Layer.BODY], '#E4DCC4') >= 3) t[Layer.OUTLINE] = '#E4DCC4';
    t[Layer.BODY_LIGHT] = mixHex(t[Layer.BODY], '#FFFFFF', ctx.dark ? 0.18 : BODY_LIGHT_TINT);
  }
  cache.set(key, t);
  return t;
}

/** Color of one layer. Traditional: every lit layer is the ink. */
export function colorFor(layer: number, ctx: PaletteCtx): string {
  return paletteTable(ctx)[layer] ?? screenColors(ctx.mode, ctx.dark).ink;
}

/** Technicolor sky behind the scene by local phase and weather (rain overrides day and dusk). */
export function skyFor(ctx: PaletteCtx, phase: Phase, rain: boolean): string {
  const k: Phase | 'rain' = rain && (phase === 'day' || phase === 'dusk') ? 'rain' : phase;
  if (ctx.dark) return k === 'night' ? DARK_SKY_NIGHT : mixHex(SKY[k], screenColors(ctx.mode, true).ground, DARK_SKY_BLEND);
  return SKY[k];
}
/** Technicolor fill under the ground band. */
export function soilFor(ctx: PaletteCtx): string {
  return ctx.dark ? mixHex(SOIL_LIGHT, screenColors(ctx.mode, true).ground, 0.55) : SOIL_LIGHT;
}
/** Lights-off darkening of final colors (whole sky) and the extra dither darkening. */
export const DIM_SKY = 0.4;
export const DIM_DITHER = 0.38;
export const darken = (c: string, k: number) => mixHex(c, '#0B0D18', k);
