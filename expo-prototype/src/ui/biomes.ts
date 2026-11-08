// Biomes: each pet family has its own background (see docs/BIOMES.md). Pure lookup; the drawing lives in biomeDraw.ts,
// the colours in palette.ts.
import { SPECIES_BY_ID, type Pet } from '../core/pet';

export type Biome =
  | 'meadow' | 'woods' | 'underwater' | 'sky' | 'yard' | 'clouds' | 'ember' | 'warren' | 'crags' | 'workshop' | 'swamp' | 'garden';
export const BIOMES: Biome[] = ['meadow', 'woods', 'underwater', 'sky', 'yard', 'clouds', 'ember', 'warren', 'crags', 'workshop', 'swamp', 'garden'];

export const FAMILY_BIOME: Record<string, Biome> = {
  dino: 'meadow', fox: 'woods', fish: 'underwater', bird: 'sky', cat: 'yard', spirits: 'clouds',
  bunny: 'warren', dragon: 'crags', bot: 'workshop', slime: 'swamp', bug: 'garden',
};

/** Spirits on the imp, horn and soot lines (tools/families/spirits.py LINE) live in the ember realm. */
export const EMBER_SPIRITS: ReadonlySet<string> = new Set([
  'glimmer', 'fluffimp', 'plumpuff', 'cherubimp', 'prankwing', 'jester', 'duskhalo', 'trickstar',
  'emberling', 'hornlet', 'pronglet', 'embergut', 'emberhorn', 'prongmaster', 'cinderbelly', 'hornbrawler', 'cinderlord', 'brimstorm',
  'smudge', 'sootwing', 'cindersnip', 'gloomwing', 'tatterimp', 'hushwing',
].map((s) => 'spirits_' + s));

/** Biomes whose backdrop is dark in every phase (caves, the ember realm, the lit workshop): HUD glyphs use the night ink. */
export const ALWAYS_DARK: ReadonlySet<Biome> = new Set<Biome>(['workshop', 'swamp', 'ember']);

export function biomeOfSpecies(speciesId: string | undefined, family: string): Biome {
  const fam = (speciesId && SPECIES_BY_ID[speciesId]?.family) || family;
  if (fam === 'spirits' && speciesId && EMBER_SPIRITS.has(speciesId)) return 'ember';
  return FAMILY_BIOME[fam] ?? 'meadow';
}
export const biomeOf = (pet: Pet): Biome => biomeOfSpecies(pet.species, pet.family);
