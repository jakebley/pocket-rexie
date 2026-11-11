// DASH painter: parallax scenery from the family's biome scrolling past, the pet running / hopping / swimming / flying on the spot
// (two frames from the species art plus a bob), the family's obstacles and bonus items sliding in, speed lines as the course quickens.
// Everything moves with the game's own scroll (never the wall clock), so a frozen state is a frozen picture.
import { DASH_GROUND, dashGame, V_END, type DashState } from '../../core/minigames/games/dash';
import type { Biome } from '../biomes';
import { biomeOf } from '../biomes';
import { Layer, SCENERY_FROM } from '../layers';
import { textWidth, type Buf } from '../pixel';
import { drawGlyph, drawGlyphMark, drawPetFit } from './common';
import { paintDash96 } from './dash96';
import type { GameEntry, PaintCtx } from './types';

const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
/** Scenery only lands on empty pixels or other scenery, never on a shared layer (Traditional keeps its plain scene). */
const put = (b: Buf, x: number, y: number, l: number) => {
  if (x < 0 || y < 9 || x >= b.n || y >= b.n) return;
  const v = b.px[y * b.n + x] & 0x7f;
  if (v === 0 || v >= SCENERY_FROM) b.set(x, y, l);
};

type Shape = 'mound' | 'tree' | 'spire' | 'block' | 'reed' | 'cloud' | 'flower' | 'disc' | 'dots';
interface Band {
  shape: Shape;
  layer: number;
  /** a second tone (tree trunks, flower heads, lit windows) */
  acc?: number;
  /** speed as a fraction of the course, cell width, baseline row, height range, chance a cell holds one */
  speed: number; cw: number; base: number; h0: number; h1: number; chance: number;
}
const STYLE: Record<Biome, Band[]> = {
  meadow: [
    { shape: 'mound', layer: Layer.HILL, speed: 0.12, cw: 26, base: 58, h0: 8, h1: 14, chance: 0.8 },
    { shape: 'mound', layer: Layer.CLOVER, speed: 0.4, cw: 14, base: 59, h0: 3, h1: 5, chance: 0.6 },
  ],
  woods: [
    { shape: 'tree', layer: Layer.CANOPY, acc: Layer.BARK, speed: 0.12, cw: 16, base: 58, h0: 16, h1: 26, chance: 0.85 },
    { shape: 'mound', layer: Layer.FERN, speed: 0.4, cw: 13, base: 59, h0: 3, h1: 6, chance: 0.6 },
  ],
  underwater: [
    { shape: 'mound', layer: Layer.CORAL_A, speed: 0.12, cw: 22, base: 58, h0: 7, h1: 14, chance: 0.75 },
    { shape: 'reed', layer: Layer.SEAWEED, speed: 0.4, cw: 11, base: 59, h0: 5, h1: 10, chance: 0.65 },
    { shape: 'dots', layer: Layer.AIR_BUBBLE, speed: 0.25, cw: 9, base: 50, h0: 20, h1: 40, chance: 0.5 },
  ],
  sky: [
    { shape: 'cloud', layer: Layer.CLOUD_SHADE, speed: 0.1, cw: 30, base: 34, h0: 4, h1: 6, chance: 0.8 },
    { shape: 'cloud', layer: Layer.CLOUD, speed: 0.3, cw: 24, base: 22, h0: 3, h1: 4, chance: 0.7 },
  ],
  yard: [
    { shape: 'block', layer: Layer.ROOF, acc: Layer.WINDOW, speed: 0.12, cw: 26, base: 58, h0: 12, h1: 20, chance: 0.8 },
    { shape: 'block', layer: Layer.WOOD, speed: 0.4, cw: 8, base: 59, h0: 5, h1: 7, chance: 0.9 },
  ],
  clouds: [
    { shape: 'cloud', layer: Layer.CLOUD_SHADE, speed: 0.1, cw: 28, base: 40, h0: 5, h1: 8, chance: 0.8 },
    { shape: 'cloud', layer: Layer.CLOUD, speed: 0.32, cw: 22, base: 24, h0: 3, h1: 5, chance: 0.7 },
  ],
  ember: [
    { shape: 'spire', layer: Layer.CRAG, speed: 0.12, cw: 24, base: 58, h0: 12, h1: 24, chance: 0.8 },
    { shape: 'spire', layer: Layer.EMBER, speed: 0.4, cw: 13, base: 59, h0: 3, h1: 6, chance: 0.6 },
    { shape: 'dots', layer: Layer.ASH, speed: 0.3, cw: 10, base: 50, h0: 12, h1: 40, chance: 0.5 },
  ],
  warren: [
    { shape: 'mound', layer: Layer.BURROW, speed: 0.12, cw: 24, base: 58, h0: 8, h1: 15, chance: 0.8 },
    { shape: 'mound', layer: Layer.CLOVER, speed: 0.4, cw: 12, base: 59, h0: 3, h1: 5, chance: 0.6 },
  ],
  crags: [
    { shape: 'spire', layer: Layer.CRAG, speed: 0.12, cw: 26, base: 58, h0: 14, h1: 28, chance: 0.85 },
    { shape: 'spire', layer: Layer.ROCK, speed: 0.4, cw: 14, base: 59, h0: 4, h1: 8, chance: 0.6 },
  ],
  workshop: [
    { shape: 'block', layer: Layer.PANEL, acc: Layer.LED_A, speed: 0.12, cw: 24, base: 58, h0: 14, h1: 26, chance: 0.85 },
    { shape: 'reed', layer: Layer.CABLE, speed: 0.4, cw: 12, base: 59, h0: 4, h1: 9, chance: 0.55 },
  ],
  swamp: [
    { shape: 'tree', layer: Layer.MOSS, acc: Layer.BARK, speed: 0.12, cw: 18, base: 58, h0: 14, h1: 24, chance: 0.8 },
    { shape: 'reed', layer: Layer.GLOW_SHROOM, speed: 0.4, cw: 12, base: 59, h0: 3, h1: 7, chance: 0.6 },
  ],
  garden: [
    { shape: 'reed', layer: Layer.LEAF_BIG, speed: 0.12, cw: 14, base: 58, h0: 14, h1: 26, chance: 0.8 },
    { shape: 'flower', layer: Layer.LEAF_BIG, acc: Layer.DAISY, speed: 0.4, cw: 12, base: 59, h0: 5, h1: 8, chance: 0.6 },
  ],
  space: [
    { shape: 'disc', layer: Layer.PLANET, acc: Layer.PLANET_SHADE, speed: 0.06, cw: 64, base: 30, h0: 8, h1: 12, chance: 0.9 },
    { shape: 'dots', layer: Layer.TWINKLE, speed: 0.2, cw: 7, base: 30, h0: 10, h1: 48, chance: 0.6 },
    { shape: 'mound', layer: Layer.CRATER, speed: 0.4, cw: 14, base: 59, h0: 2, h1: 4, chance: 0.6 },
  ],
};

