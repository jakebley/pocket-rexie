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
  /** frames[0] open eyes, frames[1] blink; 16 rows of 16 chars, 'X' is ink */
  frames: string[][];
  evolutions: { to: string; req: Requirement }[];
}
