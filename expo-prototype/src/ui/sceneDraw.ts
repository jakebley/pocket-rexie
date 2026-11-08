// Draws the 64x64 living scene into a Buf (ink only). Pure: everything comes from Scene + Pet.
import { SPECIES_BY_ID, needsAttention, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import { DIM_FLAG, LAYER_MASK, Layer, SCENERY_FROM, petLayers } from './layers';
import { biomeOf, type Biome } from './biomes';
import { drawBackdrop, drawFore } from './biomeDraw';
import { Buf, G7 } from './pixel';
import { BED_X, GROUND_Y, HEAD_Y, MAX_X, POOP_X, SCENE_N, SPRITE_N, TICK_MS, maxXFor, phaseOf, type Pop, type Prop, type Scene } from './scene';

type Rows = string[];

export const ART: Record<string, Rows> = {
  // 9x9 food
  'food:meat': ['..XXXXX..', '.XXXXXXX.', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '...XXX...', '..XX.....', '.XX......', 'XX.XX....'],
  'food:veggie': ['..X...X..', '.XXX.XXX.', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '...XXX...', '...XXX...', '...XXX...', '...XXX...'],
  'food:pasta': ['.X..X.X..', 'X.XX.X.XX', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '.XXXXXXX.', '..XXXXX..', '..XXXXX..'],
  'food:snack': ['..XXXXX..', '.XXXXXXX.', 'XXX.XXXXX', 'XXXXXX.XX', 'XX.XXXXXX', 'XXXXX.XXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..'],
  broom: ['.......XX', '......XX.', '.....XX..', '....XX...', '...XXX...', '..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'X.X.X.X.X'],
  ball: ['..XXXXX..', '.XX.X.XX.', 'XX..X..XX', 'X..XXX..X', 'XXXXXXXXX', 'X..XXX..X', 'XX..X..XX', '.XX.X.XX.', '..XXXXX..'],
  dumbbell: ['.XX.....XX.', 'XXXX...XXXX', 'XXXX...XXXX', 'XXXXXXXXXXX', 'XXXX...XXXX', 'XXXX...XXXX', '.XX.....XX.'],
  syringe: ['.....XXXX', '....XXXX.', '...XXXX..', '..XXXX...', '.XXXX....', 'XXXX.....', 'XXX......', 'XX.......', 'X........'],
  spark: ['....X....', '....X....', '..X.X.X..', '...XXX...', 'XXXXXXXXX', '...XXX...', '..X.X.X..', '....X....', '....X....'],
  puff: ['XXXXXXXXXXXX', '............', '....XXXXXXXX', '............', '..XXXXX'],
  glint: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
  shell: ['XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'],
  note: ['..XX.', '..XXX', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..'],
  dropS: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.XXX.'],
  flakeS: ['X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'],
  dot: ['XX', 'XX'],
  // sky
  cloudL: ['...XXXXX.........', '..XXXXXXX........', '.XXXXXXXXX.......', '.XXXXXXXXX.XXXXX.', '.XXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXXX'],
  cloudS: ['..XXX......', '.XXXXX.....', 'XXXXXXXXXX.', 'XXXXXXXXXX.', 'XXXXXXXXXXX', 'XXXXXXXXXXX', 'XXXXXXXXXXX'],
  sunDisc: ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..'],
  moon: ['...XXXX..', '..XXX....', '.XXX.....', '.XXX.....', '.XXX.....', '.XXX.....', '.XXX.....', '..XXX....', '...XXXX..'],
  butterfly0: ['XX...XX', 'XXX.XXX', '.XXXXX.', '..X.X..'],
  butterfly1: ['.......', '..X.X..', '..XXX..', '...X...'],
  // ground
  tuftT0: ['..X..', 'X.X.X', 'X.X.X', 'XXXXX'],
  tuftT1: ['...X.', '.X.X.', 'X.X.X', 'XXXXX'],
  tuftS0: ['.X.', 'X.X', 'XXX'],
  tuftS1: ['..X', 'X.X', 'XXX'],
  pebble: ['.XXX.', 'XXXXX'],
  flower0: ['.X.', 'X.X', '.X.', '.X.', 'XX.'],
  flower1: ['.X.', 'XXX', '.X.', '.X.', '.XX'],
  // thought bubble 13x9 (interior 11x7 holds a 7x7 icon)
  bubble: ['..XXXXXXXXX..', '.X.........X.', 'X...........X', 'X...........X', 'X...........X', 'X...........X', 'X...........X', '.X.........X.', '..XXXXXXXXX..'],
};

const FRAME_MS = 600;
export { GROUND_Y, HEAD_Y };
const SKY_TOP = 16; // first free sky row under the HUD (also the thought bubble's top)
const HOP = [0, -6, -8, -6, 0];

function flipRows(rows: Rows): Rows { return rows.map((r) => [...r].reverse().join('')); }

/** Stamp a bitmap in `layer`. halo: clear a 1px ring first so it stays legible over anything behind it. */
function stamp(b: Buf, rows: Rows, x: number, y: number, halo = false, layer: number = Layer.INK, rowLayer?: (j: number) => number) {
  if (halo) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] === 'X') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(x + i + dx, y + j + dy, 0);
    }
  }
  if (rowLayer) rows.forEach((r, j) => b.rows([r], x, y + j, 'X', rowLayer(j)));
  else b.rows(rows, x, y, 'X', layer);
}

