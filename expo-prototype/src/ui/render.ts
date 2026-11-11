// Turns a layer-coded framebuffer into a few colored SVG paths for the selected color mode.
import { forceSpecies, newPet, SPECIES_BY_ID, type Pet } from '../core/pet';
import { DIM_FLAG, LAYER_MASK, tradVisible, type Line } from './layers';
import { darken, darkSky, DIM_DITHER, DIM_SKY, paletteTable, screenColors, skyFor, soilFor, type ColorMode, type PaletteCtx } from './palette';
import { allCellsPath, gridFor, litPath, type Buf } from './pixel';
import { GROUND_Y, TICK_MS, initScene, type Scene } from './scene';
import { renderScreen, type Rendered } from './screens';

export interface ColorGroup { color: string; d: string }
export interface Frame {
  n: number;
  /** Technicolor only: sky and soil fills behind the scene */
  sky: { color: string; h: number } | null;
  soil: { color: string; y: number } | null;
  groups: ColorGroup[];
  /** change-detection key */
  key: string;
}

export interface FrameStyle { mode: ColorMode; dark: boolean; line?: Line; bodyHex?: string }

let SCRATCH = new Uint8Array(0);
const scratch = (len: number) => (SCRATCH.length === len ? SCRATCH : (SCRATCH = new Uint8Array(len)));

/** Group the lit pixels by their color: one path per color (Traditional: a single ink path). */
export function buildFrame(r: Rendered, st: FrameStyle): Frame {
  const { buf } = r;
  const n = buf.n;
  // a buffer painted for one look must never be coloured as the other (the grids differ); legacy buffers without a look are unchecked
  if (r.look !== undefined && (r.look !== st.mode || n !== gridFor(st.mode))) throw new Error(`buildFrame: ${n}x${n} buffer painted for ${r.look} but coloured as ${st.mode}`);
  if (st.mode === 'traditional') {
    const ink = screenColors('traditional', st.dark).ink;
    // biome scenery is Technicolor-only: it prints as unlit (a dimmed one keeps the dither dot of an unlit pixel)
    const src = buf.px;
    const px = scratch(src.length);
    for (let i = 0; i < src.length; i++) { const c = src[i]; px[i] = c && !tradVisible(c & LAYER_MASK) ? c & DIM_FLAG : c; }
    const d = litPath(px, n);
    return { n, sky: null, soil: null, groups: [{ color: ink, d }], key: `${n}t${st.dark ? 'd' : 'l'}${d}` };
  }
  const biome = r.sky?.biome ?? 'meadow';
  const night = r.sky ? darkSky(biome, r.sky.phase) : false;
  const ctx: PaletteCtx = { mode: 'technicolor', dark: st.dark, line: st.line, bodyHex: st.bodyHex, night, biome, phase: r.sky?.phase, rain: r.sky?.rain };
  const tbl = paletteTable(ctx);
  const dim = !!r.sky?.dim;
  const sky = r.sky ? skyFor(ctx, r.sky.phase, r.sky.rain, biome) : null;
  const skyShown = sky && dim ? darken(sky, DIM_SKY) : sky;
  const groups = new Map<string, string>();
  const px = buf.px;
  for (let i = 0; i < px.length; i++) {
    const c = px[i];
    if (!c) continue;
    const layer = c & LAYER_MASK;
    let color: string;
    if (c & DIM_FLAG) color = darken(layer ? tbl[layer] : (skyShown ?? tbl[0]), DIM_DITHER);
    else color = tbl[layer];
    const x = i % n, y = (i / n) | 0;
    groups.set(color, (groups.get(color) ?? '') + `M${x + 0.06} ${y + 0.06}h0.88v0.88h-0.88z`);
  }
  const arr = [...groups].map(([color, d]) => ({ color, d }));
  const gy = Math.round((GROUND_Y * n) / 64); // the ground row in cells of this grid
  const skyF = skyShown ? { color: skyShown, h: gy } : null;
  const soilF = r.sky ? { color: dim ? darken(soilFor(ctx, biome), DIM_SKY) : soilFor(ctx, biome), y: gy } : null;
  return {
    n, sky: skyF, soil: soilF, groups: arr,
    key: `${n}c${st.dark ? 'd' : 'l'}${skyShown ?? ''}${soilF?.color ?? ''}${arr.map((g) => g.color + g.d).join('|')}`,
  };
}

export const lineOf = (pet: Pet | null | undefined): Line => ((pet && SPECIES_BY_ID[pet.species]?.line) as Line | undefined) || 'baby';

/** Per-family body colour of a pet's species (undefined for the dino palette). */
export const bodyOf = (pet: Pet | null | undefined): string | undefined => (pet ? SPECIES_BY_ID[pet.species]?.bodyHex : undefined);

export function cellsPath(n: number) { return allCellsPath(n); }

/** A calm still daytime scene of a pet, for the settings preview tiles. */
export function previewFrame(species: string | null, st: FrameStyle, hour = 12): Frame {
  const T = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
  const pet = newPet(T, { seed: 7 });
  forceSpecies(pet, species && SPECIES_BY_ID[species] ? species : 'rawr');
  pet.named = true; pet.hunger = 3; pet.happy = 4; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
  const sc0 = initScene(pet, T, hour);
  const sc: Scene = { ...sc0, state: 'idle', x: 14, facing: 1, still: true, dim: false, weather: 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0 };
  const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc, look: st.mode });
  return buildFrame(r, { ...st, line: lineOf(pet), bodyHex: bodyOf(pet) });
}

export type { Buf };
