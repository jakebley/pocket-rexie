// Rank -> engine reward, plus the day cap. Rewards stay inside the existing balance (docs/PLAY.md):
// BRONZE counts as a win (finishPlay's rule: smarts +3, weight -1), SILVER or better adds +1 happy heart,
// and only 3 plays per 24 hours of game time are rewarded; extra plays still score but give nothing, and say so.
import { finishRanked, type Pet } from '../pet';
import type { Rank } from './types';

export const DAY_MS = 24 * 3600 * 1000;
export const DAILY_REWARDED_PLAYS = 3;

export interface RewardResult {
  rank: Rank;
  /** the engine was changed */
  rewarded: boolean;
  /** this play was over the day cap */
  capped: boolean;
  /** effects, for the result screen: e.g. ["SMARTS +3", "HAPPY +1"] */
  lines: string[];
  /** the one-line message for the message area */
  msg: string;
  /** rewarded plays left today, after this one */
  left: number;
}

/** The rewarded plays still inside the last 24 h of game time. */
export const recentRewards = (p: Pet, now: number): number[] => (p.rewardedPlays ?? []).filter((t) => now - t < DAY_MS && t <= now + 1000);
export const rewardsLeft = (p: Pet, now: number): number => Math.max(0, DAILY_REWARDED_PLAYS - recentRewards(p, now).length);

/** Apply a finished play to the pet. Mutates `p`; call after advance(). */
export function applyReward(p: Pet, rank: Rank, now: number): RewardResult {
  const recent = recentRewards(p, now);
  p.rewardedPlays = recent;
  if (recent.length >= DAILY_REWARDED_PLAYS) {
    return { rank, rewarded: false, capped: true, lines: ['DAY LIMIT', 'NO REWARD'], msg: `${p.name} is worn out. No reward until tomorrow`, left: 0 };
  }
  const before = { smarts: p.smarts, happy: p.happy };
  const msg = finishRanked(p, rank);
  if (msg === '...') return { rank, rewarded: false, capped: false, lines: [], msg: '', left: DAILY_REWARDED_PLAYS - recent.length };
  p.rewardedPlays = [...recent, now];
  const lines: string[] = [];
  if (p.smarts > before.smarts) lines.push(`SMARTS +${p.smarts - before.smarts}`);
  if (p.happy > before.happy) lines.push(`HAPPY +${p.happy - before.happy}`);
  if (lines.length === 0) lines.push(rank === 'none' ? 'BURNED A LITTLE' : 'ALL MAXED OUT');
  return { rank, rewarded: true, capped: false, lines, msg, left: DAILY_REWARDED_PLAYS - recent.length - 1 };
}
