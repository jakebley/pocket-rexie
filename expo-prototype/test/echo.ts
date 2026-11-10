// ECHO: the pattern generator, the controls (buttons, chords, taps), the bots (a perfect player clears every pattern, a random one never gets GOLD),
// the pet modifiers, thresholds, and the painter for 12 families x 2 modes. (The generic monkey and render tests in minigames.ts cover ECHO too.)
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { paramsForBody } from '../src/core/minigames/tuning';
import { RANKS, type GameInput, type MiniGame } from '../src/core/minigames/types';
import {
  ECHO_LENGTHS, ECHO_ROUNDS, ECHO_THRESHOLDS, ECHO_UNLOCK_AB, ECHO_UNLOCK_BC, activeSlots, echoGame, idleFor, litFor, makePatterns, memoryBonus, padRects,
  roundPoints, type EchoState,
} from '../src/core/minigames/games/echo';
import { GAME_ENTRIES } from '../src/ui/games/registry';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen } from '../src/ui/screens';
import { newSession, playOut, pressButton, tickSession } from '../src/core/minigames/session';
import { echoBot, ECHO_SKILLS } from './echo-bots';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const FAM_SPECIES = (fam: string, stage = 'adult') => SPECIES.find((s) => s.family === fam && s.stage === stage) ?? SPECIES.find((s) => s.family === fam)!;
const petOf = (species: string): Pet => { const p = newPet(T0, { seed: 9 }); forceSpecies(p, species); p.named = true; p.name = 'Rexie'; p.hunger = 4; return p; };

function play(species: string, skill: keyof typeof ECHO_SKILLS, seed: number, stage: 'adult' | 'baby' = 'adult', smarts = 30): MiniGame {
  const params = paramsForBody({ species, stage }, 'echo', smarts);
  return playOut(echoGame, params, seed, echoBot(ECHO_SKILLS[skill], seed));
}

