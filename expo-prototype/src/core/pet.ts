// TypeScript port of Shared/Pet.swift. Time is plain epoch milliseconds so the engine is easy to test.
import { BABIES, SPECIES } from './speciesData';
import type { Call, Food, Requirement, SpeciesDef, Stage } from './types';

export const TICK = 5 * 60 * 1000;
export const MAX_HEARTS = 4;
/** Care tuning: how long a call may wait before it counts as a mistake, and how long the light may stay on at night. */
export const MISTAKE_AFTER_TICKS = 72; // a call may wait 6 awake hours before it counts as a mistake
export const BABY_MISTAKE_AFTER_TICKS = 48; // babies are needier: 4 awake hours
export const NAUGHTY_EXPIRES_TICKS = 36; // a naughty call just wears off after 3 awake hours (no mistake)
export const LIGHT_MISTAKE_TICKS = 24;
const STAGE_HOURS: Partial<Record<Stage, number>> = { baby: 11, child: 36, teen: 72, adult: 168 };

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const DEX_SIZE = SPECIES.length;

export interface PetEvent {
  kind: 'hatched' | 'evolved' | 'poop' | 'sick' | 'sleep' | 'wake' | 'call' | 'died';
  detail: string;
  at: number;
}

export interface Pet {
  name: string;
  named: boolean;
  seed: number;
  generation: number;
  birth: number;
  lastTick: number;
  modified: number;
  stage: Stage;
  species: string;
  dex: string[];
  hunger: number;
  happy: number;
  weight: number;
  smarts: number;
  discipline: number;
  poops: number;
  sick: boolean;
  medDoses: number;
  asleep: boolean;
  lightOn: boolean;
  careMistakes: number;
  gentle: boolean;
  paused: boolean;
  temp: number;
  trains: number;
  battles: number;
  wins: number;
  stageMistakes: number;
  stageMeat: number;
  stageVeg: number;
  stagePasta: number;
  stageTrain: number;
  stageWins: number;
  stageSmarts: number;
  lastFood: Food | null;
  weightTicks: number;
  lastTrain: number | null;
  lastBattle: number | null;
  call: Call | null;
  callSince: number | null;
  callMistaken: boolean;
  callTicks: number;
  hungerProgress: number;
  happyProgress: number;
  poopProgress: number;
  tempProgress: number;
  petProgress: number;
  starveTicks: number;
  sickTicks: number;
  lightTicks: number;
  napMistaken: boolean;
  diedAt: number | null;
  causeOfDeath: string | null;
  legacy: string[];
  events: PetEvent[];
}

export function newPet(now: number, opts: { generation?: number; name?: string; legacy?: string[]; gentle?: boolean; dex?: string[]; seed?: number } = {}): Pet {
  return {
    name: opts.name ?? 'Rexie', named: false,
    seed: opts.seed ?? 1 + Math.floor(Math.random() * 0x7fffffff),
    generation: opts.generation ?? 1, birth: now, lastTick: now, modified: now,
    stage: 'egg', species: '', dex: opts.dex ?? [],
    hunger: 4, happy: 4, weight: 5, smarts: 0, discipline: 0, poops: 0, sick: false, medDoses: 0,
    asleep: false, lightOn: true, careMistakes: 0, gentle: opts.gentle ?? true, paused: false, temp: 0,
    trains: 0, battles: 0, wins: 0,
    stageMistakes: 0, stageMeat: 0, stageVeg: 0, stagePasta: 0, stageTrain: 0, stageWins: 0, stageSmarts: 0, lastFood: null, weightTicks: 0,
    lastTrain: null, lastBattle: null,
    call: null, callSince: null, callMistaken: false, callTicks: 0,
    hungerProgress: 0, happyProgress: 0, poopProgress: 0, tempProgress: 0, petProgress: 0,
    starveTicks: 0, sickTicks: 0, lightTicks: 0, napMistaken: false,
    diedAt: null, causeOfDeath: null, legacy: opts.legacy ?? [], events: [],
  };
}

