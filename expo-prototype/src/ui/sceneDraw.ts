// Draws the 48x48 living scene into a Buf (ink only). Pure: everything comes from Scene + Pet.
import { SPECIES_BY_ID, needsAttention, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import { Buf, GLYPHS } from './pixel';
import { BED_X, MAX_X, POOP_X, SCENE_N, TICK_MS, maxXFor, phaseOf, type Pop, type Prop, type Scene } from './scene';

type Rows = string[];

export const ART: Record<string, Rows> = {
  'food:meat': ['.XXX.', 'XXXXX', 'XXXXX', '.XXX.', 'X.X..'],
  'food:veggie': ['..XXX', '.XXXX', 'XXXX.', 'XXX..', 'X....'],
  'food:pasta': ['.X.X.', 'X.X.X', 'XXXXX', 'XXXXX', '.XXX.'],
  'food:snack': ['X...X', 'XXXXX', 'XXXXX', 'XXXXX', 'X...X'],
  broom: ['...XX', '..XX.', '.XXX.', 'XXXXX', 'X.X.X'],
  ball: ['.X.', 'XXX', '.X.'],
  dumbbell: ['X...X', 'XXXXX', 'X...X'],
  syringe: ['..XXX', '.XXX.', 'XXX..', 'XX...', 'X....'],
  spark: ['X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'],
  puff: ['XXXXX', '.....', '..XXX'],
  glint: ['.X.', 'XXX', '.X.'],
  shell: ['XXXX', '.XX.'],
  bulb: ['.XXX.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  note: ['.XX', '.X.', '.X.', 'XX.', 'XX.'],
  dropS: ['.X.', 'XXX', 'XXX'],
  flakeS: ['X.X', '.X.', 'X.X'],
  cloudL: ['..XX.....', '.XXXXXX..', 'XXXXXXXXX'],
  cloudS: ['.XX..', 'XXXXX'],
  sunDisc: ['.XXX.', 'XXXXX', 'XXXXX', 'XXXXX', '.XXX.'],
  moon: ['.XXX.', 'XX...', 'XX...', 'XX...', '.XXX.'],
  butterfly0: ['X.X', '.X.', 'X.X'],
  butterfly1: ['...', 'XXX', '.X.'],
  tuft0: ['.X.', 'X.X', 'X.X'],
  tuft1: ['..X', '.XX', 'X.X'],
  pebble: ['.X.', 'XXX'],
  heartS: ['X.X', 'XXX', '.X.'],
  heartSE: ['X.X', '...', '.X.'],
  smileS: ['X.X', '...', 'XXX'],
  smileSE: ['X.X', '...', '...'],
  skullS: ['XXX', 'X.X', '.X.'],
  bubble: ['.XXXXXXX.', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', '.XXXXXXX.'],
};

const FRAME_MS = 600;
export const HEAD_Y = 28; // sprite row 0 sits here, so sprite row 15 (the feet) lands on y=43, just above the ground
export const GROUND_Y = 44; // solid 2-row ground line at y=44..45, dirt dither at 46..47
const HOP = [0, -5, -6, -5, 0];

function flipRows(rows: Rows): Rows { return rows.map((r) => [...r].reverse().join('')); }

/** Stamp a bitmap. halo: clear a 1px ring first so it stays legible over anything behind it. */
function stamp(b: Buf, rows: Rows, x: number, y: number, halo = false) {
  if (halo) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] === 'X') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(x + i + dx, y + j + dy, 0);
    }
  }
  b.rows(rows, x, y);
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
    case 'poop': dy = 1; blink = true; dx = t % 2 ? 1 : 0; break;
    case 'eat': blink = Math.floor(t / 2) % 2 === 1; dx = blink ? 1 : 0; break;
    case 'sneeze': dx = [-1, -1, 2, 2, 0, 0][Math.min(5, t)] ?? 0; blink = t < 4; break;
    case 'shiver': dx = t % 2 ? 1 : -1; break;
    case 'sweat': dy = 0; blink = Math.floor(t / 4) % 2 === 1; break;
    case 'stretch': dy = t < 5 ? -1 : 0; blink = t < 5; break;
    case 'react': dx = t < 2 ? -2 : 0; blink = true; break;
    case 'battle': dy = 0; break;
  }
  return { blink, dx: dx + s.pdx, dy: dy + s.pdy, facing };
}

