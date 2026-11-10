// Pure functions that paint the LCD (64x64 scene and text) for a given game state.
import { dexSizeOf, SPECIES_BY_ID, ageDays, needsAttention, speciesName, type Pet } from '../core/pet';
import { familyIdUnlocked, foodLabels, NO_ENTITLEMENTS, type Entitlements } from '../core/entitlements';
import { FAMILIES, SPECIES } from '../core/speciesData';
import { favouriteOf } from '../core/minigames/tuning';
import type { Session } from '../core/minigames/session';
import type { ScoreData } from '../core/minigames/scores';
import { rankLabel, RANKS } from '../core/minigames/types';
import type { HiLoState } from '../core/minigames/games/hilo';
import { paintField, paintHud, STAR5 } from './games/common';
import { paintHiLo } from './games/hilo';
import { GAME_ENTRIES, entryById } from './games/registry';
import { Layer } from './layers';
import { biomeOf, type Biome } from './biomes';
import { Buf, EGG_SPRITE, GLYPHS, GRID, TEXT_GRID, TOMB_SPRITE, epx, textWidth } from './pixel';
import { initScene, phaseOf, type Phase, type Scene } from './scene';
import { drawScene } from './sceneDraw';

/**
 * 'playmenu': the Play menu; 'game': a mini-game session (ready, playing, result); 'scores': the HIGH SCORES screen.
 * 'play' is the original HI-LO screen driven by `ctx.play`: the app no longer uses it (HI-LO is a mini-game now) but the golden test cases still do.
 */
