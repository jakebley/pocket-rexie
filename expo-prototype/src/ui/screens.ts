// Pure functions that paint the LCD (64x64 scene and text) for a given game state.
import { dexSizeOf, SPECIES_BY_ID, ageDays, needsAttention, speciesName, type Pet } from '../core/pet';
import { familyIdUnlocked, foodLabels, NO_ENTITLEMENTS, type Entitlements } from '../core/entitlements';
import { FAMILIES, SPECIES } from '../core/speciesData';
import { Layer } from './layers';
import { biomeOf, type Biome } from './biomes';
import { Buf, EGG_SPRITE, GLYPHS, GRID, TEXT_GRID, TOMB_SPRITE, epx, textWidth } from './pixel';
import { initScene, phaseOf, type Phase, type Scene } from './scene';
import { drawScene } from './sceneDraw';

export type Mode = 'home' | 'feed' | 'play' | 'stats' | 'dex' | 'dev';
export interface PlayState {
  round: number; shown: number; won: number;
  phase: 'guess' | 'reveal'; sel: 0 | 1;
  revealed: number | null; correct: boolean | null;
}
export interface Evo { from: string; to: string; until: number }
export interface ScreenCtx {
  pet: Pet; tick: number; mode: Mode; feedSel: number; play: PlayState | null;
  statsPage: number; dexPage: number; evo: Evo | null; scene?: Scene | null;
  /** the family the Dex is showing (default: the pet's own) */
  dexFamily?: string;
  /** what the player may use; gates the locked Dex families */
  ent?: Entitlements;
}
/** Feed menu rows: the three foods are named for the pet's family (Mice / Berries / Fish ...). */
export const feedRows = (family: string) => [...foodLabels(family), 'SNACK', 'CANCEL'];

const spriteOf = (id: string, blink: boolean): string[] | null => {
  const sp = SPECIES_BY_ID[id];
  return sp ? sp.hiFrames[blink && sp.hiFrames[1] ? 1 : 0] : null;
};
const EGG_HI = epx(EGG_SPRITE);
const TOMB_HI = epx(TOMB_SPRITE);

function hearts(b: Buf, n: number, full: string[], empty: string[], x: number, y: number, step = 6, layer: number = Layer.INK) {
  for (let i = 0; i < 4; i++) b.rows(i < n ? full : empty, x + i * step, y, 'X', layer);
}

// ---- text-mode layout (64x64 grid, 16 chars per line) ----
export const LINE_H = 7;
const rowY = (i: number) => 1 + i * LINE_H;
/** Feed menu: title at top, five rows of 10px starting at FEED_TOP. */
export const FEED_TOP = 11;
export const FEED_ROW_H = 10;
/** Play screen option rows (HIGHER / LOWER), in 64-grid cells. */
export const PLAY_ROWS = [{ y: 30, h: 9 }, { y: 41, h: 9 }] as const;

const center = (b: Buf, s: string, y: number, scale = 1) => b.text(s, (b.n - textWidth(s, scale)) >> 1, y, scale);

// ---- stats ----
export const lineStr = (s: string) => s.toUpperCase();
const DETAIL_LINES = 8;
export function detailLines(p: Pet): string[] {
  return [
    lineStr(p.named ? p.name : 'NO NAME'),
    lineStr(speciesName(p)),
    `STAGE ${p.stage}`,
    `MISTAKES ${p.stageMistakes}`,
    `DIET M${p.stageMeat} V${p.stageVeg} P${p.stagePasta}`,
    `TRAINED ${p.stageTrain}`,
    `WINS ${p.wins}/${p.battles}`,
    `SMARTS ${p.smarts}`,
  ].map(lineStr);
}
export function legacyLines(p: Pet): string[] {
  const out = [`GEN ${p.generation}`];
  if (p.legacy.length === 0) out.push('NO LEGACY YET');
  p.legacy.forEach((l, i) => out.push(`#${i + 1} ${l}`));
  return out.map(lineStr);
}
const LEGACY_PER_PAGE = 8;
export const statsPageCount = (p: Pet) => 2 + Math.max(1, Math.ceil(legacyLines(p).length / LEGACY_PER_PAGE));

