// Colours of the biome-A painters (meadow, woods, underwater, sky, yard, clouds, ember). Layer codes 95..129 are SLOTS: a slot means
// one thing per biome ("bark", "kelp", "window" ...) and palette.ts asks `biomeAColors` for the table of the biome being drawn.
// Slots 95..100 are glow slots by convention (they keep their colour in every phase), 101..129 are tones. A tone given as a plain hex is
// the DAY colour and is shaded by phase (night, dusk, dawn, rain) like the shared scenery; a tone given as {day, night, ...} is explicit.
import type { Biome } from '../biomes';
import type { Phase } from '../scene';

export const A_FIRST = 95;
export const A_LAST = 127; // layer codes must stay below 128: the lights-off dither flag is 0x80 (DIM_FLAG), px is a Uint8Array
const GLOW_SLOTS = 6;
type PhaseKey = Phase | 'rain';
export type Tone = string | ({ day: string } & Partial<Record<PhaseKey, string>>);

const hex2rgb = (h: string): number[] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const x = hex2rgb(a), y = hex2rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const NIGHT_TINT: Partial<Record<Biome, string>> = { underwater: '#0C2A52', ember: '#1A0C10' };
function auto(c: string, biome: Biome, phase: Phase, rain: boolean): string {
  if (phase === 'night') return mix(c, NIGHT_TINT[biome] ?? '#101830', 0.42);
  if (rain && (phase === 'day' || phase === 'dusk')) return biome === 'underwater' ? mix(c, '#0E3A5E', 0.3) : mix(c, '#5A6A78', 0.14);
  if (phase === 'dusk') return mix(c, '#8A4A6A', 0.14);
  if (phase === 'dawn') return mix(c, '#E8A878', 0.08);
  return c;
}
function resolve(t: Tone, biome: Biome, phase: Phase, rain: boolean, glow: boolean): string {
  if (typeof t === 'string') return glow ? t : auto(t, biome, phase, rain);
  const k: PhaseKey = rain && (phase === 'day' || phase === 'dusk') && t.rain ? 'rain' : phase;
  return t[k] ?? (glow ? t.day : auto(t.day, biome, phase, rain));
}

interface Def<G extends string, T extends string> { c: Record<G | T, number>; glow: Record<G, Tone>; tone: Record<T, Tone> }
/** Assign slot codes: glow names first (95..), tones from 101. */
function def<G extends string, T extends string>(glow: Record<G, Tone>, tone: Record<T, Tone>): Def<G, T> {
  const c: Record<string, number> = {};
  Object.keys(glow).forEach((k, i) => { if (i >= GLOW_SLOTS) throw new Error('too many glow slots'); c[k] = A_FIRST + i; });
  Object.keys(tone).forEach((k, i) => { if (A_FIRST + GLOW_SLOTS + i > A_LAST) throw new Error('too many tone slots'); c[k] = A_FIRST + GLOW_SLOTS + i; });
  return { c: c as Record<G | T, number>, glow, tone };
}
const TABLES = new Map<string, Record<number, string>>();
const DEFS: Partial<Record<Biome, Def<string, string>>> = {};
function reg<G extends string, T extends string>(biome: Biome, d: Def<G, T>): Def<G, T> { DEFS[biome] = d as unknown as Def<string, string>; return d; }
/** Colours of the slot layers for a biome in a phase (undefined: the biome has no slots). */
export function biomeAColors(biome: Biome, phase: Phase, rain: boolean): Record<number, string> | undefined {
  const d = DEFS[biome];
  if (!d) return undefined;
  const key = `${biome}|${phase}|${rain ? 1 : 0}`;
  let t = TABLES.get(key);
  if (!t) {
    t = {};
    for (const k of Object.keys(d.glow)) t[d.c[k]] = resolve(d.glow[k], biome, phase, rain, true);
    for (const k of Object.keys(d.tone)) t[d.c[k]] = resolve(d.tone[k], biome, phase, rain, false);
    TABLES.set(key, t);
  }
  return t;
}
/** Every colour a biome's slot layers take in a phase (tests). */
export const biomeAHas = (biome: Biome) => !!DEFS[biome];