function spriteRows(pet: Pet, blink: boolean): Rows | null {
  const sp = SPECIES_BY_ID[pet.species];
  return sp ? sp.frames[blink && sp.frames[1] ? 1 : 0] : null;
}

/** Draw the pet mirrored when facing left; scanline-clears the background behind its silhouette. */
function drawPet(b: Buf, s: Scene, pet: Pet) {
  const pose = poseOf(s);
  const blinkNow = pose.blink || (!s.still && (Math.floor(s.nowMs / 200) + (s.seed % 20)) % 20 === 0 && s.state !== 'sleep');
  const spr = spriteRows(pet, blinkNow);
  if (!spr) return;
  const rows = pose.facing === 1 ? spr : flipRows(spr);
  let px = Math.round(s.x + pose.dx * pose.facing);
  // pose wiggles (squat, shiver, sneeze) must not push the ink into a poop; the sleeper stays on the bed
  if (s.state !== 'sleep') px = Math.min(px, maxXFor(pet.species, s.poopMask));
  const py = HEAD_Y + pose.dy;
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j];
    const lo = r.indexOf('X'), hi = r.lastIndexOf('X');
    if (lo < 0) continue;
    for (let i = lo; i <= hi; i++) b.set(px + i, py + j, 0);
  }
  b.rows(rows, px, py);
}

// ---------- sky ----------
function drawSky(b: Buf, s: Scene) {
  const phase = phaseOf(s.hour);
  const hf = s.hour + s.minute / 60;
  const tickN = s.still ? 0 : Math.floor(s.nowMs / TICK_MS);
  const amb = s.still ? 0 : s.nowMs;
  if (phase !== 'night') {
    const p = Math.min(1, Math.max(0, (hf - 5) / 16));
    const cx = Math.round(3 + p * 40), cy = 38 - Math.round(21 * Math.sin(Math.PI * p));
    b.rows(ART.sunDisc, cx - 2, cy - 2);
    if (Math.floor(amb / FRAME_MS) % 2 === 0) { b.set(cx - 4, cy); b.set(cx + 4, cy); b.set(cx, cy - 4); b.set(cx, cy + 4); }
    else { b.set(cx - 3, cy - 3); b.set(cx + 3, cy - 3); b.set(cx - 3, cy + 3); b.set(cx + 3, cy + 3); }
  } else {
    const q = Math.min(1, ((hf - 21 + 24) % 24) / 8);
    const cx = Math.round(43 - q * 38), cy = 38 - Math.round(21 * Math.sin(Math.PI * q));
    b.rows(ART.moon, cx - 2, cy - 2);
    const stars: [number, number][] = [[18, 15], [38, 14], [4, 22], [14, 18], [30, 21], [44, 25], [24, 30], [8, 34]];
    stars.forEach(([x, y], i) => { if ((Math.floor(tickN / 5) + i * 2) % 5 !== 0) b.set(x, y); });
  }
  if (phase === 'dawn' || phase === 'dusk') for (let x = 0; x < SCENE_N; x += 4) { b.set(x + (phase === 'dawn' ? 0 : 2), 40); b.set(x + (phase === 'dawn' ? 2 : 0), 39); }
  // clouds drift one cell every 10 s
  const drift = Math.floor(amb / 10000);
  const o = s.seed % 48;
  const wide = (v: number) => ((v % 60) + 60) % 60 - 12;
  if (s.weather === 'clear') {
    if (phase !== 'night') stamp(b, ART.cloudS, wide(o + 30 + drift), 16, true);
  } else {
    stamp(b, ART.cloudL, wide(o + drift), 17, true);
    stamp(b, ART.cloudL, wide(o + 32 + drift), 14, true);
    if (s.weather === 'rain') stamp(b, ART.cloudL, wide(o + 16 + drift), 21, true);
  }
  if (s.weather === 'rain') {
    for (let i = 0; i < 14; i++) {
      const x = (i * 7 + (s.seed % 5)) % SCENE_N;
      const y = 13 + (tickN * 2 + i * 5) % 28;
      b.set(x, y); b.set(x, y + 1);
    }
  }
}

