// Native 96x96 layouts of the Technicolor text screens (docs/RESOLUTION.md, phase 3): feed menu, stats, Dex, play menu, high scores, ready,
// result, ghost and the evolution flash. Registered one line each in layout96.ts (LAYOUT96). Traditional never reaches this file.
//
// Fonts: 's' = the LCD's 3x5 font at scale 1 (dense lists), 'l' = 3x5 at scale 2 (titles, short labels), 'm' = the 5x7 font (finer, used for
// titles and numbers). Tap rows stay in 64-space logic units; the row bands of the lists below are 10 logic units = 15 cells.
import { SPECIES_BY_ID, ageDays, baseWeight, requirementMet, type Pet } from '../core/pet';
import { foodLabels, NO_ENTITLEMENTS } from '../core/entitlements';
import { FAMILIES, SPECIES } from '../core/speciesData';
import type { Requirement, SpeciesDef } from '../core/types';
import { favouriteOf } from '../core/minigames/tuning';
import type { Session } from '../core/minigames/session';
import { rankLabel, RANKS } from '../core/minigames/types';
import { GAME_ENTRIES } from './games/registry';
import { Layer } from './layers';
import { FONT5X7, FONT5X7_ADV } from './font5x7';
import { ART96, G10 } from './art96';
import { Buf, EGG_SPRITE, TOMB_SPRITE, scale3xCached } from './pixel';
import {
  DEX_PER_PAGE, LEGACY_PER_PAGE, MENU_VISIBLE, FEED_TOP96, MENU_TOP96, FEED_ROW_H, MENU_ROW_H, CONDITION_TEXT,
  dexPageCount, dexUnlocked, feedRows, legacyLines, detailLines, menuFirst, playMenuRows, scoresPageCount, statsPageCount,
  type ScreenCtx,
} from './screens';

type Rows = string[];
type Font = 's' | 'm' | 'l';
const N = 96;
const ADV: Record<Font, number> = { s: 4, m: FONT5X7_ADV, l: 8 };
const FH: Record<Font, number> = { s: 5, m: 7, l: 10 };
/** Width in cells of a string in a font (the last blank column is not counted). */
export const textW = (s: string, f: Font) => (s.length === 0 ? 0 : s.length * ADV[f] - (f === 'm' ? 1 : f === 'l' ? 2 : 1));

// ---- bounds trace: tests switch it on to learn where every text, glyph and thumbnail was placed ----
export interface Box { x: number; y: number; w: number; h: number; what: string }
export const trace: { on: boolean; boxes: Box[] } = { on: false, boxes: [] };
const note = (x: number, y: number, w: number, h: number, what: string) => { if (trace.on) trace.boxes.push({ x, y, w, h, what }); };

function glyph5x7(b: Buf, ch: string, x: number, y: number) {
  const g = FONT5X7[ch] ?? FONT5X7['?'];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === 'X') b.set(x + i, y + j);
}
/** Draw text (upper-cased) with its top-left at x,y in a font and optional layer. */
function txt(b: Buf, s: string, x: number, y: number, f: Font = 's', layer?: number) {
  s = s.toUpperCase();
  note(x, y, textW(s, f), FH[f], 'text:' + s);
  const run = () => {
    if (f === 's') b.text(s, x, y, 1);
    else if (f === 'l') b.text(s, x, y, 2);
    else { let px = x; for (const ch of s) { glyph5x7(b, ch, px, y); px += FONT5X7_ADV; } }
  };
  if (layer === undefined) run(); else b.as(layer, run);
}
const txtC = (b: Buf, s: string, y: number, f: Font = 's', layer?: number) => txt(b, s, (N - textW(s, f)) >> 1, y, f, layer);
const txtR = (b: Buf, s: string, xr: number, y: number, f: Font = 's', layer?: number) => txt(b, s, xr - textW(s, f), y, f, layer);
/** The biggest font whose width fits `w` (falls back to the smallest). */
const fit = (s: string, w: number, order: Font[] = ['l', 'm', 's']): Font => order.find((f) => textW(s, f) <= w) ?? 's';
/** Marquee in the 3x5 font inside a window (plain text when it fits). */
function tick3(b: Buf, s: string, x: number, y: number, w: number, tick: number, layer?: number) {
  s = s.toUpperCase();
  note(x, y, Math.min(w, textW(s, 's')), 5, 'ticker:' + s);
  if (layer === undefined) b.ticker(s, y, tick, x, w); else b.as(layer, () => b.ticker(s, y, tick, x, w));
}

