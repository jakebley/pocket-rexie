// Interface chrome at finer pixels (docs/RESOLUTION.md "Interface chrome"): the 5x7 font, 16x16 icons, pixel-drawn box geometry and the text-fit helpers
// for Technicolor, and proof that Traditional's chrome numbers and behaviour did not move.
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { statusLine, newPet } from '../src/core/pet';
import { FONT, ICONS, ICON_HELP, ICON_LABELS, ICON_ORDER, textWidth } from '../src/ui/pixel';
import { FONT5X7 } from '../src/ui/font5x7';
import { ICONS16 } from '../src/ui/icons16';
import { density, fitLinesD, fontPx, textWidthD } from '../src/ui/density';
import { Cell, CORNER_STEPS, boxCells, boxColors, boxPaths, cornerFor } from '../src/ui/chrome96';

declare const require: (m: string) => any; // node types are not installed; this file runs under tsx
declare const __dirname: string;
const fs = require('fs'), path = require('path');
let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T = density('technicolor'), R = density('traditional');

// 1. Traditional is exactly what it was
{
  ok(R.font.id === '3x5' && R.font.w === 3 && R.font.h === 5 && R.font.adv === 4 && R.font.glyphs === FONT, 'Traditional font is the 3x5 table');
  ok(R.icons === ICONS && R.iconSize === 8 && R.iconFill === 0.74 && R.iconRowMin === 48 && R.border === 2 && R.btnMinH === 48 && R.labelPsMax === 2, 'Traditional icons / border / button numbers unchanged');
  ok(R.chrome === 'flat' && R.textScale === 1 && R.cp === 2 && R.corner === 0 && R.bigLabelPs === 5, 'Traditional chrome is flat CSS with textScale 1');
  ok(R.glyphs.gear.size === 8 && R.glyphs.gear.rows.length === 8 && R.glyphs.lock.size === 5 && R.glyphs.tick.size === 7, 'Traditional glyphs keep their 8x8 / 5x5 / 7x7 bitmaps');
  // fitLinesD on the 3x5 font must equal the historical fitLines
  const legacy = (text: string, avail: number, maxPs = 3, minPs = 2) => {
    if (text.includes('\n')) { const lines = text.split('\n').slice(0, 2); return { lines, ps: Math.max(1, Math.min(maxPs, avail / Math.max(...lines.map((l) => textWidth(l))))) }; }
    const one = Math.min(maxPs, avail / textWidth(text));
    if (one >= minPs || text.length < 2) return { lines: [text], ps: Math.max(1, one) };
    const per = Math.max(1, Math.floor((avail / minPs + 1) / 4));
    const lines: string[] = []; let cur = '';
    for (const w of text.split(' ')) { if (cur && (cur + ' ' + w).length > per) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) lines.push(cur);
    return { lines: lines.slice(0, 2), ps: Math.max(1, Math.min(minPs, avail / Math.max(...lines.map((l) => textWidth(l))))) };
  };
  const samples = ['REXIE IS DOING FINE', 'A: next | B: eat | C: back', 'Rexie is being naughty', 'HATCH', 'x', 'Wonderbolt is too warm', 'one\ntwo', 'An egg is warming up', 'B: next page | C: back'];
  let same = true;
  for (const s of samples) for (const avail of [120, 200, 300, 351, 500]) for (const [mx, mn] of [[3, 2], [4.5, 3], [3.75, 2.5]]) {
    const a = fitLinesD(R, s, avail, mx, mn), b = legacy(s, avail, mx, mn);
    if (a.ps !== b.ps || a.lines.join('|') !== b.lines.join('|')) { same = false; console.log('  differs', s, avail, mx, mn, a, b); }
  }
  ok(same, 'Traditional fitLinesD is identical to the historical fitLines (lines and size)');
}

