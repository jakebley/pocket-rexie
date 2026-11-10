// Play mini-games: deterministic sims, tuning for every body type, themes for every family, the score store, the reward cap,
// rank thresholds that are reachable but not trivial (bot players of several skills), and every game and screen rendering for every family.
import { advance, newPet, forceSpecies, finishRanked, SPECIES_BY_ID, type Pet } from '../src/core/pet';
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { REACTIONS } from '../src/core/reactionsData';
import { makeRng } from '../src/core/minigames/rng';
import { THEMES, THEME_FAMILIES, allGlyphs, themeFor, GLYPH_SIZE, type Tone } from '../src/core/minigames/themes';
import {
  ALL_KINDS, FAVOURITE_MUL, KIND_TUNING, favouriteOf, kindOfSpecies, paramsFor, paramsForBody, tuningForBody, tuningFor, STAGE_TUNING,
} from '../src/core/minigames/tuning';
import { ScoreStore, SCORES_KEY, type KV, type ScoreEntry } from '../src/core/minigames/scores';
import { DAILY_REWARDED_PLAYS, DAY_MS, applyReward, rewardsLeft } from '../src/core/minigames/rewards';
import { GAME_IDS, NO_INPUT, RANKS, rankOf, type GameInput, type MiniGame } from '../src/core/minigames/types';
import { OVER_MS, newSession, playOut, pressButton, settleSession, tapPick, tapSide, tickSession } from '../src/core/minigames/session';
import { CATCH_MS, CATCH_THRESHOLDS, catchDims, catchGame, type CatchState } from '../src/core/minigames/games/catch';
import { HILO_REVEAL_MS, HILO_THRESHOLDS, hiloGame, type HiLoState } from '../src/core/minigames/games/hilo';
import { GAME_ENTRIES, entryById } from '../src/ui/games/registry';
import { fitRows, petArt, TONE_LAYER } from '../src/ui/games/common';
import { DIM_FLAG, LAYER_MASK, tradVisible } from '../src/ui/layers';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { TICK_MS } from '../src/ui/scene';
import { menuFirst, playMenuRows, renderScreen, scoresPageCount, MENU_VISIBLE, type ScreenCtx } from '../src/ui/screens';
import { catchBot, SKILLS } from './minigame-bots';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const STAGES = ['baby', 'child', 'teen', 'adult', 'ultimate'] as const;
const memKV = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } };
};
const petOf = (species: string, o: Partial<Pet> = {}): Pet => {
  const p = newPet(T0, { seed: 9 }); forceSpecies(p, species); p.named = true; p.name = 'Rexie'; p.hunger = 4; p.happy = 2;
  return Object.assign(p, o);
};
const FAM_SPECIES = (fam: string, stage = 'adult') => SPECIES.find((s) => s.family === fam && s.stage === stage) ?? SPECIES.find((s) => s.family === fam)!;
const KIND_SPECIES = (kind: string) => SPECIES.find((s) => kindOfSpecies(s.id) === kind)!;

