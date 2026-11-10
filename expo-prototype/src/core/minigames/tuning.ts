// Species tuning: nothing is one-size-fits-all (docs/PLAY.md). Every reaction `kind` (the body type: fennec, mech, loaf, jelly ...)
// has four modifiers on a 1..5 scale and a favourite game; stage, weight and health then scale the result.
//   speed:  how fast the pet moves (light and quick kinds 4-5, heavy kinds 1-2)
//   size:   hitbox / body size (small kinds are harder to catch with, big kinds are forgiving but clumsy)
//   luck:   how many bonus items come the pet's way
//   memory: extra time each ECHO symbol stays on screen
//   fav:    the game the kind loves (score x1.25, a star in the menu)
import { SPECIES_BY_ID, overweight, type Pet } from '../pet';
import { REACTIONS } from '../reactionsData';
import type { Stage } from '../types';
import { GAME_IDS, type GameId, type GameParams } from './types';
import { themeFor } from './themes';

export const FAVOURITE_MUL = 1.25;

type Level = 1 | 2 | 3 | 4 | 5;
type Fav = 'h' | 'c' | 'd' | 'e';
type Row = [Level, Level, Level, Level, Fav];
const FAV_ID: Record<Fav, GameId> = { h: 'hilo', c: 'catch', d: 'dash', e: 'echo' };
const SPEED = [0.82, 0.92, 1.0, 1.1, 1.2];
const SIZE = [0.8, 0.9, 1.0, 1.12, 1.25];
const LUCK = [0.4, 0.7, 1.0, 1.4, 1.8];
const MEMORY = [0, 150, 300, 450, 600];

