// Dragon crags at 96x96: a hazy far ridge, a layered crag face with a cave mouth (two eyes glint inside, stalactite teeth), a volcano with a
// crater glow, lava flows and a smoke plume, a rocky floor with boulders and glowing cracks. Ash flakes and embers drift. The static art
// is cached per (phase, rain); the plume, embers, eyes and lava flicker are drawn per frame.
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, disc, ellipse, hline, line, occlude, poly, px, rnd, tickOf, vline } from './kitB';

const FARR = L.PEAK, CRAG = L.CRAG, CRAG_HI = L.WALL, ROCK = L.ROCK, DEEP = L.STALAC, CAVE = L.CAVE, LAVA = L.LAVA, EMB = L.EMBER, ASH = L.ASH;

const VX = 76, VY = 36; // volcano apex
const volHw = (y: number) => 3.5 + 0.5 * (y - VY) + 0.004 * (y - VY) * (y - VY);

function back(b: Buf, phase: string) {
  const hot = phase === 'dusk' || phase === 'night';
  // hazy far ridge
  for (let x = 0; x < N; x++) {
    const y = Math.round(60 + 5 * Math.sin(x / 9) + 3.2 * Math.sin(x / 3.7 + 2) + Math.abs(((x * 7) % 23) - 11) * 0.45);
    vline(b, x, y, GY - 1, FARR);
  }
  // volcano: lit left flank, shaded right flank, rock ribs, crater
  for (let y = VY; y < GY; y++) {
    const hw = volHw(y);
    for (let x = Math.round(VX - hw); x <= Math.round(VX + hw); x++) {
      const t = (x - VX) / Math.max(1, hw);
      b.set(x, y, t > 0.15 ? DEEP : ROCK);
    }
  }
  for (let i = 0; i < 70; i++) {
    const y = VY + 6 + Math.floor(rnd(i + 11) * 52), hw = volHw(y), x = Math.round(VX + (rnd(i + 31) * 2 - 1) * hw * 0.9);
    if (b.px[y * N + x]) b.set(x, y, x < VX ? CRAG : ROCK);
  }
  for (let k = 0; k < 6; k++) { // ribs down the lit flank
    const sx = VX - 3 - k * 4;
    for (let y = VY + 8; y < GY - 2; y++) { const x = Math.round(VX + (sx - VX) * (volHw(y) / volHw(GY - 1)) * 1.1); if (y % 7 !== (k * 3) % 7) b.set(x, y, k % 2 ? CRAG : DEEP); }
  }
  hline(b, VX - 4, VX + 4, VY, CRAG_HI); hline(b, VX - 5, VX - 2, VY + 1, CRAG_HI);
  // crater with a lava lip
  ellipse(b, VX, VY + 1, 5.5, 2, LAVA); hline(b, VX - 3, VX + 3, VY + 1, EMB); b.set(VX - 5, VY - 1, ROCK); b.set(VX + 5, VY - 1, DEEP);
  // two lava flows, the left one thick, tapering and cooling to rock at its end
  const flow = (pts: [number, number][], w: number) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
        const ww = Math.max(1, Math.round(w * (1 - (i + s / steps) / pts.length * 0.7)));
        for (let k = 0; k < ww; k++) b.set(x + k - (ww >> 1), y, LAVA);
        if (ww >= 2) b.set(x, y, EMB);
      }
    }
  };
  flow([[VX - 2, VY + 3], [VX - 4, VY + 9], [VX - 3, VY + 16], [VX - 7, VY + 23], [VX - 6, VY + 31], [VX - 10, VY + 39], [VX - 9, VY + 47]], 3);
  flow([[VX + 2, VY + 3], [VX + 4, VY + 10], [VX + 3, VY + 17], [VX + 7, VY + 25], [VX + 6, VY + 32]], 2);
  for (const [x, y] of [[VX - 9, VY + 50], [VX - 11, VY + 49], [VX - 7, VY + 51]]) b.set(x, y, LAVA);
  px(b, [[VX - 12, VY + 45], [VX - 12, VY + 46], [VX - 6, VY + 41]], ROCK);
  if (hot) for (let y = VY - 18; y < VY; y++) for (let x = VX - 18; x < VX + 18; x++) {
    const d = Math.hypot(x - VX, (y - (VY - 1)) * 1.4);
    if (b.px[y * N + x] === 0 && ((d < 7 && (x + y) % 2 === 0) || (d < 12 && x % 2 === 0 && y % 2 === 0) || (d < 16 && x % 4 === 0 && y % 4 === 0))) b.set(x, y, EMB);
  }

  // the front crag: polygon with strata, a shaded flank, rim light
  const crag = [[0, 48], [5, 44], [9, 36], [14, 30], [19, 36], [26, 44], [30, 54], [37, 62], [43, 72], [47, 90], [0, 90]];
  poly(b, crag, CRAG);
  for (let y = 30; y < GY; y++) for (let x = 0; x < 50; x++) {
    if (b.px[y * N + x] !== CRAG) continue;
    const ridge = 14 + (y - 30) * 0.62;
    if (x > ridge) b.set(x, y, ROCK); else if (x < ridge - 14 + (y % 5) * 0 && x > ridge - 22 && y % 9 === 4) b.set(x, y, CRAG_HI);
  }
  for (let y = 36; y < GY - 2; y += 6) { // strata: slightly tilted bands with gaps
    const sl = (y % 12 ? 0.18 : -0.12);
    for (let x = 0; x < 48; x++) { const yy = Math.round(y + x * sl); if (b.px[yy * N + x] === CRAG && (x + y) % 11 !== 0) b.set(x, yy, (y % 12) ? ROCK : DEEP); }
  }
  for (let y = 31; y < 62; y++) { const x = Math.round(14 - (y - 30) * 0.55 - (y > 38 ? 0 : -(38 - y) * 0)); if (b.px[y * N + x] === CRAG) b.set(x, y, CRAG_HI); }
  line(b, 9, 36, 14, 30, CRAG_HI); line(b, 14, 30, 19, 36, DEEP);
  // cliff cracks
  line(b, 22, 40, 24, 48, DEEP); line(b, 24, 48, 22, 56, DEEP); line(b, 6, 54, 8, 60, DEEP);

  // cave mouth with stalactite teeth, an inner arch and a rim
  const cx = 17, top = 62;
  for (let y = top; y < GY; y++) {
    const hw = y < top + 9 ? Math.round(Math.sqrt(Math.max(0, 14 * 14 - (top + 9 - y) * (top + 9 - y) * 2.2))) : 14;
    hline(b, cx - hw, cx + hw, y, CAVE);
    b.set(cx - hw - 1, y, DEEP); b.set(cx + hw + 1, y, DEEP);
  }
  for (let y = top + 3; y < GY; y++) { const hw = y < top + 11 ? Math.max(0, Math.round(Math.sqrt(Math.max(0, 9 * 9 - (top + 11 - y) * (top + 11 - y) * 1.6)))) : 9; hline(b, cx - hw, cx + hw, y, DEEP); }
  for (let y = top + 6; y < GY; y++) { const hw = y < top + 13 ? Math.max(0, Math.round(Math.sqrt(Math.max(0, 5 * 5 - (top + 13 - y) * (top + 13 - y) * 1.4)))) : 5; hline(b, cx - hw, cx + hw, y, CAVE); }
  hline(b, cx - 9, cx + 9, top + 1, DEEP);
  for (const [x, len] of [[cx - 10, 4], [cx - 6, 3], [cx - 1, 5], [cx + 4, 3], [cx + 8, 4]] as [number, number][]) for (let k = 0; k < len; k++) hline(b, x - (len - k > 2 ? 1 : 0), x + (len - k > 2 ? 1 : 0), top + 4 + k, CRAG);
  if (hot) { px(b, [[cx - 7, GY - 3], [cx - 6, GY - 2], [cx + 6, GY - 3], [cx + 5, GY - 2], [cx, GY - 2]], EMB); }
}