const dotted = (b: Buf, y: number, x0 = 0, x1 = N) => { for (let x = x0; x < x1; x += 2) b.set(x, y); };
function stamp(b: Buf, rows: Rows, x: number, y: number, layer: number = Layer.INK) {
  note(x, y, rows[0].length, rows.length, 'glyph');
  b.rows(rows, x, y, 'X', layer);
}
/** Progress bar: 1px frame, filled interior in a layer, optional tick mark at a fraction. */
function bar(b: Buf, x: number, y: number, w: number, h: number, frac: number, layer: number, mark?: number) {
  note(x, y, w, h, 'bar');
  b.frame(x, y, w, h);
  const iw = w - 4, f = Math.max(0, Math.min(1, frac));
  if (f > 0) b.rect(x + 2, y + 2, Math.max(1, Math.round(iw * f)), h - 4, layer);
  if (mark !== undefined) { const mx = x + 2 + Math.round(iw * mark); b.set(mx, y - 1); b.set(mx, y + h); }
}
const TICK_MARK: Rows = ['.....', '....X', '...X.', 'X.X..', '.X...'];
const STAR9: Rows = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XXXXX..', '.XXX.XXX.', '.XX...XX.'];
const outline = (rows: Rows): Rows => rows.map((r, y) => [...r].map((c, x) => {
  if (c !== 'X') return '.';
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (rows[y + dy]?.[x + dx] ?? '.') !== 'X');
  return nb ? 'X' : '.';
}).join(''));
const STAR9_OUT = outline(STAR9);
const STAR5: Rows = ['..X..', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'];
const CROSS9: Rows = ['XX.....XX', 'XXX...XXX', '.XXX.XXX.', '..XXXXX..', '...XXX...', '..XXXXX..', '.XXX.XXX.', 'XXX...XXX', 'XX.....XX'];
const ARROW_UP: Rows = ['..X..', '.XXX.', 'XXXXX'];
const ARROW_DN: Rows = ['XXXXX', '.XXX.', '..X..'];
const LOCK10: Rows = ['..XXXXXX..', '.XX....XX.', '.XX....XX.', '.XX....XX.', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXX..XXXX', 'XXXX..XXXX', 'XXXXXXXXXX', 'XXXXXXXXXX'];

// ---- 24x24 thumbnails: the 48x48 Scale3x pet halved with a 2x2 vote (lit when 2 of 4 are) ----
const thumbCache = new WeakMap<Rows, Rows>();
/** 24x24 ink bitmap of a 16x16 base frame. */
export function thumbRows(frame: Rows): Rows {
  let o = thumbCache.get(frame);
  if (o) return o;
  const big = scale3xCached(frame);
  o = [];
  for (let y = 0; y < 24; y++) {
    let r = '';
    for (let x = 0; x < 24; x++) {
      let n = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (big[y * 2 + j][x * 2 + i] === 'X') n++;
      r += n >= 2 ? 'X' : '.';
    }
    o.push(r);
  }
  thumbCache.set(frame, o);
  return o;
}
/** Draw a species thumbnail: solid ink for a found form, a flat grey-blue silhouette (RAIN tone) for a locked one. */
export function thumb(b: Buf, frame: Rows, x: number, y: number, locked = false) {
  note(x, y, 24, 24, locked ? 'silhouette' : 'thumb');
  const t = thumbRows(frame);
  for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) if (t[j][i] === 'X') b.set(x + i, y + j, locked ? Layer.RAIN : Layer.INK);
}
const frameOf = (id: string): Rows | null => SPECIES_BY_ID[id]?.frames[0] ?? null;
const petFrame = (p: Pet): Rows => (p.stage === 'egg' || !SPECIES_BY_ID[p.species] ? EGG_SPRITE : SPECIES_BY_ID[p.species].frames[0]);

// ---- shared chrome ----
function header(b: Buf, title: string, right?: string) {
  const f: Font = 'm';
  txt(b, title, 3, 2, f);
  if (right) txtR(b, right, N - 3, 4, 's');
  dotted(b, 12);
}
function hearts(b: Buf, n: number, full: Rows, empty: Rows, x: number, y: number, layer: number) {
  for (let i = 0; i < 4; i++) stamp(b, i < n ? full : empty, x + i * 12, y, layer);
}
/** Selected list row: the row band inverted (text painted first). */
const selectBar = (b: Buf, top: number, h: number) => b.invert(1, top, N - 2, h);

// =============== FEED ===============
const FOOD_ART = ['food:meat', 'food:veggie', 'food:pasta', 'food:snack'];
const FOOD_LAYER = [Layer.FOOD_MEAT, Layer.FOOD_VEG, Layer.FOOD_PASTA, Layer.SNACK];
export function paintFeed96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  const p = ctx.pet;
  txt(b, 'FEED', 3, 3, 'm');
  // the pet's hunger, where the title bar has room
  for (let i = 0; i < 4; i++) stamp(b, i < p.hunger ? G10.heartFull : G10.heartEmpty, 45 + i * 12, 1, Layer.HEART);
  dotted(b, 14);
  const rows = feedRows(p.family);
  const f: Font = 'm';
  rows.forEach((r, i) => {
    const top = FEED_TOP96 * 1.5 + i * FEED_ROW_H * 1.5;
    if (i < 4) stamp(b, ART96[FOOD_ART[i]], 4, top + 1, FOOD_LAYER[i]);
    else stamp(b, CROSS9, 6, top + 3);
    txt(b, r, 22, top + ((FEED_ROW_H * 1.5 - 1 - FH[f]) >> 1), f);
    if (i === ctx.feedSel) selectBar(b, top, FEED_ROW_H * 1.5 - 1);
  });
  return b;
}

