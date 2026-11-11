// Pixel art tables + a tiny square bitmap buffer (64x64 scene and text mode) used by the LCD.
import { DIM_FLAG, LAYER_MASK, Layer } from './layers';

/** The two looks (same union as palette.ts ColorMode; declared here so pixel.ts has no runtime dependency on the palette). */
export type Look = 'traditional' | 'technicolor';
/** LCD grid per look: Traditional keeps the classic 64x64, Technicolor has the finer 96x96 (docs/RESOLUTION.md). */
export const GRID_TRAD = 64;
export const GRID_TECH = 96;
export type GridN = typeof GRID_TRAD | typeof GRID_TECH;
export const gridFor = (look: Look | undefined | null): GridN => (look === 'technicolor' ? GRID_TECH : GRID_TRAD);
/** Simulation units ("logic units"): the pet's life always runs in 64-space; the 96 painters convert with this. */
export const LOGIC_N = 64;
/** logic units to grid cells for a grid of n (identity at 64, x1.5 at 96) */
/** A pointer offset in points inside an LCD of `size` points to a logic cell 0..63 (taps work in logic units whatever the grid). */
export const toLogic = (v: number, size: number) => Math.max(0, Math.min(LOGIC_N - 1, Math.floor(v / (size / LOGIC_N))));
export const toGrid = (v: number, n: number) => Math.round((v * n) / LOGIC_N);

/** Home-scene framebuffer: 64x64 (species sprites are 32x32 hiFrames, drawn 1:1). */
export const GRID = 64;
/** Text-mode framebuffer: 64x64 so a 3x5 line holds 16 characters. */
export const TEXT_GRID = 64;

export const GLYPHS = {
  poop: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.XXX.'],
  heartFull: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  heartEmpty: ['.X.X.', 'X.X.X', 'X...X', '.X.X.', '..X..'],
  smileFull: ['.XXX.', 'X.X.X', 'XXXXX', 'X.X.X', '.XXX.'],
  smileEmpty: ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
  alert: ['..X..', '..X..', '..X..', '.....', '..X..'],
  skull: ['.XXX.', 'X.X.X', 'XXXXX', '.XXX.', '.X.X.'],
  zzz: ['XXXXX', '...X.', '..X..', '.X...', 'XXXXX'],
  drop: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.XXX.'],
  flake: ['X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'],
  lock: ['.XXX.', 'X...X', 'XXXXX', 'XXXXX', 'XXXXX'],
};

/** 7x7 HUD / bubble glyphs for the 64 grid (the 5x5 GLYPHS stay for the text screens). */
export const G7 = {
  poop: ['...X...', '..XXX..', '.XXXXX.', '..XXX..', 'XX.X.XX', 'XXXXXXX', '.XXXXX.'],
  heartFull: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  heartEmpty: ['.XX.XX.', 'X..X..X', 'X.....X', 'X.....X', '.X...X.', '..X.X..', '...X...'],
  smileFull: ['..XXX..', '.XXXXX.', 'XX.X.XX', 'XXXXXXX', 'X.XXX.X', '.X...X.', '..XXX..'],
  smileEmpty: ['..XXX..', '.X...X.', 'X.X.X.X', 'X.....X', 'X.....X', '.X...X.', '..XXX..'],
  alert: ['..XXX..', '..XXX..', '..XXX..', '..XXX..', '...X...', '.......', '..XXX..'],
  skull: ['.XXXXX.', 'XXXXXXX', 'X..X..X', 'XX.X.XX', 'XXXXXXX', '.XXXXX.', '.X.X.X.'],
  zzz: ['XXXXXXX', '.....X.', '....X..', '...X...', '..X....', '.X.....', 'XXXXXXX'],
  drop: ['...X...', '...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.'],
  flake: ['X..X..X', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', 'X..X..X'],
  meat: ['..XXXX.', '.XXXXXX', '.XXXXXX', '..XXXX.', '..XX...', '.XX....', 'XX.XX..'],
  ball: ['.XXXXX.', 'XX.X.XX', 'X..X..X', 'XXXXXXX', 'X..X..X', 'XX.X.XX', '.XXXXX.'],
  syringe: ['.....XX', '....XXX', '...XXX.', '..XXX..', '.XXX...', 'XX.....', 'X......'],
  bulb: ['..XXX..', '.XXXXX.', '.XXXXX.', '.XXXXX.', '..XXX..', '..XXX..', '...X...'],
};

/** Scale2x (EPX) doubling of an ink bitmap: same smoothing as the species hiFrames. */
export function epx(rows: string[]): string[] {
  const h = rows.length, w = rows[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let a = '', b = '';
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      a += C === A && C !== D && A !== B ? A : P;
      a += A === B && A !== C && B !== D ? B : P;
      b += D === C && D !== B && C !== A ? C : P;
      b += B === D && B !== A && D !== C ? D : P;
    }
    out.push(a, b);
  }
  return out;
}

