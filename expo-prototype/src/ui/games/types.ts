// The UI side of a mini-game: a painter that draws the game's state into the 64x64 layer buffer.
import type { Pet } from '../../core/pet';
import type { GameDef, GameParams, MiniGame } from '../../core/minigames/types';
import type { Buf } from '../pixel';

export interface PaintCtx {
  b: Buf;
  game: MiniGame;
  params: GameParams;
  pet: Pet;
  /** wall-clock ms, for ambient animation only (never for game rules) */
  ms: number;
}
export type Painter = (c: PaintCtx) => void;

export interface GameEntry {
  /** the core definition (rules, thresholds, ...) */
  def: GameDef<any>;
  /**
   * 'field': the generic game screen paints the family biome backdrop and the HUD strip, the painter draws the pet and the items.
   * 'text': the painter owns the whole screen (a text-style layout, like HI-LO).
   */
  layout: 'field' | 'text';
  paint: Painter;
}