// kind: [speed, size, luck, memory, favourite]
const R: Record<string, Row> = {
  baby: [4, 1, 3, 2, 'c'],
  // dinos
  dino_trex: [3, 4, 2, 2, 'd'], dino_bronto: [1, 5, 3, 3, 'e'], dino_trike: [2, 4, 3, 2, 'h'], dino_raptor: [5, 2, 2, 3, 'd'], dino_ankylo: [1, 5, 4, 2, 'h'], dino_stego: [2, 4, 3, 2, 'c'],
  // foxes
  fox: [4, 2, 3, 3, 'c'], foxsit: [3, 3, 3, 4, 'e'], foxfish: [3, 3, 4, 3, 'c'], fennec: [5, 1, 3, 2, 'c'], arctic: [2, 4, 3, 3, 'h'], kitsune: [4, 2, 5, 5, 'e'],
  // fish
  fry: [5, 1, 4, 1, 'c'], fishy: [4, 2, 3, 2, 'c'], puffer: [2, 4, 3, 2, 'h'], seahorse: [3, 1, 4, 4, 'e'], angler: [2, 3, 5, 3, 'h'], eel: [5, 2, 2, 2, 'd'],
  koi: [3, 3, 5, 3, 'e'], jelly: [2, 3, 4, 4, 'e'], ray: [4, 4, 3, 2, 'd'], whale: [1, 5, 4, 5, 'e'],
  // birds
  chick: [4, 1, 3, 1, 'c'], owl: [2, 3, 3, 5, 'e'], duck: [3, 3, 4, 2, 'c'], pigeon: [4, 2, 3, 3, 'd'], songbird: [4, 1, 4, 3, 'e'], raptorbird: [5, 3, 2, 3, 'd'],
  heron: [3, 2, 3, 3, 'd'], swan: [2, 4, 4, 3, 'd'], phoenix: [4, 3, 5, 3, 'd'], songfan: [3, 2, 4, 4, 'e'], doveshow: [3, 2, 5, 3, 'h'],
  // cats
  kitten: [4, 1, 3, 2, 'c'], cat: [4, 2, 3, 3, 'c'], loaf: [1, 4, 3, 2, 'h'], catsit: [3, 3, 3, 3, 'h'], catlean: [3, 3, 3, 4, 'e'], catround: [2, 4, 4, 2, 'c'], catking: [2, 4, 3, 4, 'h'],
  // spirits
  halobaby: [3, 1, 4, 3, 'e'], emberimp: [4, 1, 3, 2, 'c'], cloud: [2, 4, 4, 4, 'e'], imp: [4, 2, 3, 3, 'c'], chubimp: [2, 4, 3, 2, 'h'], spirit: [3, 3, 5, 4, 'e'],
  // bunnies
  bunbaby: [4, 1, 3, 2, 'c'], bunny: [4, 2, 3, 2, 'd'], pika: [5, 1, 3, 3, 'c'], hamster: [3, 2, 3, 2, 'c'], hare: [5, 3, 2, 2, 'd'], lop: [2, 3, 4, 3, 'h'],
  guineapig: [2, 4, 3, 2, 'c'], chinchilla: [4, 2, 3, 4, 'e'], dormouse: [3, 1, 4, 3, 'h'],
  // dragons
  wyrmling: [3, 1, 3, 3, 'c'], westdragon: [2, 5, 3, 3, 'd'], eastdragon: [3, 4, 5, 4, 'e'], hoarder: [1, 4, 5, 3, 'h'], lizard: [4, 2, 2, 2, 'd'], wyvern: [4, 3, 3, 3, 'd'],
  drake: [3, 3, 3, 3, 'c'], wurm: [2, 3, 2, 3, 'd'], hydra: [2, 5, 3, 3, 'h'], coil: [3, 3, 3, 4, 'e'],
  // bots
  orb: [3, 2, 3, 3, 'e'], rover: [4, 3, 2, 2, 'd'], handheld: [3, 2, 4, 3, 'h'], walkie: [3, 3, 3, 3, 'e'], junkbot: [2, 4, 4, 2, 'c'], boombox: [2, 4, 3, 2, 'h'], mech: [2, 5, 2, 3, 'd'],
  dozer: [1, 5, 3, 2, 'd'], crt: [2, 4, 3, 4, 'e'], floppy: [3, 1, 4, 5, 'e'], drone: [5, 2, 3, 3, 'c'], toaster: [2, 3, 4, 2, 'h'], quad: [5, 3, 2, 3, 'd'], modem: [3, 3, 3, 4, 'e'],
  // slimes
  jiggle: [3, 3, 4, 2, 'c'], shroom: [2, 3, 4, 3, 'e'], puddle: [3, 4, 3, 3, 'h'], lump: [1, 4, 3, 2, 'h'], gel: [3, 3, 3, 3, 'c'], stalk: [2, 2, 3, 4, 'e'], snail: [1, 3, 4, 4, 'e'],
  sjelly: [3, 3, 4, 3, 'c'], sghost: [4, 2, 4, 4, 'e'], melt: [2, 4, 3, 2, 'h'], twin: [4, 3, 3, 4, 'c'], mimic: [3, 3, 5, 5, 'e'],
  // bugs
  bugegg: [1, 2, 3, 1, 'h'], larva: [2, 2, 3, 2, 'c'], pill: [3, 2, 3, 3, 'h'], pupa: [1, 3, 3, 3, 'e'], butterfly: [4, 2, 4, 3, 'd'], dragonfly: [5, 2, 3, 3, 'd'], moth: [4, 2, 4, 4, 'c'],
  ladybug: [3, 1, 5, 3, 'c'], beetle: [2, 4, 3, 3, 'h'], firefly: [4, 1, 4, 4, 'e'], bee: [5, 1, 3, 3, 'c'], ant: [4, 1, 3, 5, 'e'], mantis: [4, 3, 3, 4, 'd'], roach: [5, 2, 2, 3, 'd'],
  // aliens
  alienbaby: [3, 1, 4, 2, 'c'], cyclops: [3, 4, 3, 3, 'd'], antennae: [4, 2, 3, 4, 'e'], tentacle: [3, 3, 4, 3, 'c'], grey: [3, 2, 3, 5, 'e'], threeeye: [3, 3, 3, 5, 'h'], brainfloat: [2, 3, 3, 5, 'e'],
  mothfolk: [4, 2, 4, 3, 'd'], alienblob: [2, 4, 4, 2, 'c'], insectoid: [4, 3, 2, 3, 'd'], pilot: [4, 2, 3, 3, 'd'], crystalbeing: [2, 4, 5, 4, 'e'], starmaw: [3, 4, 3, 2, 'h'],
  nebula: [3, 5, 4, 4, 'e'], cosmojelly: [3, 3, 5, 4, 'c'], mothership: [1, 5, 4, 3, 'd'], echoring: [3, 3, 3, 5, 'e'],
};

export interface KindTuning { speed: number; size: number; luck: number; memory: number; favourite: GameId }
export const KIND_TUNING: Record<string, KindTuning> = Object.fromEntries(Object.entries(R).map(([k, [s, z, l, m, f]]) => [k, {
  speed: SPEED[s - 1], size: SIZE[z - 1], luck: LUCK[l - 1], memory: MEMORY[m - 1], favourite: FAV_ID[f],
}]));
export const ALL_KINDS: string[] = [...new Set(Object.values((REACTIONS as unknown as { kindOf: Record<string, string> }).kindOf))];
const KIND_OF = (REACTIONS as unknown as { kindOf: Record<string, string> }).kindOf;
const NEUTRAL: KindTuning = { speed: 1, size: 1, luck: 1, memory: 300, favourite: 'catch' };