// =============== PLAY MENU ===============
export function paintPlayMenu96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  const rows = playMenuRows();
  const sel = ctx.playSel ?? 0;
  const first = menuFirst(sel, rows.length);
  txt(b, 'PLAY', 3, 3, 'm');
  txtR(b, `${sel + 1}/${rows.length}`, N - 3, 4, 's');
  dotted(b, 14);
  const fav = favouriteOf(ctx.pet);
  const f: Font = 'm';
  rows.slice(first, first + MENU_VISIBLE).forEach((r, k) => {
    const i = first + k;
    const top = MENU_TOP96 * 1.5 + k * MENU_ROW_H * 1.5;
    const e = GAME_ENTRIES[i];
    txt(b, r, 10, top + ((MENU_ROW_H * 1.5 - 1 - FH[f]) >> 1), f);
    if (e) {
      const best = ctx.scores?.[e.def.id]?.species[ctx.pet.species];
      if (best) txtR(b, String(best.score), N - 5, top + 5, 's');
      if (fav === e.def.id) stamp(b, STAR5, N - 6 - (best ? textW(String(best.score), 's') + 3 : 0) - 5, top + 5, Layer.SUN);
    }
    if (i === sel) { stamp(b, ['X.', 'XX', 'XXX', 'XX', 'X.'].map((s) => s.padEnd(3, '.')), 4, top + 4); selectBar(b, top, MENU_ROW_H * 1.5 - 1); }
  });
  // scroll hints sit in the title bar, left of the counter
  if (first > 0) stamp(b, ARROW_UP, 50, 5);
  if (first + MENU_VISIBLE < rows.length) stamp(b, ARROW_DN, 58, 5);
  return b;
}

// =============== STATS ===============
const LABEL_X = 3;
const BAR_X = 32, BAR_W = 46;
function statRow(b: Buf, label: string, y: number, frac: number, layer: number, value: string, mark?: number) {
  txt(b, label, LABEL_X, y + 1, 's');
  bar(b, BAR_X, y, BAR_W, 7, frac, layer, mark);
  txt(b, value, BAR_X + BAR_W + 4, y + 1, 's');
}

