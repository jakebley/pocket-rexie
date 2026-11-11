// Bot workshop at 96x96 (always dark, indoors): riveted wall panels, a pegboard of tools, copper pipes with a steam leak, meshing gears that turn,
// a vent fan, a monitor with scrolling lines and a sparkline on a work bench, a control box with blinking LEDs, hanging cables and a grated
// floor. The sun, moon, clouds and rain of the outdoor sky are removed (clearSky). Static art is cached; the animated bits run per frame.
import { Layer as L } from '../layers';
import type { Buf } from '../pixel';
import type { Biome96Painter, Ctx96 } from '../biome96';
import { GY, N, blit, cachedPart, clearSky, disc, hline, line, px, rnd, spr, tickOf, vline } from './kitB';

const PLATE: number = L.PANEL, SEAM = L.CABLE, STEEL: number = L.GEAR, STEEL_HI = L.WALL, COPPER = L.ROOF, COPPER_HI = L.LITTER, COPPER_DK = L.BARK, BENCH = L.WOOD, BENCH_DK = L.HOLE;

function plate(b: Buf, x: number, y: number, w: number, h: number) {
  b.rect(x, y, w, h, PLATE);
  hline(b, x, x + w - 1, y, STEEL_HI); vline(b, x, y, y + h - 1, STEEL_HI);
  hline(b, x, x + w - 1, y + h - 1, SEAM); vline(b, x + w - 1, y, y + h - 1, SEAM);
  for (const [rx, ry] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) { b.set(rx, ry, STEEL); b.set(rx + 1, ry + 1, SEAM); }
}
function pipe(b: Buf, x0: number, y0: number, len: number, thick: number, vertical = false) {
  for (let k = 0; k < len; k++) for (let t = 0; t < thick; t++) {
    const l = t === 0 ? COPPER_HI : t === thick - 1 ? COPPER_DK : t === 1 ? COPPER_HI : COPPER;
    if (vertical) b.set(x0 + t, y0 + k, l); else b.set(x0 + k, y0 + t, l);
  }
}
const WRENCH = ['.XXX.', 'X...X', 'X...X', '.XXX.', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'];
const HAMMER = ['XXXXXX', 'XXXXXX', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'];
const PLIERS = ['X...X', 'XX.XX', '.XXX.', '..X..', '.X.X.', '.X.X.', 'X...X', 'X...X'];
const SAW = ['XXXXXXXXXXXXXX', '.X.X.X.X.X.X.X', '..............', '...............'];

function back(b: Buf) {
  // wall plates in two bands, with a seam channel between
  for (const x of [0, 33, 66]) plate(b, x, 40, 31, 22);
  for (const x of [0, 33, 66]) plate(b, x, 63, 31, 27);
  // pegboard on the left: a holed plate with hanging tools and their shadows
  plate(b, 3, 30, 27, 30);
  for (let y = 33; y < 58; y += 4) for (let x = 6; x < 28; x += 4) b.set(x, y, SEAM);
  const hang = (rows: string[], x: number, y: number) => { spr(b, rows, x + 1, y + 1, { X: SEAM }); spr(b, rows, x, y, { X: STEEL }); };
  hang(WRENCH, 7, 34); hang(HAMMER, 15, 34); hang(PLIERS, 22, 34);
  spr(b, SAW, 7, 50, { X: SEAM }); spr(b, SAW, 6, 49, { X: STEEL });
  // ceiling pipe run with flanges, a drop on the right and a valve wheel
  pipe(b, 36, 29, 60, 4); pipe(b, 91, 33, 29, 4, true);
  for (const x of [46, 70, 86]) { b.rect(x, 27, 4, 8, COPPER_DK); b.rect(x + 1, 27, 2, 8, COPPER); }
  b.rect(88, 29, 8, 8, COPPER_DK); b.rect(89, 30, 6, 6, COPPER);
  ring2(b, 92, 50);
  // fan housing (the blades turn in live)
  disc(b, 37, 47, 8, SEAM); disc(b, 37, 47, 6.4, PLATE);
  // a work bench on the right: thick wood top, drawers, dark legs, a mug and parts
  b.rect(54, 76, 42, 3, BENCH); hline(b, 54, 95, 76, COPPER_HI); hline(b, 54, 95, 79, BENCH_DK);
  b.rect(56, 80, 3, 10, SEAM); b.rect(91, 80, 3, 10, SEAM); b.rect(59, 81, 31, 8, BENCH_DK); hline(b, 59, 89, 81, SEAM);
  b.rect(62, 83, 10, 5, BENCH); b.rect(76, 83, 10, 5, BENCH); px(b, [[66, 85], [67, 85], [80, 85], [81, 85]], SEAM);
  b.rect(58, 70, 5, 6, STEEL); hline(b, 58, 62, 70, STEEL_HI); b.set(63, 72, STEEL); b.set(63, 73, STEEL); // mug
  disc(b, 52 + 7, 74, 2, STEEL); b.set(59, 74, SEAM);
  // monitor on the bench: dark bezel, stand, glowing screen drawn live
  b.rect(67, 50, 26, 21, SEAM); hline(b, 67, 92, 50, PLATE); b.rect(77, 71, 6, 3, SEAM); b.rect(73, 74, 14, 2, SEAM);
  // control box on the left, below the pegboard
  plate(b, 3, 64, 22, 16);
  for (let k = 0; k < 4; k++) b.rect(5 + k * 5, 75, 3, 3, SEAM);
  // cables: drooping runs between the machines
  const drape = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
    let px0 = x0, py0 = y0;
    for (let x = x0 + 1; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0), y = Math.round(y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag);
      line(b, px0, py0, x, y, SEAM); px0 = x; py0 = y;
    }
  };
  drape(30, 36, 66, 36, 8); drape(0, 36, 3, 41, 4); drape(60, 62, 67, 66, 9); drape(20, 90, 3, 78, 4);
  b.rect(63, 58, 4, 4, STEEL); b.set(64, 59, SEAM);
  // a hanging lamp: shade, bulb, a soft dithered cone (the bulb glows in all phases)
  vline(b, 52, 0, 12, SEAM); b.rect(48, 13, 9, 3, COPPER_DK); hline(b, 49, 55, 13, COPPER); hline(b, 50, 54, 12, COPPER_DK);
  hline(b, 50, 54, 16, L.WINDOW); hline(b, 51, 53, 17, L.WINDOW);
  for (const [x, y] of [[48, 18], [56, 18], [46, 20], [58, 20], [49, 21], [55, 21]]) b.set(x, y, L.WINDOW);
}
function ring2(b: Buf, cx: number, cy: number) { // valve wheel
  disc(b, cx, cy, 5, SEAM); disc(b, cx, cy, 3.6, PLATE); hline(b, cx - 5, cx + 5, cy, STEEL); vline(b, cx, cy - 5, cy + 5, STEEL); b.set(cx, cy, SEAM);
}