// ---- derived ----
export const isAlive = (p: Pet) => p.stage !== 'ghost';
export const speciesOf = (p: Pet): SpeciesDef | undefined => SPECIES_BY_ID[p.species];
export const speciesName = (p: Pet) => speciesOf(p)?.name ?? (p.stage === 'egg' ? 'Egg' : 'Dino');
export const ageMs = (p: Pet) => p.lastTick - p.birth;
export const ageDays = (p: Pet) => Math.floor(ageMs(p) / 86400000);
export function baseWeight(p: Pet): number {
  return { egg: 3, baby: 5, child: 12, teen: 20, adult: 30, ultimate: 40, ghost: 0 }[p.stage];
}
export const overweight = (p: Pet) => p.weight >= baseWeight(p) + 8;
/** The food eaten most this stage. A tie goes to the food eaten last, then meat, veggies, pasta. */
export function leadFood(p: Pet): Food {
  const counts: [Food, number][] = [['meat', p.stageMeat], ['veggie', p.stageVeg], ['pasta', p.stagePasta]];
  const top = Math.max(...counts.map(([, n]) => n));
  const tied = counts.filter(([, n]) => n === top).map(([f]) => f);
  if (p.lastFood && tied.includes(p.lastFood)) return p.lastFood;
  return tied[0];
}
export const needsAttention = (p: Pet) => (p.call !== null && !p.asleep) || p.call === 'light';

export function statusLine(p: Pet): string {
  const n = p.name;
  if (p.stage === 'ghost') return `${n} has passed on`;
  if (p.paused) return `${n} is on vacation`;
  if (p.stage === 'egg') return 'An egg is warming up';
  if (p.asleep) return `${n} is sleeping`;
  switch (p.call) {
    case 'hungry': return `${n} is hungry`;
    case 'bored': return `${n} wants to play`;
    case 'poop': return `${n} made a mess`;
    case 'sick': return `${n} is sick`;
    case 'naughty': return `${n} is being naughty`;
    case 'hot': return `${n} is too warm`;
    case 'cold': return `${n} is cold`;
    default: return `${n} is doing fine`;
  }
}