interface Cond { label: string; cur: number; need: number; text?: string; met: boolean }
/** The conditions of one evolution branch, with the pet's progress on each (bars for numbers, ticks for yes / no). */
export function conditions(p: Pet, r: Requirement): Cond[] {
  const out: Cond[] = [];
  if (r.train) out.push({ label: 'TRAIN', cur: p.stageTrain, need: r.train, met: p.stageTrain >= r.train });
  if (r.wins) out.push({ label: 'WINS', cur: p.stageWins, need: r.wins, met: p.stageWins >= r.wins });
  if (r.smarts) out.push({ label: 'SMARTS', cur: p.stageSmarts, need: r.smarts, met: p.stageSmarts >= r.smarts });
  if (r.disc) out.push({ label: 'DISC', cur: p.discipline, need: r.disc, met: p.discipline >= r.disc });
  if (r.mist_min !== undefined || r.mist_max !== undefined) {
    const lo = r.mist_min ?? 0, hi = r.mist_max;
    const rng = hi === undefined ? `${lo}+` : lo === 0 ? `0-${hi}` : `${lo}-${hi}`;
    out.push({ label: 'MIST', cur: p.stageMistakes, need: 0, text: `${p.stageMistakes} OF ${rng}`, met: p.stageMistakes >= lo && p.stageMistakes <= (hi ?? Infinity) });
  }
  if (r.heavy) out.push({ label: 'HEAVY', cur: 0, need: 0, text: 'OVERWEIGHT', met: requirementMet({ heavy: true }, p) });
  if (r.lead) {
    const i = ['meat', 'veggie', 'pasta'].indexOf(r.lead);
    out.push({ label: 'FOOD', cur: 0, need: 0, text: `MOSTLY ${foodLabels(p.family)[i]}`, met: requirementMet({ lead: r.lead }, p) });
  }
  return out;
}

function paintStatsCare(b: Buf, p: Pet) {
  header(b, 'CARE', `1/${statsPageCount(p)}`);
  txt(b, 'HUNGER', LABEL_X, 18, 's'); hearts(b, p.hunger, G10.heartFull, G10.heartEmpty, 38, 14, Layer.HEART);
  txt(b, 'HAPPY', LABEL_X, 31, 's'); hearts(b, p.happy, G10.smileFull, G10.smileEmpty, 38, 27, Layer.SMILE);
  dotted(b, 40);
  const base = baseWeight(p);
  statRow(b, 'DISC', 44, p.discipline / 100, Layer.MAT, String(p.discipline));
  statRow(b, 'WEIGHT', 54, p.weight / (base + 16), Layer.FOOD_PASTA, `${p.weight}G`, (base + 8) / (base + 16));
  statRow(b, 'SMARTS', 64, p.smarts / 100, Layer.WATER_DROP, String(p.smarts));
  dotted(b, 75);
  const d = ageDays(p); const h = Math.floor(((p.lastTick - p.birth) % 86400000) / 3600000);
  txt(b, `AGE ${d}D ${h}H`, LABEL_X, 79, 's');
  txtR(b, `MISTAKES ${p.careMistakes}`, N - 3, 79, 's');
  txt(b, `GEN ${p.generation}`, LABEL_X, 88, 's');
  txtR(b, `${p.wins}/${p.battles} WINS`, N - 3, 88, 's');
}