function fore(b: Buf, phase: string) {
  // rocky floor: crumbly top edge, strata, rubble; glowing cracks at dusk and night
  for (let x = 0; x < N; x++) {
    b.set(x, GY, x % 4 === 1 ? CRAG : L.GROUND); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, x % 3 === 0 ? CRAG : L.GROUND);
    b.set(x, GY + 3, L.DIRT);
  }
  for (let x = 0; x < N; x++) for (let y = GY + 4; y < N; y++) if ((x * 3 + y * 7) % 13 === 0) b.set(x, y, DEEP); else if ((x * 5 + y) % 19 === 0) b.set(x, y, L.GROUND);
  for (let x = 4; x < N; x += 12) { hline(b, x, x + 5, GY + 5, DEEP); hline(b, x + 2, x + 8, GY + 4, L.GROUND); }
  // boulders and rubble standing on the floor
  const boulder = (cx: number, r: number) => { ellipse(b, cx, GY - r * 0.4, r * 1.3, r, ROCK); ellipse(b, cx - 1, GY - r * 0.6, r * 0.9, r * 0.6, CRAG); hline(b, cx - r, cx + r, GY - 1, DEEP); b.set(cx - r, GY - r + 1, CRAG_HI); b.set(cx - r + 1, GY - r, CRAG_HI); };
  boulder(4, 4); boulder(90, 5); boulder(58, 3); boulder(35, 2);
  for (const [x, y] of [[25, GY - 1], [27, GY - 1], [26, GY - 2], [46, GY - 1], [49, GY - 1], [48, GY - 2], [70, GY - 1], [73, GY - 1], [72, GY - 2], [82, GY - 1]]) b.set(x, y, x % 2 ? CRAG : ROCK);
  if (phase === 'dusk' || phase === 'night') {
    const nl = phase === 'night';
    line(b, 14, GY + 3, 20, GY + 5, LAVA); line(b, 20, GY + 5, 26, GY + 4, LAVA); line(b, 26, GY + 4, 30, GY + 6, LAVA); line(b, 55, GY + 4, 62, GY + 5, LAVA); line(b, 62, GY + 5, 66, GY + 3, LAVA);
    if (nl) { line(b, 72, GY + 5, 80, GY + 4, LAVA); line(b, 4, GY + 5, 10, GY + 4, LAVA); px(b, [[22, GY + 4], [58, GY + 5], [76, GY + 4]], EMB); }
  }
}