function fore(b: Buf) {
  // grated floor: plate top, seams, rivets, glowing guide dashes
  for (let x = 0; x < N; x++) { b.set(x, GY, STEEL_HI); b.set(x, GY + 1, L.GROUND); b.set(x, GY + 2, L.GROUND); b.set(x, GY + 3, x % 6 === 0 ? SEAM : L.GROUND); }
  for (let y = GY + 4; y < N; y++) for (let x = 0; x < N; x++) b.set(x, y, (x + (y % 2) * 2) % 4 < 2 ? L.DIRT : L.GROUND);
  for (let x = 0; x < N; x += 12) { vline(b, x, GY, GY + 3, SEAM); b.set(x + 2, GY + 1, STEEL); b.set(x + 9, GY + 1, STEEL); }
  for (let x = 0; x < N; x++) if (x % 8 < 5) b.set(x, GY + 5, L.GRIDLINE);
  // floor cables snaking in front of the machines
  for (let x = 6; x < 46; x++) b.set(x, GY - 1 + Math.round(Math.sin(x / 3.2)), SEAM);
  for (let x = 62; x < 82; x++) b.set(x, GY - 2 - Math.round(Math.sin((x - 62) / 2.8)), SEAM);
  // small parts on the floor: bolts and a spring
  px(b, [[50, GY - 1], [51, GY - 1], [52, GY - 1], [51, GY - 2], [30, GY - 1], [31, GY - 1], [32, GY - 1], [31, GY - 2]], STEEL);
}

