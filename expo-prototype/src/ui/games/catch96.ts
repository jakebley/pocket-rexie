// CATCH at 96x96: the family's 10x10 items fall over the finer biome, with a landing mark on the ground under each one, the pet slides underneath
// (walk bob, dizzy stars when stunned, a hop and sparks when it catches something) and little score pops rise from its head.
import { CATCH_GROUND, type CatchState } from '../../core/minigames/games/catch';
import { themeFor96 } from '../../core/minigames/themes96';
import { Layer } from '../layers';
import { FEET96, GROUND96, drawGlyphMark96, drawPetFit96, g96, groundShadow, textHaloC } from './common96';
import type { PaintCtx } from './types';

export function paintCatch96(c: PaintCtx) {
  const { b, params, pet } = c;
  const s = c.game.state as CatchState;
  const th = themeFor96(params.family);
  // landing marks: a short dash on the ground under every falling item, wider the closer it is
  for (const it of s.items) {
    const near = Math.max(0, Math.min(1, (it.y + 3) / CATCH_GROUND));
    const hw = 1 + Math.round(near * 3);
    b.as(it.kind === 'bad' ? Layer.ALERT : Layer.DIRT, () => { for (let i = -hw; i <= hw; i++) b.set(g96(it.x) + i, GROUND96 + 1); });
  }
  // falling items: the 7x7 logic box is 10.5 cells, a 10x10 glyph sits centred in it
  for (const it of s.items) {
    const gl = it.kind === 'bad' ? th.bad[it.glyph % th.bad.length] : it.kind === 'bonus' ? th.bonus : th.good[it.glyph % th.good.length];
    drawGlyphMark96(c.b, gl, g96(it.x) - 5, Math.round(it.y * 1.5 + 0.25), true, it.kind === 'bad' ? 'danger' : it.kind === 'bonus' ? 'prize' : 'none', c.ms);
  }
  // the pet
  const stunned = s.stun > 0;
  const shake = stunned ? (Math.floor(c.ms / 80) % 2 ? 1 : -1) : 0;
  const moving = s.dir !== 0 && !stunned;
  const bob = moving && Math.floor(c.ms / 130) % 2 === 0 ? -1 : 0;
  const hop = s.cheer > 0 ? (Math.floor(c.ms / 110) % 2 === 0 ? -3 : -1) : 0;
  const cx = g96(s.petX);
  groundShadow(b, cx + shake, Math.round(g96(s.petW) / 2));
  const art = drawPetFit96(b, pet.species, cx, FEET96, g96(s.petW), g96(s.petH), { blink: stunned, flip: s.face === -1, dx: shake, dy: bob + hop });
  if (art && stunned) {
    // dizzy stars circling the head
    const a = Math.floor(c.ms / 100) % 4;
    const pts = [[-8, 0], [0, -3], [8, 0], [0, 3]];
    const hx = art.x + (art.w >> 1), hy = art.y - 4;
    for (const k of [0, 2]) { const [dx, dy] = pts[(a + k) % 4]; for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) b.set(hx + dx + ox, hy + dy + oy, Layer.SPARK); }
  } else if (art && s.cheer > 0) {
    // a few sparks fly off the pet
    const k = Math.floor(c.ms / 90) % 3;
    b.as(Layer.SPARK, () => { b.set(art.x - 2 - k, art.y + 4 - k, Layer.SPARK); b.set(art.x + art.w + 1 + k, art.y + 4 - k, Layer.SPARK); b.set(art.x + 2, art.y - 2 - k, Layer.SPARK); b.set(art.x + art.w - 3, art.y - 2 - k, Layer.SPARK); });
  }
  // score pops
  for (const p of s.pops) {
    const txt = p.pts > 0 ? `+${p.pts}` : String(p.pts);
    const y = Math.round(g96(p.y) - p.age / 38);
    textHaloC(b, txt, Math.max(8, Math.min(b.n - 8, g96(p.x))), Math.max(14, y), p.kind === 'bad' ? Layer.ALERT : Layer.SPARK, p.pts >= 3 ? 2 : 1);
  }
}
