// ECHO painter: the pet on a ledge shows the pattern in a speech bubble while the matching pad lights, and nods or shrugs at the player's answer.
// Layout (64 grid): HUD 0-7, stage 8-35 (pet left, bubble right), ledge 36, pattern dots 38-40, pad labels 42-46, pads 47-62, patience bar 63.
// Traditional: one ink. A lit pad is a solid block with the symbol punched out of it; scenery-layer pixels are holes there, so the same code serves both modes.
import { SLOT_NAMES, padRects, roundPoints, type EchoState, echoGame } from '../../core/minigames/games/echo';
import type { Glyph } from '../../core/minigames/themes';
import { Layer } from '../layers';
import type { Buf } from '../pixel';
import { textWidth } from '../pixel';
import { TONE_LAYER, drawGlyphScaled, drawPetFit } from './common';
import { paintEcho96 } from './echo96';
import type { GameEntry, PaintCtx } from './types';

const LEDGE = 36;
const BUBBLE = { x: 37, y: 10, w: 24, h: 24 };
const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
const DARK_TONES = new Set(['ink', 'dbrown', 'brown', 'rust', 'blue', 'purple', 'grey', 'red']);

/** A glyph with its pixels cut out of a filled block: Technicolor draws the cut as a light or dark detail, Traditional as an unlit hole. */
function punchGlyph(b: Buf, gl: Glyph, x: number, y: number, k: number) {
  const layer = DARK_TONES.has(gl.main) ? Layer.DAISY : Layer.CABLE;
  for (let j = 0; j < gl.rows.length; j++) for (let i = 0; i < gl.rows[j].length; i++) {
    if (gl.rows[j][i] !== '.') b.rect(x + i * k, y + j * k, k, k, layer);
  }
}
function centerText(b: Buf, s: string, cx: number, y: number, scale = 1) { b.text(s, Math.round(cx - textWidth(s, scale) / 2), y, scale); }

function paintDots(b: Buf, s: EchoState, ms: number) {
  const n = s.pattern.length;
  const x0 = Math.round((64 - (n * 6 - 2)) / 2) + 2;
  const done = s.phase === 'show' ? s.shown : s.phase === 'ok' ? n : s.phase === 'input' || s.phase === 'oops' ? s.entered : 0;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 6;
    const miss = s.phase === 'oops' && i === s.entered && Math.floor(ms / 160) % 2 === 0;
    if (miss) b.as(Layer.ALERT, () => b.rect(x, 38, 4, 3));
    else if (i < done) b.rect(x, 38, 4, 3, Layer.INK);
    else { b.rect(x, 38, 4, 1, Layer.INK); b.rect(x, 40, 4, 1, Layer.INK); b.set(x, 39, Layer.INK); b.set(x + 3, 39, Layer.INK); }
  }
  if (s.retries > 0) b.rows(HEART, 1, 37, 'X', Layer.HEART);
}

function paintPads(b: Buf, s: EchoState, c: PaintCtx) {
  const syms = c.params.theme.symbols;
  const rects = padRects(s.active.length);
  const k = rects[0].w >= 16 ? 2 : 1;
  s.active.forEach((slot, i) => {
    const r = rects[i];
    const gl = syms[slot];
    const lit = s.lit === slot || (s.pressed === slot && !s.wrong);
    const wrong = s.pressed === slot && s.wrong;
    b.rect(r.x, r.y, r.w, r.h, 0);
    b.as(Layer.INK, () => b.frame(r.x, r.y, r.w, r.h));
    const gx = r.x + Math.floor((r.w - 7 * k) / 2), gy = r.y + Math.floor((r.h - 7 * k) / 2);
    if (lit || wrong) {
      b.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, wrong ? Layer.ALERT : TONE_LAYER[gl.main]);
      punchGlyph(b, gl, gx, gy, k);
    } else {
      drawGlyphScaled(b, gl, gx, gy, k);
      // after a mistake the pad the player should have pressed blinks
      if (s.phase === 'oops' && s.expected === slot && Math.floor(c.ms / 200) % 2 === 0) b.as(Layer.ALERT, () => b.frame(r.x + 1, r.y + 1, r.w - 2, r.h - 2));
    }
    centerText(b, slot % 2 === 1 ? SLOT_NAMES[slot].split('').join('+') : SLOT_NAMES[slot], r.x + r.w / 2, 41);
  });
}

