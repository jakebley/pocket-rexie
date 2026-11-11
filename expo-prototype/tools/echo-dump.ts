// Dumps ECHO screens (real renderer) for every family and both modes: tsx tools/echo-dump.ts out.json [stage]. Used by tools/echo-sheets.js.
import { forceSpecies, newPet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { echoGame, type EchoState } from '../src/core/minigames/games/echo';
import { ScoreStore, type KV } from '../src/core/minigames/scores';
import { newSession, pressButton, settleSession, tickSession } from '../src/core/minigames/session';
import { paramsFor } from '../src/core/minigames/tuning';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { echoBot, ECHO_SKILLS } from '../test/echo-bots';

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
    for (const mode of ['technicolor', 'traditional'] as const) {
      const pet = newPet(T, { seed: 7 }); forceSpecies(pet, sp.id); pet.named = true; pet.name = 'Rexie'; pet.hunger = 4; pet.happy = 3;
      const store = new ScoreStore(mem()); await store.load();
      const params = paramsFor(pet, 'echo');
      const s = newSession(echoGame, params, 21);
      const base: Omit<ScreenCtx, 'mode'> = { pet, tick: 3, feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, playSel: 2, scores: store.snapshot(), session: s, ms: T + 4000 };
      const shot = (name: string, ms = 4000) => {
        const r = renderScreen({ ...base, look: mode, mode: 'game', ms: T + ms });
        const frame = buildFrame(r, { mode, dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
        const sc = screenColors(mode, false);
        out.push({ fam, id: sp.id, mode, name, frame, ground: sc.ground, ink: sc.ink });
      };
      shot('ready');
      pressButton(s, 'b');
      const g = s.game!;
      const bot = echoBot(ECHO_SKILLS.perfect, 2);
      let t = 0;
      const run = (cond: (st: EchoState) => boolean) => {
        let guard = 0;
        while (s.phase === 'play' && !cond(g.state as EchoState) && guard++ < 6000) {
          s.pending = { ...s.pending, ...bot(g, t) }; tickSession(s, 50); t += 50;
        }
      };
      run((st) => st.phase === 'intro' && st.round === 0); shot('intro');
      run((st) => st.phase === 'show' && st.lit >= 0 && st.litIndex === 1); shot('show3', 4500);
      run((st) => st.phase === 'input' && st.entered === 2); shot('input3', 5100);
      run((st) => st.phase === 'ok'); shot('ok', 5400);
      run((st) => st.round === 3 && st.phase === 'show' && st.lit === 1); shot('show4', 4700);
      run((st) => st.round === 6 && st.phase === 'show' && st.lit === 3); shot('show5', 4800);
      run((st) => st.round === 6 && st.phase === 'input' && st.entered === 3); shot('input5', 5200);
      // a mistake
      run((st) => st.round === 6 && st.phase === 'input' && st.entered === 3);
      const want = (g.state as EchoState).pattern[(g.state as EchoState).entered];
      const wrong = want === 0 ? { left: false, right: true, act: false } : { left: true, right: false, act: false };
      s.pending = { ...s.pending, ...wrong }; tickSession(s, 50); tickSession(s, 50); t += 100;
      shot('oops', 4900);
      // finish with the bot to the result (kept short: let the run time out)
      while (s.phase === 'play') { tickSession(s, 50); }
      shot('over');
      while (tickSession(s, 100) === false) { /* result */ }
      settleSession(s, pet, store, T);
      shot('result');
    }
  }
  writeFileSync(process.argv[2], JSON.stringify(out));
})();
