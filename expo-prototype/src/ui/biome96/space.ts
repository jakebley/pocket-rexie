// Alien space at 96x96 (always dark): a starfield in three brightnesses with a twinkle, two dim nebula smudges, a big banded ringed planet, a cratered
// moon, lunar hills with pits and boulders, a landed saucer with blinking lights, glowing crystal clusters and shooting stars. The outdoor sky objects
// are removed (clearSky); everything static is cached per phase; twinkles, lights and meteors are drawn per frame.
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, clearSky, disc, ellipse, hline, line, px, rnd, tickOf, vline } from './kitB';

const STAR = L.STARFIELD, DIMSTAR = L.CLOUD_SHADE, NEB1 = L.HILL, NEB2 = L.SAND;
const PL: number = L.PLANET, PL_DK = L.PLANET_SHADE, RING = L.CRAG, RING_DK = L.ROCK;
const MOON = L.HULL, CRATER = L.CRATER, HULL = L.HULL, CRYS = L.CRYSTAL, CRYS_DK = L.GRIDLINE;

const PX = 66, PY = 34; // planet centre

function planet(b: Buf) {
  const ring = (front: boolean) => {
    for (let k = 0; k < 400; k++) {
      const a = (k / 400) * Math.PI * 2, sn = Math.sin(a);
      if ((sn >= 0) !== front) continue;
      for (const [rr, l] of [[24, RING], [22.5, RING], [20.5, RING_DK]] as [number, number][]) {
        const x = Math.round(PX + Math.cos(a) * rr), y = Math.round(PY + sn * rr * 0.2 + Math.cos(a) * rr * 0.16);
        if (front || Math.hypot(x - PX, y - PY) > 14.5) b.set(x, y, l);
      }
    }
  };
  ring(false);
  disc(b, PX, PY, 14, PL);
  for (let y = PY - 14; y <= PY + 14; y++) for (let x = PX - 14; x <= PX + 14; x++) {
    const dx = x - PX, dy = y - PY;
    if (dx * dx + dy * dy > 14 * 14 + 0.5) continue;
    const band = Math.floor((dy + 14 + Math.sin(dx / 6) * 1.2) / 4.5);
    let l = band % 2 === 0 ? PL : L.CORAL_A; // soft belts
    if (dx * 0.6 + dy * 0.8 > 6.5) l = PL_DK; // shadowed limb
    else if (dx * 0.6 + dy * 0.8 > 4.6 && (x + y) % 2 === 0) l = PL_DK;
    if (dx < -9 && dy < -4 && (x + y) % 3 === 0) l = L.DAISY; // light on the lit limb
    b.set(x, y, l);
  }
  ring(true);
  // the ring's shadow across the planet and its glint
  for (let x = PX - 12; x < PX + 12; x++) { const y = Math.round(PY + 2 + (x - PX) * 0.03); if ((x + y) % 2 === 0) b.set(x, y + 3, PL_DK); }
}
function crystal(b: Buf, x: number, base: number, w: number, h: number) {
  // hexagonal prism with a pointed tip: lit left facet, darker right facet, bright edge
  const tip = base - h;
  for (let y = tip; y < base; y++) {
    const t = (y - tip) / h, hw = y - tip < w * 0.8 ? Math.round(((y - tip) / (w * 0.8)) * (w / 2)) : w / 2;
    for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) b.set(xx, y, xx > x + 0.5 ? CRYS_DK : CRYS);
    if (t > 0.1 && (y - tip) % 5 === 3) b.set(Math.round(x - hw), y, L.DAISY);
  }
  vline(b, x, tip + 2, base - 2, CRYS);
  b.set(x - 1, tip + w * 0.9, L.DAISY);
}