function drawGround(b: Buf, s: Scene) {
  b.rect(0, GROUND_Y, SCENE_N, 2);
  for (let x = 0; x < SCENE_N; x += 2) b.set(x, GROUND_Y + 2);
  for (let x = 1; x < SCENE_N; x += 4) b.set(x, GROUND_Y + 3);
  const sway = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  [1, 14, 27, 40].forEach((x, i) => b.rows(ART[(sway + i) % 2 ? 'tuft1' : 'tuft0'], x, GROUND_Y - 3));
  [8, 33].forEach((x) => b.rows(ART.pebble, x, GROUND_Y - 2));
}

function drawDim(b: Buf) {
  for (let y = 0; y < GROUND_Y; y++) for (let x = 0; x < SCENE_N; x++) if ((x + y) % 2 === 0) b.set(x, y);
}

/** HUD: full 5x5 hearts (hunger, y=1) and smiles (happy, y=7) top-left; skull, climate and alert glyphs stacked top-right. */
function drawHud(b: Buf, s: Scene, pet: Pet) {
  for (let i = 0; i < 4; i++) {
    stamp(b, i < pet.hunger ? GLYPHS.heartFull : GLYPHS.heartEmpty, 1 + i * 6, 1, true);
    stamp(b, i < pet.happy ? GLYPHS.smileFull : GLYPHS.smileEmpty, 1 + i * 6, 7, true);
  }
  const flip = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS) % 2;
  const tempG = pet.temp >= 2 ? GLYPHS.drop : pet.temp <= -2 ? GLYPHS.flake : null;
  const icons: Rows[] = [];
  if (pet.sick) icons.push(GLYPHS.skull);
  if (tempG && (!pet.sick || flip === 0)) icons.push(tempG);
  if (needsAttention(pet)) icons.push(GLYPHS.alert);
  icons.slice(0, 3).forEach((g, k) => stamp(b, g, 41, 1 + k * 6, true));
}

function popArt(g: Pop['g']): Rows {
  return g === 'heart' ? GLYPHS.heartFull : g === 'smile' ? GLYPHS.smileFull : g === 'note' ? ART.note : g === 'spark' ? ART.glint : ['X'];
}

function foeRows(idx: number, flip: boolean): Rows {
  const sp = SPECIES[idx % SPECIES.length];
  const f = sp.frames[0];
  const out: string[] = [];
  for (let y = 0; y < 8; y++) {
    let r = '';
    for (let x = 0; x < 8; x++) {
      const on = f[y * 2][x * 2] === 'X' || f[y * 2][x * 2 + 1] === 'X' || f[y * 2 + 1][x * 2] === 'X' || f[y * 2 + 1][x * 2 + 1] === 'X';
      r += on ? 'X' : '.';
    }
    out.push(r);
  }
  return flip ? flipRows(out) : out;
}

function drawProp(b: Buf, p: Prop) {
  if (p.g === 'foe') { stamp(b, foeRows(p.n ?? 0, p.x > 24), p.x, p.y, true); return; }
  let rows = ART[p.g];
  if (!rows) return;
  if (p.g.startsWith('food:') && p.n) {
    const cut = p.n * 2;
    rows = rows.map((r) => (p.side === 1 ? '.'.repeat(cut) + r.slice(cut) : r.slice(0, r.length - cut) + '.'.repeat(cut)));
  }
  if (p.g === 'shell' && p.n === 1) rows = flipRows(rows);
  stamp(b, rows, p.x, p.y, true);
}

function bubbleIcon(pet: Pet): Rows | null {
  switch (pet.call) {
    case 'hungry': return ART['food:meat'];
    case 'bored': return ['.XXX.', 'XX.XX', 'X...X', 'XX.XX', '.XXX.']; // ball
    case 'poop': return GLYPHS.poop;
    case 'sick': return ART.syringe;
    case 'naughty': return GLYPHS.alert;
    case 'light': return ART.bulb;
    case 'hot': return GLYPHS.drop;
    case 'cold': return GLYPHS.flake;
    default: return null;
  }
}

/** Thought bubble spot: over the head when it fits in the sky (y >= 13), else beside the head. */
export function bubblePos(s: Scene): { x: number; y: number; beside: boolean } {
  const hx = Math.round(s.x);
  const y = HEAD_Y - 12;
  if (y >= 13) return { x: Math.max(0, Math.min(SCENE_N - 9, hx + 4)), y, beside: false };
  const right = hx + 16 + 9 <= SCENE_N;
  return { x: right ? hx + 16 : Math.max(0, hx - 9), y: 13, beside: true };
}

