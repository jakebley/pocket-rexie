// The Technicolor home scene at 96x96 (docs/RESOLUTION.md). The pet's life stays in 64-space logic units (scene.ts); this painter converts
// every logic position with `g(v) = round(v * 1.5)` and uses finer art (art96.ts): a 48x48 pet (Scale3x of the 16x16 base frames),
// 10x10 HUD glyphs, 13x13 props. Biome scenery goes through the hook in biome96.ts.
import { SPECIES_BY_ID, needsAttention, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import { DIM_FLAG, LAYER_MASK, Layer, SCENERY_FROM } from './layers';
import { biomeOf, type Biome } from './biomes';
import { drawBiome96, ownGround96 } from './biome96';
import { ART96, FLOWER96, G10, TUFT96 } from './art96';
import { Buf, GRID_TECH, scale3xCached } from './pixel';
import { FRAME_MS, flipRows, poseOf } from './pose';
import { GROUND_Y, HEAD_Y, POOP_X, SCENE_N, TICK_MS, maxXFor, phaseOf, type Pop, type Prop, type Scene } from './scene';
import { shadedPetLayers } from './shading';

type Rows = string[];
export const N96 = GRID_TECH;
/** logic units to 96 cells */
export const g96 = (v: number) => Math.round(v * 1.5);
/** first ground row at 96 (90) */
export const GROUND_Y96 = g96(GROUND_Y);
/** the pet sprite at 96 is 48x48 and its top row sits at HEAD_Y96 */
export const PET_N96 = 48;
export const HEAD_Y96 = GROUND_Y96 - PET_N96;
const SKY_TOP = 16;

/** Stamp a bitmap in `layer` (or per-character layers). halo clears a 1px ring first so it reads over anything behind it. */
function stamp(b: Buf, rows: Rows, x: number, y: number, halo = false, layer: number = Layer.INK, map?: Record<string, number>) {
  if (halo) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] !== '.') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(x + i + dx, y + j + dy, 0);
    }
  }
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.') continue;
      if (map) { const l = map[ch]; if (l !== undefined) b.set(x + i, y + j, l); } else if (ch === 'X') b.set(x + i, y + j, layer);
    }
  }
}
/** A rectangle given in logic units (at least 1 cell). */
function R(b: Buf, x: number, y: number, w: number, h: number, layer: number = Layer.INK) {
  const x0 = g96(x), y0 = g96(y);
  b.rect(x0, y0, Math.max(1, g96(x + w) - x0), Math.max(1, g96(y + h) - y0), layer);
}

// ---------- the pet: 48x48 ----------
const petCache = new WeakMap<Rows, Uint8Array>();
const petCacheFlip = new WeakMap<Rows, Uint8Array>();
function petCodes96(base: Rows, flipped: boolean, family: string): Uint8Array {
  const cache = flipped ? petCacheFlip : petCache;
  let c = cache.get(base);
  if (!c) {
    const big = scale3xCached(base);
    c = shadedPetLayers(flipped ? flipRows(big) : big, family); // the light comes from the top-left of the screen, so a mirrored sprite is shaded again
    cache.set(base, c);
  }
  return c;
}
/** The 48x48 rows (facing right) of a species frame; null for an unknown species. */
export function petRows96(pet: Pet, blink: boolean): Rows | null {
  const sp = SPECIES_BY_ID[pet.species];
  return sp ? sp.frames[blink && sp.frames[1] ? 1 : 0] : null;
}