/** Scale3x (AdvMAME3x) enlargement of an ink bitmap: every pixel becomes 3x3, with diagonal edges smoothed and corners kept crisp. */
export function scale3x(rows: string[]): string[] {
  const h = rows.length, w = rows[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x]);
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    const r = ['', '', ''];
    for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1);
      const D = at(x - 1, y), E = at(x, y), F = at(x + 1, y);
      const G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E, e5 = E, e6 = E, e7 = E, e8 = E;
      if (B !== H && D !== F) {
        e0 = D === B ? D : E;
        e1 = (D === B && E !== C) || (B === F && E !== A) ? B : E;
        e2 = B === F ? F : E;
        e3 = (D === B && E !== G) || (D === H && E !== A) ? D : E;
        e5 = (B === F && E !== I) || (H === F && E !== C) ? F : E;
        e6 = D === H ? D : E;
        e7 = (D === H && E !== I) || (H === F && E !== G) ? H : E;
        e8 = H === F ? F : E;
      }
      r[0] += e0 + e1 + e2; r[1] += e3 + E + e5; r[2] += e6 + e7 + e8;
    }
    out.push(r[0], r[1], r[2]);
  }
  return out;
}
const s3Cache = new WeakMap<string[], string[]>();
/** scale3x with a cache keyed on the (immutable) source rows. */
export function scale3xCached(rows: string[]): string[] {
  let o = s3Cache.get(rows);
  if (!o) { o = scale3x(rows); s3Cache.set(rows, o); }
  return o;
}

export const EGG_SPRITE = [
  '................',
  '.....XXXXXX.....',
  '...XXX....XXX...',
  '..XX..XX....XX..',
  '..X...XX......X.',
  '.XX..........XX.',
  '.X.......XX...X.',
  '.X......XXXX..X.',
  '.X.......XX...X.',
  '.XX..XX......XX.',
  '..X..XX......X..',
  '..XX........XX..',
  '...XXX....XXX...',
  '.....XXXXXX.....',
  '................',
  '................',
];

export const TOMB_SPRITE = [
  '................',
  '......XXXX......',
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '...XXXX..XXXX...',
  '...XXXX..XXXX...',
  '...XX..XX..XX...',
  '...XXXX..XXXX...',
  '...XXXX..XXXX...',
  '...XXXXXXXXXX...',
  '...XXX....XXX...',
  '...XXXXXXXXXX...',
  '...XXXXXXXXXX...',
  '.XXXXXXXXXXXXXX.',
  '................',
  '................',
];

