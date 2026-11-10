// CATCH painter: family items falling over the biome, the pet sliding underneath, little "+1" pops.
import { CATCH_GROUND, catchGame, type CatchState } from '../../core/minigames/games/catch';
import { Layer } from '../layers';
import { drawGlyphMark, drawPetFit } from './common';
import type { GameEntry, PaintCtx } from './types';

export function paintCatch(c: PaintCtx) {
  const { b, params, pet } = c;
  const s = c.game.state as CatchState;
  const th = params.theme;
  // falling items
  for (const it of s.items) {
    const gl = it.kind === 'bad' ? th.bad[it.glyph % th.bad.length] : it.kind === 'bonus' ? th.bonus : th.good[it.glyph % th.good.length];
    drawGlyphMark(b, gl, it.x - 3, it.y, true, it.kind === 'bad' ? 'danger' : it.kind === 'bonus' ? 'prize' : 'none', c.ms);
  }
  // the pet: stunned pets blink and shake, happy ones hop
  const stunned = s.stun > 0;
  const shake = stunned ? (Math.floor(c.ms / 80) % 2 ? 1 : -1) : 0;
  const hop = s.cheer > 0 && Math.floor(c.ms / 120) % 2 === 0 ? -1 : 0;
  drawPetFit(b, pet.species, s.petX, CATCH_GROUND, s.petW, s.petH, { blink: stunned, flip: s.face === -1, dx: shake, dy: hop });
  // pops
  for (const p of s.pops) {
    const txt = p.pts > 0 ? `+${p.pts}` : String(p.pts);
    const w = txt.length * 4 - 1;
    const x = Math.max(0, Math.min(b.n - w, Math.round(p.x - w / 2)));
    b.rect(x - 1, Math.round(p.y - p.age / 60) - 1, w + 2, 7, 0);
    b.as(p.kind === 'bad' ? Layer.ALERT : Layer.SPARK, () => b.text(txt, x, Math.round(p.y - p.age / 60)));
  }
}

export const entry: GameEntry = { def: catchGame, layout: 'field', paint: paintCatch };
