// Procedural pet shading: turns a 1-bit silhouette (32x32 hi-res sprite) into layer codes with dimension: highlight, base,
// ordered-dithered shadow, deep underside, belly, accent tips on extremities, rim light and eye rings. Everything derives from the
// silhouette (plus a small per-family rule table), so all ~400 species are shaded without hand painting.
//
// Invariant: the LIT PIXEL SET never changes: every lit pixel gets a non-zero code; unlit cells stay 0 except eye-hole fills (EYE_FILL,
// EYE_SHINE: Technicolor-only codes that Traditional prints as unlit, like scenery). Traditional mode prints
// every non-zero code as ink, so it stays pixel-identical. Only the code a pixel gets differs from the flat petLayers() split.
import { Layer, type Rows } from './layers';

type Acc = number; // 0 = none, else a Layer.ACCENT* code
interface Style {
  /** lighter underbelly / chest on the lower interior */ belly: boolean;
  /** small specular sheen near the top-left (jellies, bots, shells, spirits) */ sheen: boolean;
  /** accent for tips of protrusions that point up (ears, horns, crests, antennae) */ top: Acc;
  /** ... that point down (feet, paws, legs) */ foot: Acc;
  /** ... that point sideways (tails, fins, arms, wings) */ side: Acc;
}
const A = Layer.ACCENT, D = Layer.ACCENT_DARK, L = Layer.ACCENT_LIGHT;
const STYLE: Record<string, Style> = {
  dino: { belly: true, sheen: false, top: A, foot: D, side: A },
  fox: { belly: true, sheen: false, top: D, foot: D, side: L }, // dark ears and socks, cream tail tip
  fish: { belly: true, sheen: true, top: A, foot: A, side: A }, // fins pick up the accent, pale belly
  bird: { belly: true, sheen: false, top: A, foot: A, side: D },
  cat: { belly: true, sheen: false, top: D, foot: L, side: D }, // white mittens
  spirits: { belly: false, sheen: true, top: L, foot: 0, side: L },
  bunny: { belly: true, sheen: false, top: D, foot: L, side: L }, // cotton tail, pale feet
  dragon: { belly: true, sheen: false, top: L, foot: D, side: A }, // bone horns, dark claws, hot tail tip
  bot: { belly: false, sheen: true, top: A, foot: D, side: D },
  slime: { belly: false, sheen: true, top: L, foot: 0, side: 0 },
  bug: { belly: false, sheen: true, top: D, foot: D, side: A },
};
const DEFAULT_STYLE: Style = { belly: true, sheen: false, top: A, foot: D, side: A };

// tuning
/** how far down the silhouette an eye hole may sit; cats and bots carry spots and vents lower down, so they only look near the head */
const EYE_FRAC: Record<string, number> = { cat: 0.5, bot: 0.5 };
const R_MAX = 7;
const T_HI = 0.42, T_SH = 0.5, T_DITHER = 0.28;
const VBIAS = 0.22;

/** Flood the unlit cells connected to the grid edge (the outside), 4-connected. */
function exterior(on: Uint8Array, w: number, h: number): Uint8Array {
  const ext = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => { const i = y * w + x; if (!on[i] && !ext[i]) { ext[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  return ext;
}

/** 4-connected components of the cells where `mask` is set: returns the component id per cell (0 = none) and the cell lists. */
function components(mask: Uint8Array, w: number, h: number): { id: Int16Array; list: number[][] } {
  const id = new Int16Array(w * h);
  const list: number[][] = [[]];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || id[s]) continue;
    const c = list.length, cells: number[] = [], stack = [s];
    id[s] = c;
    while (stack.length) {
      const i = stack.pop()!;
      cells.push(i);
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && mask[j] && !id[j]) { id[j] = c; stack.push(j); }
    }
    list.push(cells);
  }
  return { id, list };
}

/** Binary morphology with a square window of radius r (outside the grid counts as unset). */
function erode(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let all = 1;
    for (let dy = -r; dy <= r && all; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx]) { all = 0; break; }
    }
    o[y * w + x] = all;
  }
  return o;
}
function dilate(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) o[yy * w + xx] = 1;
    }
  }
  return o;
}

