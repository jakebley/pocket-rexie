// The native 96x96 Technicolor text screens (src/ui/screens96.ts): every screen renders for all 12 families, text and glyphs stay inside the
// LCD, selection bars and tap rows agree in logic units, the Dex shows thumbnails and silhouettes, Traditional is untouched.
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { SPECIES_BY_ID } from '../src/core/pet';
import { GAME_ENTRIES } from '../src/ui/games/registry';
import { LAYOUT96 } from '../src/ui/layout96';
import { Layer } from '../src/ui/layers';
import { toLogic, type Buf } from '../src/ui/pixel';
import {
  FEED_ROW_H, MENU_ROW_H, MENU_VISIBLE, dexLines, dexPageCount, feedTop, feedRows, menuFirst, menuTop, playMenuRows, renderScreen, scoresPageCount, statsPageCount,
  type ScreenCtx,
} from '../src/ui/screens';
import { conditions, dexRows, thumbRows, trace } from '../src/ui/screens96';
import { PLUS, fixtures, richPet, sessionFor } from './screens96-fixtures';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const lit = (b: Buf) => b.px.reduce((n, v) => n + (v ? 1 : 0), 0);
const count = (b: Buf, x: number, y: number, w: number, h: number, layer: number) => { let n = 0; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((b.px[j * b.n + i] & 0x7f) === layer) n++; return n; };

// 1. every fixture at 96 for all 12 families: renders, right size, not blank, text inside the buffer
{
  let n = 0;
  const t0 = Date.now();
  for (const fam of FAMILIES) {
    for (const fx of fixtures(fam.id)) {
      trace.boxes = []; trace.on = true;
      let r;
      try { r = renderScreen(fx.ctx); } catch (e) { ok(false, `${fam.id}/${fx.name} threw ${(e as Error).message}`); continue; } finally { trace.on = false; }
      n++;
      if (r.buf.n !== 96) { ok(false, `${fam.id}/${fx.name}: buffer is ${r.buf.n}`); }
      if (lit(r.buf) < 20) { ok(false, `${fam.id}/${fx.name}: blank`); }
      for (const bx of trace.boxes) {
        if (bx.x < 0 || bx.y < 0 || bx.x + bx.w > 96 || bx.y + bx.h > 96) { ok(false, `${fam.id}/${fx.name}: ${bx.what} at ${bx.x},${bx.y} ${bx.w}x${bx.h} leaves the screen`); }
      }
    }
  }
  ok(n === 12 * fixtures('fox').length, `rendered ${n} screens`);
  console.log(`  ${n} screens in ${Date.now() - t0}ms (${((Date.now() - t0) / n).toFixed(1)}ms each)`);
}

