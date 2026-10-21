// "While you were away" summary: pure, built from the engine's event log.
import { SPECIES_BY_ID, type Pet } from '../core/pet';

export const AWAY_MIN_MS = 15 * 60 * 1000;
const MAX_LINE = 38; // characters on the second line (fits two lines of 3x5 pixel text on a phone)

export function awaySummary(p: Pet, since: number): string {
  const ev = p.events.filter((e) => e.at > since);
  const count = (k: string) => ev.filter((e) => e.kind === k).length;
  const parts: string[] = [];
  if (count('hatched')) parts.push('HATCHED');
  const evo = ev.filter((e) => e.kind === 'evolved').pop();
  if (evo) parts.push(`GREW INTO ${(SPECIES_BY_ID[evo.detail]?.name ?? 'SOMETHING NEW').toUpperCase()}`);
  const slept = count('sleep'), woke = count('wake');
  if (slept && woke) parts.push('SLEPT THROUGH THE NIGHT');
  else if (slept) parts.push('FELL ASLEEP');
  else if (woke) parts.push('WOKE UP');
  const poops = count('poop');
  if (poops) parts.push(poops === 1 ? 'MADE A MESS' : `MADE ${poops} MESSES`);
  if (count('sick')) parts.push('GOT SICK');
  const calls = count('call');
  if (calls) parts.push(calls === 1 ? 'WANTED ATTENTION' : `WANTED ATTENTION ${calls} TIMES`);
  if (count('died')) parts.push('PASSED ON');
  if (parts.length === 0) return `${p.name.toUpperCase()} MISSED YOU`;
  let line = parts.join(', ');
  while (line.length > MAX_LINE && parts.length > 1) { parts.pop(); line = parts.join(', '); }
  return `WHILE YOU WERE AWAY\n${line}`;
}