/** Growth stage: little pets are small and quick, big ones are bigger and a touch slower. */
export const STAGE_TUNING: Record<Stage, { speed: number; size: number }> = {
  egg: { speed: 1, size: 1 }, baby: { speed: 1.1, size: 0.78 }, child: { speed: 1.05, size: 0.9 }, teen: { speed: 1, size: 1 },
  adult: { speed: 0.97, size: 1.08 }, ultimate: { speed: 0.95, size: 1.15 }, ghost: { speed: 1, size: 1 },
};
export const HEAVY_SPEED = 0.88; // an overweight pet is slowed
export const SICK = { speed: 0.78, luck: 0.5, memory: 0.5 };
export const HUNGRY = { speed: 0.88, luck: 0.7 }; // hunger of 1 or less
export const STARVING = { speed: 0.78, luck: 0.5 }; // hunger of 0

/** The final numbers a game reads. */
export interface Tuning {
  kind: string;
  /** pet movement multiplier (kind x stage x weight x health) */
  speed: number;
  /** the same without weight and health: what a game may count on from a healthy pet of this body type and stage (fair-play spacing) */
  baseSpeed: number;
  /** body and hitbox multiplier (kind x stage) */
  size: number;
  /** bonus-item multiplier, 1 = normal */
  luck: number;
  /** extra ms each ECHO symbol stays on screen */
  memory: number;
  favourite: GameId;
  /** why the pet is playing below its best (for the ready screen) */
  condition: 'fine' | 'heavy' | 'hungry' | 'sick';
}

export const kindOfSpecies = (species: string): string => KIND_OF[species] ?? 'baby';

export interface Body { species: string; stage: Stage; weight?: number; heavy?: boolean; sick?: boolean; hunger?: number }
/** Combine the species' body type with stage, weight and health. */
export function tuningForBody(b: Body): Tuning {
  const kind = kindOfSpecies(b.species);
  const k = KIND_TUNING[kind] ?? NEUTRAL;
  const st = STAGE_TUNING[b.stage] ?? STAGE_TUNING.teen;
  const baseSpeed = k.speed * st.speed;
  let speed = baseSpeed;
  let luck = k.luck;
  let memory = k.memory;
  let condition: Tuning['condition'] = 'fine';
  if (b.heavy) { speed *= HEAVY_SPEED; condition = 'heavy'; }
  const hunger = b.hunger ?? 4;
  if (hunger <= 0) { speed *= STARVING.speed; luck *= STARVING.luck; condition = 'hungry'; }
  else if (hunger <= 1) { speed *= HUNGRY.speed; luck *= HUNGRY.luck; condition = 'hungry'; }
  if (b.sick) { speed *= SICK.speed; luck *= SICK.luck; memory *= SICK.memory; condition = 'sick'; }
  return { kind, speed, baseSpeed, size: Math.max(0.6, Math.min(1.5, k.size * st.size)), luck, memory, favourite: k.favourite, condition };
}
export const tuningFor = (p: Pet): Tuning =>
  tuningForBody({ species: p.species, stage: p.stage, weight: p.weight, heavy: overweight(p), sick: p.sick, hunger: p.hunger });

/** The favourite game of the pet's body type (null for an egg or a ghost). */
export const favouriteOf = (p: Pet): GameId | null => (SPECIES_BY_ID[p.species] ? tuningFor(p).favourite : null);

/** Build the params for a game from a pet. */
export function paramsFor(p: Pet, gameId: string): GameParams {
  const tuning = tuningFor(p);
  const fam = SPECIES_BY_ID[p.species]?.family ?? p.family;
  return {
    family: fam, species: p.species, stage: p.stage, kind: tuning.kind, theme: themeFor(fam), tuning,
    scoreMul: tuning.favourite === gameId ? FAVOURITE_MUL : 1, smarts: p.smarts,
  };
}
/** Params for a species without a Pet (tests, sheets, bots). */
export function paramsForBody(b: Body, gameId: string, smarts = 30): GameParams {
  const tuning = tuningForBody(b);
  const fam = SPECIES_BY_ID[b.species]?.family ?? 'dino';
  return { family: fam, species: b.species, stage: b.stage, kind: tuning.kind, theme: themeFor(fam), tuning, scoreMul: tuning.favourite === gameId ? FAVOURITE_MUL : 1, smarts };
}
export { GAME_IDS };
