// HI-LO painter: the original screen, pixel for pixel (the golden test cases still cover it), plus the family's token glyph beside the numbers.
import { HILO_ROWS, hiloGame, type HiLoState } from '../../core/minigames/games/hilo';
import type { FamilyTheme } from '../../core/minigames/themes';
import { textWidth, type Buf } from '../pixel';
import { drawGlyph } from './common';
import type { GameEntry, PaintCtx } from './types';

/** The original HI-LO screen; pass a theme to add the family token (the old tests pass none and get the exact original). */
export function paintHiLo(b: Buf, pl: HiLoState, theme?: FamilyTheme) {
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
  if (theme) {
    // the numbers count the family's food: one token before the first number, one after the second
    drawGlyph(b, theme.good[0], 4, 14, false);
    drawGlyph(b, theme.good[0], 53, 14, false);
  }
  ['HIGHER', 'LOWER'].forEach((label, i) => {
    const { y, h } = HILO_ROWS[i];
    b.frame(1, y, b.n - 2, h);
    b.text(label, 14, y + 2);
  });
  const row = HILO_ROWS[pl.sel];
  b.text('>', 5, row.y + 2);
  b.invert(1, row.y, b.n - 2, row.h);
  if (pl.phase === 'reveal') b.text(pl.correct ? 'YOU WIN' : 'MISSED', (b.n - textWidth(pl.correct ? 'YOU WIN' : 'MISSED')) >> 1, 55);
}

export const entry: GameEntry = {
  def: hiloGame,
  layout: 'text',
  paint: (c: PaintCtx) => paintHiLo(c.b, c.game.state as HiLoState, c.params.theme),
};
