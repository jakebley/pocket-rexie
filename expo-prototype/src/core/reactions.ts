import { REACTIONS } from './reactionsData';

type Ctx = { name: string; species: string; stage: string; line: string; sick: boolean; hunger: number; happy: number; poops: number; heavy: boolean };
const R = REACTIONS as unknown as {
  kindOf: Record<string, string>; kindLines: Record<string, string[]>; context: Record<string, string[]>; speciesLines: Record<string, string[]>;
};
let counter = 0;
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const fill = (line: string, name: string) => line.replace(/\{n\}/g, name);

/** The line a pet says when petted: urgent needs first, otherwise its body type and species, with the odd mood line mixed in. */
export function reactionFor(c: Ctx, step?: number): string {
  const i = (step ?? counter++) + hash(c.species);
  const pick = (ls: string[]) => ls[i % ls.length];
  if (c.sick) return fill(pick(R.context.sick), c.name);
  if (c.hunger <= 1) return fill(pick(R.context.hungry), c.name);
  if (c.poops >= 2) return fill(pick(R.context.dirty), c.name);
  const mood: string[] | null = c.heavy ? R.context.heavy : c.happy <= 1 ? R.context.sad : /^(neglect|stray)$/.test(c.line) ? R.context.stray : c.stage === 'ultimate' ? R.context.ultimate : null;
  if (mood && i % 3 === 0) return fill(pick(mood), c.name);
  const own = R.speciesLines[c.species] ?? [];
  const kind = R.kindLines[R.kindOf[c.species] ?? 'baby'] ?? R.kindLines.baby;
  return fill(pick([...own, ...own, ...kind]), c.name);
}