export interface Pose { blink: boolean; dx: number; dy: number; facing: 1 | -1 }

/** Derived poses: everything comes from the two existing sprite frames. */
export function poseOf(s: Scene): Pose {
  const t = s.t;
  const amb = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  let blink = false, dx = 0, dy = 0;
  let facing = s.facing;
  switch (s.state) {
    case 'idle': dy = amb % 2 === 1 ? -1 : 0; break;
    case 'walk': case 'play': dy = -(Math.floor(t / 2) % 2); break;
    case 'look': dy = s.lookUp ? -1 : 0; break;
    case 'hop': case 'greet': case 'train': dy = HOP[t % 5]; break;
    case 'dance': dy = HOP[t % 5]; if (Math.floor((t * TICK_MS) / 300) % 2 === 1) facing = (facing * -1) as 1 | -1; break;
    case 'sit': case 'droop': case 'sleep': dy = 1; blink = true; break;
    case 'poop': dy = 1; blink = true; dx = t % 2 ? 2 : 0; break;
    case 'eat': blink = Math.floor(t / 2) % 2 === 1; dx = blink ? 2 : 0; break;
    case 'sneeze': dx = [-2, -2, 3, 3, 0, 0][Math.min(5, t)] ?? 0; blink = t < 4; break;
    case 'shiver': dx = t % 2 ? 1 : -1; break;
    case 'sweat': dy = 0; blink = Math.floor(t / 4) % 2 === 1; break;
    case 'stretch': dy = t < 5 ? -2 : 0; blink = t < 5; break;
    case 'react': dx = t < 2 ? -3 : 0; blink = true; break;
    case 'battle': dy = 0; break;
  }
  return { blink, dx: dx + s.pdx, dy: dy + s.pdy, facing };
}

// pet layer grids per sprite frame and facing (the BODY_LIGHT rule depends on direction)
const petCache = new WeakMap<Rows, Uint8Array>();
const petCacheFlip = new WeakMap<Rows, Uint8Array>();
function petCodes(spr: Rows, flipped: boolean, rows: Rows): Uint8Array {
  const cache = flipped ? petCacheFlip : petCache;
  let c = cache.get(spr);
  if (!c) { c = petLayers(rows); cache.set(spr, c); }
  return c;
}

function spriteRows(pet: Pet, blink: boolean): Rows | null {
  const sp = SPECIES_BY_ID[pet.species];
  return sp ? sp.hiFrames[blink && sp.hiFrames[1] ? 1 : 0] : null;
}