// 3x5 pixel font. Rows are separated with '|'.
const F: Record<string, string> = {
  A: '.X.|X.X|XXX|X.X|X.X', B: 'XX.|X.X|XX.|X.X|XX.', C: '.XX|X..|X..|X..|.XX', D: 'XX.|X.X|X.X|X.X|XX.',
  E: 'XXX|X..|XX.|X..|XXX', F: 'XXX|X..|XX.|X..|X..', G: '.XX|X..|X.X|X.X|.XX', H: 'X.X|X.X|XXX|X.X|X.X',
  I: 'XXX|.X.|.X.|.X.|XXX', J: '..X|..X|..X|X.X|.X.', K: 'X.X|X.X|XX.|X.X|X.X', L: 'X..|X..|X..|X..|XXX',
  M: 'X.X|XXX|XXX|X.X|X.X', N: 'XXX|X.X|X.X|X.X|X.X', O: '.X.|X.X|X.X|X.X|.X.', P: 'XX.|X.X|XX.|X..|X..',
  Q: '.X.|X.X|X.X|XX.|.XX', R: 'XX.|X.X|XX.|X.X|X.X', S: '.XX|X..|.X.|..X|XX.', T: 'XXX|.X.|.X.|.X.|.X.',
  U: 'X.X|X.X|X.X|X.X|XXX', V: 'X.X|X.X|X.X|X.X|.X.', W: 'X.X|X.X|XXX|XXX|X.X', X: 'X.X|X.X|.X.|X.X|X.X',
  Y: 'X.X|X.X|.X.|.X.|.X.', Z: 'XXX|..X|.X.|X..|XXX',
  '0': 'XXX|X.X|X.X|X.X|XXX', '1': '.X.|XX.|.X.|.X.|XXX', '2': 'XX.|..X|.X.|X..|XXX', '3': 'XX.|..X|.X.|..X|XX.',
  '4': 'X.X|X.X|XXX|..X|..X', '5': 'XXX|X..|XX.|..X|XX.', '6': '.XX|X..|XXX|X.X|XXX', '7': 'XXX|..X|.X.|.X.|.X.',
  '8': 'XXX|X.X|XXX|X.X|XXX', '9': 'XXX|X.X|XXX|..X|XX.',
  ' ': '...|...|...|...|...', '.': '...|...|...|...|.X.', ',': '...|...|...|.X.|X..', '!': '.X.|.X.|.X.|...|.X.',
  '?': 'XX.|..X|.X.|...|.X.', ':': '...|.X.|...|.X.|...', '/': '..X|..X|.X.|X..|X..', '-': '...|...|XXX|...|...',
  '+': '...|.X.|XXX|.X.|...', "'": '.X.|.X.|...|...|...', '%': 'X.X|..X|.X.|X..|X.X',
  '|': '.X.|.X.|.X.|.X.|.X.', '>': 'X..|.X.|..X|.X.|X..', '<': '..X|.X.|X..|.X.|..X', '(': '.XX|X..|X..|X..|.XX', ')': 'XX.|..X|..X|..X|XX.',
};
export const FONT: Record<string, string[]> = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, v.split('|')]));
export const textWidth = (s: string, scale = 1) => (s.length === 0 ? 0 : (s.length * 4 - 1) * scale);

