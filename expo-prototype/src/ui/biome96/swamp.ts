// Slime swamp cave at 96x96 (always dark): a ragged ceiling with stalactites, a pale light shaft by day, mossy rock walls, hanging vines that sway,
// glowing mushrooms with a soft halo, muddy floor with puddles, drips that fall from the stalactite tips and ring the puddles. Static art is cached
// per (phase, rain); drips, ripples, vines, bubbles, motes and the glow pulse are drawn per frame. Outdoor sky objects are removed (clearSky).
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, clearSky, ellipse, hline, line, px, rnd, tickOf, vline } from './kitB';

const WALL = L.ROCK, WALL_HI = L.CRAG, DEEP = L.CAVE, STAL = L.STALAC, MOSS = L.MOSS, MOSS_DK = L.FERN, GLOW = L.GLOW_SHROOM, STEM = L.CLOUD_SHADE, WET = L.PUDDLE, DEW = L.DEW, ROOT = L.BARK;

/** Stalactites: x, length, base half-width. */
const STALACTITES: [number, number, number][] = [[3, 9, 3], [14, 7, 3], [27, 5, 2], [36, 8, 3], [52, 20, 5], [62, 9, 3], [69, 29, 6], [78, 13, 4], [86, 24, 5], [93, 10, 3]];
/** Which stalactites drip (index into STALACTITES). */
const DRIPS = [4, 6, 8, 3];

function stalactite(b: Buf, x: number, y0: number, len: number, hw: number) {
  for (let k = 0; k < len; k++) {
    const w = Math.max(0, Math.round(hw * (1 - k / len) * (1 - k / len * 0.15)));
    for (let xx = x - w; xx <= x + w; xx++) b.set(xx, y0 + k, xx > x + w * 0.3 ? STAL : WALL_HI);
    if (k > 1 && k % 5 === 3 && w > 1) { b.set(x - w, y0 + k, STAL); }
  }
}
function shroom(b: Buf, x: number, base: number, r: number) {
  vline(b, x, base - r - 1, base - 1, STEM); vline(b, x + 1, base - r, base - 1, STEM); b.set(x + 1, base - 1, MOSS_DK);
  const cy = base - r - 2;
  for (let yy = -r; yy <= 1; yy++) for (let xx = -r - 1; xx <= r + 2; xx++) {
    const cx = x + 0.5, d = Math.hypot((x + xx - cx) / (r + 1.5), (cy + yy - cy) / (r * 0.8));
    if (yy <= 1 && d <= 1) b.set(x + xx, cy + yy, GLOW);
  }
  hline(b, x - r, x + r + 1, cy + 1, MOSS_DK);
  b.set(x - 1, cy - 1, DEW); b.set(x + 2, cy - 2, DEW); if (r > 3) b.set(x + 3, cy, DEW);
}

