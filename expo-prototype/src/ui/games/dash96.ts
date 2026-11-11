// DASH at 96x96: the family's finer biome stands still behind the course (distant scenery needs no scrolling), a nearer band of the biome's own
// small scenery (bushes, reeds, pebbles, clouds, bubbles) scrolls past at course speed, the ground dashes stream under the pet, the pet runs / hops /
// swims / flies in place with a 2-frame step and a bob, obstacles and pick-ups are the 10x10 family glyphs. Everything moves with the game's own scroll
// (never the wall clock), so a frozen state is a frozen picture.
import { DASH_GROUND, V_END, type DashState } from '../../core/minigames/games/dash';
import { themeFor96 } from '../../core/minigames/themes96';
import { biomeOf, type Biome } from '../biomes';
import { Layer, SCENERY_FROM } from '../layers';
import { textWidth, type Buf } from '../pixel';
import { FEET96, GROUND96, HUD96_H, drawGlyph96, drawGlyphMark96, drawPetFit96, g96, groundShadow, panel, textHalo, textHaloC } from './common96';
import type { PaintCtx } from './types';

const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
/** Scenery only lands on empty pixels or other scenery, never on a shared layer. */
const put = (b: Buf, x: number, y: number, l: number) => {
  if (x < 0 || y < HUD96_H || x >= b.n || y >= b.n) return;
  const v = b.px[y * b.n + x] & 0x7f;
  if (v === 0 || v >= SCENERY_FROM) b.set(x, y, l);
};

type Shape = 'mound' | 'tree' | 'spire' | 'block' | 'reed' | 'cloud' | 'flower' | 'disc' | 'dots';
interface Band {
  shape: Shape; layer: number;
  /** a second tone (trunks, flower heads, lit windows) and a lighter one for the lit top edge */
  acc?: number; hi?: number;
  /** speed as a fraction of the course, cell width, baseline row, height range, chance a cell holds one (all in 96 cells) */
  speed: number; cw: number; base: number; h0: number; h1: number; chance: number;
}
const B = FEET96;
/** Near scenery per biome (the far scenery is the biome's own static backdrop). */
const STYLE: Record<Biome, Band[]> = {
  meadow: [{ shape: 'mound', layer: Layer.CLOVER, hi: Layer.GRASS, speed: 0.4, cw: 22, base: B, h0: 5, h1: 9, chance: 0.6 }],
  woods: [{ shape: 'mound', layer: Layer.FERN, hi: Layer.GRASS, speed: 0.4, cw: 20, base: B, h0: 5, h1: 10, chance: 0.6 }],
  underwater: [
    { shape: 'reed', layer: Layer.SEAWEED, speed: 0.4, cw: 17, base: B, h0: 9, h1: 16, chance: 0.65 },
    { shape: 'dots', layer: Layer.AIR_BUBBLE, speed: 0.25, cw: 13, base: 76, h0: 30, h1: 60, chance: 0.5 },
  ],
  sky: [
    { shape: 'cloud', layer: Layer.CLOUD_SHADE, hi: Layer.CLOUD, speed: 0.12, cw: 46, base: 52, h0: 6, h1: 9, chance: 0.8 },
    { shape: 'cloud', layer: Layer.CLOUD, speed: 0.34, cw: 36, base: 34, h0: 4, h1: 6, chance: 0.7 },
  ],
  yard: [{ shape: 'block', layer: Layer.WOOD, acc: Layer.ROOF, speed: 0.4, cw: 15, base: B, h0: 8, h1: 11, chance: 0.85 }],
  clouds: [
    { shape: 'cloud', layer: Layer.CLOUD_SHADE, hi: Layer.CLOUD, speed: 0.12, cw: 42, base: 58, h0: 8, h1: 12, chance: 0.8 },
    { shape: 'cloud', layer: Layer.CLOUD, speed: 0.34, cw: 34, base: 34, h0: 4, h1: 8, chance: 0.7 },
  ],
  ember: [
    { shape: 'spire', layer: Layer.EMBER, speed: 0.4, cw: 20, base: B, h0: 5, h1: 9, chance: 0.6 },
    { shape: 'dots', layer: Layer.ASH, speed: 0.3, cw: 15, base: 76, h0: 20, h1: 60, chance: 0.5 },
  ],
  warren: [{ shape: 'mound', layer: Layer.CLOVER, hi: Layer.GRASS, speed: 0.4, cw: 18, base: B, h0: 5, h1: 8, chance: 0.6 }],
  crags: [{ shape: 'spire', layer: Layer.ROCK, speed: 0.4, cw: 21, base: B, h0: 6, h1: 12, chance: 0.6 }],
  workshop: [{ shape: 'reed', layer: Layer.CABLE, speed: 0.4, cw: 18, base: B, h0: 6, h1: 13, chance: 0.55 }],
  swamp: [{ shape: 'reed', layer: Layer.GLOW_SHROOM, speed: 0.4, cw: 18, base: B, h0: 5, h1: 11, chance: 0.6 }],
  garden: [{ shape: 'flower', layer: Layer.LEAF_BIG, acc: Layer.DAISY, speed: 0.4, cw: 18, base: B, h0: 8, h1: 13, chance: 0.6 }],
  space: [
    { shape: 'dots', layer: Layer.TWINKLE, speed: 0.2, cw: 10, base: 50, h0: 12, h1: 70, chance: 0.6 },
    { shape: 'mound', layer: Layer.CRATER, speed: 0.4, cw: 21, base: B, h0: 3, h1: 6, chance: 0.6 },
  ],
};

