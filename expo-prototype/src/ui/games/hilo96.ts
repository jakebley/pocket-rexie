// HI-LO at 96x96: a header strip (round, wins, progress), two cards (the number on show and the one to guess, each with the family's token), HIGHER and LOWER
// buttons exactly on the logic tap rows, the result line and a row of five token slots that fill as the pet wins. The rules and the tap rows are the 64 ones.
import { HILO_ROUNDS, HILO_ROWS, type HiLoState } from '../../core/minigames/games/hilo';
import { themeFor96 } from '../../core/minigames/themes96';
import { Layer } from '../layers';
import { textWidth, type Buf } from '../pixel';
import { drawGlyph96, g96, panel, paintHud96, roundRect } from './common96';
import type { PaintCtx } from './types';

const ARROW_UP = ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '..XXX..', '..XXX..'];
const ARROW_DOWN = ['..XXX..', '..XXX..', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

function card(b: Buf, x: number, y: number, w: number, h: number, text: string, border: number, token: ReturnType<typeof themeFor96>['good'][number], ink: number) {
  panel(b, x, y, w, h, border, Layer.DAISY);
  roundRect(b, x + 2, y + 2, w - 4, h - 4, Layer.DAISY);
  const tw = textWidth(text, 4) - 4;
  b.as(ink, () => b.text(text, x + w - tw - 7, y + (h - 20) / 2, 4));
  drawGlyph96(b, token, x + 5, y + (h - 10) / 2, true);
}

export function paintHiLo96(c: PaintCtx) {
  const { b, params } = c;
  const pl = c.game.state as HiLoState;
  const th = themeFor96(params.family);
  const token = th.good[0];
  paintHud96(b, `ROUND ${pl.round}/${HILO_ROUNDS}`, `WINS ${pl.won}`, c.game.progress);
  // the cards
  const reveal = pl.phase === 'reveal';
  const rb = !reveal ? Layer.CABLE : pl.correct ? Layer.LED_A : Layer.ALERT;
  card(b, 5, 15, 40, 27, String(pl.shown), Layer.CABLE, token, Layer.CABLE);
  card(b, 51, 15, 40, 27, reveal ? String(pl.revealed) : '?', rb, token, Layer.CABLE);
  // an arrow between the cards
  b.as(Layer.CABLE, () => { for (let i = 0; i < 4; i++) { b.rect(46 + i, 27 - i, 1, 1 + 2 * i); } });
  // the two choices sit on the logic tap rows
  ['HIGHER', 'LOWER'].forEach((labelText, i) => {
    const { y: ly, h: lh } = HILO_ROWS[i];
    const y = g96(ly), h = g96(ly + lh) - y;
    const sel = pl.sel === i;
    panel(b, 5, y, 86, h, Layer.CABLE, sel ? Layer.CABLE : Layer.DAISY);
    const col = sel ? Layer.DAISY : Layer.CABLE;
    const tw = textWidth(labelText, 2) - 2;
    b.as(col, () => b.text(labelText, 48 - (tw >> 1) + 4, y + ((h - 10) >> 1), 2));
    b.rows(i === 0 ? ARROW_UP : ARROW_DOWN, 12, y + ((h - 6) >> 1), 'X', sel ? Layer.SPARK : (i === 0 ? Layer.LED_A : Layer.ALERT));
    if (sel) b.rows(ARROW_UP.map((_, j) => ['X', 'XX', 'XXX', 'XXXX', 'XXX', 'XX', 'X'][j] ?? ''), 80, y + ((h - 6) >> 1), 'X', Layer.SPARK);
  });
  // the result
  if (reveal) {
    const t = pl.correct ? 'YOU WIN' : 'MISSED';
    const tw = textWidth(t, 2) - 2;
    b.as(Layer.CABLE, () => b.text(t, 48 - (tw >> 1) + 1, 78, 2));
    b.as(pl.correct ? Layer.LED_A : Layer.ALERT, () => b.text(t, 48 - (tw >> 1), 77, 2));
  }
  // one pip per round: gold when won, an empty ring while still to play
  for (let i = 0; i < HILO_ROUNDS; i++) {
    const x = 48 - ((HILO_ROUNDS * 12 - 4) >> 1) + i * 12;
    roundRect(b, x, 89, 8, 6, Layer.CABLE);
    roundRect(b, x + 1, 90, 6, 4, i < pl.won ? Layer.SPARK : Layer.DAISY);
  }
}
