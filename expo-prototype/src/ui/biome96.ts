// Biome scenery for the Technicolor 96x96 LCD: the EXTENSION POINT for the biome agents.
//
// Until a biome has a 96 painter the scene falls back to the family's sky and soil colours (palette.ts, same as at 64) with the generic
// meadow-style ground and no scenery. To redraw a biome, put a painter in BIOME96 below. Rules:
//  - paint in 96 cells (use `c.g(v)` to convert the 64-space logic numbers the 64 painter used, or draw at native 96 resolution);
//  - `backdrop` runs before the sky/ground (sun, moon, clouds, ground follow), `fore` after the ground and before the HUD and the pet;
//  - scenery codes (Layer.BARK and up) are Technicolor-only; shared codes (< 43) also print in Traditional but this painter never runs there;
//  - the pet is drawn after `fore` and clears a 1px ring of scenery codes around itself, so scenery must not use pet codes (PET_LAYER_CODES);
//  - set `ground: 'own'` to replace the generic meadow ground band (rows from GROUND_Y96 down) with your own;
//  - everything must stay a pure function of (scene, phase): no randomness except s.seed / s.nowMs.
import type { Biome } from './biomes';
import type { Phase, Scene } from './scene';
import type { Buf } from './pixel';
import { meadow96 } from './biome96/meadow';
import { woods96 } from './biome96/woods';
import { underwater96 } from './biome96/underwater';
import { sky96 } from './biome96/sky';
import { yard96 } from './biome96/yard';
import { clouds96 } from './biome96/clouds';
import { ember96 } from './biome96/ember';

export interface Ctx96 {
  b: Buf; s: Scene; phase: Phase; rain: boolean; biome: Biome;
  /** logic (64-space) units to 96 cells */
  g: (v: number) => number;
}
export interface Biome96Painter {
  backdrop?: (c: Ctx96) => void;
  fore?: (c: Ctx96) => void;
  ground?: 'own';
}

/** One entry per biome. null = not redrawn yet (generic fallback). The biome agents replace their entries. */
export const BIOME96: Record<Biome, Biome96Painter | null> = {
  meadow: null, woods: null, underwater: null, sky: null, yard: null, clouds: null, ember: null,
  warren: null, crags: null, workshop: null, swamp: null, garden: null, space: null,
};
// ---- biomes A ----
BIOME96.meadow = meadow96;
BIOME96.woods = woods96;
BIOME96.underwater = underwater96;
BIOME96.sky = sky96;
BIOME96.yard = yard96;
BIOME96.clouds = clouds96;
BIOME96.ember = ember96;
// ---- biomes B ----

/** Biomes that already have a 96 painter. */
export const biomes96Done = (): Biome[] => (Object.keys(BIOME96) as Biome[]).filter((k) => BIOME96[k]);

/** Paint one part of a biome at 96. Returns true when a painter handled it (false: generic fallback, nothing drawn). */
export function drawBiome96(c: Ctx96, part: 'backdrop' | 'fore'): boolean {
  const p = BIOME96[c.biome];
  const fn = p?.[part];
  if (!fn) return false;
  fn(c);
  return true;
}
/** Does this biome paint its own ground band? */
export const ownGround96 = (biome: Biome): boolean => BIOME96[biome]?.ground === 'own';