/** Draw the pet mirrored when facing left; scanline-clears the background behind its silhouette. */
const SPAN_LO = new Int16Array(40), SPAN_HI = new Int16Array(40);
function drawPet(b: Buf, s: Scene, pet: Pet, biome: Biome) {
  const pose = poseOf(s);
  const blinkNow = pose.blink || (!s.still && (Math.floor(s.nowMs / 200) + (s.seed % 20)) % 20 === 0 && s.state !== 'sleep');
  const spr = spriteRows(pet, blinkNow);
  if (!spr) return;
  const rows = pose.facing === 1 ? spr : flipRows(spr);
  let px = Math.round(s.x + pose.dx * pose.facing);
  // pose wiggles (squat, shiver, sneeze) must not push the ink into a poop; the sleeper stays on the bed
  if (s.state !== 'sleep') px = Math.min(px, maxXFor(pet.species, s.poopMask));
  const py = HEAD_Y + pose.dy;
  if (biome !== 'meadow') {
    // clear a 1px ring of biome scenery around the silhouette so the pet reads against any backdrop (shared meadow layers are untouched)
    const h = Math.min(rows.length, SPAN_LO.length);
    for (let j = 0; j < h; j++) { SPAN_LO[j] = rows[j].indexOf('X'); SPAN_HI[j] = rows[j].lastIndexOf('X'); }
    for (let j = -1; j <= h; j++) {
      let lo = 999, hi = -1;
      for (let k = j - 1; k <= j + 1; k++) if (k >= 0 && k < h && SPAN_HI[k] >= 0) { lo = Math.min(lo, SPAN_LO[k]); hi = Math.max(hi, SPAN_HI[k]); }
      if (hi < 0) continue;
      const y = py + j;
      if (y < 0 || y >= b.n) continue;
      for (let x = Math.max(0, px + lo - 1); x <= Math.min(b.n - 1, px + hi + 1); x++) {
        const i = y * b.n + x;
        if ((b.px[i] & LAYER_MASK) >= SCENERY_FROM) b.px[i] &= DIM_FLAG;
      }
    }
  }
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    const lo = r.indexOf('X'), hi = r.lastIndexOf('X');
    if (lo < 0) continue;
    for (let i = lo; i <= hi; i++) b.set(px + i, py + j, 0);
  }
  b.layers(petCodes(spr, pose.facing !== 1, rows), rows[0].length, px, py);
}

// ---------- sky ----------
const STARS: [number, number, number][] = [
  [18, 19, 1], [42, 20, 0], [6, 24, 0], [30, 25, 1], [51, 31, 0], [12, 35, 1], [39, 39, 0], [24, 43, 0], [57, 41, 1], [8, 47, 0], [46, 48, 1], [31, 51, 0],
];

function drawSky(b: Buf, s: Scene) {
  const phase = phaseOf(s.hour);
  const hf = s.hour + s.minute / 60;
  const tickN = s.still ? 0 : Math.floor(s.nowMs / TICK_MS);
  const amb = s.still ? 0 : s.nowMs;
  if (phase !== 'night') {
    const p = Math.min(1, Math.max(0, (hf - 5) / 16));
    const cx = Math.round(7 + p * 50), cy = 50 - Math.round(26 * Math.sin(Math.PI * p));
    b.as(Layer.SUN, () => {
      b.rows(ART.sunDisc, cx - 4, cy - 4);
      if (Math.floor(amb / FRAME_MS) % 2 === 0) {
        for (const k of [6, 7]) { b.set(cx - k, cy); b.set(cx + k, cy); b.set(cx, cy - k); b.set(cx, cy + k); }
      } else {
        for (const k of [5, 6]) { b.set(cx - k, cy - k); b.set(cx + k, cy - k); b.set(cx - k, cy + k); b.set(cx + k, cy + k); }
      }
    });
  } else {
    const q = Math.min(1, ((hf - 21 + 24) % 24) / 8);
    const cx = Math.round(57 - q * 50), cy = 50 - Math.round(26 * Math.sin(Math.PI * q));
    b.rows(ART.moon, cx - 4, cy - 4, 'X', Layer.MOON);
    b.as(Layer.STAR, () => STARS.forEach(([x, y, big], i) => {
      const ph = (Math.floor(tickN / 5) + i * 2) % 5;
      if (big) {
        b.set(x, y);
        if (ph !== 0) { b.set(x - 1, y); b.set(x + 1, y); b.set(x, y - 1); b.set(x, y + 1); }
      } else if (ph !== 0) b.set(x, y);
    }));
  }
  if (phase === 'dawn' || phase === 'dusk') {
    const o = phase === 'dawn' ? 0 : 1;
    b.as(Layer.CLOUD, () => {
      for (let x = 0; x < SCENE_N; x++) {
        if ((x + o) % 2 === 0) b.set(x, 53);
        if ((x + o * 2) % 4 === 0) b.set(x, 51);
        if ((x + o) % 8 === 0) b.set(x, 49);
      }
    });
  }
  // clouds drift one cell every 7.5 s
  const drift = Math.floor(amb / 7500);
  const o = s.seed % 64;
  const wide = (v: number) => ((v % 84) + 84) % 84 - 18;
  if (s.weather === 'clear') {
    if (phase !== 'night') stamp(b, ART.cloudS, wide(o + 40 + drift), 21, true, Layer.CLOUD);
  } else {
    stamp(b, ART.cloudL, wide(o + drift), 24, true, Layer.CLOUD);
    stamp(b, s.weather === 'rain' ? ART.cloudL : ART.cloudS, wide(o + 42 + drift), 18, true, Layer.CLOUD);
    if (s.weather === 'rain') stamp(b, ART.cloudS, wide(o + 21 + drift), 33, true, Layer.CLOUD);
  }
  if (s.weather === 'rain') {
    b.as(Layer.RAIN, () => {
      for (let i = 0; i < 22; i++) {
        const x = (i * 11 + (s.seed % 7)) % SCENE_N;
        const y = SKY_TOP + 8 + (tickN * 3 + i * 7) % (GROUND_Y - SKY_TOP - 10);
        b.set(x, y); b.set(x, y + 1); b.set(x - 1, y + 2);
      }
    });
  }
}