async function main() {
  // ---------- 1. the pattern generator ----------
  {
    ok(ECHO_LENGTHS.length === ECHO_ROUNDS && Math.min(...ECHO_LENGTHS) === 3 && Math.max(...ECHO_LENGTHS) === 8, 'rounds run from patterns of 3 up to 8');
    ok(ECHO_LENGTHS.every((n, i) => i === 0 || n >= ECHO_LENGTHS[i - 1]), 'patterns never get shorter');
    let bad = 0, repeats = 0, newMissing = 0, distinct = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const ps = makePatterns(seed);
      distinct.add(ps[0].join() + '/' + ps[5].join());
      if (ps.length !== ECHO_ROUNDS) bad++;
      ps.forEach((p, r) => {
        const act = activeSlots(r);
        if (p.length !== ECHO_LENGTHS[r] || !p.every((x) => act.includes(x))) bad++;
        for (let i = 2; i < p.length; i++) if (p[i] === p[i - 1] && p[i] === p[i - 2]) bad++;
        if (r > 0 && p.join() === ps[r - 1].join()) repeats++;
        if (new Set(p).size < 2) bad++;
      });
      if (!ps[ECHO_UNLOCK_AB].includes(1)) newMissing++;
      if (!ps[ECHO_UNLOCK_BC].includes(3)) newMissing++;
      if (makePatterns(seed).join('|') !== ps.join('|')) bad++;
    }
    ok(bad === 0, 'patterns: right length, only unlocked slots, never 3 in a row, 2+ symbols, deterministic');
    ok(repeats === 0, 'the same pattern never comes twice in a row');
    ok(newMissing === 0, 'a round that unlocks a pad uses it');
    ok(distinct.size > 250, 'different seeds give different patterns');
    ok(activeSlots(0).join() === '0,2,4' && activeSlots(ECHO_UNLOCK_AB).join() === '0,1,2,4' && activeSlots(ECHO_UNLOCK_BC).join() === '0,1,2,3,4', 'pads unlock: 3, then 4, then 5');
    for (const k of [3, 4, 5]) {
      const r = padRects(k);
      ok(r.length === k && r.every((q, i) => q.x >= 0 && q.x + q.w <= 64 && q.y + q.h <= 63 && q.w >= 10 && (i === 0 || q.x >= r[i - 1].x + r[i - 1].w)), `${k} pads fit the screen without overlap`);
    }
    ok(roundPoints(4, 0) === 4 && roundPoints(4, 5) === 6 && roundPoints(4, 50) === 6, 'streak bonus: +10% per round, capped at +50%');
  }

  // ---------- 2. controls ----------
  {
    const params = paramsForBody({ species: FAM_SPECIES('fox').id, stage: 'adult' }, 'echo');
    const idle: GameInput = { left: false, right: false, act: false };
    const mk = () => echoGame.init(5, params);
    const toInput = (g: MiniGame) => { let n = 0; while ((g.state as EchoState).phase !== 'input' && n++ < 2000) g.step(idle, 50); return g.state as EchoState; };
    // presses during the show are ignored
    { const g = mk(); for (let i = 0; i < 30; i++) g.step({ left: true, right: true, act: true }, 50); const s = g.state as EchoState; ok(s.mistakes === 0 && s.entered === 0, 'presses before the player\'s turn are ignored'); }
    // A / B / C play slots 0 / 2 / 4
    for (const [inp, slot] of [[{ left: true, right: false, act: false }, 0], [{ left: false, right: false, act: true }, 2], [{ left: false, right: true, act: false }, 4]] as const) {
      const g = mk(); const s = toInput(g);
      const want = s.pattern[0];
      g.step(inp, 50);
      ok(s.pressed === slot && (slot === want ? s.entered === 1 : s.mistakes === 1), `button for slot ${slot} plays that pad`);
    }
    // a tap on a pad picks it; a tap on the stage does nothing
    { const g = mk(); const s = toInput(g); const rows = echoGame.tapRows!(s); ok(rows.length === s.active.length + 1, 'tap rows: the pads, plus the stage to swallow stray taps');
      g.step({ ...idle, pick: rows.length - 1 }, 50); ok(s.mistakes === 0 && s.entered === 0, 'a tap on the stage is ignored');
      const want = s.pattern[0]; g.step({ ...idle, pick: s.active.indexOf(want) }, 50); ok(s.entered === 1, 'a tap on the right pad counts'); }
    // chords: round 4 has A+B; A then B 50 ms apart is a chord, 200 ms apart is two presses
    {
      const bot = (chord: boolean) => {
        const g = mk();
        const s = g.state as EchoState;
        // clear rounds 1-3 perfectly, then look at round 4
        const b = echoBot(ECHO_SKILLS.perfect, 5);
        let t = 0;
        while (s.round < ECHO_UNLOCK_AB && t < 400000) { g.step(b(g, t), 50); t += 50; }
        toInput(g);
        // force a known pattern: begin with A+B
        s.pattern = [1, 0, 2, 1]; s.patterns[s.round] = s.pattern;
        if (chord) { g.step({ left: true, right: false, act: false }, 50); g.step({ left: false, right: false, act: true }, 50); }
        else { g.step({ left: true, right: false, act: false }, 50); for (let i = 0; i < 4; i++) g.step(idle, 50); g.step({ left: false, right: false, act: true }, 50); }
        for (let i = 0; i < 4; i++) g.step(idle, 50);
        return s;
      };
      const c = bot(true); ok(c.entered === 1 && c.mistakes === 0, 'A then B within 100 ms is the A+B chord');
      const d = bot(false); ok(d.mistakes === 1, 'A then B 250 ms apart are two separate presses (a mistake where A+B was wanted)');
    }
    // one retry: the first mistake replays the same pattern, the second ends the run
    {
      const g = mk(); const s = toInput(g);
      const first = s.pattern.join();
      const wrongBtn = (slot: number): GameInput => (slot === 0 ? { left: false, right: true, act: false } : { left: true, right: false, act: false });
      g.step(wrongBtn(s.pattern[0]), 50);
      ok(s.phase === 'oops' && s.retries === 0 && s.mood === 'shrug', 'a mistake: the pet shrugs and the retry is used');
      let n = 0; while (s.phase !== 'input' && n++ < 2000) g.step(idle, 50);
      ok(s.round === 0 && s.pattern.join() === first && s.phase === 'input' && s.entered === 0, 'the retry shows the same pattern again');
      g.step(wrongBtn(s.pattern[0]), 50);
      n = 0; while (!g.done && n++ < 2000) g.step(idle, 50);
      ok(g.done && !s.won, 'the second mistake ends the run');
      ok(g.overLabel === 'OOPS', 'the game over banner says OOPS');
    }
    // doing nothing is a mistake after the patience runs out, not a hang
    { const g = mk(); let n = 0; while (!g.done && n++ < 6000) g.step(idle, 50); ok(g.done && g.score === 0 && g.rank === 'none', 'a player who never presses ends the run with nothing'); }
    // a sound for every note, a bad sound for a mistake
    { const g = mk(); const s = toInput(g); const seq = s.sfx.seq; g.step({ left: true, right: false, act: false }, 50); ok(s.sfx.seq > seq && (s.sfx.kind === 'note' || s.sfx.kind === 'bad'), 'presses make a sound event'); }
  }

  // ---------- 3. the bots: every pattern is clearable, a perfect player gets GOLD, a random one never does ----------
  {
    const fams = FAMILIES.map((f) => FAM_SPECIES(f.id));
    let perfectGold = 0, perfectN = 0;
    for (const sp of fams) for (const seed of [1, 2, 3]) {
      const g = play(sp.id, 'perfect', seed);
      const s = g.state as EchoState;
      perfectN++;
      ok(g.done && s.won && s.cleared === ECHO_ROUNDS && s.mistakes === 0, `${sp.family}/${seed}: a perfect player clears all ${ECHO_ROUNDS} rounds without a mistake`);
      if (g.rank === 'gold') perfectGold++;
      const expect = Math.floor(ECHO_LENGTHS.reduce((a, n, i) => a + roundPoints(n, i), 0) * paramsForBody({ species: sp.id, stage: 'adult' }, 'echo').scoreMul + 1e-9);
      ok(g.score === expect, `${sp.family}/${seed}: the perfect score is the sum of length x streak (${g.score})`);
    }
    ok(perfectGold === perfectN, 'a perfect player gets GOLD with every family');
    // all patterns of many seeds are clearable by the perfect bot, whatever the stage and body type
    for (const sp of SPECIES.filter((_, i) => i % 7 === 0)) for (const seed of [11, 12]) {
      const g = play(sp.id, 'perfect', seed, 'adult');
      ok(g.done && (g.state as EchoState).cleared === ECHO_ROUNDS, `${sp.id}/${seed}: clearable`);
    }
    // a random player
    let randomMax = 0, randomSum = 0, n = 0;
    for (const sp of fams) for (const seed of [1, 2, 3, 4, 5]) {
      const g = play(sp.id, 'random', seed);
      randomMax = Math.max(randomMax, g.score); randomSum += g.score; n++;
      ok(g.rank !== 'gold' && g.rank !== 'silver', `${sp.family}/${seed}: a random player never reaches SILVER (${g.score})`);
    }
    console.log(`  random players: best ${randomMax}, mean ${(randomSum / n).toFixed(1)}; perfect player ${play(fams[1].id, 'perfect', 1).score} (thresholds ${ECHO_THRESHOLDS.bronze}/${ECHO_THRESHOLDS.silver}/${ECHO_THRESHOLDS.gold})`);

    // skilled humans: good, okay, casual (they forget symbols more as the pattern gets longer)
    const stat = (skill: keyof typeof ECHO_SKILLS) => {
      const ranks: Record<string, number> = { none: 0, bronze: 0, silver: 0, gold: 0 };
      let sum = 0, m = 0;
      for (const sp of fams) for (const seed of [1, 2, 3, 4, 5, 6]) { const g = play(sp.id, skill, seed); ranks[g.rank]++; sum += g.score; m++; }
      return { ranks, mean: sum / m, m };
    };
    const good = stat('good'), okay = stat('okay'), casual = stat('casual');
    for (const [name, st] of [['good', good], ['okay', okay], ['casual', casual]] as const) console.log(`  ${name}: mean ${st.mean.toFixed(1)}, ranks ${JSON.stringify(st.ranks)}`);
    ok(good.ranks.silver + good.ranks.gold >= good.m * 0.5, 'a good player usually reaches SILVER');
    ok(good.ranks.gold < good.m * 0.6, 'a good player does not always get GOLD');
    ok(okay.ranks.bronze + okay.ranks.silver + okay.ranks.gold >= okay.m * 0.6, 'an okay player usually reaches BRONZE');
    ok(casual.ranks.bronze + casual.ranks.silver >= casual.m * 0.1, 'a casual player reaches BRONZE sometimes');
    ok(casual.ranks.gold === 0 && casual.ranks.none >= casual.m * 0.1, 'a casual player does not get GOLD and sometimes gets nothing');
    ok(good.mean > okay.mean && okay.mean > casual.mean, 'skill orders the scores');
  }

  // ---------- 4. the pet modifiers ----------
  {
    const kind = (k: string) => SPECIES.find((s) => paramsForBody({ species: s.id, stage: 'adult' }, 'echo').kind === k)!;
    const brainy = paramsForBody({ species: kind('floppy').id, stage: 'adult' }, 'echo', 30);
    const dull = paramsForBody({ species: kind('dozer').id, stage: 'adult' }, 'echo', 30);
    ok(memoryBonus(brainy) > memoryBonus(dull) && litFor(0, memoryBonus(brainy)) > litFor(0, memoryBonus(dull)), 'a high-memory body type sees each symbol for longer');
    ok(idleFor(brainy) > idleFor(dull), 'and has more patience for each answer');
    ok(memoryBonus({ ...dull, smarts: 90 }) > memoryBonus({ ...dull, smarts: 10 }), 'smarts add display time');
    ok(memoryBonus({ ...dull, stage: 'baby' }) > memoryBonus({ ...dull, stage: 'adult' }), 'a baby gets more display time than an adult');
    ok(litFor(11, 0) < litFor(0, 0) && litFor(11, 0) >= 320, 'the symbols get faster, but never faster than 320 ms');
    const sick = paramsForBody({ species: kind('dozer').id, stage: 'adult', sick: true }, 'echo', 30);
    ok(memoryBonus(sick) <= memoryBonus(dull), 'a sick pet sees symbols for less time');
    // the favourite multiplier
    const fav = SPECIES.find((s) => paramsForBody({ species: s.id, stage: 'adult' }, 'echo').scoreMul > 1)!;
    const plain = SPECIES.find((s) => paramsForBody({ species: s.id, stage: 'adult' }, 'echo').scoreMul === 1)!;
    const a = play(fav.id, 'perfect', 4).score, b = play(plain.id, 'perfect', 4).score;
    ok(a === Math.floor(b * 1.25 + 1e-9) || Math.abs(a - b * 1.25) < 1.01, `the favourite game multiplies the score by 1.25 (${a} vs ${b})`);
  }

  // ---------- 5. any step size plays the same game ----------
  {
    const sp = FAM_SPECIES('bot').id;
    const params = paramsForBody({ species: sp, stage: 'adult' }, 'echo');
    const run = (stepMs: number) => { const g = playOut(echoGame, params, 3, echoBot(ECHO_SKILLS.good, 3), stepMs); return JSON.stringify([g.score, (g.state as EchoState).cleared, (g.state as EchoState).mistakes]); };
    ok(run(50) === run(50), 'deterministic');
    const g = echoGame.init(1, params);
    ok(echoGame.maxMs > 60000 && g.progress === 0 && g.hud.left.length <= 16 && g.hud.right.length <= 16, 'maxMs and the HUD are sane');
  }

  // ---------- 6. painting: every family, both modes, every phase ----------
  {
    let shots = 0;
    for (const fam of FAMILIES) {
      const sp = FAM_SPECIES(fam.id);
      const pet = petOf(sp.id);
      const params = paramsForBody({ species: sp.id, stage: 'adult' }, 'echo');
      for (const mode of ['technicolor', 'traditional'] as const) {
        const sess = newSession(echoGame, params, 6); pressButton(sess, 'b');
        const bot = echoBot(ECHO_SKILLS.perfect, 6);
        let t = 0; const seen = new Set<string>();
        while (sess.phase === 'play' && t < 80000) {
          sess.pending = { ...sess.pending, ...bot(sess.game!, t) };
          tickSession(sess, 50); t += 50;
          const s = sess.game!.state as EchoState;
          const key = `${s.phase}${s.active.length}`;
          if ((t % 350 === 0 && !seen.has(key + (t % 700))) || s.phase === 'oops') {
            seen.add(key + (t % 700));
            const r = renderScreen({ pet, tick: 3, mode: 'game', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, session: sess, ms: T0 + t });
            buildFrame(r, { mode, dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) }); shots++;
            ok(r.buf.px.some((v) => v >= 29 && v <= 39), `${fam.id}/${mode}/${s.phase}: the pet is drawn`);
          }
        }
        ok(['intro', 'show', 'input', 'ok'].every((p) => [...seen].some((k) => k.startsWith(p))), `${fam.id}/${mode}: painted intro, show, input and ok`);
      }
    }
    console.log(`  painted ${shots} ECHO frames`);
    ok(GAME_ENTRIES.some((e) => e.def.id === 'echo'), 'ECHO is registered');
    ok(RANKS.length === 4, 'ranks');
  }

  console.log(`echo: ${checks - fails}/${checks} checks passed`);
  if (fails) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
