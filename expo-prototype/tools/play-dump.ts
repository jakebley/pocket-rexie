// Dumps the real renderer's Play screens (renderScreen + buildFrame) for contact sheets. Used by tools/play-sheets.js:
//   tsx tools/play-dump.ts out.json
import { forceSpecies, newPet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { catchDims, catchGame } from '../src/core/minigames/games/catch';
import { ScoreStore, type KV } from '../src/core/minigames/scores';
import { newSession, pressButton, settleSession, tickSession } from '../src/core/minigames/session';
import { paramsFor } from '../src/core/minigames/tuning';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { catchBot, SKILLS } from '../test/minigame-bots';

declare const require: (m: string) => any;
declare const process: { argv: string[] };
const { writeFileSync } = require('fs');
const T = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const FAMS = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
const stage = process.argv[3] ?? 'adult';
const mem = (): KV => { const m = new Map<string, string>(); return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }; };

const out: unknown[] = [];
(async () => {
  for (const fam of FAMS) {
    const sp = SPECIES.find((s) => s.family === fam && s.stage === stage) ?? SPECIES.find((s) => s.family === fam && s.stage === 'adult')!;
    const mk = () => { const p = newPet(T, { seed: 7 }); forceSpecies(p, sp.id); p.named = true; p.name = 'Rexie'; p.hunger = 4; p.happy = 3; return p; };
    for (const mode of ['technicolor', 'traditional'] as const) {
      const pet = mk();
      const store = new ScoreStore(mem());
      await store.load();
      store.submit('catch', { score: 41, rank: 'gold', name: 'Mochi', species: 'x', speciesName: 'Fennec', date: T });
      store.submit('catch', { score: 24, rank: 'silver', name: 'Rexie', species: pet.species, speciesName: sp.name, date: T });
      const scores = store.snapshot();
      const params = paramsFor(pet, 'catch');
      const d = catchDims(params);
      const s = newSession(catchGame, params, 11);
      const base: Omit<ScreenCtx, 'mode'> = { pet, tick: 3, feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, playSel: 1, scores, session: s, ms: T + 4000 };
      const shot = (name: string, ctx: ScreenCtx) => {
        const r = renderScreen(ctx);
        const frame = buildFrame(r, { mode, dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
        const sc = screenColors(mode, false);
        out.push({ fam, id: sp.id, mode, dark: false, name, frame, ground: sc.ground, ink: sc.ink });
      };
      shot('menu', { ...base, mode: 'playmenu', session: null });
      shot('ready', { ...base, mode: 'game' });
      pressButton(s, 'b');
      const bot = catchBot({ ...SKILLS.good, vp: d.vp }, 3);
      let t = 0;
      const upTo = (ms: number) => { while (t < ms && s.phase === 'play') { s.pending = { ...s.pending, ...bot(s.game!, t) }; tickSession(s, 50); t += 50; } };
      upTo(9000);
      shot('game-a', { ...base, mode: 'game', ms: T + 5000 });
      upTo(16500);
      shot('game-b', { ...base, mode: 'game', ms: T + 6100 });
      while (s.phase === 'play') { s.pending = { ...s.pending, ...bot(s.game!, t) }; tickSession(s, 50); t += 50; }
      shot('over', { ...base, mode: 'game' });
      while (tickSession(s, 100) === false) { /* wait for result */ }
      settleSession(s, pet, store, T);
      shot('result', { ...base, mode: 'game', tick: 2 });
      shot('scores', { ...base, mode: 'scores', scoresPage: 1, session: null });
    }
  }
  writeFileSync(process.argv[2], JSON.stringify(out));
})();