function drawBubble(b: Buf, s: Scene, pet: Pet) {
  const show = pet.call !== null && (!pet.asleep || pet.call === 'light');
  if (!show) return;
  const on = s.still || Math.floor(s.nowMs / 300) % 4 !== 3;
  const { x: bx, y: by, beside } = bubblePos(s);
  if (on) {
    const icon = bubbleIcon(pet);
    b.rect(bx, by, 9, 7, 0);
    b.rows(ART.bubble, bx, by);
    if (!beside) { b.set(bx + 2, by + 7); b.set(bx + 1, by + 8); }
    if (icon) b.rows(icon, bx + 2, by + 1);
  } else if (needsAttention(pet)) {
    stamp(b, GLYPHS.alert, bx + 2, by + 1, true);
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
  const x = Math.round(dir === 1 ? -3 + u * 54 : 50 - u * 54);
  const y = Math.round(33 + 4 * Math.sin(dt / 700) - 5 * Math.sin(Math.PI * u));
  stamp(b, ART[Math.floor(dt / 250) % 2 ? 'butterfly1' : 'butterfly0'], x, y, true);
}

/** Paint the whole home scene. */
export function drawScene(b: Buf, s: Scene, pet: Pet) {
  drawSky(b, s);
  drawGround(b, s);
  if (s.dim) drawDim(b);
  drawButterfly(b, s);
  drawHud(b, s, pet);
  drawPet(b, s, pet);
  const hx = Math.round(s.x);
  // bed: a woven mat in front of the sleeping pet's feet
  if (s.state === 'sleep' || pet.asleep) {
    const mx = hx + 2; // x=10 when the pet is on the bed
    b.rect(mx - 1, GROUND_Y, 14, 2, 0);
    for (let i = 0; i < 12; i++) { b.set(mx + i, GROUND_Y, i % 2 === 0 ? 1 : 0); b.set(mx + i, GROUND_Y + 1); }
  }
  // poops stand on the ground, right of the pet's allowed range
  const jig = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  for (let i = 0; i < 3; i++) if (s.poopMask & (1 << i)) b.rows(GLYPHS.poop, POOP_X[i] + ((jig + i) % 2), GROUND_Y - 5); // 1 px jiggle
  for (const p of s.props) drawProp(b, p);
  // state effects around the head
  const t = s.t;
  const headX = hx + 6;
  switch (s.state) {
    case 'sleep': {
      const k = s.still ? 0 : Math.floor((s.nowMs) / 1200) % 3;
      stamp(b, GLYPHS.zzz, Math.min(42, hx + 11), 25 - k * 2, true);
      break;
    }
    case 'sweat':
      stamp(b, ART.dropS, headX + (s.facing === 1 ? 4 : 0), 24 + (Math.floor(t / 3) % 2), true);
      if (t % 2) { b.set(hx - 1, 33); b.set(hx + 16, 33); } else { b.set(hx - 1, 35); b.set(hx + 16, 35); }
      break;
    case 'shiver':
      if (pet.temp <= -2) stamp(b, ART.flakeS, headX + 2, 24 + (Math.floor(t / 4) % 2), true);
      break;
    case 'dance':
      stamp(b, ART.note, headX + (Math.floor(t / 3) % 2 ? 6 : -2), 21 + (t % 3 === 0 ? 1 : 0), true);
      break;
    case 'greet': {
      const fx = s.facing === 1 ? hx + 15 : hx - 2;
      const up = t % 2 === 0;
      b.set(fx, up ? 29 : 30); b.set(fx + (s.facing === 1 ? 1 : -1), up ? 28 : 31); b.set(fx, up ? 28 : 31);
      break;
    }
    case 'look':
      if (s.lookUp) { b.set(hx + 7, 24); b.set(hx + 9, 23); }
      break;
    case 'react': {
      const fx = hx + (s.facing === 1 ? 15 : -1);
      if (t < 4) { b.set(fx, 31); b.set(fx, 33); }
      break;
    }
    case 'train': {
      if (t % 5 === 2) { b.set(hx - 1, 31); b.set(hx - 2, 30); b.set(hx + 16, 31); b.set(hx + 17, 30); }
      break;
    }
  }
  for (const p of s.pops) stamp(b, popArt(p.g), p.x, p.y - Math.floor(p.age / 2), true);
  drawBubble(b, s, pet);
  if (s.flash > 0) b.invert(0, 0, SCENE_N, SCENE_N);
}

export { BED_X, MAX_X };
