// Pure functions that paint the 32x32 LCD for a given game state.
import { DEX_SIZE, SPECIES_BY_ID, ageDays, needsAttention, speciesName, type Pet } from '../core/pet';
import { SPECIES } from '../core/speciesData';
import { Buf, EGG_SPRITE, GLYPHS, TOMB_SPRITE, textWidth } from './pixel';

export type Mode = 'home' | 'feed' | 'play' | 'stats' | 'dex' | 'dev';
export interface PlayState {
  round: number; shown: number; won: number;
  phase: 'guess' | 'reveal'; sel: 0 | 1;
  revealed: number | null; correct: boolean | null;
}
export interface Evo { from: string; to: string; until: number }
export interface ScreenCtx {
  pet: Pet; tick: number; mode: Mode; feedSel: number; play: PlayState | null;
  statsPage: number; dexPage: number; evo: Evo | null;
}
export const FEED_ROWS = ['MEAT', 'VEGGIES', 'PASTA', 'SNACK', 'CANCEL'];

const spriteOf = (id: string, blink: boolean): string[] | null => {
  const sp = SPECIES_BY_ID[id];
  return sp ? sp.frames[blink && sp.frames[1] ? 1 : 0] : null;
};

function hearts(b: Buf, n: number, full: string[], empty: string[], x: number, y: number) {
  for (let i = 0; i < 4; i++) b.rows(i < n ? full : empty, x + i * 6, y);
}

// ---- stats ----
export const lineStr = (s: string) => s.toUpperCase();
export function detailLines(p: Pet): string[] {
  const sp = SPECIES_BY_ID[p.species];
  const lines = [
    lineStr(p.named ? p.name : 'NO NAME'),
    lineStr(speciesName(p)),
    `STAGE ${p.stage}`,
    `MISTAKES ${p.stageMistakes}`,
    `MEAT ${p.stageMeat}`, `VEGGIE ${p.stageVeg}`, `PASTA ${p.stagePasta}`,
    `TRAINED ${p.stageTrain}`,
    `WINS ${p.wins}/${p.battles}`,
    `SMARTS ${p.smarts}`,
    `GEN ${p.generation}`,
    `LEGACY ${p.legacy.length}`,
  ];
  if (sp) lines.splice(2, 0, lineStr(sp.blurb));
  p.legacy.forEach((l, i) => lines.push(`#${i + 1} ${l}`));
  return lines.map(lineStr);
}
const LINES_PER_PAGE = 5;
export const statsPageCount = (p: Pet) => 2 + Math.ceil(detailLines(p).length / LINES_PER_PAGE);

export function dexLines(p: Pet): string[] {
  const lines = [`DEX ${p.dex.length}/${DEX_SIZE}`];
  for (const stage of ['baby', 'child', 'teen', 'adult', 'ultimate'] as const) {
    lines.push(`-${stage}-`);
    for (const s of SPECIES.filter((x) => x.stage === stage)) lines.push(p.dex.includes(s.id) ? s.name : '???');
  }
  return lines.map(lineStr);
}
export const dexPageCount = (p: Pet) => Math.ceil(dexLines(p).length / LINES_PER_PAGE);

function paintLines(b: Buf, lines: string[], page: number, tick: number) {
  const slice = lines.slice(page * LINES_PER_PAGE, (page + 1) * LINES_PER_PAGE);
  slice.forEach((l, i) => b.ticker(l, 2 + i * 6, tick));
}

function paintStats(b: Buf, ctx: ScreenCtx) {
  const { pet: p, statsPage, tick } = ctx;
  if (statsPage === 0) {
    b.text('HUNGER', 1, 1); hearts(b, p.hunger, GLYPHS.heartFull, GLYPHS.heartEmpty, 1, 7);
    b.text('HAPPY', 1, 14); hearts(b, p.happy, GLYPHS.smileFull, GLYPHS.smileEmpty, 1, 20);
    b.text(`DISC ${p.discipline}`, 1, 27);
  } else if (statsPage === 1) {
    b.text('WEIGHT', 1, 2); b.text(`${p.weight}G`, 1, 8, 2);
    b.text('AGE', 1, 20);
    const d = ageDays(p); const h = Math.floor(((p.lastTick - p.birth) % 86400000) / 3600000);
    b.text(`${d}D ${h}H`, 1, 26);
  } else {
    paintLines(b, detailLines(p), statsPage - 2, tick);
  }
}

