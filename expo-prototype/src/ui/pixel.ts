// Pixel art tables + a tiny square bitmap buffer (32x32 scene, 64x64 text mode) used by the LCD.
export const GRID = 32;
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
};

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
  '>': 'X..|.X.|..X|.X.|X..', '<': '..X|.X.|X..|.X.|..X', '(': '.XX|X..|X..|X..|.XX', ')': 'XX.|..X|..X|..X|XX.',
};
export const FONT: Record<string, string[]> = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, v.split('|')]));
export const textWidth = (s: string, scale = 1) => (s.length === 0 ? 0 : (s.length * 4 - 1) * scale);

// 8x8 menu icons
export const ICONS: Record<string, string[]> = {
  // drumstick: meat knob top-right, bone handle bottom-left
  feed: ['...XXXX.', '..XXXXXX', '..XXXXXX', '..XXXXXX', '...XXXX.', '..XXX...', '.XXX....', 'XX.XX...'],
  // light bulb
  light: ['..XXXX..', '.XXXXXX.', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '...XX...', '..XXXX..', '...XX...'],
  play: ['..XXXX..', '.X.XX.X.', 'X..XX..X', 'XXXXXXXX', 'XXXXXXXX', 'X..XX..X', '.X.XX.X.', '..XXXX..'],
  train: ['........', 'X......X', 'XX....XX', 'XXXXXXXX', 'XXXXXXXX', 'XX....XX', 'X......X', '........'],
  // medical cross
  medicine: ['..XXXX..', '..XXXX..', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '..XXXX..', '..XXXX..'],
  // broom (clean)
  clean: ['......XX', '.....XX.', '....XX..', '...XX...', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'X.X.X.X.'],
  climate: ['..XXX...', '..X.X...', '..X.X...', '..X.X...', '.XX.XX..', '.X.X.X..', '.XX.XX..', '..XXX...'],
  scold: ['...XX...', '...XX...', '...XX...', '...XX...', '...XX...', '........', '...XX...', '...XX...'],
  // crossed swords with hilts
  battle: ['X......X', '.X....X.', '..X..X..', '...XX...', '..XXXX..', '.XX..XX.', 'XX....XX', 'X......X'],
  stats: ['.......X', '.......X', '....X..X', '....X..X', '.X..X..X', '.X..X..X', '.X..X..X', 'XXXXXXXX'],
};
export const ICON_ORDER = ['feed', 'light', 'play', 'train', 'medicine', 'clean', 'climate', 'scold', 'battle', 'stats'] as const;
export const ICON_LABELS = ['FEED', 'LIGHT', 'PLAY', 'TRAIN', 'MEDICINE', 'CLEAN', 'CLIMATE', 'SCOLD', 'BATTLE', 'STATS'];

/** Square on/off bitmap (n x n). */
export class Buf {
  readonly n: number;
  px: Uint8Array;
  constructor(n = GRID) { this.n = n; this.px = new Uint8Array(n * n); }
  set(x: number, y: number, v = 1) { if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] = v; }
  rows(rows: string[], x0: number, y0: number, ink = 'X') {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) if (r[x] === ink) this.set(x0 + x, y0 + y);
    }
  }
  /** Same as rows() but every source pixel becomes a k x k block. */
  rowsScaled(rows: string[], x0: number, y0: number, k = 2) {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) if (r[x] === 'X') this.rect(x0 + x * k, y0 + y * k, k, k);
    }
  }
  rect(x0: number, y0: number, w: number, h: number, v = 1) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v);
  }
  frame(x0: number, y0: number, w: number, h: number) {
    for (let x = x0; x < x0 + w; x++) { this.set(x, y0); this.set(x, y0 + h - 1); }
    for (let y = y0; y < y0 + h; y++) { this.set(x0, y); this.set(x0 + w - 1, y); }
  }
  invert(x0: number, y0: number, w: number, h: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] ^= 1;
    }
  }
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