function drawGround(b: Buf, s: Scene) {
  b.rect(0, GROUND_Y, SCENE_N, 2, Layer.GROUND);
  // dirt: dither row, plus a few embedded pebbles
  b.as(Layer.DIRT, () => {
    for (let x = 0; x < SCENE_N; x += 2) b.set(x, GROUND_Y + 2);
    for (let x = 1; x < SCENE_N; x += 4) b.set(x, GROUND_Y + 3);
    [6, 17, 29, 41, 52, 60].forEach((x) => { b.set(x, GROUND_Y + 2); b.set(x + 1, GROUND_Y + 2); b.set(x, GROUND_Y + 3); b.set(x + 1, GROUND_Y + 3); b.set(x + 2, GROUND_Y + 3); });
  });
  const sway = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  [3, 21, 38, 56].forEach((x, i) => b.rows(ART[(sway + i) % 2 ? 'tuftT1' : 'tuftT0'], x, GROUND_Y - 4, 'X', Layer.GRASS));
  [11, 30, 47, 62].forEach((x, i) => b.rows(ART[(sway + i) % 2 ? 'tuftS0' : 'tuftS1'], x, GROUND_Y - 3, 'X', Layer.GRASS));
  [8, 34].forEach((x) => b.rows(ART.pebble, x, GROUND_Y - 2, 'X', Layer.DIRT));
  // flowers: colored head (top 3 rows), green stem
  [15, 26, 51].forEach((x, i) => stamp(b, ART[i % 2 ? 'flower1' : 'flower0'], x, GROUND_Y - 5, false, 0, (j) => (j < 3 ? (i % 2 ? Layer.FLOWER_B : Layer.FLOWER_A) : Layer.GRASS)));
}

function drawDim(b: Buf) {
  for (let y = 0; y < GROUND_Y; y++) for (let x = 0; x < SCENE_N; x++) if ((x + y) % 2 === 0) b.dim(x, y);
}

/** HUD: 7x7 hearts (hunger, y=1) and smiles (happy, y=9) top-left; skull, climate and alert glyphs stacked top-right. */
function drawHud(b: Buf, s: Scene, pet: Pet) {
  for (let i = 0; i < 4; i++) {
    stamp(b, i < pet.hunger ? G7.heartFull : G7.heartEmpty, 1 + i * 8, 1, true, Layer.HEART);
    stamp(b, i < pet.happy ? G7.smileFull : G7.smileEmpty, 1 + i * 8, 9, true, Layer.SMILE);
  }
  const flip = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS) % 2;
  const tempG = pet.temp >= 2 ? G7.drop : pet.temp <= -2 ? G7.flake : null;
  const icons: [Rows, number][] = [];
  if (pet.sick) icons.push([G7.skull, Layer.INK]);
  if (tempG && (!pet.sick || flip === 0)) icons.push([tempG, pet.temp >= 2 ? Layer.WATER_DROP : Layer.SNOW]);
  if (needsAttention(pet)) icons.push([G7.alert, Layer.ALERT]);
  icons.slice(0, 3).forEach(([g, l], k) => stamp(b, g, 56, 1 + k * 8, true, l));
}

function propLayer(g: string): number {
  switch (g) {
    case 'food:meat': return Layer.FOOD_MEAT;
    case 'food:veggie': return Layer.FOOD_VEG;
    case 'food:pasta': return Layer.FOOD_PASTA;
    case 'food:snack': return Layer.SNACK;
    case 'broom': case 'dumbbell': case 'syringe': return Layer.TOOL;
    case 'ball': return Layer.BALL;
    case 'spark': case 'glint': return Layer.SPARK;
    case 'puff': case 'shell': return Layer.CLOUD;
    case 'dropS': return Layer.WATER_DROP;
    case 'flakeS': return Layer.SNOW;
    default: return Layer.INK;
  }
}