function paintStatsGrowth(b: Buf, ctx: ScreenCtx) {
  const p = ctx.pet;
  header(b, 'GROWTH', `2/${statsPageCount(p)}`);
  thumb(b, petFrame(p), 3, 15);
  const d = detailLines(p);
  tick3(b, d[0], 31, 16, N - 34, ctx.tick);
  tick3(b, d[1], 31, 24, N - 34, ctx.tick);
  txt(b, d[2], 31, 32, 's');
  dotted(b, 41);
  txt(b, `MIST ${p.stageMistakes}`, 3, 44, 's');
  txt(b, `TRAINED ${p.stageTrain}`, 40, 44, 's');
  txt(b, `WINS ${p.stageWins}`, 3, 52, 's');
  txt(b, `SMARTS ${p.stageSmarts}`, 40, 52, 's');
  // diet: three bars, meat / veggie / pasta
  txt(b, 'DIET', 3, 60, 's');
  const fl = foodLabels(p.family);
  const tot = Math.max(1, p.stageMeat + p.stageVeg + p.stagePasta);
  [[p.stageMeat, Layer.FOOD_MEAT], [p.stageVeg, Layer.FOOD_VEG], [p.stagePasta, Layer.FOOD_PASTA]].forEach(([n, l], i) => {
    const x = 26 + i * 23;
    txt(b, fl[i][0], x, 60, 's');
    bar(b, x + 5, 59, 14, 7, n / tot, l);
  });
  dotted(b, 68);
  const sp = SPECIES_BY_ID[p.species];
  const evos = sp?.evolutions ?? [];
  if (p.stage === 'egg') { txt(b, 'WARMING UP', 3, 74, 's'); return; }
  if (!evos.length) { txt(b, 'FULLY GROWN', 3, 74, 's'); return; }
  const k = Math.floor(ctx.tick / 6) % evos.length;
  const ev = evos[k];
  const found = p.dex.includes(ev.to);
  txt(b, evos.length > 1 ? `NEXT ${k + 1}/${evos.length}` : 'NEXT', 3, 72, 's');
  tick3(b, found ? (SPECIES_BY_ID[ev.to]?.name ?? '???') : '???', 40, 72, N - 43, ctx.tick);
  const cs = conditions(p, ev.req);
  if (!cs.length) txt(b, 'JUST WAIT', 3, 82, 's');
  cs.slice(0, 3).forEach((c, i) => {
    const y = 82 + i * (cs.length > 2 ? 6 : 9) - (cs.length > 2 ? 3 : 0);
    txt(b, c.label, 3, y, 's');
    if (c.text === undefined) {
      bar(b, 34, y - 1, 36, 7, c.cur / c.need, Layer.GRASS);
      txt(b, `${Math.min(c.cur, 99)}/${c.need}`, 73, y, 's');
    } else tick3(b, c.text, 34, y, 52, ctx.tick);
    if (c.met) stamp(b, TICK_MARK, N - 7, y, Layer.GRASS);
  });
}