function back(b: Buf, phase: string) {
  // cave wall: lumpy rock masses in two tones, cracks, mossy patches
  for (const [cx, cy, rx, ry] of [[14, 52, 20, 14], [46, 46, 18, 10], [78, 56, 22, 16], [30, 70, 18, 10], [64, 76, 20, 9], [8, 80, 12, 8], [90, 40, 10, 14], [52, 64, 12, 8]] as number[][]) ellipse(b, cx, cy, rx, ry, WALL);
  for (let i = 0; i < 70; i++) { const x = Math.floor(rnd(i + 3) * N), y = 24 + Math.floor(rnd(i + 70) * 62); if (b.px[y * N + x] === WALL) b.set(x, y, i % 3 ? WALL_HI : STAL); }
  for (const [x0, y0, x1, y1] of [[34, 28, 36, 36], [36, 36, 33, 42], [58, 34, 60, 40], [86, 44, 84, 54], [10, 38, 12, 46]]) line(b, x0, y0, x1, y1, DEEP);
  for (const [cx, cy, rx] of [[22, 66, 5], [60, 62, 4], [88, 70, 5], [40, 56, 3]]) { ellipse(b, cx, cy, rx, 2, MOSS_DK); ellipse(b, cx - 1, cy - 1, rx - 1.5, 1, MOSS); }
  // ceiling: a dark ragged band
  for (let x = 0; x < N; x++) { const h = 4 + Math.round(2.4 * Math.sin(x / 4) + 1.8 * Math.sin(x / 1.7 + 1) + rnd(x) * 2); vline(b, x, 0, h, DEEP); if (x % 3 === 0) b.set(x, h + 1, STAL); }
  for (const [x, len, hw] of STALACTITES) stalactite(b, x, 3, len, hw);
  // side pillars with strata and moss
  for (let y = 4; y < GY; y++) {
    const wl = 5 + Math.round(2 * Math.sin(y / 5)), wr = 4 + Math.round(2 * Math.sin(y / 6 + 2));
    hline(b, 0, wl, y, STAL); hline(b, N - 1 - wr, N - 1, y, STAL);
    b.set(wl, y, WALL_HI); b.set(N - 1 - wr, y, DEEP);
    if (y % 7 === 3) { hline(b, 0, wl - 1, y, DEEP); hline(b, N - wr, N - 1, y, WALL); }
  }
  for (const [x, y] of [[6, 30], [6, 31], [5, 32], [7, 54], [6, 55], [88, 38], [89, 39], [88, 62]]) b.set(x, y, MOSS);
  // a light shaft from a crack in the roof (daylight only): dithered beam with a bright core
  if (phase === 'day' || phase === 'dawn' || phase === 'dusk') {
    const dense = phase === 'day' ? 2 : 3; // beam density
    for (let y = 6; y < GY - 2; y++) {
      const t = (y - 6) / (GY - 8), x0 = Math.round(72 - 3 - t * 12), x1 = Math.round(76 + 3 + t * 16);
      for (let x = x0; x <= x1; x++) if (b.px[y * N + x] !== STAL && (x + y) % (dense * 3) === 0 && (y % 2 === 0 || x % 3 === 0)) b.set(x, y, STEM);
    }
  }
  // dangling roots
  for (const [x, y, len] of [[24, 6, 14], [26, 6, 9], [48, 8, 11], [90, 6, 16]] as number[][]) { vline(b, x, y, y + len, ROOT); b.set(x - 1, y + len - 3, ROOT); }
  // glowing mushrooms and a ledge fungus; the halo is a sparse dither
  const clusters: [number, number, number][] = [[10, GY, 5], [18, GY, 3], [24, GY, 2], [82, GY, 5], [90, GY, 3], [75, GY, 2], [86, 66, 3]];
  for (const [x, base, r] of clusters) {
    for (let yy = -r - 8; yy < 2; yy++) for (let xx = -r - 5; xx < r + 7; xx++) {
      const d = Math.hypot(xx, yy * 1.4 + r * 0.4);
      if (d < r + 5 && ((xx + yy) % 4 === 0 && d < r + 3 || (xx % 4 === 0 && yy % 4 === 0 && d < r + 5)) && base + yy >= 0 && base + yy < GY) b.set(x + xx, base + yy, GLOW);
    }
  }
  for (const [x, base, r] of clusters) shroom(b, x, base, r);
  ledge(b, 70, 69);
}
function ledge(b: Buf, x: number, y: number) { hline(b, x, x + 14, y, MOSS); hline(b, x + 1, x + 13, y + 1, MOSS_DK); hline(b, x + 3, x + 11, y + 2, STAL); }

function fore(b: Buf) {
  // muddy floor with a mossy lip and two puddles
  for (let x = 0; x < N; x++) {
    b.set(x, GY, x % 3 === 0 ? MOSS : L.GROUND); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, x % 2 ? L.GROUND : L.DIRT); b.set(x, GY + 3, L.DIRT);
  }
  for (let x = 0; x < N; x++) for (let y = GY + 4; y < N; y++) if ((x * 5 + y * 3) % 7 === 0) b.set(x, y, STAL); else b.set(x, y, L.DIRT);
  for (const [cx, rx] of [[28, 11], [66, 14]] as number[][]) {
    ellipse(b, cx, GY + 2, rx, 3, WET); ellipse(b, cx, GY + 1, rx - 1, 1.2, L.DIRT);
    hline(b, cx - rx + 3, cx - rx + 8, GY + 2, WATER_LIGHT); hline(b, cx + 2, cx + 7, GY + 3, WATER_LIGHT);
    b.set(cx - 2, GY + 1, DEW); b.set(cx + rx - 4, GY + 2, DEW);
  }
  for (const [x, y] of [[8, GY - 1], [44, GY - 1], [47, GY - 1], [58, GY - 2], [88, GY - 1]]) { hline(b, x, x + 2, y, WALL); b.set(x, y - 1, WALL_HI); }
  for (const x of [3, 41, 49, 60, 95]) { vline(b, x, GY - 4, GY - 1, MOSS_DK); b.set(x + 1, GY - 3, MOSS); b.set(x - 1, GY - 2, MOSS); }
  for (let x = 2; x < N; x += 9) b.set(x, GY + 6, STAL);
}
const WATER_LIGHT = L.WATER_LIGHT;