function popArt(g: Pop['g']): Rows {
  return g === 'heart' ? G7.heartFull : g === 'smile' ? G7.smileFull : g === 'note' ? ART.note : g === 'spark' ? ART.glint : ART.dot;
}

function foeRows(idx: number, flip: boolean): Rows {
  const f = SPECIES[idx % SPECIES.length].frames[0]; // the 16x16 sprite: half the pet's size
  return flip ? flipRows(f) : f;
}

function drawProp(b: Buf, p: Prop) {
  if (p.g === 'foe') { stamp(b, foeRows(p.n ?? 0, p.x > 32), p.x, p.y, true); return; }
  let rows = ART[p.g];
  if (!rows) return;
  if (p.g.startsWith('food:') && p.n) {
    const cut = p.n * 3;
    rows = rows.map((r) => (p.side === 1 ? '.'.repeat(cut) + r.slice(cut) : r.slice(0, r.length - cut) + '.'.repeat(cut)));
  }
  if (p.g === 'shell' && p.n === 1) rows = flipRows(rows);
  stamp(b, rows, p.x, p.y, true, propLayer(p.g));
}

function bubbleIcon(pet: Pet): Rows | null {
  switch (pet.call) {
    case 'hungry': return G7.meat;
    case 'bored': return G7.ball;
    case 'poop': return G7.poop;
    case 'sick': return G7.syringe;
    case 'naughty': return G7.alert;
    case 'light': return G7.bulb;
    case 'hot': return G7.drop;
    case 'cold': return G7.flake;
    default: return null;
  }
}

export const BUBBLE_W = 13;
export const BUBBLE_H = 9;
/** Thought bubble spot: above the head in the free sky just under the HUD, tail toward the head. */
export function bubblePos(s: Scene): { x: number; y: number; beside: boolean } {
  const hx = Math.round(s.x);
  return { x: Math.max(0, Math.min(SCENE_N - BUBBLE_W, hx + 9)), y: HEAD_Y - 12, beside: false };
}

function bubbleLayer(pet: Pet): number {
  switch (pet.call) {
    case 'hungry': return Layer.FOOD_MEAT;
    case 'bored': return Layer.BALL;
    case 'poop': return Layer.POOP;
    case 'sick': return Layer.TOOL;
    case 'naughty': return Layer.ALERT;
    case 'light': return Layer.SPARK;
    case 'hot': return Layer.WATER_DROP;
    case 'cold': return Layer.SNOW;
    default: return Layer.INK;
  }
}

function drawBubble(b: Buf, s: Scene, pet: Pet) {
  const show = pet.call !== null && (!pet.asleep || pet.call === 'light');
  if (!show) return;
  const on = s.still || Math.floor(s.nowMs / 300) % 4 !== 3;
  const { x: bx, y: by } = bubblePos(s);
  if (on) {
    const icon = bubbleIcon(pet);
    b.rect(bx, by, BUBBLE_W, BUBBLE_H, 0);
    b.rows(ART.bubble, bx, by, 'X', Layer.BUBBLE);
    b.set(bx + 4, by + BUBBLE_H, Layer.BUBBLE); b.set(bx + 5, by + BUBBLE_H, Layer.BUBBLE); b.set(bx + 3, by + BUBBLE_H + 1, Layer.BUBBLE);
    if (icon) b.rows(icon, bx + 3, by + 1, 'X', bubbleLayer(pet));
  } else if (needsAttention(pet)) {
    stamp(b, G7.alert, bx + 3, by + 1, true, Layer.ALERT);
  }
}

function drawButterfly(b: Buf, s: Scene) {
  if (s.still || s.weather === 'rain' || phaseOf(s.hour) === 'night') return;
  const W = 90000;
  const w = Math.floor(s.nowMs / W);
  const start = w * W + Math.floor((((s.seed ^ (w * 2654435761)) >>> 0) % 76000));
  const dt = s.nowMs - start;
  if (dt < 0 || dt > 14000) return;
  const dir = ((s.seed + w) % 2) ? 1 : -1;
  const u = dt / 14000;
  const x = Math.round(dir === 1 ? -7 + u * 78 : 64 - u * 78);
  const y = Math.round(47 + 5 * Math.sin(dt / 700) - 8 * Math.sin(Math.PI * u));
  stamp(b, ART[Math.floor(dt / 250) % 2 ? 'butterfly1' : 'butterfly0'], x, y, true, Layer.BUTTERFLY);
}

