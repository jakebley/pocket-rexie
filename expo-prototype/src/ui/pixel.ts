// Pixel art tables + a tiny 32x32 bitmap buffer used by the LCD.
export const GRID = 32;

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
  feed: ['....XXX.', '...XXXXX', '...XXXXX', '...XXXX.', '..XXX...', '.XX.....', 'XXX.....', 'XX......'],
  light: ['..XXXX..', '.X....X.', '.X.XX.X.', '.X.XX.X.', '..X..X..', '..XXXX..', '..XXXX..', '...XX...'],
  play: ['..XXXX..', '.X.XX.X.', 'X..XX..X', 'XXXXXXXX', 'XXXXXXXX', 'X..XX..X', '.X.XX.X.', '..XXXX..'],
  train: ['........', 'X......X', 'XX....XX', 'XXXXXXXX', 'XXXXXXXX', 'XX....XX', 'X......X', '........'],
  medicine: ['..XXXX..', '..XXXX..', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '..XXXX..', '..XXXX..'],
  clean: ['.....XX.', '....XX..', '...XX...', '..XX....', '.XXXX...', 'XXXXXX..', 'XXXXXX..', '.X.X.X..'],
  climate: ['..XXX...', '..X.X...', '..X.X...', '..X.X...', '.XX.XX..', '.X.X.X..', '.XX.XX..', '..XXX...'],
  scold: ['...XX...', '...XX...', '...XX...', '...XX...', '...XX...', '........', '...XX...', '...XX...'],
  battle: ['X......X', 'XX....XX', '.XX..XX.', '..XXXX..', '...XX...', '..XXXX..', '.XX..XX.', 'XX....XX'],
  stats: ['.......X', '.......X', '....X..X', '....X..X', '.X..X..X', '.X..X..X', '.X..X..X', 'XXXXXXXX'],
};
export const ICON_ORDER = ['feed', 'light', 'play', 'train', 'medicine', 'clean', 'climate', 'scold', 'battle', 'stats'] as const;
export const ICON_LABELS = ['FEED', 'LIGHT', 'PLAY', 'TRAIN', 'MEDICINE', 'CLEAN', 'CLIMATE', 'SCOLD', 'BATTLE', 'STATS'];

/** 32x32 on/off bitmap. */
export class Buf {
  px = new Uint8Array(GRID * GRID);
  set(x: number, y: number, v = 1) { if (x >= 0 && y >= 0 && x < GRID && y < GRID) this.px[y * GRID + x] = v; }
  rows(rows: string[], x0: number, y0: number, ink = 'X') {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) if (r[x] === ink) this.set(x0 + x, y0 + y);
    }
  }
  rect(x0: number, y0: number, w: number, h: number, v = 1) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v);
  }
  invert(x0: number, y0: number, w: number, h: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (x >= 0 && y >= 0 && x < GRID && y < GRID) this.px[y * GRID + x] ^= 1;
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
  ticker(s: string, y: number, tick: number, x0 = 1, w = 30) {
    const tw = textWidth(s);
    if (tw <= w) { this.text(s, x0, y); return; }
    if (tw <= GRID) { this.text(s, 0, y); return; }
    const span = tw + 8;
    const off = (Math.floor(tick / 2) % span);
    // render directly into a wide scratch row then copy a window
    const wide = new Uint8Array(span * 2 * 5);
    const W = span * 2;
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

export function litPath(px: Uint8Array): string {
  let d = '';
  for (let i = 0; i < px.length; i++) {
    if (px[i]) { const x = i % GRID, y = (i / GRID) | 0; d += `M${x + 0.06} ${y + 0.06}h0.88v0.88h-0.88z`; }
  }
  return d;
}
export const ALL_CELLS_PATH = (() => {
  let d = '';
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) d += `M${x + 0.06} ${y + 0.06}h0.88v0.88h-0.88z`;
  return d;
})();