// ---- play ----
function paintPlay(b: Buf, pl: PlayState) {
  b.text(`RND ${pl.round}/5`, 1, 1);
  b.text(`${pl.won}W`, 25, 1);
  if (pl.phase === 'guess') {
    b.text(String(pl.shown), 10, 8, 3);
    const hi = pl.sel === 0;
    b.text('HIGH', 2, 26); b.text('LOW', 19, 26);
    if (hi) b.invert(0, 24, 18, 8); else b.invert(17, 24, 15, 8);
  } else {
    b.text(String(pl.shown), 2, 11, 2);
    b.text(pl.correct ? '>' : 'X', 12, 12);
    b.text(String(pl.revealed), 17, 8, 3);
    const msg = pl.correct ? 'RIGHT!' : 'WRONG!';
    b.text(msg, (32 - textWidth(msg)) >> 1, 26);
  }
}

// ---- home ----
function paintHome(b: Buf, ctx: ScreenCtx) {
  const { pet: p, tick } = ctx;
  const beat = Math.floor(tick / 2);
  const flip = tick % 2;
  if (p.stage === 'ghost') {
    b.rows(TOMB_SPRITE, 8, 9 + (beat % 2 === 0 ? 0 : 0));
    const t = 'R.I.P.';
    b.text(t, (32 - textWidth(t)) >> 1, 2);
    const nm = p.name.toUpperCase().slice(0, 7);
    b.text(nm, (32 - textWidth(nm)) >> 1, 26);
    return;
  }
  if (p.stage === 'egg') {
    const wob = [0, 0, -1, 0, 0, 0, 1, 0][tick % 8];
    b.rows(EGG_SPRITE, 8 + wob, 9);
    return;
  }
  hearts(b, p.hunger, GLYPHS.heartFull, GLYPHS.heartEmpty, 1, 1);
  hearts(b, p.happy, GLYPHS.smileFull, GLYPHS.smileEmpty, 1, 26);
  const blink = p.asleep || beat % 7 === 6;
  const spr = spriteOf(p.species, blink);
  const bob = p.asleep ? beat % 2 : beat % 2;
  if (spr) b.rows(spr, 8, 8 + bob);
  // left column status
  if (p.sick) b.rows(GLYPHS.skull, 1, 8);
  if (p.asleep && flip === 0) b.rows(GLYPHS.zzz, 1, 14);
  else if (p.asleep) b.rows(GLYPHS.zzz, 1, 15);
  if (p.temp >= 2) b.rows(GLYPHS.drop, 1, 20);
  else if (p.temp <= -2) b.rows(GLYPHS.flake, 1, 20);
  // right column
  if (needsAttention(p) && flip === 0) b.rows(GLYPHS.alert, 26, 1);
  for (let i = 0; i < Math.min(3, p.poops); i++) b.rows(GLYPHS.poop, 26, 26 - i * 6);
}

function paintFeed(b: Buf, ctx: ScreenCtx) {
  FEED_ROWS.forEach((r, i) => b.text(r, 3, 2 + i * 6));
  b.invert(0, 1 + ctx.feedSel * 6, 32, 7);
}

export function renderScreen(ctx: ScreenCtx): { buf: Buf; dark: boolean } {
  const b = new Buf();
  const { pet: p } = ctx;
  let dark = false;
  if (ctx.evo && ctx.evo.until > Date.now()) {
    const showNew = ctx.tick % 2 === 1;
    const sprite = spriteOf(showNew ? ctx.evo.to : ctx.evo.from, false);
    if (sprite) b.rows(sprite, 8, 8);
    if (!showNew) b.invert(0, 0, 32, 32);
    return { buf: b, dark };
  }
  switch (ctx.mode) {
    case 'feed': paintFeed(b, ctx); break;
    case 'play': if (ctx.play) paintPlay(b, ctx.play); break;
    case 'stats': paintStats(b, ctx); break;
    case 'dex': paintLines(b, dexLines(p), ctx.dexPage, ctx.tick); break;
    default:
      paintHome(b, ctx);
      dark = p.asleep && !p.lightOn;
  }
  return { buf: b, dark };
}