function paintBubble(b: Buf, s: EchoState, c: PaintCtx) {
  const { x, y, w, h } = BUBBLE;
  const syms = c.params.theme.symbols;
  b.rect(x, y, w, h, 0);
  b.as(Layer.INK, () => b.frame(x, y, w, h));
  // the tail towards the pet
  b.set(x - 1, y + 14, Layer.INK); b.set(x - 2, y + 15, Layer.INK); b.rect(x, y + 13, 1, 4, 0); b.set(x - 1, y + 15, 0);
  const cx = x + w / 2;
  const sym = (slot: number, ink?: number) => {
    const gl = syms[slot];
    if (ink) { for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (gl.rows[j][i] !== '.') b.rect(cx - 7 + i * 2, y + 5 + j * 2, 2, 2, ink); } else drawGlyphScaled(b, gl, cx - 7, y + 5, 2);
  };
  switch (s.phase) {
    case 'intro':
      centerText(b, 'RND', cx, y + 4);
      centerText(b, String(s.round + 1), cx, y + 11, 2);
      if (s.round === 3 || s.round === 6) b.as(Layer.SPARK, () => centerText(b, 'NEW', cx, y + 18));
      break;
    case 'show': if (s.lit >= 0) sym(s.lit); break;
    case 'input':
      if (s.pressed >= 0) sym(s.pressed, s.wrong ? Layer.ALERT : undefined);
      else centerText(b, 'GO', cx, y + 8, 2);
      break;
    case 'ok': {
      centerText(b, 'GOOD', cx, y + 7);
      const pts = Math.round(roundPoints(s.pattern.length, s.streak - 1) * 10) / 10;
      b.as(Layer.SPARK, () => centerText(b, `+${pts}`, cx, y + 14));
      break;
    }
    case 'oops': b.as(Layer.ALERT, () => centerText(b, s.mistakes >= 2 ? 'OOPS' : 'AGAIN', cx, y + 9)); break;
    case 'end': centerText(b, s.won ? 'WOW' : 'OOPS', cx, y + 9, 1); break;
  }
}

export function paintEcho(c: PaintCtx) {
  const { b, pet } = c;
  const s = c.game.state as EchoState;
  // the deck: wipe the scenery below the ledge so the labels and pads read on any biome
  b.rect(0, LEDGE, b.n, b.n - LEDGE, 0);
  b.as(Layer.INK, () => b.rect(0, LEDGE, b.n, 1));
  // pet
  const bob = Math.floor(c.ms / 110) % 2;
  let dx = 0, dy = 0, blink = false;
  if (s.mood === 'nod') dy = bob ? 0 : 2;
  else if (s.mood === 'cheer') dy = bob ? -2 : 0;
  else if (s.mood === 'shrug') { dx = bob ? 1 : -1; blink = true; }
  else if (s.mood === 'talk') dy = -1;
  drawPetFit(b, pet.species, 17, LEDGE - 1, 26, 26, { blink, dx, dy });
  if (s.mood === 'shrug') b.as(Layer.ALERT, () => b.text('?', 26, 11 + (bob ? 0 : 1)));
  if (s.mood === 'cheer') b.as(Layer.SPARK, () => { b.set(30, 14); b.set(29, 14); b.set(31, 14); b.set(30, 13); b.set(30, 15); });
  paintBubble(b, s, c);
  paintDots(b, s, c.ms);
  paintPads(b, s, c);
  // patience bar: shrinks when the player is taking long
  if (s.phase === 'input') {
    const left = 1 - s.idleMs / (s.idleMax + (s.entered === 0 ? 1500 : 0));
    if (left < 0.5) b.as(Layer.ALERT, () => b.rect(0, 63, Math.max(0, Math.round(64 * left)), 1));
  }
}

export const entry: GameEntry = {
  def: echoGame, layout: 'field', paint: paintEcho, paint96: paintEcho96,
  hud96: (c) => { const s = c.game.state as EchoState; return { mid: s.streak >= 2 ? `x${s.streak}` : undefined }; },
};