/** Paint the whole home scene. */
export function drawScene(b: Buf, s: Scene, pet: Pet, biomeOverride?: Biome) {
  const biome = biomeOverride ?? biomeOf(pet);
  drawBackdrop(b, s, biome);
  drawSky(b, s);
  drawGround(b, s);
  drawFore(b, s, biome);
  if (s.dim) drawDim(b);
  drawButterfly(b, s);
  drawHud(b, s, pet);
  drawPet(b, s, pet, biome);
  const hx = Math.round(s.x);
  // bed: a woven mat in front of the sleeping pet's feet
  if (s.state === 'sleep' || pet.asleep) {
    const mx = hx + 4; // x=10 when the pet is on the bed
    b.rect(mx - 1, GROUND_Y, 26, 3, 0);
    for (let i = 0; i < 24; i++) { b.set(mx + i, GROUND_Y, i % 2 === 0 ? Layer.MAT : 0); b.set(mx + i, GROUND_Y + 2, Layer.MAT); }
  }
  // poops stand on the ground, right of the pet's allowed range
  const jig = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  for (let i = 0; i < 3; i++) if (s.poopMask & (1 << i)) stamp(b, G7.poop, POOP_X[i] + ((jig + i) % 2), GROUND_Y - 7, true, Layer.POOP); // 1 px jiggle, haloed so it reads over the grass
  for (const p of s.props) drawProp(b, p);
  // state effects around the head
  const t = s.t;
  const headX = hx + 12;
  switch (s.state) {
    case 'sleep': {
      const k = s.still ? 0 : Math.floor((s.nowMs) / 1200) % 3;
      stamp(b, G7.zzz, Math.min(56, hx + 24), HEAD_Y - 6 - k * 3, true);
      break;
    }
    case 'sweat':
      stamp(b, ART.dropS, headX + (s.facing === 1 ? 8 : 0), HEAD_Y - 4 + (Math.floor(t / 3) % 2), true, Layer.WATER_DROP);
      if (t % 2) { b.rect(hx - 2, HEAD_Y + 10, 2, 2, Layer.WATER_DROP); b.rect(hx + 32, HEAD_Y + 10, 2, 2, Layer.WATER_DROP); } else { b.rect(hx - 2, HEAD_Y + 14, 2, 2, Layer.WATER_DROP); b.rect(hx + 32, HEAD_Y + 14, 2, 2, Layer.WATER_DROP); }
      break;
    case 'shiver':
      if (pet.temp <= -2) stamp(b, ART.flakeS, headX + 4, HEAD_Y - 4 + (Math.floor(t / 4) % 2), true, Layer.SNOW);
      break;
    case 'dance':
      stamp(b, ART.note, headX + (Math.floor(t / 3) % 2 ? 10 : -4), HEAD_Y - 8 + (t % 3 === 0 ? 1 : 0), true, Layer.SPARK);
      break;
    case 'greet': {
      const fx = s.facing === 1 ? hx + 32 : hx - 3;
      const up = t % 2 === 0;
      const dir = s.facing === 1 ? 1 : -1;
      b.rect(fx, up ? 38 : 42, 2, 4); b.rect(fx + dir * 2, up ? 36 : 45, 2, 2); b.rect(fx, up ? 34 : 46, 2, 2);
      break;
    }
    case 'look':
      if (s.lookUp) { b.rect(hx + 14, HEAD_Y - 4, 2, 2); b.rect(hx + 18, HEAD_Y - 7, 2, 2); }
      break;
    case 'react': {
      const fx = hx + (s.facing === 1 ? 32 : -3);
      if (t < 4) { b.rect(fx, HEAD_Y + 12, 2, 3); b.rect(fx, HEAD_Y + 18, 2, 3); }
      break;
    }
    case 'train': {
      if (t % 5 === 2) { b.rect(hx - 2, HEAD_Y + 14, 2, 2); b.rect(hx - 4, HEAD_Y + 10, 2, 2); b.rect(hx + 33, HEAD_Y + 14, 2, 2); b.rect(hx + 35, HEAD_Y + 10, 2, 2); }
      break;
    }
  }
  for (const p of s.pops) stamp(b, popArt(p.g), p.x, p.y - Math.floor(p.age / 2), true, Layer.SPARK);
  drawBubble(b, s, pet);
  if (s.flash > 0) b.invert(0, 0, SCENE_N, SCENE_N);
}

export { BED_X, MAX_X, SPRITE_N };
