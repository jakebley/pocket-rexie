// Layout of the non-scene screens (feed menu, stats, Dex, play menus, ghost, mini-game text screens ...) on the Technicolor 96x96 LCD.
//
// Phase 1 default: the screen is painted by the existing 64-grid painter (same content, same logic units, same tap rows) into a 64 buffer
// and enlarged 3/2 (nearest neighbour) by `scaledLayout`. A later agent gives a screen a real 96 layout by registering a function in
// LAYOUT96 under the screen's key: it receives the ScreenCtx and returns a 96 Buf (use `Buf.forLook('technicolor')`, 3x5 font at scale 1 or 2,
// `new Buf(96).text(...)`). Return null to fall back to the scaled default. Tap rows (FEED_TOP, MENU_TOP ...) are in 64-space logic units
// and Toy.tsx converts them, so a real layout keeps the same row bands unless it also changes those constants for Technicolor.
import { Buf, GRID_TRAD } from './pixel';
import type { ScreenCtx } from './screens';
import * as S96 from './screens96';

/** The screens that use the text-mode framebuffer. */
export type ScreenKey = 'feed' | 'stats' | 'dex' | 'playmenu' | 'scores' | 'ready' | 'result' | 'textgame' | 'ghost' | 'play' | 'evo';

/** Per-screen 96 layouts (screens96.ts). Screens without an entry ('play' = HI-LO, 'textgame') use the scaled 64 layout. The wrappers look the painter up at call time, so the import cycle with screens.ts is harmless. */
export const LAYOUT96: Partial<Record<ScreenKey, (ctx: ScreenCtx) => Buf | null>> = {
  feed: (c) => S96.paintFeed96(c),
  stats: (c) => S96.paintStats96(c),
  dex: (c) => S96.paintDex96(c),
  playmenu: (c) => S96.paintPlayMenu96(c),
  scores: (c) => S96.paintScores96(c),
  ready: (c) => (c.session ? S96.paintReady96(c, c.session) : null),
  result: (c) => (c.session?.result ? S96.paintResult96(c, c.session) : null),
  ghost: (c) => S96.paintGhost96(c),
  evo: (c) => S96.paintEvo96(c),
};

/** Paint with a 64 painter and enlarge it to the 96 grid (3/2 nearest neighbour). */
export function scaledLayout(paint64: (b: Buf) => void): Buf {
  const b = new Buf(GRID_TRAD);
  paint64(b);
  return b.upscale96();
}