// 2. the 5x7 font
const corpus = new Set<string>();
{
  ok(T.font.id === '5x7' && T.font.w === 5 && T.font.h === 7 && T.font.adv === 6 && T.textScale > 0 && T.textScale < 1, 'Technicolor uses the 5x7 font drawn at a smaller pixel');
  let shape = true, empty = 0, dups = 0;
  const seen = new Map<string, string>();
  for (const [ch, g] of Object.entries(FONT5X7)) {
    if (g.length !== 7 || g.some((r) => r.length !== 5 || /[^X.]/.test(r))) { shape = false; console.log('  bad glyph', ch); }
    const key = g.join('|');
    if (ch !== ' ' && !key.includes('X')) empty++;
    if (ch !== ' ' && seen.has(key)) { dups++; console.log('  duplicate glyph', ch, seen.get(key)); }
    seen.set(key, ch);
  }
  ok(shape, 'every 5x7 glyph is 7 rows of 5 columns of X and .');
  ok(empty === 0 && dups === 0, 'no empty or duplicate 5x7 glyph');
  ok(Object.keys(FONT5X7).length >= Object.keys(FONT).length, `the 5x7 font covers every 3x5 character (${Object.keys(FONT5X7).length} vs ${Object.keys(FONT).length})`);
  for (const ch of Object.keys(FONT)) ok(FONT5X7[ch] !== undefined, `5x7 has '${ch}' (used by 3x5)`);
  // every character the app puts in PixelText: labels, help lines, family and species names, status lines, and the string literals of the UI sources
  const add = (s: string) => { for (const ch of s.toUpperCase()) corpus.add(ch); };
  ICON_LABELS.forEach(add); ICON_HELP.forEach(add); FAMILIES.forEach((f) => add(f.name)); SPECIES.forEach((s) => add(s.name));
  add('POCKET REXIE IT HATCHED! NAME YOUR PET OK SETTINGS CLOSE LOOK PLAY PLUS MORE TRADITIONAL TECHNICOLOR SOUND BEEPS AND TUNES CLASSIC VACATION ON OFF DEVELOPER TOOLS CHOOSE YOUR EGG FREE LOCKED - NEEDS PLUS BACK HATCH A NEW EGG DEV PANEL ABC 0123456789');
  const p = newPet(0, { seed: 1 }); p.name = 'Rexie';
  for (const call of [null, 'hungry', 'bored', 'poop', 'sick', 'naughty', 'hot', 'cold'] as const) { p.call = call as never; add(statusLine(p)); }
  for (const st of ['ghost', 'egg'] as const) { p.stage = st; add(statusLine(p)); }
  const root = path.resolve(__dirname, '..');
  for (const f of ['src/ui/useGame.ts', 'App.tsx', 'src/ui/SettingsSheet.tsx', 'src/ui/ChooseEgg.tsx']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/(?<![\w$])'([A-Za-z][^'\n]{2,60})'/g)) if (!/^[a-z]+$/.test(m[1]) && !/[{}=;]/.test(m[1])) add(m[1].replace(/\$\{[^}]*\}/g, ''));
  }
  const missing = [...corpus].filter((ch) => ch.charCodeAt(0) < 128 && FONT5X7[ch] === undefined);
  ok(missing.length === 0, `every ASCII character the app draws exists in the 5x7 font (${corpus.size} characters scanned${missing.length ? '; missing ' + JSON.stringify(missing) : ''})`);
  ok(FONT5X7['?'] !== undefined, 'the 5x7 font has the ? fallback');
}