// 8x8 menu icons
export const ICONS: Record<string, string[]> = {
  // drumstick: meat knob top-right, bone handle bottom-left
  feed: ['...XXXX.', '..XXXXXX', '..XXXXXX', '..XXXXXX', '...XXXX.', '..XXX...', '.XXX....', 'XX.XX...'],
  // light bulb
  light: ['..XXXX..', '.X....X.', '.X....X.', '.X....X.', '..X..X..', '..XXXX..', '..X..X..', '...XX...'],
  // game controller: d-pad and two buttons cut out of the body
  play: ['........', '.XXXXXX.', 'XX.XXXXX', 'X...XX.X', 'XX.XX.XX', 'XXXXXXXX', 'XX....XX', '........'],
  train: ['........', 'X......X', 'XX....XX', 'XXXXXXXX', 'XXXXXXXX', 'XX....XX', 'X......X', '........'],
  // medical cross
  medicine: ['..XXXX..', '..XXXX..', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '..XXXX..', '..XXXX..'],
  // broom (clean)
  clean: ['...XX...', '...XX...', '...XX...', '...XX...', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'X.X..X.X'],
  climate: ['..XXX...', '..X.X...', '..X.X...', '..X.X...', '.XX.XX..', '.X.X.X..', '.XX.XX..', '..XXX...'],
  scold: ['...XX...', '...XX...', '...XX...', '...XX...', '...XX...', '........', '...XX...', '...XX...'],
  // crossed swords with hilts
  battle: ['X......X', '.X....X.', '..X..X..', '...XX...', '..XXXX..', '.XX..XX.', 'XX....XX', 'X......X'],
  stats: ['.......X', '.......X', '....X..X', '....X..X', '.X..X..X', '.X..X..X', '.X..X..X', 'XXXXXXXX'],
};
export const ICON_ORDER = ['feed', 'light', 'play', 'train', 'medicine', 'clean', 'climate', 'scold', 'battle', 'stats'] as const;
export const ICON_LABELS = ['FEED', 'LIGHT', 'PLAY', 'TRAIN', 'MEDICINE', 'CLEAN', 'CLIMATE', 'SCOLD', 'BATTLE', 'STATS'];
/** What each icon does; shown when the icon is held down. */
export const ICON_HELP = [
  'FEED: meal or snack. Fills hunger.',
  'LIGHT: turn the lights off so it can sleep.',
  'PLAY: mini-games. Makes it happy.',
  'TRAIN: exercise. Gets stronger, burns weight.',
  'MEDICINE: cures a sick pet.',
  'CLEAN: wipe up the poop.',
  'CLIMATE: fix hot or cold.',
  'SCOLD: only when it is being naughty.',
  'BATTLE: fight for wins.',
  'STATS: hunger, mood and growth.',
];