function back(b: Buf, phase: string) {
  // nebula: two dithered smudges, very dim
  for (const [cx, cy, rx, ry, l] of [[22, 30, 26, 11, NEB1], [74, 62, 24, 9, NEB2], [52, 20, 16, 5, NEB1]] as number[][]) {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d < 1 && ((d < 0.55 && (x + y) % 2 === 0) || (d < 0.85 && x % 2 === 0 && y % 2 === 0))) b.set(x, y, l);
    }
  }
  // stars: dim, bright, and a few with crosses
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rnd(i + 7) * N), y = 1 + Math.floor(rnd(i + 91) * 70);
    b.set(x, y, i % 3 === 0 ? STAR : DIMSTAR);
    if (i % 17 === 0) { px(b, [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], DIMSTAR); }
  }
  planet(b);
  // the moon: a lit disc with pits
  disc(b, 30, 36, 6, MOON);
  for (let y = 30; y <= 42; y++) for (let x = 24; x <= 36; x++) if ((x - 30) * 0.7 + (y - 36) * 0.7 > 3.2 && (x - 30) ** 2 + (y - 36) ** 2 <= 36) b.set(x, y, L.ROCK);
  for (const [x, y, r] of [[28, 34, 1.6], [32, 39, 1.2], [27, 38, 1]] as number[][]) { disc(b, x, y, r, CRATER); }
  // lunar hills: two layers, craters with a bright rim, boulders
  for (let x = 0; x < N; x++) { const h = Math.round(76 + 3 * Math.sin(x / 11 + 1) + 1.5 * Math.sin(x / 4)); vline(b, x, h, GY - 1, L.HILL); b.set(x, h, L.CRAG); }
  for (let x = 0; x < N; x++) { const h = Math.round(82 + 3 * Math.sin(x / 8 + 4) + 1.5 * Math.sin(x / 3.1)); vline(b, x, h, GY - 1, L.ROCK); b.set(x, h, L.CRAG); if (x % 3 === 0) b.set(x, h + 1, L.CRAG); }
  for (const [x, y, rx] of [[44, 84, 7], [20, 86, 5], [82, 85, 6]] as number[][]) { ellipse(b, x, y, rx, 2, CRATER); hline(b, x - rx + 1, x + rx - 1, y - 2, L.CRAG); hline(b, x - rx + 2, x + rx - 2, y - 1, CRATER); }
  // a landed saucer on the right: legs, flat hull with a shaded belly and a rim, glass dome, lit windows
  const sx = 76, sy = 70;
  for (const dx of [-12, 0, 12]) { line(b, sx + dx, sy + 10, sx + dx + (dx > 0 ? 3 : dx < 0 ? -3 : 0), GY - 1, HULL); hline(b, sx + dx - 2 + (dx > 0 ? 3 : dx < 0 ? -3 : 0), sx + dx + 2 + (dx > 0 ? 3 : dx < 0 ? -3 : 0), GY - 1, HULL); }
  ellipse(b, sx, sy + 5, 19, 5, HULL); ellipse(b, sx, sy + 7.5, 16, 3, PL_DK);
  hline(b, sx - 17, sx + 17, sy + 4, L.DAISY); hline(b, sx - 15, sx + 15, sy + 5, L.STALAC);
  ellipse(b, sx, sy - 1, 8, 6, CRYS_DK); ellipse(b, sx - 2, sy - 3, 4, 2.6, CRYS);
  for (let y = sy - 7; y < sy + 2; y++) for (let x = sx - 8; x <= sx + 8; x++) if (b.px[y * N + x] === CRYS_DK && x > sx + 3 && (x + y) % 2 === 0) b.set(x, y, L.STALAC);
  b.set(sx - 3, sy - 4, L.DAISY); b.set(sx - 2, sy - 5, L.DAISY);
  vline(b, sx, sy - 12, sy - 7, HULL); b.set(sx, sy - 13, L.LED_B);
  for (const dx of [-11, -4, 4, 11]) b.rect(sx + dx - 1, sy + 3, 3, 2, L.WINDOW);
  // glowing crystals on the left: prisms of different heights and their glow
  const cl: [number, number, number, number][] = [[7, GY, 7, 34], [14, GY, 5, 22], [20, GY, 4, 14], [2, GY, 4, 18], [11, GY, 3, 10]];
  for (const [x, base, w, h] of cl) for (let dy = -4; dy < h + 1; dy++) for (let dx = -w - 4; dx < w + 5; dx++) {
    const yy = base - h + dy, xx = x + dx;
    if (yy < 8 || yy >= GY || xx < 0) continue;
    const inside = Math.abs(dx) < w / 2 + 1 && dy >= 0;
    if (!inside && (dx + dy) % 6 === 0 && dx % 2 === 0 && Math.abs(dx) < w / 2 + 3 && (phase !== 'day' || (dx + dy) % 12 === 0)) b.set(xx, yy, CRYS_DK);
  }
  for (const [x, base, w, h] of cl) crystal(b, x, base, w, h);
}