function drawBand(b: Buf, band: Band, scroll: number, seed: number) {
  const off = scroll * band.speed;
  const k0 = Math.floor(off / band.cw) - 1, k1 = Math.floor((off + b.n) / band.cw) + 1;
  for (let k = k0; k <= k1; k++) {
    const r = rnd(k * 3.7 + seed);
    if (r > band.chance) continue;
    const h = Math.round(band.h0 + (band.h1 - band.h0) * rnd(k * 5.1 + seed + 1));
    const cx = Math.round(k * band.cw + band.cw * (0.25 + 0.5 * rnd(k * 2.3 + seed + 2)) - off);
    const base = band.base;
    const l = band.layer, a = band.acc ?? band.layer;
    switch (band.shape) {
      case 'mound': {
        const w = h * 2 + 2;
        for (let i = -w; i <= w; i++) {
          const top = Math.round(h * Math.sqrt(Math.max(0, 1 - (i * i) / (w * w))));
          for (let j = 0; j < top; j++) put(b, cx + i, base - j, l);
        }
        break;
      }
      case 'tree': {
        const trunk = Math.max(3, Math.round(h * 0.4));
        for (let j = 0; j < trunk; j++) put(b, cx, base - j, a);
        const rad = Math.max(3, Math.round(h * 0.3));
        for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (i * i + j * j <= rad * rad + 1) put(b, cx + i, base - trunk - rad + 1 + j, l);
        break;
      }
      case 'spire':
        for (let j = 0; j < h; j++) { const hw = Math.round((j / h) * (h / 3 + 1)); for (let i = -hw; i <= hw; i++) put(b, cx + i, base - h + 1 + j, l); }
        break;
      case 'block': {
        const w = Math.max(4, Math.round(h * 0.7));
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(b, cx - (w >> 1) + i, base - j, l);
        if (a !== l) for (let j = 2; j < h - 1; j += 4) for (let i = 1; i < w - 1; i += 3) put(b, cx - (w >> 1) + i, base - j, a);
        break;
      }
      case 'reed':
        for (let j = 0; j < h; j++) put(b, cx + (j > h * 0.6 ? ((j & 2) ? 1 : 0) : 0), base - j, l);
        if (h > 4) put(b, cx, base - h, a);
        break;
      case 'cloud': {
        const w = h * 3;
        for (let i = -w; i <= w; i++) {
          const t = Math.round(h * Math.sqrt(Math.max(0, 1 - (i * i) / (w * w))));
          for (let j = -(t >> 1); j <= (t >> 1); j++) put(b, cx + i, base + j, l);
        }
        break;
      }
      case 'flower':
        for (let j = 0; j < h - 1; j++) put(b, cx, base - j, l);
        put(b, cx, base - h + 1, a); put(b, cx - 1, base - h + 2, a); put(b, cx + 1, base - h + 2, a); put(b, cx, base - h + 3, a);
        break;
      case 'disc': {
        const r2 = h / 2;
        for (let j = -h; j <= h; j++) for (let i = -h; i <= h; i++) if (i * i + j * j <= r2 * r2 * 4) put(b, cx + i, base + j - 6, (i + j > h * 0.4) ? a : l);
        break;
      }
      case 'dots': {
        // floating motes: a column's worth of drifting dots (bubbles rise, ash and stars hold)
        const y = base - Math.round(h * rnd(k + seed + 9));
        put(b, cx, y, l);
        break;
      }
    }
  }
}