// ash flakes falling slowly, embers rising from the crater, the plume, eye glints
function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s), ph = c.phase;
  // smoke plume: puffs that rise from the crater, grow, thin and drift left
  for (let i = 0; i < 6; i++) {
    const u = ((T >> 1) + i * 7) % 42;
    const x = VX - 1 - u * 0.36 + Math.sin(u / 5 + i) * 1.2, y = VY - 3 - u * 0.62;
    const r = 1.4 + u / 14;
    if (y > 4) {
      if (u > 30) { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r && (Math.round(x + xx) + Math.round(y + yy)) % 2 === 0) b.set(Math.round(x + xx), Math.round(y + yy), ASH); }
      else disc(b, Math.round(x), Math.round(y), r, ASH);
      if (u < 20) b.set(Math.round(x - r * 0.5), Math.round(y - r * 0.5), L.CLOUD_SHADE);
    }
  }
  // embers
  const n = ph === 'night' ? 9 : ph === 'dusk' ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const u = ((T >> 1) + i * 5) % 30;
    if (u % 3 === 1) continue;
    b.set(Math.round(VX - 5 + i * 1.6 + Math.sin(u / 3 + i) * 3), Math.round(VY - 2 - u * 0.8), EMB);
  }
  // ash flakes
  for (let i = 0; i < 8; i++) {
    const u = (T + i * 23) % 150;
    const x = (i * 29 + 10 + Math.round(u * 0.15)) % N, y = 16 + Math.floor((u / 150) * 70);
    b.set(x, y, ASH);
  }
  // lava flicker: the flow shimmers
  if ((T >> 2) % 2 === 0) { px(b, [[VX - 3, VY + 10], [VX - 6, VY + 24], [VX - 8, VY + 38]], EMB); } else { px(b, [[VX - 4, VY + 15], [VX - 6, VY + 31], [VX + 4, VY + 13]], EMB); }
  // eyes in the cave: yellow, with a slit, blinking now and then
  const e = (T >> 3) % 20;
  if (e < 15 || ph === 'night') {
    const closed = e === 13;
    const ex = [12, 22];
    for (const x of ex) { if (closed) hline(b, x, x + 2, 78, EMB); else { b.rect(x, 77, 3, 2, EMB); b.set(x + 1, 77, L.DAISY_C); b.set(x + 1, 78, CAVE); } }
  }
}

export const crags96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('crags', 'back', c.phase, c.rain, (b, p) => back(b, p))),
  fore: (c) => {
    occlude(c.b, cachedPart('crags', 'back', c.phase, c.rain, (b, p) => back(b, p)));
    blit(c.b, cachedPart('crags', 'fore', c.phase, c.rain, (b, p) => fore(b, p)));
    live(c.b, c);
  },
};