function gear(b: Buf, cx: number, cy: number, R: number, teeth: number, rot: number) {
  const ro = R + 2.2, r2 = ro * ro;
  for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
    const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const d = Math.sqrt(d2), a = Math.atan2(dy, dx);
    const tooth = Math.cos(teeth * (a - rot)) > 0.1;
    if (d > R && !tooth) continue;
    if (d > R + 1.4 && Math.cos(teeth * (a - rot)) < 0.5) continue;
    let l = STEEL;
    if (d < 2) l = SEAM;
    else if (d < 3.4) l = STEEL_HI;
    else if (d > 3.8 && d < R - 2.4 && Math.cos(4 * (a - rot)) > 0.3) l = PLATE; // spoke windows
    else if (d > R - 1.6 && d <= R && dx + dy < 0) l = STEEL_HI;
    b.set(x, y, l);
  }
}
function live(b: Buf, c: Ctx96) {
  const T = tickOf(c.s);
  // meshing gears, top right
  const r = T * 0.055;
  gear(b, 72, 17, 10, 14, r); gear(b, 88, 12, 5.4, 8, -r * 14 / 8 + Math.PI / 8);
  // the fan: four blades
  const fa = T * 0.35;
  for (let k = 0; k < 4; k++) { const a = fa + k * Math.PI / 2; for (let s = 1; s <= 5; s++) { b.set(Math.round(37 + Math.cos(a) * s), Math.round(47 + Math.sin(a) * s), STEEL); if (s > 2) b.set(Math.round(37 + Math.cos(a + 0.35) * s), Math.round(47 + Math.sin(a + 0.35) * s), STEEL); } }
  b.set(37, 47, SEAM);
  // monitor: lines scroll up, a sparkline runs along the bottom, the cursor blinks
  b.rect(69, 52, 22, 17, L.SCREEN);
  const sc = T >> 1;
  for (let k = 0; k < 4; k++) {
    const yy = 53 + ((((k * 3 - sc) % 12) + 12) % 12);
    const idx = k + Math.floor((sc - k * 3 + 120) / 12) * 4;
    let x = 70 + (rnd(idx) > 0.7 ? 2 : 0);
    const end = 90 - Math.floor(rnd(idx + 9) * 6);
    while (x < end) { const w = 2 + Math.floor(rnd(idx * 7 + x) * 5); hline(b, x, Math.min(end, x + w - 1), yy, SEAM); x += w + 2; }
  }
  for (let x = 70; x < 90; x++) { const y = 66 + Math.round(Math.sin((x + sc) / 2.6) * 1.6 + Math.sin((x + sc * 2) / 1.7) * 0.8); b.set(x, y, L.LED_A); }
  hline(b, 69, 90, 64, SEAM);
  if ((T >> 2) % 2 === 0) b.rect(88, 55, 2, 2, SEAM);
  // control box LEDs and a level meter
  const leds: [number, number][] = [[6, 67], [11, 67], [16, 67], [6, 71], [11, 71], [16, 71]];
  leds.forEach(([x, y], i) => { const on = ((T >> 3) + i * 5 + (i % 2)) % 4 !== 0; b.rect(x, y, 3, 2, on ? (i % 3 === 1 ? L.LED_B : L.LED_A) : SEAM); });
  for (let k = 0; k < 4; k++) { const h = 1 + Math.floor(rnd((T >> 2) + k * 5) * 3); b.rect(5 + k * 5, 78 - h, 3, h, h > 2 ? L.LED_B : L.LED_A); }
  // a steam leak at the pipe flange
  for (let i = 0; i < 4; i++) {
    const u = ((T >> 1) + i * 5) % 20;
    const x = 72 + Math.round(Math.sin(u / 4 + i) * 1.5), y = 27 - u * 0.9;
    if (y > 8 && u > 2) disc(b, x, Math.round(y), 0.9 + u / 9, L.CLOUD_SHADE);
  }
  // lamp bulb flicker: the odd dim moment
  if ((T >> 4) % 17 === 5) hline(b, 50, 54, 16, SEAM);
  // a spark jumps from the loose cable now and then
  if ((T >> 1) % 23 === 3) { px(b, [[63, 62], [62, 64], [65, 63]], L.TWINKLE); }
}

export const workshop96: Biome96Painter = {
  ground: 'own',
  backdrop: (c) => blit(c.b, cachedPart('workshop', 'back', c.phase, c.rain, back)),
  fore: (c) => {
    const bk = cachedPart('workshop', 'back', c.phase, c.rain, back);
    clearSky(c.b, bk);
    blit(c.b, cachedPart('workshop', 'fore', c.phase, c.rain, fore));
    live(c.b, c);
  },
};