// ---- deterministic randomness (32-bit mixing; not bit-compatible with the Swift app) ----
function rand(p: Pet, t: number, salt: number): number {
  let x = (p.seed ^ Math.imul(Math.floor(t / TICK) | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b)) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
const roll = (p: Pet, t: number, salt: number, mod: number) => rand(p, t, salt) % mod === 0;

// ---- simulation ----
export function advance(p: Pet, now: number, hourOf: (t: number) => number = (t) => new Date(t).getHours()): void {
  if (now <= p.lastTick) return;
  if (p.stage === 'ghost') { p.lastTick = now; return; }
  if (p.paused) {
    const d = now - p.lastTick;
    p.birth += d;
    if (p.callSince !== null) p.callSince += d;
    p.lastTick = now;
    return;
  }
  let t = p.lastTick;
  let steps = 0;
  while (t + TICK <= now) {
    if (steps >= 8640) { t = now; break; }
    t += TICK;
    step(p, t, hourOf(t));
    steps++;
    if ((p.stage as Stage) === 'ghost') break;
  }
  p.lastTick = t;
}

function log(p: Pet, kind: PetEvent['kind'], detail: string, at: number) {
  p.events.push({ kind, detail, at });
  if (p.events.length > 40) p.events.splice(0, p.events.length - 40);
}

function mistake(p: Pet) { p.careMistakes++; p.stageMistakes++; }

function step(p: Pet, t: number, hour: number) {
  const age = t - p.birth;
  if (p.stage === 'egg') {
    if (age >= 10 * 60 * 1000) hatch(p, t);
    return;
  }
  const shouldSleep = hour >= 21 || hour < 8;
  if (shouldSleep && !p.asleep) { p.asleep = true; p.lightOn = true; p.lightTicks = 0; p.napMistaken = false; log(p, 'sleep', '', t); }
  if (!shouldSleep && p.asleep) { p.asleep = false; p.lightOn = true; p.lightTicks = 0; log(p, 'wake', '', t); }

  if (p.asleep) {
    if (p.lightOn) {
      p.lightTicks++;
      if (p.lightTicks >= LIGHT_MISTAKE_TICKS && !p.napMistaken) {
        mistake(p); p.napMistaken = true;
        if (!p.gentle) { p.sick = true; p.medDoses = 0; log(p, 'sick', 'light', t); }
      }
    }
    refreshCall(p, t);
    return;
  }

  checkEvolution(p, age, t);

  const rate = p.stage === 'baby' ? 24 : 36;
  p.hungerProgress++;
  if (p.hungerProgress >= rate) { p.hunger = Math.max(0, p.hunger - 1); p.hungerProgress = 0; }
  p.happyProgress++;
  if (p.happyProgress >= rate + 6) { p.happy = Math.max(0, p.happy - 1); p.happyProgress = 0; }
  // Digestion is slow (one unit per 6 awake hours); playing and training burn the rest, so a pet that is fed but never exercised gets heavy.
  p.weightTicks++;
  if (p.weightTicks >= 72) { p.weightTicks = 0; if (p.weight > baseWeight(p)) p.weight--; }
  p.poopProgress++;
  if (p.poopProgress >= 48 && p.poops < 3) { p.poops++; p.poopProgress = 0; log(p, 'poop', '', t); }

  p.tempProgress++;
  if (p.tempProgress >= 24 && roll(p, t, 6, 2)) {
    const drift = hour >= 12 && hour < 18 ? 1 : -1;
    p.temp = Math.max(-2, Math.min(2, p.temp + drift));
    p.tempProgress = 0;
  }

  if (!p.sick) {
    if ((p.poops >= 2 && roll(p, t, 1, 70)) || (p.hunger === 0 && roll(p, t, 2, 90)) ||
        (overweight(p) && roll(p, t, 3, 120)) || (Math.abs(p.temp) >= 2 && roll(p, t, 5, 100))) {
      p.sick = true; p.medDoses = 0; log(p, 'sick', 'ill', t);
    }
  }

  if (p.hunger === 0) p.starveTicks++; else p.starveTicks = Math.max(0, p.starveTicks - 1);
  if (p.sick) p.sickTicks++; else p.sickTicks = 0;

  if (p.starveTicks >= 144 || p.sickTicks >= 144) {
    if (p.gentle) {
      p.starveTicks = 0; p.sickTicks = 0; p.sick = false; p.hunger = 2; p.happy = 2; mistake(p);
    } else {
      die(p, t, p.starveTicks >= 144 ? 'went hungry too long' : 'was sick too long');
      return;
    }
  }
  if (age > 21 * 86400000 && p.stage === 'ultimate') { retire(p, t); return; }

  if (p.call === null && p.hunger >= 2 && p.happy >= 2 && !p.sick && roll(p, t, 4, 220)) {
    p.call = 'naughty'; p.callSince = t; p.callMistaken = false; p.callTicks = 0; log(p, 'call', 'naughty', t);
  }
  refreshCall(p, t);
}

function holds(p: Pet, c: Call): boolean {
  switch (c) {
    case 'hungry': return p.hunger <= 1;
    case 'bored': return p.happy <= 1;
    case 'poop': return p.poops >= 2;
    case 'sick': return p.sick;
    case 'naughty': return true;
    case 'light': return p.asleep && p.lightOn && p.lightTicks >= 3;
    case 'hot': return p.temp >= 2;
    case 'cold': return p.temp <= -2;
  }
}

/** `tick` is true only when called from the simulation; actions refresh the display without advancing the mistake clock. */
function refreshCall(p: Pet, t: number, tick = true) {
  if (p.call && p.call !== 'naughty' && !holds(p, p.call)) { p.call = null; p.callSince = null; p.callMistaken = false; p.callTicks = 0; }
  // A naughty call never blocks a real need.
  if (p.call === 'naughty' && (['sick', 'hungry', 'hot', 'cold', 'poop', 'bored'] as Call[]).some((c) => holds(p, c))) {
    p.call = null; p.callSince = null; p.callMistaken = false; p.callTicks = 0;
  }
  if (p.call === null) {
    const order: Call[] = p.asleep ? ['light'] : ['sick', 'hungry', 'hot', 'cold', 'poop', 'bored'];
    for (const c of order) if (holds(p, c)) { p.call = c; p.callSince = t; p.callMistaken = false; p.callTicks = 0; log(p, 'call', c, t); break; }
  }
  if (tick && p.call && !p.asleep && p.call !== 'light') {
    // Only awake time counts: a call that comes in at bedtime cannot be answered in the night.
    p.callTicks++;
    if (p.call === 'naughty') {
      if (p.callTicks >= NAUGHTY_EXPIRES_TICKS) { p.call = null; p.callSince = null; p.callMistaken = false; p.callTicks = 0; }
    } else if (!p.callMistaken && p.callTicks >= (p.stage === 'baby' ? BABY_MISTAKE_AFTER_TICKS : MISTAKE_AFTER_TICKS)) {
      mistake(p); p.callMistaken = true;
    }
  }
}

// ---- growth ----
export function requirementMet(r: Requirement, p: Pet): boolean {
  return p.stageMistakes >= (r.mist_min ?? 0) && p.stageMistakes <= (r.mist_max ?? Infinity) &&
    p.stageTrain >= (r.train ?? 0) && p.stageWins >= (r.wins ?? 0) &&
    p.stageSmarts >= (r.smarts ?? 0) && p.discipline >= (r.disc ?? 0) &&
    (!r.heavy || overweight(p)) && (r.lead === undefined || leadFood(p) === r.lead);
}

function hatch(p: Pet, t: number) {
  evolve(p, BABIES[p.seed % BABIES.length], t, true);
  p.hunger = 4; p.happy = 4;
}

function checkEvolution(p: Pet, age: number, t: number) {
  const hours = STAGE_HOURS[p.stage];
  const sp = speciesOf(p);
  if (hours === undefined || age < hours * 3600000 || !sp) return;
  const next = sp.evolutions.find((e) => requirementMet(e.req, p));
  if (next) evolve(p, next.to, t);
}

function evolve(p: Pet, id: string, t: number, hatching = false) {
  const sp = SPECIES_BY_ID[id];
  if (!sp) return;
  p.species = id; p.stage = sp.stage;
  p.weight = Math.max(p.weight, baseWeight(p));
  p.stageMistakes = 0; p.stageMeat = 0; p.stageVeg = 0; p.stagePasta = 0; p.stageTrain = 0; p.stageWins = 0; p.stageSmarts = 0;
  if (!p.dex.includes(id)) p.dex.push(id);
  log(p, hatching ? 'hatched' : 'evolved', id, t);
}

function die(p: Pet, t: number, cause: string) {
  p.stage = 'ghost'; p.diedAt = t; p.causeOfDeath = cause; p.call = null; p.sick = false; log(p, 'died', cause, t);
  p.legacy.push(`${p.name} the ${speciesName(p)}: ${ageDays(p)}d, ${cause}`);
}

function retire(p: Pet, t: number) {
  p.stage = 'ghost'; p.diedAt = t; p.causeOfDeath = 'lived a full, happy life'; p.call = null; p.sick = false; log(p, 'died', 'lived a full, happy life', t);
  p.legacy.push(`${p.name} the ${speciesName(p)}: ${ageDays(p)}d, a full happy life`);
}

// ---- actions (call advance first); each returns a short message ----
const canAct = (p: Pet) => !p.asleep && p.stage !== 'egg' && p.stage !== 'ghost';
const touch = (p: Pet) => { p.modified = p.lastTick; refreshCall(p, p.lastTick, false); };

export function feed(p: Pet, food: Food): string {
  if (p.stage === 'egg' || p.stage === 'ghost') return '...';
  if (p.asleep) return `Shh, ${p.name} is asleep`;
  if (p.hunger >= MAX_HEARTS) return `${p.name} is full`;
  p.hunger++; p.weight++; p.starveTicks = 0; p.lastFood = food;
  if (food === 'meat') p.stageMeat++; else if (food === 'veggie') p.stageVeg++; else p.stagePasta++;
  touch(p);
  return 'Yum!';
}
export function feedSnack(p: Pet): string {
  if (p.stage === 'egg' || p.stage === 'ghost') return '...';
  if (p.asleep) return `Shh, ${p.name} is asleep`;
  if (p.happy >= MAX_HEARTS) return `${p.name} is too happy to eat`;
  p.happy++; p.weight += 2; touch(p);
  return 'Sweet!';
}
export function finishPlay(p: Pet, won: number): string {
  if (!canAct(p)) return '...';
  p.weight = Math.max(baseWeight(p) - 2, p.weight - 1);
  let msg = `You won ${won} of 5. Try again!`;
  if (won >= 3) { p.happy = Math.min(MAX_HEARTS, p.happy + 1); p.smarts = Math.min(100, p.smarts + 3); p.stageSmarts += 3; msg = `You won ${won} of 5!`; }
  touch(p);
  return msg;
}
export function giveMedicine(p: Pet): string {
  if (!canAct(p)) return '...';
  if (!p.sick) { touch(p); return `${p.name} is not sick`; }
  p.medDoses++;
  let msg = 'One more dose';
  if (p.medDoses >= 2) { p.sick = false; p.medDoses = 0; p.sickTicks = 0; msg = `${p.name} feels better!`; }
  touch(p);
  return msg;
}
export function clean(p: Pet): string {
  if (p.stage === 'egg' || p.stage === 'ghost') return '...';
  if (p.poops === 0) { touch(p); return 'Already clean'; }
  p.poops = 0; p.poopProgress = 0; touch(p);
  return 'Squeaky clean';
}
export function climate(p: Pet): string {
  if (!canAct(p)) return '...';
  if (p.temp === 0) { touch(p); return 'Already comfy'; }
  const msg = p.temp > 0 ? 'Ahh, nice and cool' : 'Toasty warm now';
  p.temp = 0; p.tempProgress = 0; touch(p);
  return msg;
}
export function scold(p: Pet): string {
  if (!canAct(p)) return '...';
  if (p.call === 'naughty') { p.call = null; p.callSince = null; p.discipline = Math.min(100, p.discipline + 25); touch(p); return `${p.name} behaves`; }
  touch(p);
  return `${p.name} looks confused`;
}
export function petIt(p: Pet): string {
  if (!canAct(p)) return '...';
  p.petProgress++; p.smarts = Math.min(100, p.smarts + 1); p.stageSmarts += 1;
  if (p.petProgress >= 3) { p.petProgress = 0; if (p.happy < MAX_HEARTS) p.happy++; }
  touch(p);
  return `${p.name} purrs. Dinos can purr.`;
}
export function toggleLight(p: Pet): string {
  if (p.stage === 'egg' || p.stage === 'ghost') return '...';
  p.lightOn = !p.lightOn;
  if (!p.lightOn) p.lightTicks = 0;
  touch(p);
  return p.lightOn ? 'Lights on' : 'Lights off';
}
export function train(p: Pet): string {
  if (!canAct(p)) return '...';
  if (p.stage === 'baby') return `${p.name} is too little`;
  if (p.sick) return `${p.name} is too sick`;
  if (p.hunger === 0) return `${p.name} is too hungry`;
  if (p.lastTrain !== null && p.lastTick - p.lastTrain < 900000) return `${p.name} needs a rest`;
  p.lastTrain = p.lastTick; p.trains++; p.stageTrain++;
  p.weight = Math.max(baseWeight(p) - 2, p.weight - 1); touch(p);
  return 'Good workout!';
}
export function battle(p: Pet): string {
  if (!canAct(p)) return '...';
  if (p.stage === 'baby') return `${p.name} is too little`;
  if (p.sick) return `${p.name} is too sick`;
  if (p.hunger === 0) return `${p.name} is too hungry`;
  if (p.lastBattle !== null && p.lastTick - p.lastBattle < 1800000) return `${p.name} needs a rest`;
  p.lastBattle = p.lastTick; p.battles++;
  const level = { child: 1, teen: 2, adult: 3 }[p.stage as 'child' | 'teen' | 'adult'] ?? 4;
  const mine = level * 10 + Math.min(p.trains, 25) * 2 + Math.floor(p.smarts / 10) + Math.floor(p.discipline / 10);
  const theirs = level * 10 + (rand(p, p.lastTick, 100 + p.battles) % 30);
  const edge = rand(p, p.lastTick, 200 + p.battles) % 15;
  const foes = ['a grumpy Pterodactyl', 'a wild Raptor', 'a big Ankylo', 'a sneaky Compy', 'a loud Parasaur'];
  const foe = foes[rand(p, p.lastTick, 300 + p.battles) % foes.length];
  p.weight = Math.max(baseWeight(p) - 2, p.weight - 1);
  let msg: string;
  if (mine + edge >= theirs) { p.wins++; p.stageWins++; p.happy = Math.min(MAX_HEARTS, p.happy + 1); msg = `${p.name} beat ${foe}!`; }
  else { p.happy = Math.max(0, p.happy - 1); msg = `${foe} won. Train more!`; }
  touch(p);
  return msg;
}

export function newEgg(p: Pet, now: number): Pet {
  const np = newPet(now, { generation: p.generation + 1, name: p.name, legacy: p.legacy, gentle: p.gentle, dex: p.dex });
  return np;
}

/** Dev helper: jump straight to a species, exactly like a natural evolution (plus a sane start if still an egg). */
export function forceSpecies(p: Pet, id: string): void {
  if (!SPECIES_BY_ID[id]) return;
  const wasEgg = p.stage === 'egg' || p.stage === 'ghost';
  if (p.stage === 'ghost') { p.diedAt = null; p.causeOfDeath = null; p.sickTicks = 0; p.starveTicks = 0; }
  evolve(p, id, p.lastTick);
  if (wasEgg) { p.hunger = 4; p.happy = 4; }
}