export function shadedPetLayers(rows: Rows, family?: string): Uint8Array {
  const h = rows.length, w = rows[0]?.length ?? 0, n = w * h;
  const out = new Uint8Array(n);
  if (!n) return out;
  const st = (family && STYLE[family]) || DEFAULT_STYLE;
  const on = new Uint8Array(n);
  let area = 0, ymin = h, ymax = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === 'X') { on[y * w + x] = 1; area++; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  if (!area) return out;
  const isOn = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && on[y * w + x] === 1;
  const ol = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (isOn(x, y) && !(isOn(x - 1, y) && isOn(x + 1, y) && isOn(x, y - 1) && isOn(x, y + 1))) ol[y * w + x] = 1;
  }
  const isOl = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && ol[y * w + x] === 1;
  const ext = exterior(on, w, h);
  const isExt = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || ext[y * w + x] === 1;

  // distance to the outside (holes count as body, so an eye does not carve its own bevel)
  const dist = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (isExt(x, y)) continue;
    let best = R_MAX * R_MAX;
    for (let dy = -R_MAX; dy <= R_MAX; dy++) for (let dx = -R_MAX; dx <= R_MAX; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 < best && isExt(x + dx, y + dy)) best = d2;
    }
    dist[y * w + x] = Math.sqrt(best);
  }
  const cap = area > 520 ? 3.6 : area > 280 ? 3.1 : 2.6;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
  const sm = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += at(x + dx, y + dy);
    sm[y * w + x] = Math.min(sum / 9, cap);
  }
  const hh = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : sm[y * w + x]);

  // ---- base shading: light from the top-left ----
  const span = Math.max(1, ymax - ymin);
  const code = (x: number, y: number) => out[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!on[i]) continue;
    if (ol[i]) { out[i] = (isExt(x - 1, y) || isExt(x, y - 1)) ? Layer.RIM : Layer.OUTLINE; continue; }
    const gx = (hh(x + 1, y) - hh(x - 1, y)) / 2, gy = (hh(x, y + 1) - hh(x, y - 1)) / 2;
    const vn = ((y - ymin) / span) * 2 - 1;
    const s = (gx + gy) * 0.7071 - VBIAS * vn;
    if (isOl(x, y + 1) && vn > -0.1) out[i] = Layer.DEEP;
    else if (s >= T_HI) out[i] = Layer.BODY_LIGHT;
    else if (s <= -T_SH) out[i] = Layer.SHADE;
    else if (s <= -T_DITHER) out[i] = ((x + y) & 1) === 0 ? Layer.SHADE : Layer.BODY;
    else out[i] = Layer.BODY;
  }

  // the torso: the silhouette opened by a 5x5 window (thin ears, legs, tails and necks fall away)
  const filled = new Uint8Array(n);
  for (let i = 0; i < n; i++) filled[i] = on[i] || !ext[i] ? 1 : 0;
  const core = dilate(erode(filled, w, h, 2), w, h, 2);
  let cx = 0, cy = 0, cn = 0, cy0 = h, cy1 = -1;
  for (let i = 0; i < n; i++) if (core[i]) { const y = (i / w) | 0; cx += i % w; cy += y; cn++; if (y < cy0) cy0 = y; if (y > cy1) cy1 = y; }

  // ---- belly: lighter lower interior of the torso (inset from the outline), softened by a dithered top edge ----
  if (st.belly && cn > 0) {
    const line = cy0 + (cy1 - cy0) * 0.56;
    const belly = new Uint8Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (on[i] && !ol[i] && core[i] && y >= line && dist[i] >= 2.6 && code(x, y) !== Layer.DEEP) belly[i] = 1;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!belly[i]) continue;
      const edge = !belly[i - w] && y > 0;
      if (edge && ((x + y) & 1) === 1) continue;
      out[i] = Layer.BELLY;
    }
  }

  // ---- sheen: a tiny L-shaped glint on the upper-left of the body ----
  if (st.sheen && area >= 70) {
    let bx = -1, by = -1, bs = 1e9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!on[i] || ol[i] || dist[i] < 2.4) continue;
      const sc = x + y * 1.15;
      if (sc < bs) { bs = sc; bx = x; by = y; }
    }
    if (bx >= 0) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) {
      const x = bx + dx, y = by + dy;
      if (isOn(x, y) && !isOl(x, y)) out[y * w + x] = Layer.GLINT;
    }
  }

  // ---- accents on the tips of thin protrusions (ears, horns, crests, feet, tails) ----
  if (st.top || st.foot || st.side) {
    if (cn > 0) {
      cx /= cn; cy /= cn;
      const prot = new Uint8Array(n);
      for (let i = 0; i < n; i++) prot[i] = on[i] && !core[i] ? 1 : 0;
      // geodesic distance from the core through the protrusion
      const gd = new Int16Array(n);
      let frontier: number[] = [];
      for (let i = 0; i < n; i++) {
        if (!prot[i]) continue;
        const x = i % w, y = (i / w) | 0;
        if ((x > 0 && core[i - 1]) || (x < w - 1 && core[i + 1]) || (y > 0 && core[i - w]) || (y < h - 1 && core[i + w])) { gd[i] = 1; frontier.push(i); }
      }
      while (frontier.length) {
        const next: number[] = [];
        for (const i of frontier) {
          const x = i % w, y = (i / w) | 0;
          for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && prot[j] && !gd[j]) { gd[j] = gd[i] + 1; next.push(j); }
        }
        frontier = next;
      }
      const { list } = components(prot, w, h);
      for (const cells of list) {
        if (cells.length < 5) continue;
        let m = 0;
        for (const i of cells) if (gd[i] > m) m = gd[i];
        if (m < 3) continue;
        const thr = Math.max(2, m - 2); // the last three pixels: a sock, an ear tip, a tail tip
        let tx = 0, ty = 0, tn = 0;
        for (const i of cells) if (gd[i] >= thr) { tx += i % w; ty += (i / w) | 0; tn++; }
        if (!tn) continue;
        const dx = tx / tn - cx, dy = ty / tn - cy;
        const acc = dy < -Math.abs(dx) * 0.7 ? st.top : dy > Math.abs(dx) * 0.7 ? st.foot : st.side;
        if (!acc) continue;
        for (const i of cells) if (gd[i] >= thr && !ol[i]) out[i] = acc;
      }
    }
  }

  // ---- eyes: a small hole in the upper body gets a dark ring and a catch-light at its upper-left ----
  {
    const hole = new Uint8Array(n);
    for (let i = 0; i < n; i++) hole[i] = !on[i] && !ext[i] ? 1 : 0;
    const { list } = components(hole, w, h);
    // eyes are the small holes highest up (a cat's back spots or a bot's vents are lower and stay plain outline)
    const eyes: { cells: number[]; y: number }[] = [];
    for (const cells of list) {
      if (!cells.length || cells.length > 6) continue;
      let sy = 0;
      for (const i of cells) sy += (i / w) | 0;
      const y = sy / cells.length;
      if ((y - ymin) / span <= (EYE_FRAC[family ?? ''] ?? 0.75)) eyes.push({ cells, y });
    }
    // the topmost row of holes is the eyes; three or more in that row is a pattern (spots, vents, windows) and stays open
    const top = eyes.length ? Math.min(...eyes.map((e) => e.y)) : 0;
    const row = eyes.filter((e) => e.y <= top + 2.5);
    if (row.length && row.length <= 2) {
      for (const e of row) {
        let gx = w, gy = h;
        for (const i of e.cells) {
          const x = i % w, y = (i / w) | 0;
          if (x < gx) gx = x;
          if (y < gy) gy = y;
          for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (isOl(ax, ay)) out[ay * w + ax] = Layer.EYE;
        }
        // fill the see-through hole: dark pupil, one bright catch-light at its upper-left (Technicolor-only codes: Traditional leaves the hole unlit)
        let gi = e.cells[0];
        for (const i of e.cells) { out[i] = Layer.EYE_FILL; if ((i % w) + ((i / w) | 0) < (gi % w) + ((gi / w) | 0)) gi = i; }
        if (e.cells.length >= 2) out[gi] = Layer.EYE_SHINE;
        else if (isOn(gx - 1, gy - 1) && !isOl(gx - 1, gy - 1)) out[(gy - 1) * w + gx - 1] = Layer.GLINT;
      }
    }
  }
  return out;
}