function drawBand(b: Buf, band: Band, scroll: number, seed: number) {
  const off = scroll * band.speed * 1.5;
  const k0 = Math.floor(off / band.cw) - 1, k1 = Math.floor((off + b.n) / band.cw) + 1;
  for (let k = k0; k <= k1; k++) {
    if (rnd(k * 3.7 + seed) > band.chance) continue;
    const h = Math.round(band.h0 + (band.h1 - band.h0) * rnd(k * 5.1 + seed + 1));
    const cx = Math.round(k * band.cw + band.cw * (0.25 + 0.5 * rnd(k * 2.3 + seed + 2)) - off);
    const base = band.base;
    const l = band.layer, a = band.acc ?? band.layer, hi = band.hi ?? band.layer;
    switch (band.shape) {
      case 'mound': {
        const w = h * 2;
        for (let i = -w; i <= w; i++) {
          const top = Math.round(h * Math.sqrt(Math.max(0, 1 - (i * i) / (w * w))));
          for (let j = 0; j < top; j++) put(b, cx + i, base - j, j >= top - 1 ? hi : l);
        }
        break;
      }
      case 'spire':
        for (let j = 0; j < h; j++) { const hw = Math.round((j / h) * (h / 3 + 1)); for (let i = -hw; i <= hw; i++) put(b, cx + i, base - h + 1 + j, i < 0 && hw > 1 ? hi : l); }
        break;
      case 'block': {
        const w = Math.max(6, Math.round(h * 0.9));
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(b, cx - (w >> 1) + i, base - j, j >= h - 2 ? a : l);
        break;
      }
      case 'reed':
        for (let j = 0; j < h; j++) { const sway = j > h * 0.6 ? ((Math.floor(scroll / 6) + k) % 2 ? 1 : 0) : 0; put(b, cx + sway, base - j, l); if (j > h * 0.3 && j % 3 === 0) put(b, cx + 1 + sway, base - j, l); }
        break;
      case 'cloud': {
        const w = h * 3;
        for (let i = -w; i <= w; i++) {
          const t = Math.round(h * Math.sqrt(Math.max(0, 1 - (i * i) / (w * w))));
          for (let j = -(t >> 1); j <= (t >> 1); j++) put(b, cx + i, base + j, j < 0 ? hi : l);
        }
        break;
      }
      case 'flower':
        for (let j = 0; j < h - 2; j++) put(b, cx, base - j, l);
        put(b, cx - 1, base - 3, l); put(b, cx - 2, base - 4, l); put(b, cx + 1, base - 5, l); put(b, cx + 2, base - 6, l);
        for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) put(b, cx + dx, base - h + 1 + dy, a);
        break;
      case 'dots': {
        const y = base - Math.round(h * rnd(k + seed + 9));
        put(b, cx, y, l); if (band.layer === Layer.AIR_BUBBLE) { put(b, cx + 1, y, l); put(b, cx, y - 1, l); }
        break;
      }
      case 'tree': case 'disc': break;
    }
  }
}

