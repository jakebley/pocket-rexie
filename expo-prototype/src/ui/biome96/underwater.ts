// Underwater (fish) at 96: surface glow and wave, light shafts that shimmer, a hazy far reef with a school of fish, kelp that sways,
// coral (staghorn, fan, brain, tubes), an anemone, a sand floor with ripples, pebbles, shells and a starfish; bubbles rise.
import { Layer } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { WATER } from './colorsA';
import { ball, dither, ell, hline, line, N, px, rnd, spr, stat, tickOf, vline, ridge } from './kit';

const K = WATER.c;
const G = 90;
const SURF = 27;

function shafts(b: Buf, phase: string, rain: boolean, step: number) {
  const xs = rain ? [] : phase === 'night' ? [58] : phase === 'dusk' ? [20, 62] : [8, 34, 60, 84];
  xs.forEach((x0, i) => {
    for (let y = SURF + 2; y < G - 2; y++) {
      const w = 5 + ((y - SURF) >> 3) + (i % 2);
      const xs0 = x0 + Math.round((y - SURF) * 0.5);
      for (let k = 0; k < w; k++) {
        const x = xs0 + k;
        // an edge-weighted dither that slides one cell every other step: the shimmer
        const edge = k === 0 || k === w - 1;
        if (((x + y + step * (1 + (i & 1))) & 1) === 0 && (edge ? ((y >> 1) + i) % 3 !== 0 : ((x >> 1) + y) % 4 !== 1)) b.set(x, y, K.shaft);
      }
    }
  });
}
function back(b: Buf) {
  // far reef: spires and arches in haze
  ridge(b, (x) => 70 + 5 * Math.sin(x / 9) + 4 * Math.sin(x / 3.7 + 2) - (x > 56 && x < 74 ? 8 : 0) - (x < 12 ? 5 : 0), G, K.farRock);
  for (let x = 0; x < N; x++) { const t = Math.round(70 + 5 * Math.sin(x / 9) + 4 * Math.sin(x / 3.7 + 2) - (x > 56 && x < 74 ? 8 : 0) - (x < 12 ? 5 : 0)); if (x % 4 < 2) b.set(x, t + 1, K.farRockDark); }
  // a far arch
  for (let a = 0; a <= 12; a++) { const x = 28 + a, y = 80 - Math.round(Math.sin((a / 12) * Math.PI) * 9); vline(b, x, y, y + 2, K.farRockDark); }
  // surface glow above the wave
  for (let y = 15; y < SURF; y++) dither(b, 0, y, N, 1, (y - 14) / 16, K.surface);
  b.rect(0, SURF, N, 2, K.surface);
}
const STAGHORN = (b: Buf, x: number, y: number, h: number, l: number, d: number, li: number) => {
  const branch = (x0: number, y0: number, ang: number, len: number, depth: number) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    line(b, x0, y0, x1, y1, depth ? l : li);
    b.set(Math.round(x0) + 1, Math.round(y0), d);
    if (depth < 3) { branch(x1, y1, ang - 0.5, len * 0.7, depth + 1); branch(x1, y1, ang + 0.45, len * 0.7, depth + 1); }
  };
  branch(x, y, -Math.PI / 2, h * 0.4, 0);
  vline(b, x, y, y + 2, d);
};
function fan(b: Buf, cx: number, cy: number, r: number, l: number, d: number, li: number) {
  for (let a = -75; a <= 75; a += 7) {
    const rad = (a - 90) * Math.PI / 180;
    line(b, cx, cy, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, a % 14 === 0 ? l : li);
  }
  for (let a = -70; a <= 70; a += 7) { const rad = (a - 90) * Math.PI / 180; px(b, cx + Math.cos(rad) * r * 0.62, cy + Math.sin(rad) * r * 0.62, d); }
  for (let a = -70; a <= 70; a += 5) { const rad = (a - 90) * Math.PI / 180; px(b, cx + Math.cos(rad) * (r + 1), cy + Math.sin(rad) * (r + 1), li); }
  vline(b, cx, cy, cy + 3, d);
}
function brain(b: Buf, cx: number, cy: number, r: number) {
  ball(b, cx, cy, r, r * 0.75, K.coralCD, K.coralC, K.sandLight);
  for (let a = 0; a < 6; a++) { const rad = (a / 6) * 6.283; for (let t = 1; t < r * 0.8; t++) if ((t + a) % 3 !== 0) px(b, cx + Math.cos(rad) * t * 0.9, cy - 1 + Math.sin(rad) * t * 0.6, K.coralCD); }
}
function tubes(b: Buf, x: number, y: number, hs: number[], l: number, d: number, li: number) {
  hs.forEach((h, i) => {
    const xx = x + i * 3;
    for (let k = 0; k < h; k++) { b.set(xx, y - k, l); b.set(xx + 1, y - k, d); }
    hline(b, xx - 1, xx + 2, y - h, li); b.set(xx, y - h - 1, li); b.set(xx + 1, y - h, K.rockDark);
  });
}
function fore(b: Buf) {
  // sand floor with ripples
  b.rect(0, G, N, 6, K.sand);
  for (let x = 0; x < N; x++) { b.set(x, G, K.sandLight); }
  for (let y = G + 1; y < 96; y++) for (let x = 0; x < N; x++) {
    const w = Math.sin(x / 4.2 + y * 0.9 + (y & 1) * 2);
    if (w > 0.55) b.set(x, y, K.sandDark); else if (w < -0.85) b.set(x, y, K.sandLight);
  }
  for (let i = 0; i < 16; i++) { const x = Math.floor(rnd(i + 20) * N), y = G + 1 + Math.floor(rnd(i + 60) * 5); px(b, x, y, K.sandDark); px(b, x + 1, y, K.sandDark); }
  // pebbles, a shell, a starfish
  for (const [x, y, r] of [[8, 92, 2], [33, 93, 1.5], [47, 91, 2.2], [75, 93, 2], [90, 92, 1.6]] as const) ball(b, x, y, r + 0.8, r * 0.7, K.pebbleDark, K.pebble, K.sandLight);
  spr(b, ['..sss..', '.sSsSs.', 'sSsSsSs', '.sssss.'], 56, G - 3, { s: K.shell, S: K.sandDark });
  spr(b, ['..S..', '.SSS.', 'SSSSS', '.S.S.'], 16, G + 1, { S: K.starfish });
  // coral clusters at both edges, small pieces in the middle
  STAGHORN(b, 6, G - 1, 30, K.coralA, K.coralAD, K.coralAL); STAGHORN(b, 14, G - 1, 22, K.coralA, K.coralAD, K.coralAL);
  fan(b, 22, G - 1, 13, K.coralB, K.coralBD, K.coralBL);
  brain(b, 31, G - 3, 6);
  tubes(b, 41, G - 1, [5, 8, 4], K.coralB, K.coralBD, K.coralBL);
  brain(b, 63, G - 2, 5);
  tubes(b, 70, G - 1, [8, 12, 6, 9], K.coralA, K.coralAD, K.coralAL);
  fan(b, 84, G - 1, 15, K.coralA, K.coralAD, K.coralAL);
  STAGHORN(b, 91, G - 1, 24, K.coralB, K.coralBD, K.coralBL);
  // rocks at the foot of the reef
  ball(b, 2, G - 1, 5, 4, K.rockDark, K.pebbleDark, K.pebble); ball(b, 95, G - 1, 5, 4, K.rockDark, K.pebbleDark, K.pebble);
  // anemone
  ell(b, 52, G - 1, 4, 2, K.anemone);
  for (let i = -3; i <= 3; i++) vline(b, 52 + i, G - 4 - (3 - Math.abs(i)), G - 2, K.anemone);
  for (let i = -3; i <= 3; i += 2) px(b, 52 + i, G - 7 + Math.abs(i), K.coralAL);
}
const KELP: [number, number, number][] = [[11, 38, 0], [1, 30, 1], [79, 34, 2], [92, 42, 3], [58, 24, 4], [47, 18, 5]];
const FISH = ['..ff....', 'ffFFff.f', '.fFFFfff', '..ff....'];
const FISH_R = ['....ff..', 'f.ffFFff', 'fffFFFf.', '....ff..'];
function live(c: Ctx96) {
  const { b, s, phase } = c;
  const T = tickOf(s), t = s.still ? 0 : s.nowMs / 1000;
  // wave line and rain rings
  for (let x = 0; x < N; x++) if ((x + (T >> 2)) % 6 < 3) b.set(x, SURF - 1 + (((x + (T >> 2)) % 12) < 6 ? 0 : 1), Layer.WAVE);
  if (c.rain) for (let i = 0; i < 4; i++) {
    const w = 2 + ((T >> 1) + i * 5) % 9, cx = 14 + i * 22;
    hline(b, cx - w, cx - w + 1, SURF + 3 + (i & 1), K.bubble); hline(b, cx + w - 1, cx + w, SURF + 3 + (i & 1), K.bubble); hline(b, cx - 2, cx + 2, SURF + 5 + (i & 1), K.bubble);
  }
  // far school (silhouettes drift slowly)
  for (let i = 0; i < 7; i++) {
    const dir = i < 4 ? 1 : -1, x = Math.round((((t * 2 * dir + i * 23) % 130) + 130) % 130 - 17), y = 40 + (i % 4) * 5 + (i > 3 ? 12 : 0) + Math.round(Math.sin(t + i) * 1.2);
    spr(b, dir === 1 ? FISH : FISH_R, x, y, { f: K.farFish, F: K.farRockDark });
  }
  // kelp: each strand is a stalk with leaves that sway more toward the top
  KELP.forEach(([x, h, seed]) => {
    for (let k = 0; k < h; k++) {
      const sway = Math.sin(t * 1.2 + k * 0.28 + seed) * 2.2 * (k / h);
      const xx = Math.round(x + sway), y = G - 1 - k;
      b.set(xx, y, k % 2 ? K.kelp : K.kelpDark); b.set(xx + 1, y, K.kelp);
      if (k % 7 === 3) { b.set(xx - 1, y, K.kelpLight); b.set(xx - 2, y - 1, K.kelpLight); b.set(xx - 3, y - 1, K.kelp); }
      if (k % 7 === 6) { b.set(xx + 2, y, K.kelpLight); b.set(xx + 3, y - 1, K.kelpLight); b.set(xx + 4, y - 1, K.kelp); }
    }
  });
  // bubbles from the vents
  const VENT = [14, 27, 38, 50, 60, 72, 86];
  VENT.forEach((x0, i) => {
    const u = ((s.still ? 0 : t * (6 + (i % 3) * 2)) + i * 17) % 62, y = Math.round(G - 3 - u);
    const x = Math.round(x0 + Math.sin(t * 1.5 + i) * 2 + u * 0.05 * ((i % 2) * 2 - 1));
    if (i % 2) { b.set(x, y, K.bubble); b.set(x + 1, y, K.bubble); b.set(x, y + 1, K.bubble); b.set(x + 1, y + 1, K.bubble); }
    else { b.set(x + 1, y, K.bubble); b.set(x, y + 1, K.bubble); b.set(x + 2, y + 1, K.bubble); b.set(x + 1, y + 2, K.bubble); b.set(x + 1, y + 1, K.glint); }
    if (u < 30) b.set(x + 3, y + 7, K.bubble);
  });
  // a jellyfish drifts up and down on the right
  const jx = 70 + Math.round(Math.sin(t / 3) * 5), jy = 44 + Math.round(Math.sin(t / 2) * 4), pulse = Math.floor(t * 1.5) % 2;
  ell(b, jx, jy, 4, 2.4, K.jelly); hline(b, jx - 3, jx + 3, jy + 2, K.jelly); px(b, jx - 1, jy - 1, K.glint);
  for (let i = -2; i <= 2; i += 2) for (let k = 0; k < 4 + pulse; k++) px(b, jx + i + (k % 2) * (i === 0 ? 1 : 0), jy + 3 + k, K.jelly);
  if (phase === 'night' || phase === 'dusk') for (let i = 0; i < 8; i++) px(b, 6 + i * 11 + Math.sin(t + i) * 3, 50 + (i * 9) % 34 + Math.cos(t * 0.7 + i) * 3, K.plankton);
}
export const underwater96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => {
    stat(c, 'back', back);
    const step = c.s.still ? 0 : Math.floor(c.s.nowMs / 900) % 4;
    stat(c, 'shafts' + step, (b, ph, rain) => shafts(b, ph, rain, step));
  },
  fore: (c) => { stat(c, 'fore', fore); live(c); },
};
