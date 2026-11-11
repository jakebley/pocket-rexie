// Layout of the non-scene screens (feed menu, stats, Dex, play menus, ghost, mini-game text screens ...) on the Technicolor 96x96 LCD.
//
// Phase 1 default: the screen is painted by the existing 64-grid painter (same content, same logic units, same tap rows) into a 64 buffer
// and enlarged 3/2 (nearest neighbour) by `scaledLayout`. A later agent gives a screen a real 96 layout by registering a function in
// LAYOUT96 under the screen's key: it receives the ScreenCtx and returns a 96 Buf (use `Buf.forLook('technicolor')`, 3x5 font at scale 1 or 2,
// `new Buf(96).text(...)`). Return null to fall back to the scaled default. Tap rows (FEED_TOP, MENU_TOP ...) are in 64-space logic units
// and Toy.tsx converts them, so a real layout keeps the same row bands unless it also changes those constants for Technicolor.
import { Buf, GRID_TRAD } from './pixel';
import type { ScreenCtx } from './screens';

/** The screens that use the text-mode framebuffer. */
export type ScreenKey = 'feed' | 'stats' | 'dex' | 'playmenu' | 'scores' | 'ready' | 'result' | 'textgame' | 'ghost' | 'play';

/** Per-screen 96 layouts. Empty in phase 1: every screen uses the scaled 64 layout. */
export const LAYOUT96: Partial<Record<ScreenKey, (ctx: ScreenCtx) => Buf | null>> = {};

/** Paint with a 64 painter and enlarge it to the 96 grid (3/2 nearest neighbour). */
export function scaledLayout(paint64: (b: Buf) => void): Buf {
  const b = new Buf(GRID_TRAD);
  paint64(b);
  return b.upscale96();
}