function fore(b: Buf) {
  // moon dust floor with a lit lip, pits and small crystals
  for (let x = 0; x < N; x++) { b.set(x, GY, x % 2 ? L.CRAG : L.GROUND); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, L.GROUND); b.set(x, GY + 3, x % 3 === 0 ? L.DIRT : L.GROUND); }
  for (let x = 0; x < N; x++) for (let y = GY + 4; y < N; y++) b.set(x, y, (x * 7 + y * 5) % 9 === 0 ? CRATER : (x + y) % 6 === 0 ? L.GROUND : L.DIRT);
  for (const [x, w] of [[30, 6], [58, 8], [8, 5]] as number[][]) { ellipse(b, x, GY + 3, w, 1.4, CRATER); hline(b, x - w + 1, x + w - 1, GY + 1, L.CRAG); }
  for (const x of [38, 52, 64, 28]) { hline(b, x, x + 2, GY - 1, L.ROCK); b.set(x, GY - 2, L.CRAG); b.set(x + 1, GY - 2, L.ROCK); }
  for (const [x, h] of [[44, 4], [90, 5], [60, 3]] as number[][]) { vline(b, x, GY - h, GY - 1, CRYS); vline(b, x + 1, GY - h + 1, GY - 1, CRYS_DK); b.set(x, GY - h - 1, CRYS); }
}

function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s);
  // twinkle: bright stars blink and flare in turn
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd(i * 3 + 200) * N), y = 2 + Math.floor(rnd(i * 3 + 300) * 62);
    if (Math.hypot(x - PX, y - PY) < 26) continue;
    const ph = ((T >> 2) + i * 3) % 6;
    if (ph === 0) continue;
    b.set(x, y, L.TWINKLE);
    if (ph === 3 || ph === 4) px(b, [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], L.TWINKLE);
  }
  // shooting stars: one every ~8 s, a shower in the rain
  const meteors = c.rain ? 3 : 1;
  for (let m = 0; m < meteors; m++) {
    const cyc = c.rain ? 52 : 70, u = ((T >> 1) + m * 19) % cyc;
    if (u < 12) {
      const x0 = 8 + ((m * 41 + Math.floor(((T >> 1) + m * 19) / cyc) * 23) % 56), y0 = 6 + m * 9;
      for (let k = 0; k < 7; k++) { const t = u - k * 0.9; if (t < 0) continue; b.set(Math.round(x0 + t * 4), Math.round(y0 + t * 1.9), k < 2 ? L.DAISY : L.TWINKLE); }
    }
  }
  // the saucer's rim lights chase, the antenna blinks, a crystal tip glints
  const sx = 76, sy = 70;
  for (let i = 0; i < 6; i++) { const on = ((T >> 2) + i) % 6; b.set(sx - 15 + i * 6, sy + 6 + (i % 2), on === 0 ? L.LED_A : on === 3 ? L.LED_B : L.HULL); }
  if (((T >> 3) % 3) === 0) b.set(sx, sy - 13, L.LED_B); else b.set(sx, sy - 13, L.HULL);
  if (((T >> 3) % 5) === 1) px(b, [[7, 49], [6, 50], [8, 50], [7, 51]], L.DAISY);
  // the planet's ring glints
  if (((T >> 4) % 6) === 2) px(b, [[PX + 21, PY + 2], [PX + 22, PY + 2]], L.DAISY);
}

export const space96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('space', 'back', c.phase, c.rain, back)),
  fore: (c) => {
    clearSky(c.b, cachedPart('space', 'back', c.phase, c.rain, back));
    blit(c.b, cachedPart('space', 'fore', c.phase, c.rain, fore));
    live(c.b, c);
  },
};