// 2. awkward pets: egg, baby, ultimate, ghost, a 16-letter name, huge numbers, no legacy, no scores
{
  for (const fam of FAMILIES) {
    const pets = [richPet(fam.id, { stage: 'baby' }), richPet(fam.id, { stage: 'ultimate' }), richPet(fam.id, { stage: 'adult' })];
    const egg = richPet(fam.id); egg.stage = 'egg'; egg.species = ''; pets.push(egg);
    const long = richPet(fam.id); long.name = 'ABCDEFGHIJKLMNOP'; long.weight = 99; long.smarts = 100; long.discipline = 100; long.stageTrain = 99; long.stageWins = 99; long.wins = 999; long.battles = 999; long.legacy = []; pets.push(long);
    const dead = richPet(fam.id); dead.stage = 'ghost'; dead.causeOfDeath = null; pets.push(dead);
    for (const p of pets) for (const mode of ['feed', 'stats', 'dex', 'playmenu', 'scores'] as const) {
      const pages = mode === 'stats' ? statsPageCount(p) : mode === 'dex' ? dexPageCount(p, p.family, PLUS) : 1;
      for (let pg = 0; pg < pages; pg++) {
        const ctx: ScreenCtx = { pet: p, tick: 3, mode, feedSel: 4, statsPage: pg, dexPage: pg, evo: null, look: 'technicolor', ent: PLUS, playSel: 5, scoresPage: pg % scoresPageCount() };
        trace.boxes = []; trace.on = true;
        try { const r = renderScreen(ctx); ok(r.buf.n === 96, `${fam.id}/${p.stage}/${mode}/${pg} size`); } catch (e) { ok(false, `${fam.id}/${p.stage}/${mode}/${pg} threw ${(e as Error).message}`); } finally { trace.on = false; }
        for (const bx of trace.boxes) ok(bx.x >= 0 && bx.y >= 0 && bx.x + bx.w <= 96 && bx.y + bx.h <= 96, `${fam.id}/${p.stage}/${mode}/${pg}: ${bx.what} ${bx.x},${bx.y} ${bx.w}x${bx.h} inside`);
      }
    }
    // a ghost on the home screen and the ready / result of every game
    for (const p of [pets[5], pets[0]]) p.stage === 'ghost' && ok(renderScreen({ pet: p, tick: 0, mode: 'home', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor' }).buf.n === 96, 'ghost renders');
  }
}

// 3. the 5x7 / 3x5 text of one screen fits its lines: longest food labels, game names and results at the real widths
{
  let longestFood = 0;
  for (const f of FAMILIES) for (const r of feedRows(f.id)) longestFood = Math.max(longestFood, r.length);
  ok(longestFood * 6 - 1 + 22 <= 94, `longest feed label (${longestFood} chars) fits beside the glyph`);
  ok(Math.max(...playMenuRows().map((r) => r.length)) * 6 - 1 + 10 <= 94, 'longest play menu label fits');
}

// 4. tap rows: the inverted selection bar of row i is exactly the pixel band the logic-unit tap table maps to row i (both screens, all selections)
{
  const p = richPet('fox');
  const base: ScreenCtx = { pet: p, tick: 0, mode: 'feed', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', ent: PLUS, scores: {} };
  const tapRow = (v: number, top: number, rowH: number, count: number) => { const l = toLogic(v, 96); const i = Math.floor((l - top) / rowH); return l >= top && i < count ? i : -1; };
  for (let sel = 0; sel < 5; sel++) {
    const r = renderScreen({ ...base, feedSel: sel }).buf;
    // x = 93 is empty of text, so the bar is the only lit column
    for (let y = 0; y < 96; y++) {
      const barRow = r.px[y * 96 + 93] !== 0;
      const tapped = tapRow(y + 0.5, feedTop('technicolor'), FEED_ROW_H, 5);
      if (barRow) ok(tapped === sel, `feed sel ${sel}: bar pixel row ${y} is tap row ${tapped}`);
    }
    const bar = Array.from({ length: 96 }, (_, y) => r.px[y * 96 + 93] !== 0).filter(Boolean).length;
    ok(bar >= 13 && bar <= 15, `feed sel ${sel}: bar is ${bar} cells tall`);
  }
  // the pixel centre of every row maps back to the row it paints
  for (let i = 0; i < 5; i++) ok(tapRow(18 + 15 * i + 7, feedTop('technicolor'), FEED_ROW_H, 5) === i, `feed row ${i} centre taps row ${i}`);
  ok(feedTop('traditional') === 11 && menuTop('traditional') === 11 && feedTop(undefined) === 11 && feedTop('technicolor') === 12 && menuTop('technicolor') === 12, 'tap tops: 11 at 64, 12 at 96');
  ok(FEED_ROW_H === 10 && MENU_ROW_H === 10 && ((12 * 3) >> 1) === 18, '10 logic units per row = 15 cells, list starts at cell 18');
  const nrows = playMenuRows().length;
  for (let sel = 0; sel < nrows; sel++) {
    const r = renderScreen({ ...base, mode: 'playmenu', playSel: sel }).buf;
    const first = menuFirst(sel, nrows);
    for (let y = 0; y < 96; y++) {
      if (r.px[y * 96 + 93] === 0) continue;
      const row = tapRow(y + 0.5, menuTop('technicolor'), MENU_ROW_H, MENU_VISIBLE);
      ok(row >= 0 && first + row === sel, `playmenu sel ${sel}: bar pixel row ${y} is tap row ${row} (first ${first})`);
    }
    ok(Array.from({ length: 96 }, (_, y) => r.px[y * 96 + 93] !== 0).filter(Boolean).length >= 13, `playmenu sel ${sel}: selection bar present`);
  }
}

// 5. stats: bars, evolution conditions
{
  const p = richPet('fox');
  const c = conditions(p, { train: 3, disc: 25, mist_max: 1 });
  ok(c.length === 3 && c[0].label === 'TRAIN' && !c[0].met && c[1].met && c[2].met, 'conditions: train 2/3 not met, disc 40>=25 met, mistakes 1 within 0-1');
  ok(conditions(p, {}).length === 0, 'conditions: empty requirement');
  ok(conditions(p, { lead: 'meat' })[0].met && conditions(p, { lead: 'pasta' })[0].text === `MOSTLY ${feedRows('fox')[2]}`, 'conditions: lead food met / named after the family');
  const care = renderScreen({ pet: p, tick: 0, mode: 'stats', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor' }).buf;
  const fullDisc = { ...p, discipline: 100 };
  const care2 = renderScreen({ pet: fullDisc, tick: 0, mode: 'stats', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor' }).buf;
  ok(count(care2, 32, 44, 46, 7, Layer.MAT) > count(care, 32, 44, 46, 7, Layer.MAT) * 2, 'the discipline bar grows with the value');
  ok(count(care, 38, 14, 48, 10, Layer.HEART) > 0 && count(care, 38, 27, 48, 10, Layer.SMILE) > 0, 'hearts and smiles are coloured');
  ok(statsPageCount(p) === 4, 'stats page count unchanged (2 + legacy pages)');
}

// 6. Dex: thumbnails for found forms, silhouettes for locked ones, same line order and page count as the 64 Dex
{
  for (const fam of FAMILIES) {
    const p = richPet(fam.id);
    const rows = dexRows(p, fam.id);
    ok(rows.length === dexLines(p, fam.id).length, `${fam.id}: dexRows has one row per Dex line`);
    ok(rows.every((r, i) => (r.hdr ? dexLines(p, fam.id)[i] === `-${r.hdr}-`.toUpperCase() : dexLines(p, fam.id)[i] === (r.found ? r.sp!.name.toUpperCase() : '???'))), `${fam.id}: Dex rows match the 64 Dex lines`);
    let found = 0, locked = 0, seenThumb = 0, seenSil = 0;
    for (let pg = 0; pg < dexPageCount(p, fam.id, PLUS); pg++) {
      trace.boxes = []; trace.on = true;
      const r = renderScreen({ pet: p, tick: 0, mode: 'dex', feedSel: 0, statsPage: 0, dexPage: pg, dexFamily: fam.id, evo: null, look: 'technicolor', ent: PLUS }).buf;
      trace.on = false;
      const sp = rows.slice(pg * 8, pg * 8 + 8).filter((x) => x.sp);
      found += sp.filter((x) => x.found).length; locked += sp.filter((x) => !x.found).length;
      for (const bx of trace.boxes) {
        if (bx.what === 'thumb') { seenThumb++; ok(count(r, bx.x, bx.y, 24, 24, Layer.INK) > 40, `${fam.id} p${pg}: found thumbnail has ink`); }
        if (bx.what === 'silhouette') { seenSil++; ok(count(r, bx.x, bx.y, 24, 24, Layer.RAIN) > 40 && count(r, bx.x, bx.y, 24, 24, Layer.INK) === 0, `${fam.id} p${pg}: locked form is a RAIN silhouette without ink`); }
      }
    }
    ok(seenThumb === found && seenSil === locked && found > 10 && locked > 5, `${fam.id}: ${found} thumbnails, ${locked} silhouettes on the pages`);
  }
  // every species frame has a sensible 24x24 thumbnail
  let weak = 0;
  for (const s of SPECIES) { const t = thumbRows(s.frames[0]); if (t.length !== 24 || t[0].length !== 24 || t.join('').split('X').length - 1 < 30) weak++; }
  ok(weak === 0, `all ${SPECIES.length} species have a 24x24 thumbnail with enough pixels (${weak} weak)`);
  // locked family: teaser silhouettes, lock, no thumbnails
  const p = richPet('fox');
  trace.boxes = []; trace.on = true;
  const lk = renderScreen({ pet: p, tick: 0, mode: 'dex', feedSel: 0, statsPage: 0, dexPage: 0, dexFamily: 'fish', evo: null, look: 'technicolor' }).buf;
  trace.on = false;
  ok(dexPageCount(p, 'fish') === 1 && trace.boxes.filter((b) => b.what === 'silhouette').length === 4 && !trace.boxes.some((b) => b.what === 'thumb') && lit(lk) > 100, 'a locked family shows four silhouettes and no thumbnails');
}

// 7. scores, ready, result
{
  const p = richPet('bird');
  GAME_ENTRIES.forEach((e, i) => {
    const r = renderScreen({ pet: p, tick: 0, mode: 'scores', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', scoresPage: i, scores: {} }).buf;
    const f = renderScreen({ pet: p, tick: 0, mode: 'scores', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', scoresPage: i, scores: fixtures('bird').find((x) => x.name === 'scores-0')!.ctx.scores }).buf;
    ok(lit(f) > lit(r), `${e.def.id}: scores with entries show more than the empty page (thumbnail, stars)`);
    ok(count(f, 0, 30, 96, 66, Layer.SUN) > 0, `${e.def.id}: rank stars are coloured`);
    const ready = renderScreen({ pet: p, tick: 0, mode: 'game', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', session: sessionFor(p, i, 'ready') }).buf;
    ok(lit(ready) > 300, `${e.def.id}: ready screen`);
    const res = renderScreen({ pet: p, tick: 1, mode: 'game', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', session: sessionFor(p, i, 'result') }).buf;
    ok(lit(res) > 300, `${e.def.id}: result screen`);
  });
  const withoutResult = sessionFor(p, 0, 'ready'); withoutResult.phase = 'result';
  ok(renderScreen({ pet: p, tick: 0, mode: 'game', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor', session: withoutResult }).buf.n === 96, 'a result screen without a result falls back instead of throwing');
}

// 8. evolution flash: both beats, inverted old form
{
  const p = richPet('cat');
  const to = SPECIES.find((s) => s.family === 'cat' && s.stage === 'adult')!.id;
  const evo = { from: p.species, to, until: Date.now() + 1e9 };
  const a = renderScreen({ pet: p, tick: 0, mode: 'home', feedSel: 0, statsPage: 0, dexPage: 0, evo, look: 'technicolor' }).buf;
  const b = renderScreen({ pet: p, tick: 1, mode: 'home', feedSel: 0, statsPage: 0, dexPage: 0, evo, look: 'technicolor' }).buf;
  ok(a.n === 96 && b.n === 96 && lit(a) > 4000 && lit(b) < 2500, 'evolution: the old form flashes inverted, the new one plain');
  ok(!!SPECIES_BY_ID[to], 'evolution target exists');
}

// 9. Traditional is untouched: no layout reaches the 64 screens, and removing the 96 layouts changes nothing there
{
  const saved = { ...LAYOUT96 };
  const fxs = fixtures('fox').map((f) => ({ ...f, ctx: { ...f.ctx, look: undefined as undefined } }));
  const before = fxs.map((f) => renderScreen(f.ctx));
  for (const k of Object.keys(LAYOUT96)) delete (LAYOUT96 as Record<string, unknown>)[k];
  const after = fxs.map((f) => renderScreen(f.ctx));
  Object.assign(LAYOUT96, saved);
  ok(before.every((r, i) => r.buf.n === 64 && r.buf.px.every((v, k) => v === after[i].buf.px[k])), 'Traditional screens do not depend on the 96 layouts');
  const trad = fixtures('fox').map((f) => renderScreen({ ...f.ctx, look: 'traditional' }));
  ok(trad.every((r, i) => r.buf.n === 64 && r.buf.px.every((v, k) => v === before[i].buf.px[k])), "look 'traditional' paints exactly what no look paints");
  ok(Object.keys(saved).length >= 9, 'the 96 layouts are registered');
}

console.log(`screens96: ${checks - fails}/${checks} checks passed`);
if (fails) process.exit(1);
