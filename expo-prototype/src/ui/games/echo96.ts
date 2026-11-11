// ECHO at 96x96: the pet on a ledge shows the pattern in a big speech bubble (the symbol at 3x, 30x30) while the matching pad lights, and nods or
// shrugs at the player's answer. The deck below the ledge is a dark console: pattern dots, pad labels (A, A+B, B, B+C, C) and the pads with the family's
// 10x10 symbols (2x on a wide pad). Pads sit exactly where the logic pad rects are (g96 of padRects), so taps line up.
import { SLOT_NAMES, padRects, roundPoints, type EchoState } from '../../core/minigames/games/echo';
import { themeFor96 } from '../../core/minigames/themes96';
import type { Glyph } from '../../core/minigames/themes';
import { Layer } from '../layers';
import { textWidth, type Buf } from '../pixel';
import { TONE_LAYER } from './common';
import { HUD96_H, drawGlyphFlat96, drawGlyphScaled96, drawPetFit96, g96, panel, roundRect, textHalo } from './common96';
import type { PaintCtx } from './types';

const HEART7 = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const LEDGE = 54;
const DECK = 56;
const BUBBLE = { x: 54, y: 14, w: 40, h: 38 };
const DARK_TONES = new Set(['ink', 'dbrown', 'brown', 'rust', 'blue', 'purple', 'grey', 'red']);
const PAD_Y = g96(47);
const PAD_H = g96(63) - g96(47) - 2;

/** A glyph cut out of a filled pad: light or dark detail depending on the pad tone. */
function punch(b: Buf, gl: Glyph, x: number, y: number, k: number) {
  drawGlyphFlat96(b, gl, x, y, k, DARK_TONES.has(gl.main) ? Layer.DAISY : Layer.CABLE);
}
function label(b: Buf, s: string, cx: number, y: number, layer: number) {
  const w = textWidth(s) - 1;
  b.as(layer, () => b.text(s, Math.round(cx - w / 2), y));
}

function paintDots(b: Buf, s: EchoState, ms: number) {
  const n = s.pattern.length;
  const pitch = 9;
  const x0 = Math.round((96 - ((n - 1) * pitch + 6)) / 2) + (s.retries > 0 ? 5 : 0);
  const done = s.phase === 'show' ? s.shown : s.phase === 'ok' ? n : s.phase === 'input' || s.phase === 'oops' ? s.entered : 0;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pitch;
    const miss = s.phase === 'oops' && i === s.entered && Math.floor(ms / 160) % 2 === 0;
    if (miss) roundRect(b, x, 58, 6, 4, Layer.ALERT);
    else if (i < done) roundRect(b, x, 58, 6, 4, Layer.SPARK);
    else { roundRect(b, x, 58, 6, 4, Layer.PANEL); roundRect(b, x + 1, 59, 4, 2, Layer.CABLE); }
  }
  if (s.retries > 0) b.rows(HEART7, 2, 57, 'X', Layer.HEART);
}

function paintPads(b: Buf, s: EchoState, c: PaintCtx) {
  const syms = themeFor96(c.params.family).symbols;
  const rects = padRects(s.active.length);
  s.active.forEach((slot, i) => {
    const r = rects[i];
    const x = g96(r.x), w = g96(r.x + r.w) - x;
    const gl = syms[slot];
    const lit = s.lit === slot || (s.pressed === slot && !s.wrong);
    const wrong = s.pressed === slot && s.wrong;
    const k = w >= 26 ? 2 : 1;
    if (lit || wrong) {
      panel(b, x, PAD_Y, w, PAD_H, Layer.GLINT, wrong ? Layer.ALERT : TONE_LAYER[gl.main]);
    } else {
      panel(b, x, PAD_Y, w, PAD_H, Layer.PANEL, Layer.DAISY);
    }
    const gx = x + Math.floor((w - 10 * k) / 2), gy = PAD_Y + Math.floor((PAD_H - 10 * k) / 2);
    if (lit || wrong) punch(b, gl, gx, gy, k);
    else {
      drawGlyphScaled96(b, gl, gx, gy, k, true);
      // after a mistake the pad the player should have pressed blinks
      if (s.phase === 'oops' && s.expected === slot && Math.floor(c.ms / 200) % 2 === 0) b.as(Layer.SPARK, () => { b.frame(x, PAD_Y, w, PAD_H); b.frame(x + 1, PAD_Y + 1, w - 2, PAD_H - 2); });
    }
    label(b, slot % 2 === 1 ? SLOT_NAMES[slot].split('').join('+') : SLOT_NAMES[slot], x + w / 2, 65, lit ? Layer.SPARK : Layer.GLINT);
  });
}