function paintStatsLegacy(b: Buf, ctx: ScreenCtx) {
  const p = ctx.pet;
  const pg = ctx.statsPage - 2;
  header(b, 'LEGACY', `${ctx.statsPage + 1}/${statsPageCount(p)}`);
  legacyLines(p).slice(pg * LEGACY_PER_PAGE, (pg + 1) * LEGACY_PER_PAGE).forEach((l, i) => {
    const y = 16 + i * 10;
    if (l.startsWith('GEN')) txt(b, l, 3, y, 's');
    else {
      stamp(b, ['.XXX.', 'X.X.X', 'XXXXX', '.XXX.', '.X.X.'], 3, y, Layer.INK);
      tick3(b, l.replace(/^#\d+ /, ''), 11, y, N - 13, ctx.tick);
    }
  });
}

export function paintStats96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  if (ctx.statsPage === 0) paintStatsCare(b, ctx.pet);
  else if (ctx.statsPage === 1) paintStatsGrowth(b, ctx);
  else paintStatsLegacy(b, ctx);
  return b;
}

// =============== DEX ===============
const STAGES = ['baby', 'child', 'teen', 'adult', 'ultimate'] as const;
interface DexRow { hdr?: string; sp?: SpeciesDef; found?: boolean }
/** The Dex lines (same order and count as dexLines) with the species behind each line. */
export function dexRows(p: Pet, family: string): DexRow[] {
  const out: DexRow[] = [];
  for (const stage of STAGES) {
    out.push({ hdr: stage });
    for (const s of SPECIES.filter((x) => x.stage === stage && x.family === family)) out.push({ sp: s, found: p.dex.includes(s.id) });
  }
  return out;
}
const DEX_COLS = 4, DEX_X0 = 0, DEX_Y0 = 16, DEX_PITCH_Y = 31;

export function paintDex96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  const p = ctx.pet;
  const ent = ctx.ent ?? NO_ENTITLEMENTS;
  const fam = FAMILIES.find((f) => f.id === (ctx.dexFamily ?? p.family)) ?? FAMILIES[0];
  const open = dexUnlocked(p, fam.id, ent);
  const pages = dexPageCount(p, fam.id, ent);
  const page = Math.min(ctx.dexPage, pages - 1);
  const label = (fam.id === 'dino' ? 'DEX' : fam.name.toUpperCase()).replace(' AND ', '+');
  const all = SPECIES.filter((s) => s.family === fam.id);
  const count = open ? all.filter((s) => p.dex.includes(s.id)).length : '?';
  const hf: Font = textW(label, 'm') <= 48 ? 'm' : 's';
  txt(b, label, 3, hf === 'm' ? 2 : 4, hf);
  if (!open) stamp(b, GLYPH_LOCK5, 3 + textW(label, hf) + 3, hf === 'm' ? 3 : 4);
  txtR(b, `${count}/${all.length}  ${page + 1}/${pages}`, N - 3, 4, 's');
  dotted(b, 12);
  if (!open) {
    all.filter((s) => s.stage === 'baby' || s.stage === 'child').slice(0, 4).forEach((s, i) => thumb(b, s.frames[0], DEX_X0 + i * 24, 17, true));
    stamp(b, LOCK10, 43, 50, Layer.INK);
    txtC(b, 'LOCKED', 65, 'm');
    txtC(b, 'NEEDS PLUS', 77, 's');
    txtC(b, `${all.length} FORMS`, 86, 's');
    return b;
  }
  const lines = dexRows(p, fam.id).slice(page * DEX_PER_PAGE, (page + 1) * DEX_PER_PAGE).filter((r) => r.sp);
  const stageNo = (s: SpeciesDef) => STAGES.indexOf(s.stage) + 1;
  const foundIdx = lines.map((r, i) => (r.found ? i : -1)).filter((i) => i >= 0);
  const hi = foundIdx.length ? foundIdx[Math.floor(ctx.tick / 3) % foundIdx.length] : -1;
  lines.forEach((r, i) => {
    const cx = DEX_X0 + (i % DEX_COLS) * 24, cy = DEX_Y0 + Math.floor(i / DEX_COLS) * DEX_PITCH_Y;
    const sp = r.sp!;
    thumb(b, sp.frames[0], cx, cy, !r.found);
    // stage pips under the thumbnail (1 = baby ... 5 = ultimate)
    const n = stageNo(sp), w = n * 3 - 1;
    for (let k = 0; k < n; k++) b.rect(cx + ((24 - w) >> 1) + k * 3, cy + 26, 2, 2, Layer.INK);
    if (sp.id === p.species) stamp(b, STAR5, cx + 19, cy - 1, Layer.SUN);
    if (i === hi) {
      // corner brackets around the highlighted form
      for (const [dx, dy, sx, sy] of [[0, 0, 1, 1], [23, 0, -1, 1], [0, 23, 1, -1], [23, 23, -1, -1]] as const) {
        for (let k = 0; k < 4; k++) { b.set(cx + dx + sx * k, cy + dy); b.set(cx + dx, cy + dy + sy * k); }
      }
    }
  });
  dotted(b, 78);
  if (hi >= 0) {
    const sp = lines[hi].sp!;
    txt(b, sp.name, 3, 81, fit(sp.name, 60, ['m', 's']));
    txtR(b, sp.stage, N - 3, 83, 's');
    tick3(b, sp.blurb, 3, 90, N - 6, ctx.tick);
  } else txtC(b, 'NOTHING FOUND YET', 85, 's');
  return b;
}
const GLYPH_LOCK5: Rows = ['.XXX.', 'X...X', 'XXXXX', 'XXXXX', 'XXXXX'];