// ---------- meadow (dino) ----------
export const MEADOW = reg('meadow', def({
  firefly: '#F4EA7A', glint: '#FFF6C8',
}, {
  mount: '#A9C4CC', hillFar: '#8DB5A0', hillMid: '#86B07A', hillNear: '#6FA064', hillShade: '#5E8E58',
  treeDark: '#4C7B48', treeMid: '#648F52', treeLight: '#86AC62', trunk: '#6E5238',
  grassDark: '#5A8A48', grassMid: '#78A45C', grassLight: '#9CC272', blade: '#6B9A50',
  soil: '#A98F67', soilDark: '#8A7050', soilLight: '#C2AA80', stone: '#A89C8A', stoneDark: '#80766A',
  red: '#C9707A', yellow: '#E6BC4E', white: '#F2EEE0', purple: '#9C84BC', barn: '#B2594A', barnRoof: '#6E5460', fence: '#CDB88F', fenceDark: '#A89270',
}));

// ---------- woods (fox) ----------
export const WOODS = reg('woods', def({
  firefly: '#F4EA7A', mote: '#F6F0C0',
}, {
  farTrunk: { day: '#84A07A', night: '#25384A', dusk: '#9A8672' }, farLeaf: { day: '#88A67C', night: '#243649', dusk: '#9C8A76' },
  trunkDark: '#58402C', trunk: '#6E5238', trunkLight: '#8C6C4A',
  moss: '#7FA356', mossDark: '#5E8240',
  leafDark: '#3B6639', leaf: '#4A7343', leafMid: '#5C8A4B', leafLight: '#78A458', leafHi: '#96BC70',
  fernDark: '#4A7A40', fern: '#5C8E4E', fernLight: '#7CAE62',
  litterA: '#B8793F', litterB: '#8E5A30', litterC: '#D0A458',
  shroomRed: '#C4503C', shroomSpot: '#F0E6D0', shroomStem: '#D6CAAC',
  vine: '#4A7843', stone: '#908A7A', stoneDark: '#6C665A', soil: '#7A6444', soilDark: '#5C4A32',
  ray: { day: '#B6CC9A', dawn: '#D5CFA0', dusk: '#C09A88', night: '#2A3D50', rain: '#9DB394' },
}));

// ---------- underwater (fish) ----------
export const WATER = reg('underwater', def({
  bubble: '#D8F4F4', glint: '#F4FFFF', plankton: { day: '#CFF4F0', night: '#7CF0E0' },
}, {
  shaft: { day: '#7ACAD6', dawn: '#86C6D2', dusk: '#6AA8C0', night: '#17487E', rain: '#64ACBC' },
  surface: { day: '#8ED4DE', dawn: '#98D0DA', dusk: '#76B2C8', night: '#1A4A84', rain: '#6EB0C0' },
  farRock: '#4E98B0', farRockDark: '#3F86A2', farFish: '#3C82A0', rockDark: '#476A7C',
  kelpDark: '#25735A', kelp: '#2F8F6A', kelpLight: '#4CAE80',
  coralA: '#E8826E', coralAD: '#C4604E', coralAL: '#F5AA92',
  coralB: '#B77FC0', coralBD: '#92609E', coralBL: '#D4A4DA',
  coralC: '#E8C458', coralCD: '#C29A3C',
  sand: '#E6D6A4', sandDark: '#C9B880', sandLight: '#F2E8C4',
  pebble: '#8E9AA0', pebbleDark: '#6A767C', starfish: '#F0A050', shell: '#F4E6D0', anemone: '#E8688A', jelly: { day: '#D8A8D8', dusk: '#C898CC', night: '#B890F0' },
}));

// ---------- open sky (bird) ----------
export const SKYB = reg('sky', def({
  glint: '#FFFFFF', gold: '#F6E2A0',
}, {
  mount: '#88B6E0', mountLight: '#B4D2EE', hillFar: '#74AAC0', hillMid: '#6AA262', hillNear: '#58904F', fieldA: '#9ABA6A', fieldB: '#7FA55A',
  treeDark: '#3C6C3C', tree: '#4F8A4A', treeLight: '#76AE5C',
  cloudHi: '#FFFFFF', cloudMid: '#E8F1FA', cloudShade: '#C6D8EC', cloudDeep: '#A9C0DA',
  branchDark: '#58402E', branch: '#78593C', branchLight: '#9A7A54', bark: '#6A4E34',
  straw: '#C9A560', strawDark: '#8E6C3A', strawLight: '#E2C688', egg: '#F4EEDC', eggSpot: '#B8A47C', farBird: '#50657F', feather: '#F6EEE0',
}));