function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s);
  const fast = c.rain ? 3 : 2; // rain outside: the cave drips more
  // drips: bead swells on the tip, falls, rings the puddle
  DRIPS.forEach((si, i) => {
    const [x, len] = STALACTITES[si];
    const tipY = 3 + len;
    const cyc = 46 - fast * 4, u = (T + i * 13) % cyc;
    const fallStart = 12;
    const land = x >= 54 && x <= 80 ? GY + 2 : GY + 1;
    const tFall = Math.ceil(Math.sqrt((land - tipY - 1) / 0.45)); // ticks the drop needs to reach the puddle
    if (u < fallStart) { if (u > 6) b.set(x, tipY, DEW); if (u > 9) b.set(x, tipY + 1, DEW); }
    else {
      const f = u - fallStart, y = tipY + 1 + f * f * 0.45;
      if (y < land) { b.set(x, Math.round(y), DEW); b.set(x, Math.round(y) - 1, DEW); }
      else {
        const fr = f - tFall; // ticks since the splash
        if (fr >= 0 && fr < 6) {
          if (fr < 2) px(b, [[x - 1, land - 2 - fr], [x + 1, land - 2 - fr], [x, land - 3 - fr]], DEW);
          const rr = Math.min(7, 1 + Math.round(fr * 1.4)); // a flat ripple ring, wider than tall
          hline(b, x - rr, x - rr + 1, land + 1, DEW); hline(b, x + rr - 1, x + rr, land + 1, DEW);
          if (rr > 3) { hline(b, x - rr + 2, x + rr - 2, land + 3, DEW); hline(b, x - rr + 2, x + rr - 2, land, DEW); }
        }
      }
    }
  });
  // glow pulse: the halo of the mushrooms breathes (two bright pixels per cap)
  const pulse = (T >> 3) % 4;
  for (const [x, base, r] of [[10, GY, 5], [82, GY, 5], [86, 66, 3], [18, GY, 3], [90, GY, 3]] as number[][]) {
    const cy = base - r - 2;
    if (pulse < 2) { b.set(x - 2 + pulse, cy - 1, DEW); b.set(x + 3 - pulse, cy, DEW); }
    if (pulse === 3) { b.set(x + 1, cy - r, GLOW); b.set(x - r - 2, cy + 1, GLOW); b.set(x + r + 3, cy + 1, GLOW); }
  }
  // vines sway
  for (const [x, len, ph] of [[56, 22, 0], [92, 26, 2], [32, 12, 4]] as number[][]) {
    for (let k = 0; k < len; k++) {
      const off = Math.round(Math.sin(T / 15 + ph) * 1.8 * (k / len) * (k / len) * 1.5);
      b.set(x + off, 6 + k, k % 4 === 3 ? MOSS : MOSS_DK);
      if (k % 6 === 4) { b.set(x + off + 1, 6 + k, MOSS); b.set(x + off - 1, 7 + k, MOSS); }
    }
  }
  // bubbles rising in the puddles and popping
  [[24, 0], [70, 5]].forEach(([x, o]) => {
    const u = ((T >> 1) + o) % 14;
    if (u < 6) b.set(x + (u % 2), GY + 2 - (u >> 1), u === 5 ? DEW : WATER_LIGHT);
  });
  // spore motes and (by day) dust in the light shaft
  for (let i = 0; i < 5; i++) {
    const u = (T + i * 37) % 120;
    b.set(Math.round(8 + i * 17 + Math.sin(u / 9 + i) * 4), Math.round(76 - u * 0.5), GLOW);
  }
  if (c.phase !== 'night') for (let i = 0; i < 3; i++) { const u = (T + i * 31) % 90; b.set(Math.round(66 + i * 7 + u * 0.12), 10 + Math.floor(u * 0.8), L.DAISY); }
}

export const swamp96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('swamp', 'back', c.phase, c.rain, back)),
  fore: (c) => {
    clearSky(c.b, cachedPart('swamp', 'back', c.phase, c.rain, back));
    blit(c.b, cachedPart('swamp', 'fore', c.phase, c.rain, fore));
    live(c.b, c);
  },
};