// 3. widths and fitting agree with the metrics
{
  ok(textWidthD(T, '') === 0 && textWidthD(T, 'A') === 5 && textWidthD(T, 'AB') === 11 && textWidthD(T, 'MEDICINE') === 8 * 6 - 1, 'textWidthD uses the active font (5x7: 6 per character minus the gap)');
  ok(textWidthD(R, 'AB') === 7 && textWidthD(R, 'AB') === textWidth('AB'), 'Traditional textWidthD equals pixel.ts textWidth');
  const sentences = ['Rexie is doing fine', 'A: next | B: eat | C: back', 'B: next page | C: back', 'A: family | B: next page | C: back', 'Wonderbolt is being naughty', 'HATCH A NEW EGG', 'Rexie has passed on', 'An egg is warming up', 'Rexie wants to play'];
  const snapFloor = (v: number) => Math.floor(v * 3 + 1e-6) / 3; // a 3x phone
  let widthsOk = true, fewer = 0, total = 0;
  for (const avail of [150, 200, 250, 301, 351, 400]) for (const s of sentences) {
    for (const snap of [undefined, snapFloor]) {
      const r = fitLinesD(T, s, avail, 3, 2, snap);
      const wmax = Math.max(...r.lines.map((l) => textWidthD(T, l) * fontPx(T, r.ps)));
      if (wmax > avail + 0.02 && r.lines.length <= 2 && s.length * 6 * fontPx(T, 1) < avail * 3) { widthsOk = false; console.log('  too wide', s, avail, wmax, r); }
    }
    // a string that fits one line at the Traditional minimum size must still fit in Technicolor
    const t = fitLinesD(R, s, avail, 3, 2), n = fitLinesD(T, s, avail, 3, 2);
    total++;
    if (t.lines.length === 1 && n.lines.length > 1) { fewer++; console.log('  no longer fits one line:', s, avail); }
  }
  ok(widthsOk, 'fitLinesD lines never exceed the available width at the size it returns');
  ok(fewer === 0, `every message that fits on one line in Traditional still does in Technicolor (${total} cases)`);
  // more text fits per line at the same nominal size: characters per line at ps=2
  for (const avail of [200, 300, 351]) {
    const perT = Math.floor((avail / (2 * T.textScale) + 1) / T.font.adv), perR = Math.floor((avail / 2 + 1) / R.font.adv);
    ok(perT >= perR, `at ps 2 and ${avail}pt a line holds ${perT} characters in Technicolor vs ${perR} in Traditional`);
  }
  const wrapped = fitLinesD(T, 'Wonderbolt is being naughty again today friend', 200, 3, 2);
  ok(wrapped.lines.length <= 2, 'long messages wrap to at most two lines');
}

// 4. icons
{
  ok(T.iconSize === 16 && T.icons === ICONS16, 'Technicolor icons are the 16x16 set');
  const seen = new Map<string, string>();
  for (const name of [...ICON_ORDER, 'gear', 'lock', 'tick', 'close']) {
    const rows = ICONS16[name];
    ok(!!rows && rows.length === 16 && rows.every((r) => r.length === 16 && !/[^X.]/.test(r)), `icon ${name} is 16x16`);
    const lit = rows ? rows.join('').split('X').length - 1 : 0;
    ok(lit >= 30 && lit <= 200, `icon ${name} has a sensible amount of ink (${lit})`);
    const key = rows?.join('|') ?? name;
    ok(!seen.has(key), `icon ${name} is distinct${seen.has(key) ? ' (same as ' + seen.get(key) + ')' : ''}`);
    seen.set(key, name);
    if (rows) {
      // touches the edge area reasonably: the icon fills most of its box (not a tiny speck)
      const ys = rows.map((r, y) => (r.includes('X') ? y : -1)).filter((y) => y >= 0), xs = rows.flatMap((r) => [...r].map((c, x) => (c === 'X' ? x : -1))).filter((x) => x >= 0);
      const sy = Math.max(...ys) - Math.min(...ys) + 1, sx = Math.max(...xs) - Math.min(...xs) + 1;
      ok(Math.max(sx, sy) >= 12 && Math.min(sx, sy) >= 5, `icon ${name} fills its box (${sx}x${sy})`);
    }
  }
  for (const name of ICON_ORDER) ok(T.icons[name] !== undefined && R.icons[name].length === 8, `both looks have the ${name} icon`);
  ok(T.glyphs.gear.rows === ICONS16.gear && T.glyphs.lock.size === 16 && T.glyphs.tick.size === 16, 'Technicolor gear / lock / tick are 16x16');
}