// ---------- backyard (cat) ----------
export const YARD = reg('yard', def({
  window: '#F6CE66', windowHi: '#FFEDA6', porch: '#FFE29A',
}, {
  glass: { day: '#86AEC4', dawn: '#B4C2C8', dusk: '#A894A8', night: '#2E3A5A', rain: '#7C9AAC' },
  wall: '#D8C6AA', wallShade: '#BEAA8C', roof: '#8C5A52', roofDark: '#6C4440', roofLight: '#A87268', brick: '#B0644E', brickDark: '#88483A',
  trim: '#F0E8D8', door: '#5F8CA8',
  wood: '#CBB68E', woodDark: '#A38C68', woodLight: '#DECDA8',
  grassDark: '#5A8A48', grass: '#78A45C', grassLight: '#9CC272', bush: '#4A7A46',
  pink: '#E889A8', yellow: '#EBC048', white: '#F4EFE2', purple: '#A688C8',
  soil: '#7A5C40', soilDark: '#5C4430', pot: '#C06A4A', yarn: '#D66F8E', yarnDark: '#AA4A6C',
  smoke: { day: '#EEF0F4', dawn: '#EEE8EA', dusk: '#D8C4D0', night: '#4E5478', rain: '#C4CAD2' },
}));

// ---------- cloud realm (spirits) ----------
export const CLOUDS = reg('clouds', def({
  star: '#FFF1B8', starW: '#FFFFFF', dust: '#F8D8F4',
}, {
  band1: { day: '#CBD3F4', dawn: '#F2D8E0', dusk: '#DDBFE6', night: '#44418A', rain: '#B9BFD8' },
  band2: { day: '#D9D3F3', dawn: '#F4DCDC', dusk: '#E6C3E2', night: '#4E4692', rain: '#C1C3D8' },
  band3: { day: '#E8D6F0', dawn: '#F6E0D6', dusk: '#EEC6DC', night: '#5C4A98', rain: '#C9C6D8' },
  band4: { day: '#F4DCEA', dawn: '#F8E6D0', dusk: '#F4CAD2', night: '#6E509C', rain: '#D0C8D6' },
  cloudHi: { day: '#FFFFFF', dawn: '#FFF4F0', dusk: '#FFEFF6', night: '#A8ABDD', rain: '#E4E6F2' },
  cloudMid: { day: '#EEF0FC', dawn: '#F8E8EC', dusk: '#F0DCEE', night: '#8588C6', rain: '#CDD0E4' },
  cloudShade: { day: '#D4D8F0', dawn: '#E8D4E0', dusk: '#D8C4E4', night: '#6A6CAE', rain: '#B4B8D2' },
  cloudDeep: { day: '#B9BEE4', dawn: '#D8C0D4', dusk: '#C0A8D8', night: '#575A98', rain: '#9EA4C4' },
  cloudPink: { day: '#F8DDEA', dawn: '#FFE3DA', dusk: '#FFD3E4', night: '#9C82C8', rain: '#E0CEDA' },
  rbRed: '#F2B4BC', rbYel: '#F6E6AA', rbGrn: '#B6E6CA', rbBlu: '#AACAF2',
  isle: '#C6B6E8', isleDark: '#A494D0', isleGrass: '#A8DEC2', isleTree: '#7CC4A4',
}));

// ---------- ember realm (spirits: imp, horn and soot lines) ----------
export const EMBERS = reg('ember', def({
  lava: '#F2663A', lavaHot: '#FFC060', ember: '#FF9A3C', emberDim: '#C8502C', glowRock: '#FF7A44',
}, {
  rockFar: '#46303A', rockFar2: '#583A44', rock: '#5E4E54', rockDark: '#3C2E36', rockLight: '#7E6A70', rockEdge: '#92787A',
  crack: '#2A1C24', ash: '#8A8284', ashDark: '#6A6264', ashLight: '#B0A8A8', soil: '#4A3C3C', soilDark: '#32282A', soilLight: '#62504E',
  smokeA: '#5A4850', smokeB: '#74606A', glowHaze: '#8A3C34', glowHaze2: '#A24A38', cinder: '#2C2024', bone: '#B8A89A',
}));
