export type Stage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'ultimate' | 'ghost';
export type Food = 'meat' | 'veggie' | 'pasta';
export type Call = 'hungry' | 'bored' | 'poop' | 'sick' | 'naughty' | 'light' | 'hot' | 'cold';

export interface Requirement {
  mist_min?: number;
  mist_max?: number;
  train?: number;
  wins?: number;
  smarts?: number;
  disc?: number;
  heavy?: boolean;
  lead?: Food;
}

export interface SpeciesDef {
  id: string;
  name: string;
  stage: Exclude<Stage, 'egg' | 'ghost'>;
  blurb: string;
  /** animal family (the free app ships only 'dino') */
  family: string;
  /** lineage color family */
  line: string;
  /** Technicolor body colour from the family's own palette (line names collide across families); absent = use the line palette */
  bodyHex?: string;
  /** frames[0] open eyes, frames[1] blink; 16 rows of 16 chars, 'X' is ink */
  frames: string[][];
  /** 32x32 Scale2x-smoothed version of `frames` for the high-resolution scene */
  hiFrames: string[][];
  evolutions: { to: string; req: Requirement }[];
}

export interface FamilyDef {
  id: string;
  name: string;
  /** free families are always available; the others need Plus */
  isFree: boolean;
  /** feed menu labels for the three engine foods, in order meat, veggie, pasta */
  foods: string[];
}