/** Ground dashes and tufts streaming past on the ground rows, so every biome shows its speed. */
function ground(b: Buf, scroll: number, biome: Biome) {
  const s = Math.floor(scroll * 1.5);
  b.as(Layer.DIRT, () => {
    for (let x = 0; x < b.n; x++) {
      if ((x + s) % 6 === 0) { b.set(x, GROUND96 + 3); b.set(x + 1, GROUND96 + 3); }
      if ((x + s * 2) % 11 === 4) { b.set(x, GROUND96 + 5); b.set(x + 1, GROUND96 + 5); b.set(x + 2, GROUND96 + 5); }
    }
  });
  const tuft = biome === 'workshop' || biome === 'space' || biome === 'crags' || biome === 'ember' ? Layer.DIRT : Layer.GRASS;
  const k0 = Math.floor(s / 14) - 1;
  for (let k = k0; k <= k0 + 8; k++) {
    if (rnd(k * 1.9 + 3) > 0.55) continue;
    const x = k * 14 + Math.floor(rnd(k + 8) * 9) - s;
    if (x < -3 || x > b.n) continue;
    if (tuft === Layer.GRASS) for (const [dx, dy] of [[0, 0], [0, -1], [-1, -2], [1, -2], [0, -2], [-2, -3], [2, -3]]) put(b, x + dx, GROUND96 + dy, tuft);
    else for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, -1]]) put(b, x + dx, GROUND96 + dy, tuft);
  }
}

function speedLines(b: Buf, s: DashState) {
  const level = (s.speed / V_END) * (s.stun > 0 ? 0 : 1);
  if (level < 0.8) return;
  const n = level > 1.05 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const y = 20 + Math.floor(rnd(i * 7.7 + 1) * 56);
    const len = 8 + Math.floor(rnd(i + 3) * 8);
    const x = (((Math.floor(rnd(i * 3.1) * 96) - Math.floor(s.scroll * 4.8)) % 106) + 106) % 106 - 6;
    for (let j = 0; j < len; j++) if (b.px[y * b.n + x + j] === 0 || (b.px[y * b.n + x + j] & 0x7f) >= SCENERY_FROM) b.set(x + j, y, Layer.CLOUD);
  }
}

function pose(s: DashState, move: string): { blink: boolean; dy: number } {
  if (s.stun > 0) return { blink: true, dy: 0 };
  if (!s.grounded) return { blink: s.vy < 0, dy: 0 };
  const ph = Math.floor(s.scroll / 4.5) % 2;
  switch (move) {
    case 'HOP': return { blink: ph === 1, dy: ph === 0 ? -2 : 0 };
    case 'RUN': case 'ROLL': case 'SLIDE': return { blink: ph === 1, dy: ph === 1 ? -1 : 0 };
    default: { const bob = Math.floor(s.scroll / 9) % 2; return { blink: ph === 1, dy: bob ? -3 : -1 }; } // fly, swim, float: hovering
  }
}

const spark = (b: Buf, x: number, y: number, l: number) => { for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) b.set(x + dx, y + dy, l); };