function ground(b: Buf, scroll: number, biome: Biome) {
  const s = Math.floor(scroll);
  for (let x = 0; x < b.n; x++) { b.set(x, DASH_GROUND + 3, 0); b.set(x, DASH_GROUND + 4, 0); }
  b.as(Layer.DIRT, () => {
    for (let x = 0; x < b.n; x++) {
      if ((x + s) % 4 === 0) b.set(x, DASH_GROUND + 3);
      if ((x + s * 2) % 7 === 3) b.set(x, DASH_GROUND + 4);
    }
  });
  // little tufts or pebbles on the line, so Traditional shows the speed too
  const tuft = biome === 'workshop' || biome === 'space' || biome === 'crags' || biome === 'ember' ? Layer.DIRT : Layer.GRASS;
  const k0 = Math.floor(s / 9) - 1;
  for (let k = k0; k <= k0 + 9; k++) {
    if (rnd(k * 1.9 + 3) > 0.55) continue;
    const x = k * 9 + Math.floor(rnd(k + 8) * 6) - s;
    if (x < -2 || x > b.n) continue;
    if (tuft === Layer.GRASS) { put(b, x, DASH_GROUND, tuft); put(b, x - 1, DASH_GROUND - 1, tuft); put(b, x + 1, DASH_GROUND - 1, tuft); }
    else { put(b, x, DASH_GROUND, tuft); put(b, x + 1, DASH_GROUND, tuft); }
  }
}

function speedLines(b: Buf, s: DashState) {
  const level = (s.speed / V_END) * (s.stun > 0 ? 0 : 1);
  if (level < 0.8) return;
  const n = level > 1.05 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const y = 14 + Math.floor(rnd(i * 7.7 + 1) * 40);
    const len = 5 + Math.floor(rnd(i + 3) * 5);
    const x = (((Math.floor(rnd(i * 3.1) * 64) - Math.floor(s.scroll * 3.2)) % 70) + 70) % 70 - 4;
    for (let j = 0; j < len; j++) if (b.px[y * b.n + x + j] === 0) b.set(x + j, y, Layer.CLOUD);
  }
}

/** The pet's pose: [frame (0 or 1), dx, dy] */
function pose(s: DashState, move: string): { blink: boolean; dy: number } {
  if (s.stun > 0) return { blink: true, dy: 0 };
  if (!s.grounded) return { blink: s.vy < 0, dy: 0 };
  const ph = Math.floor(s.scroll / 4.5) % 2;
  switch (move) {
    case 'HOP': return { blink: ph === 1, dy: ph === 0 ? -1 : 0 };
    case 'RUN': case 'ROLL': case 'SLIDE': return { blink: ph === 1, dy: ph === 1 ? -1 : 0 };
    default: { const bob = Math.floor(s.scroll / 9) % 2; return { blink: ph === 1, dy: bob ? -2 : -1 }; } // fly, swim, float: hovering
  }
}