// 5. pixel box geometry
{
  for (const r of Object.keys(CORNER_STEPS).map(Number)) {
    const wc = 20, hc = 14;
    const c = boxCells(wc, hc, r);
    const at = (x: number, y: number) => c[y * wc + x];
    const steps = CORNER_STEPS[r];
    let symmetric = true;
    for (let y = 0; y < hc; y++) for (let x = 0; x < wc; x++) {
      const a = at(x, y) === Cell.Out, b = at(wc - 1 - x, y) === Cell.Out, d = at(x, hc - 1 - y) === Cell.Out;
      if (a !== b || a !== d) symmetric = false;
    }
    ok(symmetric, `corner radius ${r}: the outline is symmetric left-right and top-bottom`);
    ok(steps.length === 0 ? at(0, 0) === Cell.Border : at(0, 0) === Cell.Out && at(steps[0], 0) === Cell.Border, `corner radius ${r}: first row starts at its step`);
    ok(at(10, 0) === Cell.Border && at(10, hc - 1) === Cell.Border && at(0, 7) === Cell.Border && at(wc - 1, 7) === Cell.Border, `radius ${r}: straight edges are 1 cell of border`);
    ok(at(10, 7) === Cell.Face, `radius ${r}: the middle is face`);
    ok(at(10, 1) === Cell.Hi && at(1, 7) === Cell.Hi && at(10, hc - 2) === Cell.Sh && at(wc - 2, 7) === Cell.Sh, `radius ${r}: 1-cell highlight top-left, shadow bottom-right`);
    // border is 4-connected all round: every border cell has a border neighbour
    let conn = true;
    for (let y = 0; y < hc; y++) for (let x = 0; x < wc; x++) if (at(x, y) === Cell.Border) {
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < wc && y + dy < hc && at(x + dx, y + dy) === Cell.Border).length;
      if (n < 2) conn = false;
    }
    ok(conn, `radius ${r}: the border is one (8-connected) stepped outline`);
  }
  ok(cornerFor(6, 6, 5) === 2 && cornerFor(40, 40, 9) === 5 && cornerFor(3, 40, 4) === 1, 'cornerFor clamps the radius to the box');
  const tiny = boxCells(3, 3, 5);
  ok(tiny.length === 9 && tiny[4] !== Cell.Out && tiny[0] === Cell.Out, 'a tiny box still has a body and a cut corner');
  const cols = boxColors('raised', '#EAE2CB', '#34384A', false);
  const paths = boxPaths(20, 14, 3, cols);
  ok(paths.length === 4 && paths.every((p) => p.d.length > 0), 'a raised box draws border, face, highlight and shadow');
  ok(boxPaths(20, 14, 3, boxColors('tile', '#EAE2CB', '#34384A', false)).length === 1, 'a tile draws only its border');
  ok(boxColors('down', '#EAE2CB', '#34384A', false).face === '#34384A', 'pressed / selected boxes invert to the ink');
  ok(T.chrome === 'pixel' && T.cp > 0 && T.corner >= 1 && T.cornerBig >= T.corner, 'Technicolor chrome is pixel-drawn with rounded corners');
}

// 6. touch floors
{
  for (const d of [R, T]) ok(d.btnMinH >= 44 && d.iconRowMin >= 44, `${d.look}: buttons and icon rows are at least 44pt (${d.btnMinH}, ${d.iconRowMin})`);
  ok(T.btnMinH === R.btnMinH && T.iconRowMin === R.iconRowMin, 'the finger size does not change with the pixel density');
}

console.log(`chrome96: ${checks - fails}/${checks} ok`);
if (fails) process.exit(1);