export function paintDash96(c: PaintCtx) {
  const { b, params, pet } = c;
  const s = c.game.state as DashState;
  const th = themeFor96(params.family);
  const move = (params as { theme: { move: string } }).theme.move;
  const biome = biomeOf(pet);
  STYLE[biome].forEach((band, i) => drawBand(b, band, s.scroll, i * 11));
  ground(b, s.scroll, biome);
  speedLines(b, s);
  // pick-ups
  for (const it of s.items) {
    if (it.x < -6 || it.x > 64 + 6) continue;
    const gl = it.bonus ? th.bonus : th.good[it.glyph % th.good.length];
    drawGlyphMark96(b, gl, g96(it.x) - 5, g96(DASH_GROUND - it.hc - 3), true, it.bonus ? 'prize' : 'none', Math.floor(s.scroll * 40));
  }
  // obstacles stand on the pet's ground row
  for (const o of s.obstacles) {
    if (o.x < -10 || o.x > 66) continue;
    if (o.hit && Math.floor(s.t / 100) % 2) continue; // a bumped obstacle flickers so the player sees what hurt
    drawGlyph96(b, th.obstacles[o.kind % th.obstacles.length], Math.round(o.x * 1.5 + 0.25), FEET96 - 9, true);
  }
  // the pet
  const po = pose(s, move);
  const shake = s.stun > 0 ? (Math.floor(s.t / 70) % 2 ? 1 : -1) : 0;
  const flicker = s.invul > 0 && s.stun <= 0 && Math.floor(s.invul / 90) % 2 === 0;
  const lift = Math.round(s.hp * 1.5);
  const footY = FEET96 - lift;
  const cx = g96(s.petX);
  // the shadow shrinks as the pet climbs
  if (move !== 'SWIM' && move !== 'FLY') groundShadow(b, cx, Math.max(2, Math.round(g96(s.petW) / 2 - lift / 5)));
  // trail: dust for runners, bubbles for swimmers, sparks for floaters, feathers of air for flyers
  const back = Math.round(cx - g96(s.petW) / 2);
  const ph = Math.floor(s.scroll / 4.5);
  if (s.grounded && s.stun <= 0 && (move === 'RUN' || move === 'HOP' || move === 'ROLL' || move === 'SLIDE')) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) b.set(back - 2 - (ph % 3) + dx, FEET96 - dy, Layer.SAND);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1]]) b.set(back - 6 - ((ph + 1) % 3) + dx, FEET96 - 2 - dy, Layer.SAND);
  } else if (move === 'SWIM') {
    for (const [ox, oy, r] of [[3, 9, 0], [8, 13, 1], [12, 7, 0]] as const) { const bx = back - ox - ((ph + r) % 3), by = footY - oy - ((ph + 2 * r) % 4); b.set(bx, by, Layer.BUBBLE); b.set(bx + 1, by, Layer.BUBBLE); b.set(bx, by - 1, Layer.BUBBLE); }
  } else if (move === 'FLOAT') {
    spark(b, back - 3 - (ph % 3), footY - 8 - (ph % 5), Layer.SPARK);
  } else if (move === 'FLY' && !s.grounded) {
    for (const [dx, dy] of [[2, 6], [5, 9], [8, 6]]) for (let j = 0; j < 4; j++) b.set(back - dx - j, footY - dy, Layer.CLOUD);
  }
  const art = drawPetFit96(b, pet.species, cx + shake, footY, g96(s.petW), g96(s.petH), { blink: po.blink !== flicker, dy: po.dy });
  if (art && s.stun > 0) {
    const a = Math.floor(s.t / 90) % 4;
    const pts = [[-8, 0], [0, -4], [8, 0], [0, 3]];
    const hx = art.x + (art.w >> 1), hy = art.y - 4;
    for (const k of [0, 2]) { const [dx, dy] = pts[(a + k) % 4]; spark(b, hx + dx, hy + dy, Layer.SPARK); }
  }
  // pops
  for (const p of s.pops) {
    const w = textWidth(p.text) - 1;
    const x = Math.max(2, Math.min(b.n - w - 2, Math.round(g96(p.x) - w / 2)));
    const y = Math.max(HUD96_H + 3, Math.round(g96(p.y) - p.age / 36));
    textHalo(b, p.text, x, y, p.kind === 'hit' ? Layer.ALERT : Layer.SPARK);
  }
  // the course speeds up in three steps: say so
  const third = s.duration / 3;
  if (s.cd <= 0 && [1, 2].some((k) => s.t >= k * third && s.t < k * third + 900) && Math.floor(s.t / 150) % 2 === 0) textHaloC(b, 'FASTER!', 48, 18, Layer.ALERT, 2);
  // countdown and GO
  if (s.cd > 0 || s.t < 600) {
    const txt = s.cd > 0 ? String(Math.min(3, Math.ceil(s.cd / 600))) : 'GO!';
    const w = textWidth(txt, 4) - 4;
    const x = (b.n - w) >> 1;
    panel(b, x - 7, 22, w + 14, 31, Layer.CABLE, Layer.DAISY);
    b.as(Layer.CABLE, () => b.text(txt, x, 28, 4));
  }
}