export type Mode = 'home' | 'feed' | 'play' | 'playmenu' | 'game' | 'scores' | 'stats' | 'dex' | 'dev';
export type PlayState = HiLoState;
export interface Evo { from: string; to: string; until: number }
export interface ScreenCtx {
  pet: Pet; tick: number; mode: Mode; feedSel: number; play?: PlayState | null;
  statsPage: number; dexPage: number; evo: Evo | null; scene?: Scene | null;
  /** Play menu selection, the running mini-game session, the HIGH SCORES page and the saved scores */
  playSel?: number; session?: Session | null; scoresPage?: number; scores?: ScoreData;
  /** wall-clock ms for ambient animation of the game screen (never for rules) */
  ms?: number;
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
/** HI-LO option rows (HIGHER / LOWER), in 64-grid cells. */
export { HILO_ROWS as PLAY_ROWS } from '../core/minigames/games/hilo';
/** Play menu: the registered games, then HIGH SCORES, then CANCEL; at most MENU_VISIBLE rows show at once. */
export const MENU_TOP = 11;
export const MENU_ROW_H = 10;
export const MENU_VISIBLE = 5;
export const playMenuRows = (): string[] => [...GAME_ENTRIES.map((e) => e.def.name), 'HIGH SCORES', 'CANCEL'];
/** First visible row of the Play menu for a selection (the window follows the cursor). */
export const menuFirst = (sel: number, count = playMenuRows().length) => Math.max(0, Math.min(count - MENU_VISIBLE, sel - (MENU_VISIBLE - 1)));
export const scoresPageCount = () => Math.max(1, GAME_ENTRIES.length);

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
function paintPlayMenu(b: Buf, ctx: ScreenCtx) {
  center(b, 'PLAY', 2);
  b.rect(0, 8, b.n, 1);
  const rows = playMenuRows();
  const sel = ctx.playSel ?? 0;
  const first = menuFirst(sel, rows.length);
  const fav = favouriteOf(ctx.pet);
  rows.slice(first, first + MENU_VISIBLE).forEach((r, k) => {
    const i = first + k;
    const top = MENU_TOP + k * MENU_ROW_H;
    b.text(r, 14, top + 2);
    const e = GAME_ENTRIES[i];
    if (e && fav === e.def.id) b.rows(STAR5, 54, top + 2);
    if (i === sel) { b.text('>', 5, top + 2); b.invert(1, top, b.n - 2, MENU_ROW_H - 1); }
  });
  if (first > 0) b.rows(['..X..', '.XXX.'], 29, 9);
  if (first + MENU_VISIBLE < rows.length) b.rows(['.XXX.', '..X..'], 29, 62);
}

const CONDITION_TEXT = { fine: '', heavy: 'A BIT HEAVY', hungry: 'TUMMY GRUMBLES', sick: 'FEELING SICK' } as const;

function paintReady(b: Buf, ctx: ScreenCtx, s: Session) {
  const th = s.params.theme;
  center(b, (th.titles as Record<string, string>)[s.def.id] ?? s.def.name, 2);
  b.rect(0, 8, b.n, 1);
  s.def.rules(th).slice(0, 3).forEach((l, i) => b.ticker(l.toUpperCase(), 11 + i * 7, ctx.tick, 1, b.n - 2));
  let y = 34;
  if (s.params.scoreMul > 1) { b.rows(STAR5, 1, y); b.as(Layer.SPARK, () => b.text(`FAVE X${s.params.scoreMul}`, 8, y)); y += 7; }
  const cond = CONDITION_TEXT[s.params.tuning.condition];
  if (cond) { b.text(cond, 1, y); y += 7; }
  const best = ctx.scores?.[s.def.id]?.species[ctx.pet.species];
  b.text(best ? `BEST ${best.score}` : 'NO BEST YET', 1, 49);
  center(b, 'B: START', 57);
}

function paintResult(b: Buf, ctx: ScreenCtx, s: Session) {
  const r = s.result;
  if (!r) return;
  const th = s.params.theme;
  center(b, (th.titles as Record<string, string>)[s.def.id] ?? s.def.name, 1);
  b.rect(0, 7, b.n, 1);
  const sc = String(r.score);
  b.text(sc, (b.n - textWidth(sc, 3)) >> 1, 10, 3);
  // stars: one per rank step, then the rank
  const n = RANKS.indexOf(r.rank);
  const stars = n * 6 - 1;
  b.as(Layer.SPARK, () => { for (let i = 0; i < n; i++) b.rows(STAR5, ((b.n - stars) >> 1) + i * 6, 26); });
  center(b, rankLabel(r.rank), 32);
  b.ticker(r.winLine.toUpperCase(), 39, ctx.tick, 1, b.n - 2);
  const rec = r.recordOverall ? 'NEW RECORD!' : r.recordSpecies ? `${r.speciesName.toUpperCase().slice(0, 8)} BEST!` : '';
  if (rec) { const w = textWidth(rec); const x = (b.n - w) >> 1; b.as(Layer.SPARK, () => b.text(rec, x, 46)); if (ctx.tick % 2 === 0) b.invert(x - 1, 45, w + 2, 7); }
  r.reward.lines.slice(0, 2).forEach((l, i) => { if (r.reward.capped) b.as(Layer.ALERT, () => b.text(l, 1, 53 + i * 6)); else b.text(l, 1, 53 + i * 6); });
}

function paintScores(b: Buf, ctx: ScreenCtx) {
  const pages = scoresPageCount();
  const pg = Math.min(ctx.scoresPage ?? 0, pages - 1);
  b.text('HIGH SCORES', 1, 1);
  const num = `${pg + 1}/${pages}`;
  b.text(num, b.n - textWidth(num) - 1, 1);
  b.rect(0, 7, b.n, 1);
  const e = GAME_ENTRIES[pg];
  if (!e) { b.text('NO GAMES', 1, 10); return; }
  b.text(e.def.name, 1, 10);
  b.text(e.def.unit, b.n - textWidth(e.def.unit) - 1, 10);
  b.rect(0, 17, b.n, 1);
  const gs = ctx.scores?.[e.def.id];
  const all = gs?.overall, mine = gs?.species[ctx.pet.species];
  b.text('ALL PETS', 1, 20);
  if (all) { b.text(String(all.score), 1, 27, 2); b.ticker(`${all.name} ${all.speciesName}`.toUpperCase(), 38, ctx.tick, 1, b.n - 2); } else b.text('--', 1, 27, 2);
  b.rect(0, 44, b.n, 1);
  b.text(`THIS ${ctx.pet.stage === 'egg' ? 'PET' : 'SPECIES'}`, 1, 47);
  if (mine) b.ticker(`${mine.score} ${mine.name} ${mine.speciesName}`.toUpperCase(), 54, ctx.tick, 1, b.n - 2); else b.text('--', 1, 54);
}

function paintGame(b: Buf, ctx: ScreenCtx, s: Session, entryLayout: 'field' | 'text') {
  const e = entryById(s.def.id);
  if (!e || !s.game) return;
  const c = { b, game: s.game, params: s.params, pet: ctx.pet, ms: ctx.ms ?? Date.now() };
  if (entryLayout === 'field') {
    paintField(b, ctx.pet, c.ms);
    e.paint(c);
    const h = s.game.hud;
    paintHud(b, h.left, h.right, s.game.progress);
    if (s.phase === 'over') {
      const w = textWidth('TIME UP', 2);
      const x = (b.n - w) >> 1;
      b.rect(x - 3, 22, w + 6, 15, 0); b.frame(x - 3, 22, w + 6, 15);
      b.text('TIME UP', x, 26, 2);
    }
  } else e.paint(c);
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
export function isTextMode(ctx: ScreenCtx): boolean {
  if (ctx.evo && ctx.evo.until > Date.now()) return false;
  if (ctx.mode === 'game') {
    const s = ctx.session;
    if (!s) return true;
    return s.phase === 'ready' || s.phase === 'result' || (entryById(s.def.id)?.layout ?? 'text') === 'text';
  }
  return (ctx.pet.stage === 'ghost' && ctx.mode === 'home') || (ctx.mode !== 'home' && ctx.mode !== 'dev');
}

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
      case 'play': if (ctx.play) paintHiLo(b, ctx.play); break;
      case 'playmenu': paintPlayMenu(b, ctx); break;
      case 'scores': paintScores(b, ctx); break;
      case 'game': {
        const sn = ctx.session;
        if (!sn) break;
        if (sn.phase === 'ready') paintReady(b, ctx, sn);
        else if (sn.phase === 'result') paintResult(b, ctx, sn);
        else paintGame(b, ctx, sn, 'text');
        break;
      }
      case 'stats': paintStats(b, ctx); break;
      case 'dex': paintDex(b, p, ctx.dexPage, ctx.tick, ctx.dexFamily ?? p.family, ctx.ent ?? NO_ENTITLEMENTS); break;
    }
    return { buf: b, dark };
  }
  if (ctx.mode === 'game' && ctx.session) {
    const b = new Buf(GRID);
    paintGame(b, ctx, ctx.session, 'field');
    return { buf: b, dark, sky: { phase: 'day', rain: false, dim: false, biome: biomeOf(p) } };
  }
  const b = new Buf(GRID);
  const sc = ctx.scene ?? initScene(p, Date.now());
  paintHome(b, ctx, sc);
  if (p.stage === 'egg') return { buf: b, dark };
  return { buf: b, dark, sky: { phase: phaseOf(sc.hour), rain: sc.weather === 'rain', dim: sc.dim, biome: biomeOf(p) } };
}