/** Is this family's Dex open? A pet's own family always is; the rest follow the entitlement. */
export const dexUnlocked = (p: Pet, family: string, ent: Entitlements = NO_ENTITLEMENTS) => family === p.family || familyIdUnlocked(family, ent);
/** Next family in the Dex switcher, wrapping around. */
export function nextDexFamily(current: string): string {
  const i = FAMILIES.findIndex((f) => f.id === current);
  return FAMILIES[(i + 1) % FAMILIES.length].id;
}
export function dexLines(p: Pet, family: string = p.family): string[] {
  const lines: string[] = [];
  for (const stage of ['baby', 'child', 'teen', 'adult', 'ultimate'] as const) {
    lines.push(`-${stage}-`);
    for (const s of SPECIES.filter((x) => x.stage === stage && x.family === family)) lines.push(p.dex.includes(s.id) ? s.name : '???');
  }
  return lines.map(lineStr);
}
const DEX_PER_PAGE = 8;
export const dexPageCount = (p: Pet, family: string = p.family, ent: Entitlements = NO_ENTITLEMENTS) =>
  dexUnlocked(p, family, ent) ? Math.ceil(dexLines(p, family).length / DEX_PER_PAGE) : 1;

function paintDex(b: Buf, p: Pet, page: number, tick: number, family: string, ent: Entitlements) {
  const fam = FAMILIES.find((f) => f.id === family) ?? FAMILIES[0];
  const open = dexUnlocked(p, fam.id, ent);
  const pages = dexPageCount(p, fam.id, ent);
  // the free dino Dex keeps its original header; the other families put their name there
  const label = fam.id === 'dino' ? 'DEX' : fam.name.toUpperCase();
  const total = dexSizeOf(fam.id);
  const head = `${label} ${open ? p.dex.filter((id) => SPECIES_BY_ID[id]?.family === fam.id).length : '?'}/${total}`;
  b.text(head, 1, 1);
  if (!open) b.rows(GLYPHS.lock, textWidth(head) + 3, 1);
  const pg = `${page + 1}/${pages}`;
  b.text(pg, b.n - textWidth(pg) - 1, 1);
  b.rect(0, 7, b.n, 1);
  if (!open) {
    b.rowsScaled(GLYPHS.lock, 24, 18, 3);
    center(b, 'LOCKED', 40);
    center(b, 'NEEDS PLUS', 49);
    return;
  }
  dexLines(p, fam.id).slice(page * DEX_PER_PAGE, (page + 1) * DEX_PER_PAGE).forEach((l, i) => {
    const y = 9 + i * LINE_H;
    if (l.startsWith('-')) { b.text(l, 1, y); b.rect(textWidth(l) + 3, y + 2, b.n - textWidth(l) - 4, 1); }
    else b.ticker(l, y, tick, 5, b.n - 6);
  });
}

function paintStats(b: Buf, ctx: ScreenCtx) {
  const { pet: p, statsPage, tick } = ctx;
  if (statsPage === 0) {
    b.text('HUNGER', 1, 1); hearts(b, p.hunger, GLYPHS.heartFull, GLYPHS.heartEmpty, 1, 8, 7, Layer.HEART);
    b.text('HAPPY', 1, 16); hearts(b, p.happy, GLYPHS.smileFull, GLYPHS.smileEmpty, 1, 23, 7, Layer.SMILE);
    b.text(`DISC ${p.discipline}`, 1, 34);
    b.text(`WEIGHT ${p.weight}G`, 1, 42);
    const d = ageDays(p); const h = Math.floor(((p.lastTick - p.birth) % 86400000) / 3600000);
    b.text(`AGE ${d}D ${h}H`, 1, 50);
  } else if (statsPage === 1) {
    detailLines(p).forEach((l, i) => b.ticker(l, rowY(i), tick, 1, b.n - 2));
  } else {
    const per = LEGACY_PER_PAGE;
    const pg = statsPage - 2;
    b.text('LEGACY', 1, 1);
    legacyLines(p).slice(pg * per, (pg + 1) * per).forEach((l, i) => b.ticker(l, rowY(i + 1), tick, 1, b.n - 2));
  }
}