// =============== HIGH SCORES ===============
function scoreBlock(b: Buf, y: number, label: string, e: { score: number; rank: string; name: string; species: string; speciesName: string } | null | undefined, tick: number) {
  txt(b, label, 3, y, 's');
  const fr = e ? frameOf(e.species) : null;
  if (e) {
    const sc = String(e.score), f = fit(sc, 44, ['l', 'm', 's']);
    txt(b, sc, 3, y + 8, f);
    const n = RANKS.indexOf(e.rank as never);
    const sx = 3 + textW(sc, f) + 5;
    for (let i = 0; i < 3; i++) stamp(b, i < n ? STAR5 : STAR5_OUT, sx + i * 7, y + 8 + ((FH[f] - 5) >> 1), i < n ? Layer.SUN : Layer.INK);
    tick3(b, `${e.name} ${e.speciesName}`, 3, y + 21, 66, tick);
    if (fr) thumb(b, fr, N - 27, y);
  } else {
    txt(b, '--', 3, y + 8, 'l');
    txt(b, 'NO SCORE YET', 3, y + 21, 's');
  }
}
const STAR5_OUT: Rows = ['..X..', '.X.X.', 'X...X', '.X.X.', 'X.X.X'];

export function paintScores96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  const pages = scoresPageCount();
  const pg = Math.min(ctx.scoresPage ?? 0, pages - 1);
  const e = GAME_ENTRIES[pg];
  header(b, 'SCORES', `${pg + 1}/${pages}`);
  if (!e) { txt(b, 'NO GAMES', 3, 16, 's'); return b; }
  txt(b, e.def.name, 3, 17, fit(e.def.name, 56, ['m', 's']));
  txtR(b, e.def.unit, N - 3, 19, 's');
  dotted(b, 28);
  const gs = ctx.scores?.[e.def.id];
  scoreBlock(b, 33, 'ALL PETS', gs?.overall, ctx.tick);
  dotted(b, 62);
  scoreBlock(b, 67, `THIS ${ctx.pet.stage === 'egg' ? 'PET' : 'SPECIES'}`, gs?.species[ctx.pet.species], ctx.tick);
  return b;
}

// =============== READY / RESULT ===============
const gameTitle = (s: Session) => ((s.params.theme.titles as Record<string, string>)[s.def.id] ?? s.def.name).toUpperCase();

export function paintReady96(ctx: ScreenCtx, s: Session): Buf {
  const b = new Buf(N);
  const title = gameTitle(s);
  txtC(b, title, 3, fit(title, 90, ['l', 'm', 's']));
  dotted(b, 14);
  s.def.rules(s.params.theme).slice(0, 3).forEach((l, i) => {
    const t = l.toUpperCase();
    if (textW(t, 'm') <= N) txtC(b, t, 18 + i * 9, 'm'); else tick3(b, t, 3, 19 + i * 9, N - 6, ctx.tick);
  });
  dotted(b, 46);
  // portrait + what to beat
  thumb(b, petFrame(ctx.pet), 3, 50);
  const best = ctx.scores?.[s.def.id]?.species[ctx.pet.species];
  txt(b, best ? `BEST ${best.score}` : 'NO BEST YET', 32, 51, 's');
  let y = 60;
  if (s.params.scoreMul > 1) { stamp(b, STAR5, 32, y, Layer.SUN); txt(b, `FAVE X${s.params.scoreMul}`, 39, y, 's'); y += 8; }
  const cond = CONDITION_TEXT[s.params.tuning.condition];
  if (cond) txt(b, cond, 32, y, 's');
  // rank goals: one, two and three stars
  const th = s.def.thresholds;
  let x = 3;
  [[1, th.bronze], [2, th.silver], [3, th.gold]].forEach(([n, v]) => {
    for (let k = 0; k < n; k++) stamp(b, STAR5, x + k * 6, 78, Layer.SUN);
    const t = String(v);
    txt(b, t, x + n * 6 + 1, 78, 's');
    x += n * 6 + 1 + textW(t, 's') + 6;
  });
  txtC(b, 'B: START', 87, 'm');
  b.invert(1, 85, N - 2, 11);
  return b;
}

