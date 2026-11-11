// Finer art for the Technicolor 96x96 LCD: 10x10 HUD glyphs and 13x13-ish props and effects (the 64 grid keeps G7 / ART in pixel.ts and
// sceneDraw.ts). Sizes follow the x1.5 rule: a 7x7 glyph becomes 10x10, a 9x9 prop 13x13, a 5x5 effect 7x7.
type Rows = string[];

/** Build a bitmap from a predicate (x, y) -> lit. */
export function fromPred(w: number, h: number, f: (x: number, y: number) => boolean | string): Rows {
  const out: Rows = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) { const v = f(x, y); r += v === true ? 'X' : v === false ? '.' : v; }
    out.push(r);
  }
  return out;
}
const dist = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);
function segDist(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** 10x10 HUD / bubble glyphs (same meanings as G7). */
export const G10 = {
  heartFull: ['.XXX..XXX.', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...', '....XX....', '..........'],
  heartEmpty: ['.XXX..XXX.', 'X...XX...X', 'X........X', 'X........X', 'X........X', '.X......X.', '..X....X..', '...X..X...', '....XX....', '..........'],
  smileFull: ['...XXXX...', '..XXXXXX..', '.XXXXXXXX.', 'XXX.XX.XXX', 'XXX.XX.XXX', 'XXXXXXXXXX', 'XX.XXXX.XX', '.XX....XX.', '..XXXXXX..', '...XXXX...'],
  smileEmpty: ['...XXXX...', '..X....X..', '.X......X.', 'X..X..X..X', 'X..X..X..X', 'X........X', 'X.X....X.X', '.X.XXXX.X.', '..X....X..', '...XXXX...'],
  poop: ['..........', '....XX....', '...XXXX...', '..XXXXXX..', '...XXXX...', '.XXXXXXXX.', 'XXXXXXXXXX', 'XX.XXXX.XX', 'XXXXXXXXXX', '.XXXXXXXX.'],
  alert: ['...XXXX...', '...XXXX...', '...XXXX...', '...XXXX...', '...XXXX...', '....XX....', '..........', '...XXXX...', '...XXXX...', '..........'],
  skull: ['..XXXXXX..', '.XXXXXXXX.', 'XXXXXXXXXX', 'XX..XX..XX', 'XX..XX..XX', 'XXXX..XXXX', '.XXXXXXXX.', '..XXXXXX..', '..X.XX.X..', '..........'],
  zzz: ['XXXXXXXXXX', 'XXXXXXXXXX', '......XXX.', '.....XXX..', '....XXX...', '...XXX....', '..XXX.....', '.XXX......', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  drop: ['....XX....', '....XX....', '...XXXX...', '..XXXXXX..', '.XXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..'],
  flake: ['X...XX...X', '.X..XX..X.', '..X.XX.X..', '...XXXX...', 'XXXXXXXXXX', 'XXXXXXXXXX', '...XXXX...', '..X.XX.X..', '.X..XX..X.', 'X...XX...X'],
  meat: ['...XXXXX..', '..XXXXXXX.', '.XXXXXXXXX', '.XXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '..XXXX....', '.XXX......', 'XX.XX.....', '.XXX......'],
  ball: ['..XXXXXX..', '.XX.XX.XX.', 'XX..XX..XX', 'X..XXXX..X', 'XXXXXXXXXX', 'XXXXXXXXXX', 'X..XXXX..X', 'XX..XX..XX', '.XX.XX.XX.', '..XXXXXX..'],
  syringe: ['........XX', '.......XXX', '......XXX.', '.....XXX..', '....XXX...', '..XXXX....', '.XXXX.....', 'XXXX......', 'XXX.......', 'XX........'],
  bulb: ['...XXXX...', '..XXXXXX..', '.XXXXXXXX.', '.XXXXXXXX.', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...', '...XXXX...', '...XXXX...', '....XX....'],
};

/** 13x13 props (9x9 in logic units). */
const disc13 = (r: number, f: (x: number, y: number) => boolean | string = () => true) => fromPred(13, 13, (x, y) => dist(x, y, 6, 6) <= r && f(x, y));
export const ART96: Record<string, Rows> = {
  'food:meat': fromPred(13, 13, (x, y) => dist(x, y, 7.5, 4.8) <= 5.3 || segDist(x, y, 5, 7.5, 1.8, 10.7) <= 1.6 || dist(x, y, 0.8, 10.4) <= 1.3 || dist(x, y, 2.2, 12) <= 1.3),
  'food:veggie': fromPred(13, 13, (x, y) => dist(x, y, 6, 7.6) <= 4.9 || segDist(x, y, 6, 3.4, 3, 0.6) <= 1.1 || segDist(x, y, 6, 3.4, 9, 0.6) <= 1.1 || segDist(x, y, 6, 3.4, 6, 0.2) <= 0.6 || (x >= 5 && x <= 7 && y >= 11)),
  'food:pasta': fromPred(13, 13, (x, y) => (y >= 6 && dist(x, y, 6, 6) <= 6.2) || (y >= 3 && y <= 6 && x >= 1 && x <= 11 && (x + y) % 3 !== 0) || (y <= 2 && x % 4 === 1 && y % 2 === (x > 6 ? 1 : 0))),
  'food:snack': fromPred(13, 13, (x, y) => dist(x, y, 6, 6) <= 6.2 && !([[4, 4], [8, 3], [6, 7], [3, 8], [9, 8], [8, 5]].some(([a, b]) => dist(x, y, a, b) <= 0.9))),
  broom: fromPred(13, 13, (x, y) => segDist(x, y, 12, 0.5, 7, 7) <= 0.9 || (y >= 7 && y <= 12 && Math.abs(x - 5) <= (y - 6.2) * 1.1 + 0.4 && !(y === 12 && x % 2 === 0))),
  ball: disc13(6.3, (x, y) => !((Math.abs(x - 6) < 0.8 && (y < 3 || y > 9)) || (Math.abs(y - 6) < 0.8 && (x < 3 || x > 9)) || (dist(x, y, 6, 6) >= 3.4 && dist(x, y, 6, 6) < 4.3 && (x + y) % 4 < 2 && false))),
  dumbbell: fromPred(16, 11, (x, y) => (x <= 4 && y >= 1 && y <= 9 && !(x === 0 && (y === 1 || y === 9))) || (x >= 11 && y >= 1 && y <= 9 && !(x === 15 && (y === 1 || y === 9))) || (x > 4 && x < 11 && y >= 4 && y <= 6)),
  syringe: fromPred(13, 13, (x, y) => segDist(x, y, 12, 0.5, 5, 7.5) <= 1.7 || segDist(x, y, 5, 7.5, 0.5, 12) <= 0.6 || segDist(x, y, 11.5, 0.5, 12.5, 1.5) <= 1.6),
  spark: fromPred(13, 13, (x, y) => (x === 6 && true) || (y === 6) || (Math.abs(x - 6) === Math.abs(y - 6) && Math.abs(x - 6) <= 3) || (dist(x, y, 6, 6) <= 2.2)),
  puff: ['XXXXXXXXXXXXXXXXXX', '..................', '......XXXXXXXXXXXX', '..................', '...XXXXXXXXXX'],
  glint: ['...X...', '...X...', '...X...', 'XXXXXXX', '...X...', '...X...', '...X...'],
  shell: ['XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '...XXXX...'],
  note: ['...XXX..', '...XXXXX', '...X..XX', '...X...X', '...X....', '...X....', '.XXX....', 'XXXX....', 'XXXX....', '.XX.....'],
  dropS: ['...X...', '...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.'],
  flakeS: ['X..X..X', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', 'X..X..X'],
  dot: ['XXX', 'XXX', 'XXX'],
  // sky
  sunDisc: fromPred(13, 13, (x, y) => dist(x, y, 6, 6) <= 6.4),
  moon: fromPred(13, 13, (x, y) => dist(x, y, 6, 6) <= 6.4 && dist(x, y, 9.2, 4.6) > 5.6),
  cloudL: fromPred(26, 14, (x, y) => y <= 13 && ([[6, 9, 5.2], [12.5, 6, 6.2], [19.5, 8, 5.4], [14, 9.5, 5.4]].some(([a, b, r]) => dist(x, y, a, b) <= r) || (x >= 6 && x <= 20 && y >= 9))),
  cloudS: fromPred(17, 10, (x, y) => y <= 9 && ([[4.5, 6, 4.2], [9, 4, 4.2], [12.5, 6, 4.2]].some(([a, b, r]) => dist(x, y, a, b) <= r) || (x >= 5 && x <= 12 && y >= 6))),
  butterfly0: ['XXX....XXX', 'XXXX..XXXX', '.XXXXXXXX.', '...XXXX...', '....XX....'],
  butterfly1: ['..........', '...X..X...', '..XXXXXX..', '...XXXX...', '....XX....'],
  pebble: ['..XXX..', '.XXXXX.', 'XXXXXXX'],
  bubble: fromPred(20, 14, (x, y) => {
    if ((y === 0 || y === 13) && x >= 2 && x <= 17) return true;
    if ((x === 0 || x === 19) && y >= 2 && y <= 11) return true;
    return (x === 1 || x === 18) && (y === 1 || y === 12);
  }),
};

/** Grass tuft: blades 2px apart with the given heights; the top two pixels of every blade lean `lean`; a base row joins them. */
export function tuft(heights: number[], lean: -1 | 0 | 1): Rows {
  const w = heights.length * 2 - 1, h = Math.max(...heights);
  const g = fromPred(w, h, () => false).map((r) => r.split(''));
  for (let i = 0; i < heights.length; i++) {
    for (let j = 0; j < heights[i]; j++) {
      const x = 2 * i + (j >= heights[i] - 2 && j > 0 ? lean : 0);
      if (x >= 0 && x < w) g[h - 1 - j][x] = 'X';
    }
  }
  for (let x = 0; x < w; x++) g[h - 1][x] = 'X';
  return g.map((r) => r.join(''));
}
export const TUFT96 = {
  T0: tuft([3, 6, 4, 5], 0), T1: tuft([3, 6, 4, 5], 1),
  S0: tuft([3, 4, 2], 0), S1: tuft([3, 4, 2], -1),
};
/** 5x7 flowers: X petals (flower layer), o centre (sun), s stem and leaf (grass). */
export const FLOWER96 = [
  ['.XXX.', 'XXoXX', '.XXX.', '..s..', '.ss..', '..s..', '..s..'],
  ['..X..', '.XXX.', 'XXoXX', '.XXX.', '..s..', '..ss.', '..s..'],
];
