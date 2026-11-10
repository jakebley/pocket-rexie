// Dumps DASH frames from the real renderer (renderScreen + buildFrame) for tools/dash-sheets.js:
//   tsx tools/dash-dump.ts out.json [stage]
import { forceSpecies, newPet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { dashGame, type DashState } from '../src/core/minigames/games/dash';
import { ScoreStore, type KV } from '../src/core/minigames/scores';
import { newSession, pressButton, settleSession, tickSession } from '../src/core/minigames/session';
import { paramsFor } from '../src/core/minigames/tuning';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { screenColors } from '../src/ui/palette';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { DASH_SKILLS, dashBot } from '../test/dash-bots';

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
    const s = newSession(dashGame, paramsFor(pet, 'dash'), 21);
    const base: Omit<ScreenCtx, 'mode'> = { pet, tick: 3, feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, playSel: 2, scores: {}, session: s, ms: T + 4000 };
    const shot = (name: string) => {
      const r = renderScreen({ ...base, mode: 'game', ms: T + 4000 + (s.game ? (s.game.state as DashState).t : 0) });
      const frame = buildFrame(r, { mode, dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
      const sc = screenColors(mode, false);
      out.push({ fam, id: sp.id, mode, name, frame, ground: sc.ground, ink: sc.ink });
    };
    shot('ready');
    pressButton(s, 'b');
    const bot = dashBot(s.params.tuning, DASH_SKILLS.casual, 5);
    let t = 0;
    const want: Record<string, (st: DashState) => boolean> = {
      count: (st) => st.cd > 0 && st.cd < 1000,
      go: (st) => st.cd <= 0 && st.t >= 100,
      jump: (st) => st.t > 6000 && st.hp > 9 && st.obstacles.some((o) => o.x > st.petX - 10 && o.x < st.petX + 12),
      item: (st) => st.t > 9000 && st.items.some((i) => i.x > 20 && i.x < 56) && !st.stun,
      hit: (st) => st.stun > 300,
      fast: (st) => st.t > 32000 && st.hp > 4,
    };
    const todo = Object.keys(want);
    while (todo.length && s.phase !== 'result') {
      const st = s.game ? (s.game.state as DashState) : null;
      if (st) for (let i = todo.length - 1; i >= 0; i--) if (want[todo[i]](st)) { shot(todo[i]); todo.splice(i, 1); }
      if (s.phase === 'play') { s.pending = { ...s.pending, ...bot(s.game!) }; }
      tickSession(s, 50); t += 50;
      if (t > 60000) break;
    }
    while (s.phase === 'play') { s.pending = { ...s.pending, ...bot(s.game!) }; tickSession(s, 50); }
    shot('over');
    while (tickSession(s, 100) === false) { /* wait for the result */ }
    const store = new ScoreStore(mem()); await store.load();
    settleSession(s, pet, store, T);
    shot('result');
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
})();
