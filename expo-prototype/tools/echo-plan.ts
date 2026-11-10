// Prints the ECHO schedule for tools/echo-e2e.js: patterns, pads and timings for a seed and a species. tsx tools/echo-plan.ts <species> <seed>
import { echoGame, activeSlots, makePatterns, padRects, litFor, gapFor, memoryBonus, ECHO_ROUNDS, INTRO_MS, LEAD_MS } from '../src/core/minigames/games/echo';
import { paramsForBody } from '../src/core/minigames/tuning';

declare const process: { argv: string[] };
const [species, seed, smarts] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4] ?? 30)];
const params = paramsForBody({ species, stage: 'adult' }, 'echo', smarts);
const bonus = memoryBonus(params);
const patterns = makePatterns(seed);
console.log(JSON.stringify({
  mul: params.scoreMul,
  rounds: Array.from({ length: ECHO_ROUNDS }, (_, r) => ({ pattern: patterns[r], active: activeSlots(r), pads: padRects(activeSlots(r).length), lit: litFor(r, bonus), gap: gapFor(r), showMs: INTRO_MS + LEAD_MS + patterns[r].length * (litFor(r, bonus) + gapFor(r)) + 300 })),
  maxMs: echoGame.maxMs,
}));