function paintBubble(b: Buf, s: EchoState, c: PaintCtx) {
  const { x, y, w, h } = BUBBLE;
  const syms = themeFor96(c.params.family).symbols;
  panel(b, x, y, w, h, Layer.CABLE, Layer.DAISY);
  // the tail towards the pet
  for (let i = 0; i < 4; i++) { b.set(x - 1 - i, y + 20 + i, Layer.CABLE); for (let j = 0; j <= 3 - i; j++) b.set(x - i + j, y + 20 + i, Layer.DAISY); b.set(x - 1 - i, y + 20 + i, Layer.CABLE); }
  b.set(x, y + 20, Layer.DAISY); b.set(x, y + 21, Layer.DAISY); b.set(x, y + 22, Layer.DAISY); b.set(x, y + 23, Layer.DAISY);
  const cx = x + w / 2, cy = y + h / 2;
  const big = (slot: number, flat?: number) => {
    const gl = syms[slot];
    if (flat) drawGlyphFlat96(b, gl, Math.round(cx - 15), Math.round(cy - 15), 3, flat);
    else drawGlyphScaled96(b, gl, Math.round(cx - 15), Math.round(cy - 15), 3, true);
  };
  const text = (str: string, yy: number, layer: number, scale = 1) => {
    const tw = textWidth(str, scale) - scale;
    b.as(layer, () => b.text(str, Math.round(cx - tw / 2), yy, scale));
  };
  switch (s.phase) {
    case 'intro':
      text('ROUND', y + 7, Layer.CABLE);
      text(String(s.round + 1), y + 15, Layer.CABLE, 3);
      if (s.round === 3 || s.round === 6) text('NEW PAD', y + 31, Layer.ALERT);
      break;
    case 'show': if (s.lit >= 0) big(s.lit); break;
    case 'input':
      if (s.pressed >= 0) big(s.pressed, s.wrong ? Layer.ALERT : undefined);
      else text('GO', y + 14, Layer.CABLE, 3);
      break;
    case 'ok': {
      text('GOOD', y + 10, Layer.CABLE, 2);
      const pts = Math.round(roundPoints(s.pattern.length, s.streak - 1) * 10) / 10;
      text(`+${pts}`, y + 24, Layer.LED_A);
      break;
    }
    case 'oops': text(s.mistakes >= 2 ? 'OOPS' : 'AGAIN', y + 14, Layer.ALERT, 2); break;
    case 'end': text(s.won ? 'WOW' : 'OOPS', y + 14, s.won ? Layer.CABLE : Layer.ALERT, 2); break;
  }
}

export function paintEcho96(c: PaintCtx) {
  const { b, pet } = c;
  const s = c.game.state as EchoState;
  // the deck: a dark console below the ledge so the labels and pads read on any biome
  b.rect(0, LEDGE, b.n, 2, Layer.GROUND);
  b.rect(0, LEDGE, b.n, 1, Layer.GRASS);
  b.rect(0, DECK, b.n, b.n - DECK, Layer.CABLE);
  // pet
  const bob = Math.floor(c.ms / 110) % 2;
  let dx = 0, dy = 0, blink = false;
  if (s.mood === 'nod') dy = bob ? 0 : 3;
  else if (s.mood === 'cheer') dy = bob ? -3 : 0;
  else if (s.mood === 'shrug') { dx = bob ? 1 : -1; blink = true; }
  else if (s.mood === 'talk') dy = -1;
  drawPetFit96(b, pet.species, 26, LEDGE - 1, 42, 40, { blink, dx, dy });
  if (s.mood === 'shrug') textHalo(b, '?', 44, 18 + (bob ? 0 : 1), Layer.ALERT, 2);
  if (s.mood === 'cheer') b.as(Layer.SPARK, () => { for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) b.set(46 + ox, HUD96_H + 6 + oy); b.set(7, 24); b.set(6, 24); b.set(8, 24); b.set(7, 23); b.set(7, 25); });
  paintBubble(b, s, c);
  paintDots(b, s, c.ms);
  paintPads(b, s, c);
  // patience bar: shrinks when the player is taking long
  if (s.phase === 'input') {
    const left = 1 - s.idleMs / (s.idleMax + (s.entered === 0 ? 1500 : 0));
    if (left < 0.5) b.as(Layer.ALERT, () => b.rect(0, 94, Math.max(0, Math.round(96 * left)), 2));
  }
}