const SPAN_LO = new Int16Array(56), SPAN_HI = new Int16Array(56);
function drawPet96(b: Buf, s: Scene, pet: Pet) {
  const pose = poseOf(s);
  const blinkNow = pose.blink || (!s.still && (Math.floor(s.nowMs / 200) + (s.seed % 20)) % 20 === 0 && s.state !== 'sleep');
  const base = petRows96(pet, blinkNow);
  if (!base) return;
  const big = scale3xCached(base);
  const rows = pose.facing === 1 ? big : flipRows(big);
  let lx = Math.round(s.x + pose.dx * pose.facing);
  if (s.state !== 'sleep') lx = Math.min(lx, maxXFor(pet.species, s.poopMask));
  const px = g96(lx);
  const py = HEAD_Y96 + g96(pose.dy);
  {
    // clear a 1px ring of scenery codes around the silhouette so the pet reads against any backdrop (shared layers are untouched)
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
  b.layers(petCodes96(base, pose.facing !== 1, SPECIES_BY_ID[pet.species]?.family ?? ''), PET_N96, px, py);
}

// ---------- sky ----------
const STARS: [number, number, number][] = [
  [18, 19, 1], [42, 20, 0], [6, 24, 0], [30, 25, 1], [51, 31, 0], [12, 35, 1], [39, 39, 0], [24, 43, 0], [57, 41, 1], [8, 47, 0], [46, 48, 1], [31, 51, 0],
];
// the extra faint stars the finer grid has room for (96 cells)
const STARS96: [number, number][] = [[10, 14], [33, 22], [58, 18], [75, 26], [88, 40], [22, 52], [49, 62], [66, 48], [81, 60], [5, 70], [38, 74], [70, 72]];

function drawSky96(b: Buf, s: Scene) {
  const g = g96;
  const phase = phaseOf(s.hour);
  const hf = s.hour + s.minute / 60;
  const tickN = s.still ? 0 : Math.floor(s.nowMs / TICK_MS);
  const amb = s.still ? 0 : s.nowMs;
  if (phase !== 'night') {
    const p = Math.min(1, Math.max(0, (hf - 5) / 16));
    const cx = g(Math.round(7 + p * 50)), cy = g(50 - Math.round(26 * Math.sin(Math.PI * p)));
    b.as(Layer.SUN, () => {
      stamp(b, ART96.sunDisc, cx - 6, cy - 6, false, Layer.SUN);
      if (Math.floor(amb / FRAME_MS) % 2 === 0) {
        for (const k of [9, 10]) { b.set(cx - k, cy); b.set(cx + k, cy); b.set(cx, cy - k); b.set(cx, cy + k); }
        for (const k of [9, 10]) { b.set(cx - k, cy - 1); b.set(cx + k, cy - 1); b.set(cx - 1, cy - k); b.set(cx - 1, cy + k); }
      } else {
        for (const k of [7, 8]) { b.set(cx - k, cy - k); b.set(cx + k, cy - k); b.set(cx - k, cy + k); b.set(cx + k, cy + k); }
      }
    });
  } else {
    const q = Math.min(1, ((hf - 21 + 24) % 24) / 8);
    const cx = g(Math.round(57 - q * 50)), cy = g(50 - Math.round(26 * Math.sin(Math.PI * q)));
    stamp(b, ART96.moon, cx - 6, cy - 6, false, Layer.MOON);
    b.as(Layer.STAR, () => {
      STARS.forEach(([x, y, big], i) => {
        const ph = (Math.floor(tickN / 5) + i * 2) % 5;
        const sx = g(x), sy = g(y);
        if (big) {
          b.set(sx, sy); b.set(sx + 1, sy); b.set(sx, sy + 1); b.set(sx + 1, sy + 1);
          if (ph !== 0) { for (const k of [1, 2]) { b.set(sx - k, sy); b.set(sx - k, sy + 1); b.set(sx + 1 + k, sy); b.set(sx + 1 + k, sy + 1); b.set(sx, sy - k); b.set(sx + 1, sy - k); b.set(sx, sy + 1 + k); b.set(sx + 1, sy + 1 + k); } }
        } else if (ph !== 0) { b.set(sx, sy); b.set(sx + 1, sy); b.set(sx, sy + 1); b.set(sx + 1, sy + 1); }
      });
      STARS96.forEach(([x, y], i) => { if ((Math.floor(tickN / 7) + i * 3) % 4 !== 0) b.set(x, y); });
    });
  }
  if (phase === 'dawn' || phase === 'dusk') {
    const o = phase === 'dawn' ? 0 : 1;
    b.as(Layer.CLOUD, () => {
      for (let x = 0; x < N96; x++) {
        if ((x + o) % 2 === 0) b.set(x, g(53));
        if ((x + o * 2) % 4 === 0) b.set(x, g(51));
        if ((x + o) % 8 === 0) b.set(x, g(49));
      }
    });
  }
  // clouds drift one logic cell every 7.5 s (1.5 cells at 96)
  const drift = Math.floor(amb / 7500);
  const o = s.seed % 64;
  const wide = (v: number) => ((v % 84) + 84) % 84 - 18;
  const cloud = (art: Rows, x: number, y: number) => stamp(b, art, g(x), g(y), true, Layer.CLOUD);
  if (s.weather === 'clear') {
    if (phase !== 'night') cloud(ART96.cloudS, wide(o + 40 + drift), 21);
  } else {
    cloud(ART96.cloudL, wide(o + drift), 24);
    cloud(s.weather === 'rain' ? ART96.cloudL : ART96.cloudS, wide(o + 42 + drift), 18);
    if (s.weather === 'rain') cloud(ART96.cloudS, wide(o + 21 + drift), 33);
  }
  if (s.weather === 'rain') {
    b.as(Layer.RAIN, () => {
      for (let i = 0; i < 26; i++) {
        const x = g((i * 11 + (s.seed % 7)) % SCENE_N) + (i % 2);
        const y = g(SKY_TOP + 8 + (tickN * 3 + i * 7) % (GROUND_Y - SKY_TOP - 10));
        b.set(x, y); b.set(x, y + 1); b.set(x, y + 2); b.set(x - 1, y + 3); b.set(x - 1, y + 4);
      }
    });
  }
}

// ---------- ground ----------
function drawGround96(b: Buf, s: Scene) {
  const G = GROUND_Y96;
  b.rect(0, G, N96, 3, Layer.GROUND);
  b.as(Layer.DIRT, () => {
    for (let x = 0; x < N96; x += 2) b.set(x, G + 3);
    for (let x = 1; x < N96; x += 3) b.set(x, G + 4);
    for (let x = 0; x < N96; x += 5) b.set(x, G + 5);
    [6, 17, 29, 41, 52, 60, 25, 47].forEach((lx) => { const x = g96(lx); b.rect(x, G + 3, 2, 1); b.rect(x, G + 4, 3, 1); b.rect(x + 1, G + 5, 3, 1); });
  });
  const sway = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  [3, 21, 38, 56].forEach((lx, i) => { const a = (sway + i) % 2 ? TUFT96.T1 : TUFT96.T0; stamp(b, a, g96(lx), G - a.length, false, Layer.GRASS); });
  [11, 30, 47, 62].forEach((lx, i) => { const a = (sway + i) % 2 ? TUFT96.S0 : TUFT96.S1; stamp(b, a, g96(lx), G - a.length, false, Layer.GRASS); });
  [13, 41, 59].forEach((lx, i) => { const a = (sway + i) % 2 ? TUFT96.S1 : TUFT96.S0; stamp(b, a, g96(lx), G - a.length, false, Layer.GRASS); });
  [8, 34].forEach((lx) => stamp(b, ART96.pebble, g96(lx), G - 3, false, Layer.DIRT));
  [15, 26, 51].forEach((lx, i) => {
    const fl = FLOWER96[i % 2];
    stamp(b, fl, g96(lx), G - fl.length, false, 0, { X: i % 2 ? Layer.FLOWER_B : Layer.FLOWER_A, o: Layer.SUN, s: Layer.GRASS });
  });
}

function drawDim96(b: Buf) {
  for (let y = 0; y < GROUND_Y96; y++) for (let x = 0; x < N96; x++) if ((x + y) % 2 === 0) b.dim(x, y);
}

// ---------- HUD ----------
function drawHud96(b: Buf, s: Scene, pet: Pet) {
  for (let i = 0; i < 4; i++) {
    stamp(b, i < pet.hunger ? G10.heartFull : G10.heartEmpty, 1 + i * 12, 1, true, Layer.HEART);
    stamp(b, i < pet.happy ? G10.smileFull : G10.smileEmpty, 1 + i * 12, 13, true, Layer.SMILE);
  }
  const flip = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS) % 2;
  const tempG = pet.temp >= 2 ? G10.drop : pet.temp <= -2 ? G10.flake : null;
  const icons: [Rows, number][] = [];
  if (pet.sick) icons.push([G10.skull, Layer.INK]);
  if (tempG && (!pet.sick || flip === 0)) icons.push([tempG, pet.temp >= 2 ? Layer.WATER_DROP : Layer.SNOW]);
  if (needsAttention(pet)) icons.push([G10.alert, Layer.ALERT]);
  icons.slice(0, 3).forEach(([gl, l], k) => stamp(b, gl, 85, 1 + k * 12, true, l));
}