export function paintResult96(ctx: ScreenCtx, s: Session): Buf {
  const b = new Buf(N);
  const r = s.result;
  if (!r) return b;
  const title = gameTitle(s);
  txtC(b, title, 3, fit(title, 90, ['m', 's']));
  dotted(b, 12);
  const sc = String(r.score);
  // the score in the 5x7 font at double size
  const bw = sc.length * 12 - 2;
  note((N - bw) >> 1, 16, bw, 14, 'score');
  for (let k = 0; k < sc.length; k++) {
    const g = FONT5X7[sc[k]] ?? FONT5X7['?'];
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === 'X') b.rect(((N - bw) >> 1) + k * 12 + i * 2, 16 + j * 2, 2, 2);
  }
  const n = RANKS.indexOf(r.rank);
  for (let i = 0; i < 3; i++) stamp(b, i < n ? STAR9 : STAR9_OUT, 31 + i * 12, 34, i < n ? Layer.SUN : Layer.INK);
  txtC(b, rankLabel(r.rank), 46, 'm');
  dotted(b, 56);
  b.ticker(r.winLine.toUpperCase(), 59, ctx.tick, 3, N - 6);
  note(3, 59, Math.min(N - 6, textW(r.winLine, 's')), 5, 'winline');
  const rec = r.recordOverall ? 'NEW RECORD!' : r.recordSpecies ? `${r.speciesName.toUpperCase().slice(0, 8)} BEST!` : '';
  if (rec) {
    const w = textW(rec, 'm'), x = (N - w) >> 1;
    txt(b, rec, x, 68, 'm', Layer.SUN);
    if (ctx.tick % 2 === 0) b.invert(x - 2, 66, w + 4, 11);
  }
  r.reward.lines.slice(0, 2).forEach((l, i) => txt(b, l, 3, 80 + i * 8, 's', r.reward.capped ? Layer.ALERT : undefined));
  return b;
}

// =============== GHOST ===============
export function paintGhost96(ctx: ScreenCtx): Buf {
  const b = new Buf(N);
  const p = ctx.pet;
  txtC(b, 'R.I.P.', 3, 'm');
  dotted(b, 12);
  const g = scale3xCached(TOMB_SPRITE);
  note(24, 14, 48, 48, 'tomb');
  b.rows(g, 24, 14);
  // grass tufts and a ground line under the stone
  for (let x = 6; x < 90; x += 2) b.set(x, 60 + ((x >> 1) % 3 === 0 ? 0 : 1));
  const name = p.name.toUpperCase().slice(0, 16);
  txtC(b, name, 67, fit(name, 90, ['m', 's']));
  const cause = (p.causeOfDeath ?? '').toString().toUpperCase();
  if (cause) { const w = Math.min(N - 6, textW(cause, 's')); b.ticker(cause, 78, ctx.tick, (N - w) >> 1, w); note((N - w) >> 1, 78, w, 5, 'cause'); }
  const sp = SPECIES_BY_ID[p.species];
  txtC(b, `${sp ? sp.name.toUpperCase() : 'DINO'} - ${ageDays(p)}D`, 87, 's');
  return b;
}

// =============== EVOLUTION FLASH ===============
export function paintEvo96(ctx: ScreenCtx): Buf | null {
  const evo = ctx.evo;
  if (!evo) return null;
  const b = new Buf(N);
  const showNew = ctx.tick % 2 === 1;
  const sp = SPECIES_BY_ID[showNew ? evo.to : evo.from];
  if (sp) b.rows(scale3xCached(sp.frames[0]), 24, 24);
  // sparkles in the corners, spreading with the flash
  const r = 2 + (ctx.tick % 4);
  for (const [cx, cy] of [[14, 14], [82, 14], [14, 82], [82, 82]]) {
    for (let k = -r; k <= r; k++) { if (Math.abs(k) > 1) { b.set(cx + k, cy, Layer.SPARK); b.set(cx, cy + k, Layer.SPARK); } }
    b.set(cx, cy, Layer.SUN);
  }
  txtC(b, 'EVOLVING', 4, 'm');
  if (!showNew) b.invert(0, 0, N, N);
  return b;
}