export function paintDash(c: PaintCtx) {
  const { b, params, pet } = c;
  const s = c.game.state as DashState;
  const th = params.theme;
  const biome = biomeOf(pet);
  // scenery
  STYLE[biome].forEach((band, i) => drawBand(b, band, s.scroll, i * 11));
  // far clouds in Traditional too: a few dashes drifting slowly
  for (let i = 0; i < 3; i++) {
    const x = (((i * 27 + 9 - Math.floor(s.scroll * 0.15)) % 80) + 80) % 80 - 12;
    const y = 12 + ((i * 7) % 12);
    for (let j = 0; j < 6; j++) if (b.px[y * b.n + x + j] === 0 && biome !== 'underwater') b.set(x + j, y, Layer.CLOUD);
  }
  ground(b, s.scroll, biome);
  speedLines(b, s);
  // bonus items
  for (const it of s.items) {
    if (it.x < -4 || it.x > b.n + 4) continue;
    const gl = it.bonus ? th.bonus : th.good[it.glyph % th.good.length];
    drawGlyphMark(b, gl, Math.round(it.x) - 3, Math.round(DASH_GROUND - it.hc - 3), true, it.bonus ? 'prize' : 'none', Math.floor(s.scroll * 40));
  }
  // obstacles
  for (const o of s.obstacles) {
    if (o.x < -8 || o.x > b.n + 1) continue;
    const gl = th.obstacles[o.kind % th.obstacles.length];
    if (o.hit) {
      // a bumped obstacle flickers so the player sees what hurt
      if (Math.floor(s.t / 100) % 2) continue;
    }
    drawGlyph(b, gl, Math.round(o.x), DASH_GROUND - 6, true);
  }
  // the pet
  const po = pose(s, th.move);
  const shake = s.stun > 0 ? (Math.floor(s.t / 70) % 2 ? 1 : -1) : 0;
  // after a bump the pet flickers between its two frames while it is safe, but it is always on screen
  const flicker = s.invul > 0 && s.stun <= 0 && Math.floor(s.invul / 90) % 2 === 0;
  const footY = DASH_GROUND - Math.round(s.hp);
  // trail: dust for runners, bubbles for swimmers, sparks for floaters
  if (s.cd <= 0 || s.cd < 600) {
    const back = Math.round(s.petX - s.petW / 2);
    const ph = Math.floor(s.scroll / 4.5);
    if (s.grounded && s.stun <= 0 && (th.move === 'RUN' || th.move === 'HOP' || th.move === 'ROLL' || th.move === 'SLIDE')) {
      b.set(back - 1 - (ph % 3), DASH_GROUND, Layer.SAND); b.set(back - 3 - ((ph + 1) % 3), DASH_GROUND - 1, Layer.SAND);
    } else if (th.move === 'SWIM') {
      b.set(back - 2 - (ph % 3), footY - 6 - (ph % 4), Layer.BUBBLE); b.set(back - 5 - ((ph + 1) % 3), footY - 8 - ((ph + 2) % 4), Layer.BUBBLE);
    } else if (th.move === 'FLOAT') {
      b.set(back - 2 - (ph % 3), footY - 4 - (ph % 5), Layer.SPARK);
    } else if (th.move === 'FLY' && !s.grounded) {
      b.set(back - 1, footY - 3, Layer.CLOUD); b.set(back - 3, footY - 5, Layer.CLOUD);
    }
  }
  drawPetFit(b, pet.species, s.petX + shake, footY, s.petW, s.petH, { blink: po.blink !== flicker, dy: po.dy, flip: false });
  if (s.stun > 0) {
    // dizzy stars over the head
    const a = Math.floor(s.t / 90) % 4;
    const hx = s.petX, hy = footY - s.petH - 2;
    const pts = [[-4, 0], [0, -2], [4, 0], [0, 1]];
    b.set(hx + pts[a][0], hy + pts[a][1], Layer.SPARK); b.set(hx + pts[(a + 2) % 4][0], hy + pts[(a + 2) % 4][1], Layer.SPARK);
  }
  // pops
  for (const p of s.pops) {
    const w = textWidth(p.text);
    const x = Math.max(0, Math.min(b.n - w, Math.round(p.x - w / 2)));
    const y = Math.max(9, Math.round(p.y - p.age / 55));
    b.rect(x - 1, y - 1, w + 2, 7, 0);
    b.as(p.kind === 'hit' ? Layer.ALERT : Layer.SPARK, () => b.text(p.text, x, y));
  }
  // the course speeds up in three steps: say so
  const third = s.duration / 3;
  if (s.cd <= 0 && [1, 2].some((k) => s.t >= k * third && s.t < k * third + 900) && Math.floor(s.t / 150) % 2 === 0) {
    const w = textWidth('FASTER!');
    b.rect(((b.n - w) >> 1) - 2, 11, w + 4, 9, 0);
    b.as(Layer.ALERT, () => b.text('FASTER!', (b.n - w) >> 1, 13));
  }
  // countdown and GO
  if (s.cd > 0 || s.t < 600) {
    const txt = s.cd > 0 ? String(Math.min(3, Math.ceil(s.cd / 600))) : 'GO!';
    const w = textWidth(txt, 3);
    const x = (b.n - w) >> 1;
    b.rect(x - 4, 14, w + 8, 21, 0); b.frame(x - 4, 14, w + 8, 21);
    b.as(Layer.INK, () => b.text(txt, x, 19, 3));
  }
}

export const entry: GameEntry = {
  def: dashGame, layout: 'field', paint: paintDash, paint96: paintDash96,
  hud96: (c) => { const s = c.game.state as DashState; return { urgent: s.cd <= 0 && s.duration - s.t <= 5000, ms: c.ms, mid: s.streak >= 2 ? `x${s.streak}` : undefined }; },
};
