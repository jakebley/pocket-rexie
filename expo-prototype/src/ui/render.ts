// Turns a layer-coded framebuffer into a few colored SVG paths for the selected color mode.
import { forceSpecies, newPet, SPECIES_BY_ID, type Pet } from '../core/pet';
import { DIM_FLAG, LAYER_MASK, type Line } from './layers';
import { darken, DIM_DITHER, DIM_SKY, paletteTable, screenColors, skyFor, soilFor, type ColorMode, type PaletteCtx } from './palette';
import { allCellsPath, litPath, type Buf } from './pixel';
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

export interface FrameStyle { mode: ColorMode; dark: boolean; line?: Line }

/** Group the lit pixels by their color: one path per color (Traditional: a single ink path). */
export function buildFrame(r: Rendered, st: FrameStyle): Frame {
  const { buf } = r;
  const n = buf.n;
  if (st.mode === 'traditional') {
    const ink = screenColors('traditional', st.dark).ink;
    const d = litPath(buf.px, n);
    return { n, sky: null, soil: null, groups: [{ color: ink, d }], key: `${n}t${st.dark ? 'd' : 'l'}${d}` };
  }
  const night = r.sky?.phase === 'night';
  const ctx: PaletteCtx = { mode: 'technicolor', dark: st.dark, line: st.line, night };
  const tbl = paletteTable(ctx);
  const dim = !!r.sky?.dim;
  const sky = r.sky ? skyFor(ctx, r.sky.phase, r.sky.rain) : null;
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
  const skyF = skyShown ? { color: skyShown, h: GROUND_Y } : null;
  const soilF = r.sky ? { color: dim ? darken(soilFor(ctx), DIM_SKY) : soilFor(ctx), y: GROUND_Y } : null;
  return {
    n, sky: skyF, soil: soilF, groups: arr,
    key: `${n}c${st.dark ? 'd' : 'l'}${skyShown ?? ''}${soilF?.color ?? ''}${arr.map((g) => g.color + g.d).join('|')}`,
  };
}

export const lineOf = (pet: Pet | null | undefined): Line => ((pet && SPECIES_BY_ID[pet.species]?.line) as Line | undefined) || 'baby';

export function cellsPath(n: number) { return allCellsPath(n); }

/** A calm still daytime scene of a pet, for the settings preview tiles. */
export function previewFrame(species: string | null, st: FrameStyle, hour = 12): Frame {
  const T = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
  const pet = newPet(T, { seed: 7 });
  forceSpecies(pet, species && SPECIES_BY_ID[species] ? species : 'rawr');
  pet.named = true; pet.hunger = 3; pet.happy = 4; pet.poops = 0; pet.call = null; pet.temp = 0; pet.sick = false; pet.asleep = false; pet.lightOn = true;
  const sc0 = initScene(pet, T, hour);
  const sc: Scene = { ...sc0, state: 'idle', x: 14, facing: 1, still: true, dim: false, weather: 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0 };
  const r = renderScreen({ pet, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc });
  return buildFrame(r, { ...st, line: lineOf(pet) });
}

export type { Buf };
