/* eslint-disable @typescript-eslint/no-require-imports */
// The list of playable games. To add a game: write src/core/minigames/games/<id>.ts and src/ui/games/<id>.ts (which exports `entry`),
// then add ONE line in the slot of your branch below. Each branch has its own slot, so parallel branches never touch the same line.
import type { GameEntry } from './types';

// `require` keeps each registration to one line (an import needs its own line above the array, which is where merges collide).
const load = (m: { entry: GameEntry }): GameEntry => m.entry;

export const GAME_ENTRIES: GameEntry[] = [
  load(require('./hilo')),
  load(require('./catch')),
  // ---- slot: DASH ----
  load(require('./dash')),

  // ---- slot: ECHO ----
  load(require('./echo')),

];

export const entryById = (id: string): GameEntry | undefined => GAME_ENTRIES.find((e) => e.def.id === id);