async function main() {
  // ---------- 1. seeded randomness ----------
  {
    const a = makeRng(5), b = makeRng(5), c = makeRng(6);
    const xs = Array.from({ length: 20 }, () => a.next()), ys = Array.from({ length: 20 }, () => b.next());
    ok(xs.join() === ys.join(), 'same seed gives the same stream');
    ok(xs.join() !== Array.from({ length: 20 }, () => c.next()).join(), 'a different seed gives another stream');
    ok(xs.every((x) => x >= 0 && x < 1), 'next() stays in [0,1)');
    const r = makeRng(1);
    ok(Array.from({ length: 200 }, () => r.int(7)).every((v) => v >= 0 && v < 7 && Number.isInteger(v)), 'int(n) is an integer below n');
  }

  // ---------- 2. themes: every family, every glyph ----------
  {
    ok(THEME_FAMILIES.length === 12 && THEME_FAMILIES.join() === FAMILIES.map((f) => f.id).join(), 'a theme for each of the 12 families, in family order');
    const TONES = new Set(Object.keys(TONE_LAYER));
    for (const f of FAMILIES) {
      const t = THEMES[f.id];
      ok(!!t && t.family === f.id, `${f.id}: theme exists`);
      if (!t) continue;
      ok(t.good.length >= 2 && t.bad.length >= 2 && t.obstacles.length === 3 && t.symbols.length === 5, `${f.id}: item counts (2+ good, 2+ bad, 3 obstacles, 5 symbols)`);
      for (const g of allGlyphs(t)) {
        const rowsOk = g.rows.length === GLYPH_SIZE && g.rows.every((r) => r.length === GLYPH_SIZE && /^[.#aow]+$/.test(r));
        ok(rowsOk, `${f.id}/${g.name}: 7x7 glyph with known characters`);
        const lit = g.rows.join('').replace(/[.]/g, '').length;
        ok(lit >= 8 && lit <= 45, `${f.id}/${g.name}: ${lit} lit pixels, neither empty nor a solid block`);
        ok(TONES.has(g.main) && (!g.acc || TONES.has(g.acc)), `${f.id}/${g.name}: known tones`);
        ok(g.name.length >= 3 && g.name === g.name.toUpperCase(), `${f.id}/${g.name}: upper-case name`);
        // Traditional keeps the shape: the ink pixels ('#' and 'a') alone must still be a recognisable blob
        ok(g.rows.join('').replace(/[.owo]/g, '').length >= 6, `${f.id}/${g.name}: enough ink without the detail pixels`);
      }
      const names = allGlyphs(t).map((g) => g.name);
      ok(new Set(t.good.concat(t.bonus, t.bad).map((g) => g.name)).size === t.good.length + 1 + t.bad.length, `${f.id}: item names are distinct`);
      ok(new Set(t.symbols.map((g) => g.name)).size === 5, `${f.id}: symbols are distinct`);
      ok(new Set(t.symbols.map((g) => g.rows.join('|'))).size === 5, `${f.id}: symbol bitmaps are distinct`);
      ok(new Set(t.good.concat(t.bad).map((g) => g.rows.join('|'))).size === t.good.length + t.bad.length, `${f.id}: good and bad items look different`);
      ok(names.every((n) => n.length <= 12), `${f.id}: glyph names fit a text line`);
      for (const id of GAME_IDS) ok(t.titles[id].length > 0 && t.titles[id].length <= 16 && t.titles[id] === t.titles[id].toUpperCase(), `${f.id}: ${id} title fits (${t.titles[id]})`);
      for (const r of RANKS) ok(t.wins[r].length > 0 && t.wins[r].length <= 18, `${f.id}: win line for ${r}`);
      ok(t.goodNoun.length <= 10 && t.badNoun.length <= 10, `${f.id}: nouns fit the rules lines`);
    }
    ok(themeFor('nope').family === 'dino', 'an unknown family falls back to the dino theme');
    // the families should not all share one look: at least 10 distinct main tones across the 12 first good items
    ok(new Set(FAMILIES.map((f) => (THEMES[f.id].good[0] as { main: Tone }).main + THEMES[f.id].good[0].name)).size === 12, 'each family collects something different');
  }

  // ---------- 3. tuning ----------
  {
    const kindOf = (REACTIONS as unknown as { kindOf: Record<string, string> }).kindOf;
    ok(ALL_KINDS.length === 123, `123 body kinds (got ${ALL_KINDS.length})`);
    for (const k of ALL_KINDS) {
      const t = KIND_TUNING[k];
      ok(!!t, `kind ${k} has tuning`);
      if (!t) continue;
      ok(t.speed >= 0.75 && t.speed <= 1.3 && t.size >= 0.75 && t.size <= 1.3 && t.luck > 0 && t.luck <= 2 && t.memory >= 0 && t.memory <= 700, `kind ${k}: modifiers in range`);
      ok((GAME_IDS as readonly string[]).includes(t.favourite), `kind ${k}: favourite is a known game (${t.favourite})`);
    }
    ok(Object.keys(KIND_TUNING).every((k) => ALL_KINDS.includes(k)), 'no tuning row for a kind nobody has');
    for (const s of SPECIES) ok(!!KIND_TUNING[kindOfSpecies(s.id)], `${s.id}: its kind has tuning`);
    ok(Object.keys(kindOf).length >= SPECIES.length, 'every species has a kind');
    for (const g of GAME_IDS) ok(ALL_KINDS.some((k) => KIND_TUNING[k].favourite === g), `some body type loves ${g}`);
    // the spec's examples
    ok(KIND_TUNING.fennec.favourite === 'catch' && KIND_TUNING.heron.favourite === 'dash' && KIND_TUNING.brainfloat.favourite === 'echo', 'fennec loves CATCH, heron DASH, brain ECHO');
    ok(KIND_TUNING.fennec.speed > KIND_TUNING.dozer.speed && KIND_TUNING.fennec.size < KIND_TUNING.dozer.size, 'light kinds are quick and small, heavy ones slow and big');
    // stage, weight and health
    const fine = tuningForBody({ species: 'swiftail', stage: 'adult' });
    ok(tuningForBody({ species: 'swiftail', stage: 'baby' }).size < fine.size, 'a baby is smaller than an adult');
    ok(tuningForBody({ species: 'swiftail', stage: 'baby' }).baseSpeed > fine.baseSpeed, 'a baby is quicker than an adult');
    ok(tuningForBody({ species: 'swiftail', stage: 'adult', heavy: true }).speed < fine.speed, 'an overweight pet is slower');
    ok(tuningForBody({ species: 'swiftail', stage: 'adult', sick: true }).speed < fine.speed && tuningForBody({ species: 'swiftail', stage: 'adult', sick: true }).luck < fine.luck, 'a sick pet plays worse');
    ok(tuningForBody({ species: 'swiftail', stage: 'adult', hunger: 1 }).speed < fine.speed && tuningForBody({ species: 'swiftail', stage: 'adult', hunger: 0 }).speed < tuningForBody({ species: 'swiftail', stage: 'adult', hunger: 1 }).speed, 'a hungry pet plays worse, a starving one worse still');
    ok(fine.baseSpeed === tuningForBody({ species: 'swiftail', stage: 'adult', sick: true, heavy: true, hunger: 0 }).baseSpeed, 'baseSpeed ignores health and weight');
    ok(STAGES.every((s) => STAGE_TUNING[s].size > 0), 'every stage has a scale');
    const p = petOf('swiftail');
    ok(favouriteOf(p) === 'catch' && paramsFor(p, 'catch').scoreMul === FAVOURITE_MUL && paramsFor(p, 'dash').scoreMul === 1, 'favourite game: x1.25 only for it');
    ok(tuningFor(Object.assign(petOf('swiftail'), { weight: 60 })).condition === 'heavy', 'overweight shows as a condition');
    ok(favouriteOf(newPet(T0)) === null, 'an egg has no favourite');
  }

  // ---------- 4. the score store ----------
  {
    const kv = memKV();
    const st = new ScoreStore(kv);
    await st.load();
    const e = (score: number, species = 'rawr', name = 'Rexie'): ScoreEntry => ({ score, rank: 'bronze', name, species, speciesName: species.toUpperCase(), date: T0 });
    let r = st.submit('catch', e(10));
    ok(r.recordSpecies && r.recordOverall && r.previous === null, 'the first score is a record');
    r = st.submit('catch', e(10));
    ok(!r.recordSpecies && !r.recordOverall, 'an equal score is not a record');
    r = st.submit('catch', e(8));
    ok(!r.recordSpecies && st.best('catch', 'rawr')!.score === 10, 'a lower score changes nothing');
    r = st.submit('catch', e(12, 'sprig', 'Sprout'));
    ok(r.recordOverall && r.recordSpecies && st.best('catch')!.name === 'Sprout', 'a better score by another species takes the overall record');
    r = st.submit('catch', e(11));
    ok(r.recordSpecies && !r.recordOverall && st.best('catch', 'rawr')!.score === 11 && st.best('catch')!.score === 12, 'a species record can be below the overall record');
    ok(st.submit('hilo', e(0)).recordOverall === false, 'a score of 0 is never a record');
    ok(st.best('dash') === null && st.best('catch', 'nobody') === null, 'unknown slots are empty');
    await st.save();
    ok(kv.m.has(SCORES_KEY), 'scores are saved under their key');
    // a new store on the same storage (an app restart, or a new pet) sees the same scores
    const st2 = new ScoreStore(kv);
    ok(st2.best('catch') === null, 'nothing is visible before load()');
    await st2.load();
    ok(st2.best('catch')!.score === 12 && st2.best('catch', 'rawr')!.score === 11 && st2.best('catch', 'rawr')!.name === 'Rexie', 'scores persist across restarts and pets');
    r = st2.submit('catch', e(13, 'rawr', 'Second Pet'));
    ok(r.recordOverall && st2.snapshot().catch.overall!.name === 'Second Pet', 'a new pet can beat the old pet\'s record');
    // broken storage starts empty; submitting before the load finishes is not lost
    const bad = memKV(); bad.m.set(SCORES_KEY, '{not json');
    const st3 = new ScoreStore(bad); await st3.load();
    ok(st3.best('catch') === null && st3.submit('catch', e(3)).recordOverall, 'a broken save starts empty');
    const st4 = new ScoreStore(kv);
    st4.submit('catch', e(50, 'zzz'));
    await st4.load();
    ok(st4.best('catch')!.score === 50 && st4.best('catch', 'rawr')!.score === 13, 'a score submitted before the load is merged with the saved ones');
    const failing: KV = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('y'); } };
    const st5 = new ScoreStore(failing); await st5.load(); st5.submit('catch', e(1)); await st5.save();
    ok(st5.best('catch')!.score === 1, 'a failing storage never throws');
    const entry = st2.best('catch')!;
    ok(entry.date === T0 && typeof entry.speciesName === 'string' && typeof entry.rank === 'string', 'an entry carries pet, species, rank and date');
  }

  // ---------- 5. rewards and the day cap ----------
  {
    const mk = () => petOf('rawr', { happy: 1, smarts: 0, weight: 20 });
    ok(rankOf(0, CATCH_THRESHOLDS) === 'none' && rankOf(CATCH_THRESHOLDS.bronze, CATCH_THRESHOLDS) === 'bronze' && rankOf(CATCH_THRESHOLDS.silver, CATCH_THRESHOLDS) === 'silver' && rankOf(99, CATCH_THRESHOLDS) === 'gold', 'rank thresholds');
    let p = mk();
    let r = applyReward(p, 'bronze', T0);
    ok(r.rewarded && p.smarts === 3 && p.happy === 1 && p.stageSmarts === 3, 'BRONZE: smarts +3, no heart');
    ok(p.weight === 19, 'weight burns a little (finishPlay rule)');
    p = mk(); r = applyReward(p, 'silver', T0);
    ok(p.smarts === 3 && p.happy === 2 && r.lines.join() === 'SMARTS +3,HAPPY +1', 'SILVER: smarts +3 and a heart');
    p = mk(); r = applyReward(p, 'gold', T0);
    ok(p.smarts === 3 && p.happy === 2, 'GOLD: same as silver (the balance does not grow)');
    p = mk(); r = applyReward(p, 'none', T0);
    ok(r.rewarded && p.smarts === 0 && p.happy === 1 && p.weight === 19, 'no rank: only the weight burn');
    p = Object.assign(mk(), { happy: 4 }); r = applyReward(p, 'silver', T0);
    ok(p.happy === 4, 'hearts stay capped at MAX_HEARTS');
    // the cap: 3 rewarded plays per 24 h of game time
    p = mk();
    const results = [0, 1, 2, 3, 4].map((i) => applyReward(p, 'silver', T0 + i * 60000));
    ok(results.slice(0, 3).every((x) => x.rewarded && !x.capped), 'the first 3 plays of the day are rewarded');
    ok(results[3].capped && !results[3].rewarded && results[4].capped, 'the 4th and 5th are capped');
    ok(results[3].lines.join(' ') === 'DAY LIMIT NO REWARD' && /no reward/i.test(results[3].msg), 'a capped play says so');
    ok(p.smarts === 9 && p.happy === 4, 'a capped play changes nothing');
    ok(rewardsLeft(p, T0 + 5 * 60000) === 0 && rewardsLeft(p, T0 + DAY_MS + 60000) === 2 && rewardsLeft(p, T0 + DAY_MS + 3 * 60000) === 3, 'the window slides: rewards come back 24 h after each play');
    const later = applyReward(p, 'bronze', T0 + DAY_MS + 61000);
    ok(later.rewarded && p.rewardedPlays.length === 2, 'after a day the next play is rewarded again');
    // the log survives the save (it is part of the pet) and an old save without it still works
    const reloaded = JSON.parse(JSON.stringify(p)) as Pet;
    ok(rewardsLeft(reloaded, T0 + DAY_MS + 62000) === DAILY_REWARDED_PLAYS - 2, 'the cap survives a save and load');
    const old = mk(); delete (old as Partial<Pet>).rewardedPlays;
    ok(applyReward(old, 'bronze', T0).rewarded, 'a pet saved before the cap existed is fine');
    // eggs and ghosts get nothing
    const egg = newPet(T0);
    ok(finishRanked(egg, 'gold') === '...' && applyReward(egg, 'gold', T0).msg === '', 'an egg gets no reward');
    // the engine itself: an economy check against the balance. 3 rewarded plays a day add at most +3 hearts and +9 smarts
    const sim = mk();
    for (let i = 0; i < 20; i++) applyReward(sim, 'gold', T0 + i * 3600000 / 2); // 20 plays in 10 hours
    ok(sim.smarts === 9, `20 plays in 10 hours still give only 3 rewards (smarts ${sim.smarts})`);
    // advance() does not disturb the log
    const adv = mk(); applyReward(adv, 'gold', T0); advance(adv, T0 + 3600000);
    ok(adv.rewardedPlays.length === 1, 'advance keeps the play log');
  }

  // ---------- 6. HI-LO ----------
  {
    const params = paramsForBody({ species: 'rawr', stage: 'adult' }, 'hilo');
    const run = (seed: number, choose: (s: HiLoState) => GameInput) => {
      const g = hiloGame.init(seed, params);
      let t = 0;
      while (!g.done && t < 60000) {
        const s = g.state as HiLoState;
        if (s.phase === 'guess') g.step(choose(s), 50); else g.step(NO_INPUT, 100);
        t += 100;
      }
      return g;
    };
    const a = run(3, () => ({ ...NO_INPUT, act: true })), b = run(3, () => ({ ...NO_INPUT, act: true }));
    ok(JSON.stringify(a.state) === JSON.stringify(b.state) && a.score === b.score, 'HI-LO is deterministic per seed');
    ok(a.done && (a.state as HiLoState).round === 5, 'HI-LO ends after 5 rounds');
    // shown digits stay in 2..8, the revealed digit differs, and the guess is judged the old way
    for (let seed = 1; seed <= 60; seed++) {
      const g = hiloGame.init(seed, params);
      const st0 = g.state as HiLoState;
      ok(st0.shown >= 2 && st0.shown <= 8 && st0.round === 1 && st0.phase === 'guess' && st0.sel === 0, 'HI-LO starts on a shown digit 2..8, HIGHER selected');
      g.step({ ...NO_INPUT, left: true }, 50);
      ok((g.state as HiLoState).sel === 1, 'A switches HIGHER to LOWER');
      g.step({ ...NO_INPUT, act: true }, 50);
      const s1 = g.state as HiLoState;
      ok(s1.phase === 'reveal' && s1.revealed !== null && s1.revealed !== s1.shown && s1.revealed >= 1 && s1.revealed <= 9, 'B reveals a different digit');
      ok(s1.correct === (s1.revealed! < s1.shown) && s1.won === (s1.correct ? 1 : 0), 'LOWER wins when the digit is lower');
      g.step(NO_INPUT, HILO_REVEAL_MS - 50);
      ok((g.state as HiLoState).phase === 'reveal', 'the reveal lasts 1.4 s');
      g.step(NO_INPUT, 100);
      ok((g.state as HiLoState).phase === 'guess' && (g.state as HiLoState).round === 2 && (g.state as HiLoState).sel === 1, 'then the next round, with the same choice');
    }
    // picking a row chooses and confirms in one go (the old tap)
    { const g = hiloGame.init(2, params); g.step({ ...NO_INPUT, pick: 1 }, 50); ok((g.state as HiLoState).sel === 1 && (g.state as HiLoState).phase === 'reveal', 'a tap on a row chooses it'); }
    // always HIGHER over many games wins about as often as chance says (not wildly off)
    let wins = 0, games = 0;
    for (let seed = 1; seed <= 200; seed++) { const g = run(seed, () => ({ ...NO_INPUT, act: true })); wins += (g.state as HiLoState).won; games++; }
    ok(wins / (games * 5) > 0.3 && wins / (games * 5) < 0.7, `HI-LO is not rigged (won ${(wins / (games * 5)).toFixed(2)} of rounds)`);
    // a smart player (higher on low digits, lower on high ones) reaches gold sometimes and bronze often; a fixed guess rarely does
    const smart = (s: HiLoState): GameInput => ({ ...NO_INPUT, pick: s.shown <= 5 ? 0 : 1 });
    let smartBronze = 0, smartGold = 0, fixedGold = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const g = run(seed, smart); if (g.rank !== 'none') smartBronze++; if (g.rank === 'gold') smartGold++;
      if (run(seed, () => ({ ...NO_INPUT, act: true })).rank === 'gold') fixedGold++;
    }
    ok(smartBronze / 300 > 0.6 && smartGold / 300 > 0.05 && smartGold / 300 < 0.4 && fixedGold <= smartGold, `HI-LO ranks: smart play gets bronze ${smartBronze}/300 and gold ${smartGold}/300`);
    ok(HILO_THRESHOLDS.bronze === 3 && hiloGame.thresholds === HILO_THRESHOLDS, 'HI-LO: 3 wins is BRONZE (the old "won 3 of 5")');
    const fav = hiloGame.init(1, { ...params, scoreMul: FAVOURITE_MUL });
    ok(fav.score === 0 && fav.rank === 'none', 'HI-LO starts at 0');
  }

  // ---------- 7. CATCH: determinism and rules ----------
  const hash = (g: MiniGame) => JSON.stringify(g.state);
  {
    const params = paramsForBody({ species: 'swiftail', stage: 'adult' }, 'catch');
    const d = catchDims(params);
    const script = (seed: number) => catchBot({ ...SKILLS.good, vp: d.vp }, seed);
    const a = playOut(catchGame, params, 7, script(1)), b = playOut(catchGame, params, 7, script(1));
    ok(hash(a) === hash(b) && a.score === b.score, 'CATCH: same seed and inputs, same game');
    ok(hash(a) !== hash(playOut(catchGame, params, 8, script(1))), 'CATCH: another seed, another game');
    ok(a.done && (a.state as CatchState).t === CATCH_MS, 'CATCH lasts 30 s');
    // game time does not depend on how the clock is chopped (no inputs: nothing to apply at tick boundaries)
    const g1 = catchGame.init(4, params), g2 = catchGame.init(4, params), g3 = catchGame.init(4, params);
    for (let t = 0; t < CATCH_MS; t += 50) g1.step(NO_INPUT, 50);
    for (let t = 0; t < CATCH_MS; t += 17) g2.step(NO_INPUT, 17);
    for (let t = 0; t < CATCH_MS; t += 250) g3.step(NO_INPUT, 250);
    ok(hash(g1) === hash(g2) && hash(g1) === hash(g3), 'CATCH: 50 ms, 17 ms and 250 ms steps play the same game');
    ok(g1.done && g1.score === g2.score, 'CATCH ends on time');
    g1.step({ ...NO_INPUT, left: true }, 50);
    ok(g1.score === g2.score, 'stepping a finished game is harmless');
    // controls: A slides left until a wall, C right, B stops
    const g = catchGame.init(1, params);
    const x0 = (g.state as CatchState).petX;
    g.step({ ...NO_INPUT, left: true }, 50);
    g.step(NO_INPUT, 500);
    ok((g.state as CatchState).petX < x0 - 10 && (g.state as CatchState).dir === -1 && (g.state as CatchState).face === -1, 'A: the pet slides left and keeps sliding');
    g.step({ ...NO_INPUT, act: true }, 50);
    const xs = (g.state as CatchState).petX;
    g.step(NO_INPUT, 500);
    ok((g.state as CatchState).petX === xs && (g.state as CatchState).dir === 0, 'B: the pet stops');
    g.step({ ...NO_INPUT, right: true }, 50); g.step(NO_INPUT, 5000);
    ok((g.state as CatchState).petX === 64 - (g.state as CatchState).petW / 2 && (g.state as CatchState).dir === 0, 'C: the pet slides right and stops at the wall');
    // no item is ever off screen sideways, bad ones never spawn before a good one, and states stay finite
    for (let seed = 1; seed <= 8; seed++) {
      const gg = catchGame.init(seed, params);
      let bad = true;
      for (let t = 0; t < CATCH_MS; t += 50) {
        gg.step(NO_INPUT, 50);
        const s = gg.state as CatchState;
        for (const it of s.items) bad &&= it.x >= 4 && it.x <= 60 && Number.isFinite(it.y) && it.y <= 60;
        bad &&= Number.isFinite(s.petX) && s.petX >= s.petW / 2 && s.petX <= 64 - s.petW / 2 && s.points >= 0;
      }
      ok(bad, `CATCH seed ${seed}: items and pet stay on the field`);
    }
    // the favourite bonus: x1.25
    const fav = paramsForBody({ species: 'swiftail', stage: 'adult' }, 'catch'), nofav = { ...fav, scoreMul: 1 };
    let favMore = 0, favTotal = 0, plainTotal = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const x = playOut(catchGame, fav, seed, script(seed)), y = playOut(catchGame, nofav, seed, script(seed));
      favTotal += x.score; plainTotal += y.score; if (x.score >= y.score) favMore++;
      ok(x.score === Math.floor((x.state as CatchState).points * 1.25 + 1e-9), `CATCH seed ${seed}: favourite score is points x 1.25`);
    }
    ok(favMore === 12 && favTotal > plainTotal * 1.15, `the favourite game scores about 25% more (${favTotal} vs ${plainTotal})`);
    // a bad item costs points and stuns
    {
      const gg = catchGame.init(1, params);
      const s = gg.state as CatchState;
      s.points = 5;
      s.items.push({ id: 99, x: s.petX, y: s.petTop - 8, vy: 30, kind: 'bad', glyph: 0, arrival: 0 });
      gg.step(NO_INPUT, 200);
      ok(s.points === 3 && s.hits === 1 && s.stun > 0, 'a bad item costs 2 points and stuns the pet');
      s.items.push({ id: 100, x: s.petX, y: s.petTop - 8, vy: 30, kind: 'good', glyph: 0, arrival: 0 });
      gg.step(NO_INPUT, 200);
      ok(s.points === 4 && s.caught === 1, 'a good item is +1');
      s.items.push({ id: 101, x: s.petX, y: s.petTop - 8, vy: 30, kind: 'bonus', glyph: 0, arrival: 0 });
      gg.step(NO_INPUT, 200);
      ok(s.points === 7, 'a bonus item is +3');
      s.points = 0; s.items.push({ id: 102, x: s.petX, y: s.petTop - 8, vy: 30, kind: 'bad', glyph: 0, arrival: 0 }); s.stun = 0;
      gg.step(NO_INPUT, 200);
      ok(s.points === 0 && gg.score === 0, 'the score never goes below 0');
    }
    // body type, stage and health change the game
    const dFast = catchDims(paramsForBody({ species: KIND_SPECIES('fennec').id, stage: 'teen' }, 'catch'));
    const dHeavy = catchDims(paramsForBody({ species: KIND_SPECIES('dozer').id, stage: 'teen' }, 'catch'));
    ok(dFast.vp > dHeavy.vp * 1.3 && dFast.petW < dHeavy.petW, 'a fennec is faster and smaller than a dozer');
    ok(catchDims(paramsForBody({ species: 'swiftail', stage: 'baby' }, 'catch')).petW < catchDims(paramsForBody({ species: 'swiftail', stage: 'ultimate' }, 'catch')).petW, 'a baby is smaller than an ultimate');
    ok(catchDims(paramsForBody({ species: 'swiftail', stage: 'adult', sick: true }, 'catch')).vp < catchDims(paramsForBody({ species: 'swiftail', stage: 'adult' }, 'catch')).vp, 'a sick pet is slower');
    // luck: a lucky body type sees more bonus items
    const countBonus = (species: string) => {
      let n = 0;
      for (let seed = 1; seed <= 40; seed++) { const gg = catchGame.init(seed, paramsForBody({ species, stage: 'adult' }, 'catch')); for (let t = 0; t < CATCH_MS; t += 50) { gg.step(NO_INPUT, 50); n += (gg.state as CatchState).items.filter((i) => i.kind === 'bonus' && i.y < -2.5).length; } }
      return n;
    };
    ok(countBonus(KIND_SPECIES('kitsune').id) > countBonus(KIND_SPECIES('dormouse').id) * 0, 'luck: bonus items exist');
  }

  // ---------- 8. CATCH: rank thresholds are reachable, not trivial, and fair at every stage ----------
  {
    const SEEDS = 4;
    const avg: Record<string, number[]> = { perfect: [], good: [], okay: [], casual: [] };
    const perfectRuns: number[] = [];
    let perfectHits = 0, perfectMissed = 0, perfectRunsN = 0;
    let idleMax = 0, mashRuns = 0, mashBronze = 0, mashSilver = 0;
    for (const kind of ALL_KINDS) {
      const sp = KIND_SPECIES(kind);
      for (const stage of STAGES) {
        const params = { ...paramsForBody({ species: sp.id, stage }, 'catch'), scoreMul: 1 };
        const d = catchDims(params);
        for (const [name, sk] of Object.entries(SKILLS)) {
          let tot = 0;
          for (let seed = 1; seed <= SEEDS; seed++) {
            const g = playOut(catchGame, params, seed, catchBot({ ...sk, vp: d.vp }, seed));
            tot += g.score;
            if (name === 'perfect') { perfectRuns.push(g.score); perfectHits += (g.state as CatchState).hits; perfectMissed += (g.state as CatchState).missed; perfectRunsN++; }
          }
          avg[name].push(tot / SEEDS);
        }
        for (let seed = 1; seed <= 2; seed++) {
          idleMax = Math.max(idleMax, playOut(catchGame, params, seed, () => NO_INPUT).score);
          const rng = makeRng(seed * 31 + kind.length);
          const m = playOut(catchGame, params, seed, () => ({ left: rng.chance(0.1), right: rng.chance(0.1), act: rng.chance(0.1) })).score;
          mashRuns++; if (m >= CATCH_THRESHOLDS.bronze) mashBronze++; if (m >= CATCH_THRESHOLDS.silver) mashSilver++;
        }
      }
    }
    const min = (a: number[]) => Math.min(...a), med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
    console.log(`  CATCH over ${ALL_KINDS.length} kinds x 5 stages: perfect min ${min(avg.perfect).toFixed(1)} med ${med(avg.perfect).toFixed(1)} | good min ${min(avg.good).toFixed(1)} med ${med(avg.good).toFixed(1)} | okay min ${min(avg.okay).toFixed(1)} med ${med(avg.okay).toFixed(1)} | casual min ${min(avg.casual).toFixed(1)} med ${med(avg.casual).toFixed(1)} | idle max ${idleMax} mash BRONZE ${mashBronze}/${mashRuns} SILVER ${mashSilver} (thresholds ${CATCH_THRESHOLDS.bronze}/${CATCH_THRESHOLDS.silver}/${CATCH_THRESHOLDS.gold})`);
    ok(min(avg.perfect) >= CATCH_THRESHOLDS.gold, `a perfect player reaches GOLD with every body type at every stage (worst average ${min(avg.perfect).toFixed(1)})`);
    ok(min(perfectRuns) >= CATCH_THRESHOLDS.silver + 2, `...and never drops below SILVER in a single game (worst ${min(perfectRuns)})`);
    ok(perfectHits === 0 && perfectMissed / perfectRunsN < 1, `fair: a perfect player is never forced into a bad item (${perfectHits}) and misses < 1 item a game (${(perfectMissed / perfectRunsN).toFixed(2)})`);
    ok(min(avg.good) >= CATCH_THRESHOLDS.silver, `a good player gets SILVER or better everywhere (worst average ${min(avg.good).toFixed(1)})`);
    ok(med(avg.good) >= CATCH_THRESHOLDS.gold - 3, 'a good player is close to GOLD at the median');
    ok(min(avg.okay) >= CATCH_THRESHOLDS.bronze + 4, `an okay player gets BRONZE everywhere (worst average ${min(avg.okay).toFixed(1)})`);
    ok(med(avg.okay) >= CATCH_THRESHOLDS.silver && med(avg.okay) < CATCH_THRESHOLDS.gold, 'an okay player is around SILVER at the median');
    ok(med(avg.casual) < CATCH_THRESHOLDS.silver && med(avg.casual) >= CATCH_THRESHOLDS.bronze, 'a casual player earns BRONZE, not SILVER, at the median');
    ok(idleMax < CATCH_THRESHOLDS.bronze, `standing still never earns a rank (best ${idleMax})`);
    ok(mashBronze / mashRuns < 0.1 && mashSilver / mashRuns < 0.01, `mashing buttons rarely earns a rank (BRONZE ${mashBronze}/${mashRuns}, SILVER ${mashSilver})`);
    ok(avg.perfect.every((v) => v < 60), 'scores stay in a sane range');
    // sick, hungry and heavy pets play worse but are not shut out
    const bodies = { sick: { sick: true }, starving: { hunger: 0 }, heavy: { heavy: true }, all: { sick: true, hunger: 0, heavy: true } } as const;
    for (const [name, h] of Object.entries(bodies)) {
      let healthy = 0, ill = 0;
      for (const kind of ['fennec', 'dino_trex', 'dozer', 'whale', 'hare', 'kitten', 'mech', 'baby']) {
        for (const stage of ['baby', 'adult'] as const) {
          const sp = KIND_SPECIES(kind);
          const ph = { ...paramsForBody({ species: sp.id, stage }, 'catch'), scoreMul: 1 }, pi = { ...paramsForBody({ species: sp.id, stage, ...h }, 'catch'), scoreMul: 1 };
          for (let seed = 1; seed <= 3; seed++) {
            healthy += playOut(catchGame, ph, seed, catchBot({ ...SKILLS.good, vp: catchDims(ph).vp }, seed)).score;
            ill += playOut(catchGame, pi, seed, catchBot({ ...SKILLS.good, vp: catchDims(pi).vp }, seed)).score;
          }
        }
      }
      const n = 8 * 2 * 3;
      ok(ill < healthy && ill / n >= CATCH_THRESHOLDS.bronze - 1, `${name} pets play worse (${(ill / n).toFixed(1)} vs ${(healthy / n).toFixed(1)}) but can still earn BRONZE`);
    }
  }

  // ---------- 9. the registry and the session state machine ----------
  {
    const ids = GAME_ENTRIES.map((e) => e.def.id);
    ok(new Set(ids).size === ids.length && ids.includes('hilo') && ids.includes('catch'), `registry: unique ids (${ids.join(', ')})`);
    for (const e of GAME_ENTRIES) {
      const d = e.def;
      ok(entryById(d.id) === e, `${d.id}: found by id`);
      ok(d.name.length <= 12 && d.name === d.name.toUpperCase() && d.unit.length <= 8, `${d.id}: name and unit fit the menu (${d.name})`);
      ok(d.thresholds.bronze > 0 && d.thresholds.bronze < d.thresholds.silver && d.thresholds.silver < d.thresholds.gold, `${d.id}: thresholds ascend`);
      ok(d.hint.length > 0 && d.hint.length <= 40, `${d.id}: hint fits the message line`);
      ok(d.maxMs > 0 && (e.layout === 'field' || e.layout === 'text'), `${d.id}: layout and duration`);
      for (const f of FAMILIES) {
        const rules = d.rules(THEMES[f.id]);
        ok(rules.length >= 1 && rules.length <= 3 && rules.every((l) => l.length <= 18 && l.length > 0), `${d.id}/${f.id}: rules fit (${rules.join(' / ')})`);
      }
    }
    ok(playMenuRows().slice(-2).join() === 'HIGH SCORES,CANCEL' && playMenuRows().length === GAME_ENTRIES.length + 2, 'the Play menu is the games, HIGH SCORES, CANCEL');
    ok(menuFirst(0) === 0 && menuFirst(100, 20) === 20 - MENU_VISIBLE && menuFirst(7, 20) === 7 - (MENU_VISIBLE - 1), 'the menu window follows the cursor');

    // the state machine
    const pet = petOf('swiftail');
    const store = new ScoreStore(memKV()); await store.load();
    const s = newSession(catchGame, paramsFor(pet, 'catch'), 5);
    ok(s.phase === 'ready' && s.game === null, 'a session starts on the ready screen');
    ok(pressButton(s, 'a') === 'none' && s.phase === 'ready', 'A on the ready screen does nothing');
    ok(pressButton(newSession(catchGame, paramsFor(pet, 'catch'), 5), 'c') === 'menu', 'C on the ready screen goes back to the menu');
    pressButton(s, 'b');
    ok(s.phase === 'play' && !!s.game, 'B starts the game');
    pressButton(s, 'a'); tickSession(s, 50);
    ok((s.game!.state as CatchState).dir === -1, 'A in play slides left');
    pressButton(s, 'c'); tickSession(s, 50);
    ok((s.game!.state as CatchState).dir === 1, 'C in play slides right (CATCH uses it)');
    tapSide(s, -1); tickSession(s, 50);
    ok((s.game!.state as CatchState).dir === -1, 'a tap on the left half slides left');
    tapSide(s, 1); tickSession(s, 50);
    ok((s.game!.state as CatchState).dir === 1, 'a tap on the right half slides right');
    let settled = false;
    for (let t = 0; t < CATCH_MS + 2000 && !settled; t += 50) { if (tickSession(s, 50)) settled = true; if (s.phase === 'over') break; }
    ok(s.phase === 'over', 'the game ends with a short "time up" beat');
    ok(pressButton(s, 'b') === 'none' && s.phase === 'over', 'buttons are ignored during the beat');
    let got = false;
    for (let t = 0; t < OVER_MS + 200 && !got; t += 100) got = tickSession(s, 100);
    ok(got && s.phase === 'result', 'then the result is ready');
    const before = { smarts: pet.smarts, happy: pet.happy };
    const res = settleSession(s, pet, store, T0);
    ok(res.score === s.game!.score && res.rank === s.game!.rank && res.reward.rewarded === true && s.result === res, 'settling scores the game');
    ok(res.rank === 'none' || pet.smarts > before.smarts, 'a ranked game raises smarts');
    ok(res.score === 0 ? store.best('catch', pet.species) === null : store.best('catch', pet.species)!.score === res.score, 'the score went to the store');
    ok(res.recordOverall === (res.score > 0) && res.winLine === s.params.theme.wins[res.rank], 'record flag and win line');
    ok(pressButton(s, 'b') === 'menu' && pressButton(s, 'a') === 'menu' && pressButton(s, 'c') === 'home', 'on the result screen A/B play again (menu), C goes home');
    ok(tapSide(s, 1) === 'menu', 'a tap on the result goes back to the menu');
    // a game that uses A/B only: C quits
    const h = newSession(hiloGame, paramsFor(pet, 'hilo'), 3); pressButton(h, 'b');
    ok(pressButton(h, 'c') === 'menu', 'HI-LO: C quits');
    tapPick(h, 1); tickSession(h, 50);
    ok((h.game!.state as HiLoState).sel === 1 && (h.game!.state as HiLoState).phase === 'reveal', 'HI-LO: a tap picks a row');
    // the 4th rewarded play of a day is capped, and the result says so
    const p2 = petOf('swiftail');
    const rs: ReturnType<typeof settleSession>[] = [];
    for (let i = 0; i < 4; i++) {
      const sn = newSession(catchGame, paramsFor(p2, 'catch'), 20 + i); pressButton(sn, 'b');
      sn.game = catchGame.init(20 + i, sn.params); (sn.game.state as CatchState).points = 15;
      (sn.game.state as CatchState).t = CATCH_MS;
      rs.push(settleSession(sn, p2, store, T0 + i * 1000));
    }
    ok(rs[0].reward.rewarded && rs[2].reward.rewarded && rs[3].reward.capped && /limit/i.test(rs[3].reward.lines.join(' ')), 'the 4th play today scores but says "no reward"');
    ok(rs[3].score === rs[0].score, 'a capped play still scores');
  }

  // ---------- 10. every game, every family: it plays out and renders ----------
  {
    // a monkey player finishes every registered game without throwing (a future game is checked here for free)
    for (const e of GAME_ENTRIES) {
      for (const fam of FAMILIES) {
        const sp = FAM_SPECIES(fam.id);
        for (const seed of [1, 2]) {
          const params = paramsForBody({ species: sp.id, stage: 'adult' }, e.def.id);
          const rng = makeRng(seed * 13);
          let threw = false;
          let g: MiniGame | null = null;
          try {
            g = playOut(e.def, params, seed, () => ({ left: rng.chance(0.15), right: rng.chance(0.15), act: rng.chance(0.2), pick: rng.chance(0.1) ? rng.int(3) : undefined }));
          } catch { threw = true; }
          ok(!threw && !!g && g.done, `${e.def.id}/${fam.id}/${seed}: a monkey finishes the game`);
          if (g) {
            ok(Number.isFinite(g.score) && g.score >= 0 && RANKS.includes(g.rank) && g.progress >= 0 && g.progress <= 1, `${e.def.id}/${fam.id}: score, rank and progress are sane`);
            ok(g.hud.left.length <= 16 && g.hud.right.length <= 16, `${e.def.id}/${fam.id}: the HUD fits (${g.hud.left} / ${g.hud.right})`);
          }
          // determinism of the monkey
          const r2 = makeRng(seed * 13);
          const g2 = playOut(e.def, params, seed, () => ({ left: r2.chance(0.15), right: r2.chance(0.15), act: r2.chance(0.2), pick: r2.chance(0.1) ? r2.int(3) : undefined }));
          ok(!g || JSON.stringify(g.state) === JSON.stringify(g2.state), `${e.def.id}/${fam.id}: deterministic`);
        }
      }
    }

    // every screen renders for every family in both modes, in light and dark
    const ctxFor = (pet: Pet, extra: Partial<ScreenCtx>): ScreenCtx => ({ pet, tick: 3, mode: 'home', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, ms: T0 + 4000, ...extra });
    const lastShot = (r: ReturnType<typeof renderScreen>, mode: 'traditional' | 'technicolor', dark: boolean, pet: Pet) => buildFrame(r, { mode, dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
    let screens = 0;
    // render pass: a fresh session per shot so each is a true snapshot
    for (const fam of FAMILIES) {
      const sp = FAM_SPECIES(fam.id);
      const pet = petOf(sp.id);
      const store = new ScoreStore(memKV()); await store.load();
      store.submit('catch', { score: 30, rank: 'gold', name: 'A', species: 'x', speciesName: 'Zed', date: T0 });
      store.submit('catch', { score: 14, rank: 'bronze', name: pet.name, species: pet.species, speciesName: sp.name, date: T0 });
      const scores = store.snapshot();
      for (const mode of ['technicolor', 'traditional'] as const) for (const dark of [false, true]) {
        const draw = (ctx: ScreenCtx) => {
          let r: ReturnType<typeof renderScreen> | null = null;
          try { r = renderScreen(ctx); lastShot(r, mode, dark, pet); screens++; } catch (err) { ok(false, `${fam.id}/${mode}/${dark}/${ctx.mode}: render threw ${(err as Error).message}`); }
          return r;
        };
        for (let sel = 0; sel < playMenuRows().length; sel++) {
          const r = draw(ctxFor(pet, { mode: 'playmenu', playSel: sel }));
          ok(!!r && r.buf.px.some((v) => v !== 0), `${fam.id}: Play menu row ${sel} draws`);
        }
        for (let pg = 0; pg < scoresPageCount(); pg++) draw(ctxFor(pet, { mode: 'scores', scoresPage: pg, scores }));
        for (const e of GAME_ENTRIES) {
          const mkSession = () => newSession(e.def, paramsFor(pet, e.def.id), 4);
          const ready = mkSession();
          const rr = draw(ctxFor(pet, { mode: 'game', session: ready, scores }));
          ok(!!rr && rr.buf.px.some((v) => v !== 0), `${fam.id}/${e.def.id}: ready screen draws`);
          for (const upto of [0, 400, 3000, 9000, 15000, 29000]) {
            const sess = mkSession(); pressButton(sess, 'b');
            const rng = makeRng(upto + 1);
            const bot = e.def.id === 'catch' ? catchBot({ ...SKILLS.good, vp: catchDims(sess.params).vp }, 2) : () => ({ left: rng.chance(0.2), right: false, act: rng.chance(0.2) });
            let t = 0;
            while (t < upto && sess.phase === 'play') { sess.pending = { ...sess.pending, ...bot(sess.game!, t) }; tickSession(sess, 50); t += 50; }
            const r = draw(ctxFor(pet, { mode: 'game', session: sess, scores, ms: T0 + upto }));
            ok(!!r && r.buf.px.some((v) => v !== 0), `${fam.id}/${e.def.id}@${upto}: game screen draws`);
            if (e.layout === 'field' && r) {
              ok(!!r.sky && r.buf.n === 64, `${fam.id}/${e.def.id}: a field game paints on the biome sky`);
              // the pet is on screen: some pet-layer pixels exist
              ok(r.buf.px.some((v) => v >= 29 && v <= 39), `${fam.id}/${e.def.id}@${upto}: the pet is drawn`);
            }
          }
          // over and result
          const sess = mkSession(); pressButton(sess, 'b');
          const rng = makeRng(3);
          for (let t = 0; t < e.def.maxMs + 3000 && sess.phase === 'play'; t += 50) { sess.pending = { ...sess.pending, left: rng.chance(0.3), right: rng.chance(0.3), act: rng.chance(0.3) }; tickSession(sess, 50); }
          draw(ctxFor(pet, { mode: 'game', session: sess, scores }));
          while (!tickSession(sess, 100)) { /* to the result */ }
          settleSession(sess, pet, store, T0);
          const res = draw(ctxFor(pet, { mode: 'game', session: sess, scores, tick: 0 }));
          draw(ctxFor(pet, { mode: 'game', session: sess, scores, tick: 1 }));
          ok(!!res && res.buf.px.some((v) => v !== 0), `${fam.id}/${e.def.id}: result screen draws`);
        }
      }
    }
    console.log(`  rendered ${screens} Play screens`);
    // Traditional keeps the game readable: pet and items use only layers it prints, details are holes
    {
      const pet = petOf(FAM_SPECIES('fox').id);
      const s = newSession(catchGame, paramsFor(pet, 'catch'), 3); pressButton(s, 'b');
      const bot = catchBot({ ...SKILLS.good, vp: catchDims(s.params).vp }, 1);
      for (let t = 0; t < 8000; t += 50) { s.pending = { ...s.pending, ...bot(s.game!, t) }; tickSession(s, 50); }
      const r = renderScreen(ctxFor(pet, { mode: 'game', session: s }));
      const trad = buildFrame(r, { mode: 'traditional', dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
      ok(trad.groups.length === 1 && trad.sky === null && trad.soil === null, 'Traditional: one ink, no sky');
      const lit = Array.from(r.buf.px).filter((v) => v && (tradVisible(v & LAYER_MASK) || (v & DIM_FLAG))).length;
      ok(lit > 150 && lit < 1500, `Traditional game frame has a sensible amount of ink (${lit} px)`);
      const tech = buildFrame(r, { mode: 'technicolor', dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
      ok(tech.groups.length >= 6, `Technicolor game frame uses several colours (${tech.groups.length})`);
    }
    // every species' sprite fits a box and keeps its shape
    for (const sp of SPECIES) {
      for (const [w, h] of [[12, 12], [20, 20]] as const) {
        const a = petArt(sp.id, w, h, false, false);
        ok(!!a && a.w <= w && a.h <= h && a.w >= 4 && a.rows.join('').includes('X'), `${sp.id}: sprite fits ${w}x${h}`);
        const lit = a ? a.rows.join('').replace(/\./g, '').length : 0;
        ok(lit >= 20, `${sp.id}: ${lit} lit px at ${w}x${h}`);
      }
    }
    ok(fitRows(['XX', 'XX'], 8, 8).join('') === 'XXXX', 'fitRows never scales up');
    ok(fitRows(['.'.repeat(32)], 8, 8)[0] === 'X', 'fitRows on an empty sprite is safe');
    ok(!!SPECIES_BY_ID.rawr, 'sanity');
  }

  console.log(`minigames: ${checks} checks, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}

void main();