// ---- play ----
function paintPlay(b: Buf, pl: PlayState) {
  b.text(`ROUND ${pl.round}/5`, 2, 2);
  const w = `WINS ${pl.won}`;
  b.text(w, b.n - textWidth(w) - 2, 2);
  b.rect(0, 9, b.n, 1);
  if (pl.phase === 'guess') {
    b.text(String(pl.shown), 16, 12, 3);
    b.text('?', 39, 12, 3);
  } else {
    b.text(String(pl.shown), 16, 12, 3);
    b.text(String(pl.revealed), 39, 12, 3);
  }
  ['HIGHER', 'LOWER'].forEach((label, i) => {
    const { y, h } = PLAY_ROWS[i];
    b.frame(1, y, b.n - 2, h);
    b.text(label, 14, y + 2);
  });
  const row = PLAY_ROWS[pl.sel];
  b.text('>', 5, row.y + 2);
  b.invert(1, row.y, b.n - 2, row.h);
  if (pl.phase === 'reveal') center(b, pl.correct ? 'YOU WIN' : 'MISSED', 55);
}

// ---- home ----
function paintHome(b: Buf, ctx: ScreenCtx, sc: Scene) {
  const { pet: p, tick } = ctx;
  if (p.stage === 'egg') {
    const wob = [0, 0, -2, 0, 0, 0, 2, 0][tick % 8];
    b.rows(EGG_HI, 16 + wob, 26);
    return;
  }
  drawScene(b, sc, p);
}

function paintGhost(b: Buf, ctx: ScreenCtx) {
  const p = ctx.pet;
  center(b, 'R.I.P.', 2);
  b.rows(TOMB_HI, 16, 10);
  center(b, p.name.toUpperCase().slice(0, 16), 45);
  const cause = (p.causeOfDeath ?? '').toString().toUpperCase();
  if (cause) b.ticker(cause, 54, ctx.tick, 1, b.n - 2);
}

function paintFeed(b: Buf, ctx: ScreenCtx) {
  center(b, 'FEED', 2);
  b.rect(0, 8, b.n, 1);
  feedRows(ctx.pet.family).forEach((r, i) => {
    const top = FEED_TOP + i * FEED_ROW_H;
    b.text(r, 14, top + 2);
    if (i === ctx.feedSel) { b.text('>', 5, top + 2); b.invert(1, top, b.n - 2, FEED_ROW_H - 1); }
  });
}

/** Screens that are text lists use the 64x64 text-mode framebuffer. */
export const isTextMode = (ctx: ScreenCtx) =>
  !(ctx.evo && ctx.evo.until > Date.now()) && ((ctx.pet.stage === 'ghost' && ctx.mode === 'home') || (ctx.mode !== 'home' && ctx.mode !== 'dev'));

/** What the Technicolor renderer needs to paint behind the scene. */
export interface SkyInfo { phase: Phase; rain: boolean; dim: boolean; biome: Biome }
export interface Rendered { buf: Buf; dark: boolean; sky?: SkyInfo }

export function renderScreen(ctx: ScreenCtx): Rendered {
  const { pet: p } = ctx;
  let dark = false;
  if (ctx.evo && ctx.evo.until > Date.now()) {
    const b = new Buf(GRID);
    const showNew = ctx.tick % 2 === 1;
    const sprite = spriteOf(showNew ? ctx.evo.to : ctx.evo.from, false);
    if (sprite) b.rows(sprite, 16, 16);
    if (!showNew) b.invert(0, 0, GRID, GRID);
    return { buf: b, dark };
  }
  if (isTextMode(ctx)) {
    const b = new Buf(TEXT_GRID);
    if (ctx.pet.stage === 'ghost' && ctx.mode === 'home') { paintGhost(b, ctx); return { buf: b, dark }; }
    switch (ctx.mode) {
      case 'feed': paintFeed(b, ctx); break;
      case 'play': if (ctx.play) paintPlay(b, ctx.play); break;
      case 'stats': paintStats(b, ctx); break;
      case 'dex': paintDex(b, p, ctx.dexPage, ctx.tick, ctx.dexFamily ?? p.family, ctx.ent ?? NO_ENTITLEMENTS); break;
    }
    return { buf: b, dark };
  }
  const b = new Buf(GRID);
  const sc = ctx.scene ?? initScene(p, Date.now());
  paintHome(b, ctx, sc);
  if (p.stage === 'egg') return { buf: b, dark };
  return { buf: b, dark, sky: { phase: phaseOf(sc.hour), rain: sc.weather === 'rain', dim: sc.dim, biome: biomeOf(p) } };
}
