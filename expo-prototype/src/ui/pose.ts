// Pose derivation shared by the 64 and 96 scene painters (everything comes from the two base sprite frames).
import { TICK_MS, type Scene } from './scene';

export const FRAME_MS = 600;
export const HOP = [0, -6, -8, -6, 0];
export const flipRows = (rows: string[]): string[] => rows.map((r) => [...r].reverse().join(''));

export interface Pose { blink: boolean; dx: number; dy: number; facing: 1 | -1 }

/** Derived poses (logic units, 64-space). */
export function poseOf(s: Scene): Pose {
  const t = s.t;
  const amb = s.still ? 0 : Math.floor(s.nowMs / FRAME_MS);
  let blink = false, dx = 0, dy = 0;
  let facing = s.facing;
  switch (s.state) {
    case 'idle': dy = amb % 2 === 1 ? -1 : 0; break;
    case 'walk': case 'play': dy = -(Math.floor(t / 2) % 2); break;
    case 'look': dy = s.lookUp ? -1 : 0; break;
    case 'hop': case 'greet': case 'train': dy = HOP[t % 5]; break;
    case 'dance': dy = HOP[t % 5]; if (Math.floor((t * TICK_MS) / 300) % 2 === 1) facing = (facing * -1) as 1 | -1; break;
    case 'sit': case 'droop': case 'sleep': dy = 1; blink = true; break;
    case 'poop': dy = 1; blink = true; dx = t % 2 ? 2 : 0; break;
    case 'eat': blink = Math.floor(t / 2) % 2 === 1; dx = blink ? 2 : 0; break;
    case 'sneeze': dx = [-2, -2, 3, 3, 0, 0][Math.min(5, t)] ?? 0; blink = t < 4; break;
    case 'shiver': dx = t % 2 ? 1 : -1; break;
    case 'sweat': dy = 0; blink = Math.floor(t / 4) % 2 === 1; break;
    case 'stretch': dy = t < 5 ? -2 : 0; blink = t < 5; break;
    case 'react': dx = t < 2 ? -3 : 0; blink = true; break;
    case 'battle': dy = 0; break;
  }
  return { blink, dx: dx + s.pdx, dy: dy + s.pdy, facing };
}