// ---------- props ----------
function propLayer(gl: string): number {
  switch (gl) {
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
function popArt(gl: Pop['g']): Rows {
  return gl === 'heart' ? G10.heartFull : gl === 'smile' ? G10.smileFull : gl === 'note' ? ART96.note : gl === 'spark' ? ART96.glint : ART96.dot;
}
const foeCache = new Map<number, Rows>();
/** The foe: the 16x16 base sprite at 24x24 (Scale3x, then a 2x2 majority reduction: half the pet's size like at 64). */
function foeBase96(idx: number): Rows {
  let r = foeCache.get(idx);
  if (!r) {
    const big = scale3xCached(SPECIES[idx % SPECIES.length].frames[0]);
    const n = big.length / 2;
    r = [];
    for (let y = 0; y < n; y++) {
      let row = '';
      for (let x = 0; x < n; x++) {
        let c = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (big[y * 2 + dy][x * 2 + dx] === 'X') c++;
        row += c >= 2 ? 'X' : '.';
      }
      r.push(row);
    }
    foeCache.set(idx, r);
  }
  return r;
}
function drawProp96(b: Buf, p: Prop) {
  const x = g96(p.x), y = g96(p.y);
  if (p.g === 'foe') { const f = foeBase96(p.n ?? 0); stamp(b, p.x > 32 ? flipRows(f) : f, x, y, true); return; }
  let rows = ART96[p.g];
  if (!rows) return;
  if (p.g.startsWith('food:') && p.n) {
    const cut = Math.round((p.n * 13) / 3);
    rows = rows.map((r) => (p.side === 1 ? '.'.repeat(cut) + r.slice(cut) : r.slice(0, r.length - cut) + '.'.repeat(cut)));
  }
  if (p.g === 'shell' && p.n === 1) rows = flipRows(rows);
  stamp(b, rows, x, y, true, propLayer(p.g));
}

function bubbleIcon(pet: Pet): Rows | null {
  switch (pet.call) {
    case 'hungry': return G10.meat;
    case 'bored': return G10.ball;
    case 'poop': return G10.poop;
    case 'sick': return G10.syringe;
    case 'naughty': return G10.alert;
    case 'light': return G10.bulb;
    case 'hot': return G10.drop;
    case 'cold': return G10.flake;
    default: return null;
  }
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
export const BUBBLE_W96 = 20;
export const BUBBLE_H96 = 14;
/** Thought bubble spot at 96: the 64 position (above the head, under the HUD) converted to cells. */
export function bubblePos96(s: Scene): { x: number; y: number } {
  const hx = Math.round(s.x);
  return { x: g96(Math.max(0, Math.min(SCENE_N - 13, hx + 9))), y: g96(HEAD_Y - 12) };
}
function drawBubble96(b: Buf, s: Scene, pet: Pet) {
  const show = pet.call !== null && (!pet.asleep || pet.call === 'light');
  if (!show) return;
  const on = s.still || Math.floor(s.nowMs / 300) % 4 !== 3;
  const { x: bx, y: by } = bubblePos96(s);
  if (on) {
    const icon = bubbleIcon(pet);
    b.rect(bx, by, BUBBLE_W96, BUBBLE_H96, 0);
    stamp(b, ART96.bubble, bx, by, false, Layer.BUBBLE);
    for (const [dx, dy] of [[4, 0], [5, 0], [6, 0], [3, 1], [4, 1], [2, 2]]) b.set(bx + dx, by + BUBBLE_H96 + dy, Layer.BUBBLE);
    if (icon) stamp(b, icon, bx + 5, by + 2, false, bubbleLayer(pet));
  } else if (needsAttention(pet)) {
    stamp(b, G10.alert, bx + 5, by + 2, true, Layer.ALERT);
  }
}

function drawButterfly96(b: Buf, s: Scene) {
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
  stamp(b, ART96[Math.floor(dt / 250) % 2 ? 'butterfly1' : 'butterfly0'], g96(x), g96(y), true, Layer.BUTTERFLY);
}

/**
 * The home scene's sky, scenery and ground with no pet, HUD or props: the backdrop of the 96 mini-game fields (a clear day at the scene's hour).
 * `scenery: false` skips the biome's own scenery and keeps the sky and the generic ground (a calmer field).
 */
export function drawBackdrop96(b: Buf, s: Scene, biome: Biome, scenery = true) {
  const c = { b, s, phase: phaseOf(s.hour), rain: false, biome, g: g96 };
  if (scenery) drawBiome96(c, 'backdrop');
  drawSky96(b, s);
  if (!scenery || !ownGround96(biome)) drawGround96(b, s);
  if (scenery) drawBiome96(c, 'fore');
}

/** Paint the whole home scene at 96x96. Same inputs as drawScene (64); positions come from the same logic-unit scene. */
export function drawScene96(b: Buf, s: Scene, pet: Pet, biomeOverride?: Biome) {
  if (b.n !== N96) throw new Error(`drawScene96 needs a ${N96} buffer, got ${b.n}`);
  const biome = biomeOverride ?? biomeOf(pet);
  const phase = phaseOf(s.hour);
  const c = { b, s, phase, rain: s.weather === 'rain', biome, g: g96 };
  drawBiome96(c, 'backdrop');
  drawSky96(b, s);
  if (!ownGround96(biome)) drawGround96(b, s);
  drawBiome96(c, 'fore');
  if (s.dim) drawDim96(b);
  drawButterfly96(b, s);
  drawHud96(b, s, pet);
  drawPet96(b, s, pet);
  const hx = Math.round(s.x);
  const G = GROUND_Y96;
  // bed: a woven mat in front of the sleeping pet's feet
  if (s.state === 'sleep' || pet.asleep) {
    const mx = g96(hx + 4);
    b.rect(mx - 1, G, 38, 5, 0);
    for (let i = 0; i < 36; i++) {
      b.set(mx + i, G, i % 2 === 0 ? Layer.MAT : 0); b.set(mx + i, G + 1, i % 2 === 0 ? 0 : Layer.MAT);
      b.set(mx + i, G + 3, i % 2 === 0 ? Layer.MAT : 0); b.set(mx + i, G + 4, Layer.MAT);
    }
  }
  // poops stand on the ground, right of the pet's allowed range
  const jig = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  for (let i = 0; i < 3; i++) if (s.poopMask & (1 << i)) stamp(b, G10.poop, g96(POOP_X[i]) + ((jig + i) % 2), G - 10, true, Layer.POOP);
  for (const p of s.props) drawProp96(b, p);
  // state effects around the head (logic units, converted)
  const t = s.t;
  const headX = hx + 12;
  switch (s.state) {
    case 'sleep': {
      const k = s.still ? 0 : Math.floor(s.nowMs / 1200) % 3;
      stamp(b, G10.zzz, g96(Math.min(56, hx + 24)), g96(HEAD_Y - 6 - k * 3), true);
      break;
    }
    case 'sweat':
      stamp(b, ART96.dropS, g96(headX + (s.facing === 1 ? 8 : 0)), g96(HEAD_Y - 4 + (Math.floor(t / 3) % 2)), true, Layer.WATER_DROP);
      if (t % 2) { R(b, hx - 2, HEAD_Y + 10, 2, 2, Layer.WATER_DROP); R(b, hx + 32, HEAD_Y + 10, 2, 2, Layer.WATER_DROP); } else { R(b, hx - 2, HEAD_Y + 14, 2, 2, Layer.WATER_DROP); R(b, hx + 32, HEAD_Y + 14, 2, 2, Layer.WATER_DROP); }
      break;
    case 'shiver':
      if (pet.temp <= -2) stamp(b, ART96.flakeS, g96(headX + 4), g96(HEAD_Y - 4 + (Math.floor(t / 4) % 2)), true, Layer.SNOW);
      break;
    case 'dance':
      stamp(b, ART96.note, g96(headX + (Math.floor(t / 3) % 2 ? 10 : -4)), g96(HEAD_Y - 8 + (t % 3 === 0 ? 1 : 0)), true, Layer.SPARK);
      break;
    case 'greet': {
      const fx = s.facing === 1 ? hx + 32 : hx - 3;
      const up = t % 2 === 0;
      const dir = s.facing === 1 ? 1 : -1;
      R(b, fx, up ? 38 : 42, 2, 4); R(b, fx + dir * 2, up ? 36 : 45, 2, 2); R(b, fx, up ? 34 : 46, 2, 2);
      break;
    }
    case 'look':
      if (s.lookUp) { R(b, hx + 14, HEAD_Y - 4, 2, 2); R(b, hx + 18, HEAD_Y - 7, 2, 2); }
      break;
    case 'react': {
      const fx = hx + (s.facing === 1 ? 32 : -3);
      if (t < 4) { R(b, fx, HEAD_Y + 12, 2, 3); R(b, fx, HEAD_Y + 18, 2, 3); }
      break;
    }
    case 'train':
      if (t % 5 === 2) { R(b, hx - 2, HEAD_Y + 14, 2, 2); R(b, hx - 4, HEAD_Y + 10, 2, 2); R(b, hx + 33, HEAD_Y + 14, 2, 2); R(b, hx + 35, HEAD_Y + 10, 2, 2); }
      break;
  }
  for (const p of s.pops) stamp(b, popArt(p.g), g96(p.x), g96(p.y - Math.floor(p.age / 2)), true, Layer.SPARK);
  drawBubble96(b, s, pet);
  if (s.flash > 0) b.invert(0, 0, N96, N96);
}