/** Square framebuffer (n x n) of layer codes: 0 is unlit, any other value is a lit pixel tagged with its layer. */
export class Buf {
  readonly n: number;
  px: Uint8Array;
  /** layer written when a draw call gives none (INK unless inside `as`) */
  cur: number = Layer.INK;
  constructor(n: number = GRID) {
    if (n !== GRID_TRAD && n !== GRID_TECH) throw new Error(`Buf: unsupported grid ${n} (use gridFor(look))`);
    this.n = n; this.px = new Uint8Array(n * n);
  }
  /** A buffer sized for a look. */
  static forLook(look: Look | undefined | null) { return new Buf(gridFor(look)); }
  /** Logic units (64-space) to this buffer's cells. */
  g(v: number) { return toGrid(v, this.n); }
  /** Copy another buffer of the SAME size over this one (lit pixels only); mixing sizes is an error. */
  blit(src: Buf) {
    if (src.n !== this.n) throw new Error(`Buf.blit: size mismatch ${src.n} vs ${this.n}`);
    for (let i = 0; i < src.px.length; i++) if (src.px[i]) this.px[i] = src.px[i];
  }
  /** Nearest-neighbour 3/2 upscale of a 64 buffer into a new 96 buffer (the simple scaled layout; see layout96.ts). */
  upscale96(): Buf {
    if (this.n !== GRID_TRAD) throw new Error('upscale96 needs a 64 buffer');
    const o = new Buf(GRID_TECH);
    for (let y = 0; y < GRID_TECH; y++) {
      const sy = ((y * 2) / 3) | 0;
      for (let x = 0; x < GRID_TECH; x++) o.px[y * GRID_TECH + x] = this.px[sy * GRID_TRAD + (((x * 2) / 3) | 0)];
    }
    return o;
  }
  /** Run `fn` with `layer` as the default layer. */
  as(layer: number, fn: () => void) { const prev = this.cur; this.cur = layer; try { fn(); } finally { this.cur = prev; } }
  /** v: 0 clears, any other value is a layer code (default: the current layer). */
  set(x: number, y: number, v: number = this.cur) { if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] = v; }
  rows(rows: string[], x0: number, y0: number, ink = 'X', layer: number = this.cur) {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) if (r[x] === ink) this.set(x0 + x, y0 + y, layer);
    }
  }
  /** Stamp a pre-computed layer grid (w cells wide) at x0,y0; zero cells are skipped. */
  layers(codes: Uint8Array, w: number, x0: number, y0: number) {
    for (let i = 0; i < codes.length; i++) if (codes[i]) this.set(x0 + (i % w), y0 + ((i / w) | 0), codes[i]);
  }
  /** Same as rows() but every source pixel becomes a k x k block. */
  rowsScaled(rows: string[], x0: number, y0: number, k = 2) {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) if (r[x] === 'X') this.rect(x0 + x * k, y0 + y * k, k, k);
    }
  }
  rect(x0: number, y0: number, w: number, h: number, v: number = this.cur) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v);
  }
  frame(x0: number, y0: number, w: number, h: number) {
    for (let x = x0; x < x0 + w; x++) { this.set(x, y0); this.set(x, y0 + h - 1); }
    for (let y = y0; y < y0 + h; y++) { this.set(x0, y); this.set(x0 + w - 1, y); }
  }
  /** Flip lit and unlit (lit pixels go dark, unlit pixels become ink). */
  invert(x0: number, y0: number, w: number, h: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (x >= 0 && y >= 0 && x < this.n && y < this.n) { const v = this.px[y * this.n + x]; this.px[y * this.n + x] = v && (v & LAYER_MASK) < Layer.EYE_FILL ? 0 : Layer.INK; } // eye fills are unlit in Traditional, so they flip to ink like any hole
    }
  }
  /** Mark a pixel as dimmed (lights-off dither): keeps its layer, adds the dim flag. */
  dim(x: number, y: number) { if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] |= DIM_FLAG; }
  text(s: string, x0: number, y0: number, scale = 1) {
    let x = x0;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT['?'];
      for (let y = 0; y < 5; y++) for (let gx = 0; gx < 3; gx++) {
        if (g[y][gx] === 'X') this.rect(x + gx * scale, y0 + y * scale, scale, scale);
      }
      x += 4 * scale;
    }
  }
  /** Text that marquees horizontally when wider than the window. */
  ticker(s: string, y: number, tick: number, x0 = 0, w = this.n) {
    const tw = textWidth(s);
    if (tw <= w) { this.text(s, x0, y); return; }
    const span = tw + 8;
    const off = Math.floor(tick / 2) % span;
    const W = span * 2;
    const wide = new Uint8Array(W * 5);
    const put = (str: string, ox: number) => {
      let x = ox;
      for (const ch of str.toUpperCase()) {
        const g = FONT[ch] ?? FONT['?'];
        for (let yy = 0; yy < 5; yy++) for (let gx = 0; gx < 3; gx++) if (g[yy][gx] === 'X') wide[yy * W + x + gx] = 1;
        x += 4;
      }
    };
    put(s, 0); put(s, span);
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < w; xx++) if (wide[yy * W + off + xx]) this.set(x0 + xx, y + yy);
  }
}

const cellPaths = new Map<number, string>();
export function litPath(px: Uint8Array, n = GRID): string {
  let d = '';
  for (let i = 0; i < px.length; i++) {
    if (px[i]) { const x = i % n, y = (i / n) | 0; d += `M${x + 0.06} ${y + 0.06}h0.88v0.88h-0.88z`; }
  }
  return d;
}
export function allCellsPath(n = GRID): string {
  let d = cellPaths.get(n);
  if (d === undefined) {
    d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) d += `M${x + 0.06} ${y + 0.06}h0.88v0.88h-0.88z`;
    cellPaths.set(n, d);
  }
  return d;
}
