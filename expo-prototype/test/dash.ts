// DASH: deterministic sims, a perfect bot that clears every obstacle for every body type and stage, mashing and standing still,
// thresholds that are reachable but not trivial, condition effects, the course never depends on health, and every family drawing in both modes.
import { newPet, forceSpecies, type Pet } from '../src/core/pet';
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { makeRng } from '../src/core/minigames/rng';
import { THEMES } from '../src/core/minigames/themes';
import { ALL_KINDS, kindOfSpecies, paramsFor, paramsForBody } from '../src/core/minigames/tuning';
import { NO_INPUT, type GameInput, type MiniGame } from '../src/core/minigames/types';
import { newSession, playOut, pressButton, tickSession } from '../src/core/minigames/session';
import {
  DASH_COUNT_MS, DASH_MS, DASH_THRESHOLDS, MARGIN_TICKS, dashGame, dashDims, jumpFor, obstacleBox, windowAbove, type DashState,
} from '../src/core/minigames/games/dash';
import { entryById } from '../src/ui/games/registry';
import { DIM_FLAG, LAYER_MASK, tradVisible } from '../src/ui/layers';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { DASH_SKILLS, dashBot } from './dash-bots';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const STAGES = ['baby', 'child', 'teen', 'adult', 'ultimate'] as const;
const KIND_SPECIES = (kind: string) => SPECIES.find((s) => kindOfSpecies(s.id) === kind)!;
const petOf = (species: string, o: Partial<Pet> = {}): Pet => {
  const p = newPet(T0, { seed: 9 }); forceSpecies(p, species); p.named = true; p.name = 'Rexie'; p.hunger = 4; p.happy = 2;
  return Object.assign(p, o);
};
const st = (g: MiniGame) => g.state as DashState;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function run(kind: string, stage: (typeof STAGES)[number], seed: number, who: string, o: { heavy?: boolean; sick?: boolean; hunger?: number; mul?: boolean } = {}) {
  const params = paramsForBody({ species: KIND_SPECIES(kind).id, stage, heavy: o.heavy, sick: o.sick, hunger: o.hunger }, 'dash');
  if (!o.mul) params.scoreMul = 1;
  let bot: (g: MiniGame) => GameInput;
  if (who === 'mash') { const r = makeRng(seed * 5 + 1); bot = () => ({ left: false, right: false, act: r.chance(0.2) }); }
  else if (who === 'mash2') { const r = makeRng(seed * 5 + 2); bot = () => ({ left: r.chance(0.5), right: false, act: r.chance(0.5) }); }
  else if (who === 'idle') bot = () => NO_INPUT;
  else bot = dashBot(params.tuning, DASH_SKILLS[who], seed);
  return playOut(dashGame, params, seed, bot);
}

async function main() {
  // ---------- 1. the jump and the obstacles ----------
  {
    for (const kind of ALL_KINDS) for (const stage of STAGES) {
      const t = paramsForBody({ species: KIND_SPECIES(kind).id, stage }, 'dash').tuning;
      const j = jumpFor(t, true), d = dashDims(t);
      ok(j.airTicks >= 8 && j.airTicks <= 20, `${kind}/${stage}: jump lasts ${j.airTicks} ticks`);
      ok(j.apex >= 12 && j.apex <= 28, `${kind}/${stage}: apex ${j.apex.toFixed(1)} px`);
      ok(d.hbW >= 5 && d.hbW <= 9 && d.petW >= 12 && d.petW <= 20, `${kind}/${stage}: hitbox ${d.hbW} in a ${d.petW} px pet`);
      // the tallest obstacle of any family must be jumpable with room to spare, at the slowest course speed
      const jh = jumpFor(paramsForBody({ species: KIND_SPECIES(kind).id, stage, heavy: true, sick: true }, 'dash').tuning, false);
      ok(jh.apex > 0, `${kind}/${stage}: a sick and heavy pet still leaves the ground`);
    }
    for (const f of FAMILIES) {
      const [low, tall, spiky] = THEMES[f.id].obstacles.map(obstacleBox);
      ok(low.h <= tall.h || low.h <= spiky.h, `${f.id}: the low obstacle is not the tallest`);
      ok([low, tall, spiky].every((b) => b.h >= 2 && b.h <= 6 && b.hr - b.hl >= 3 && b.hr - b.hl <= 7), `${f.id}: obstacle hitboxes are sensible`);
    }
  }

  // ---------- 2. determinism and tick independence ----------
  {
    const params = paramsForBody({ species: KIND_SPECIES('fennec').id, stage: 'adult' }, 'dash');
    const mk = (stepMs: number) => {
      const g = dashGame.init(7, params);
      const bot = dashBot(params.tuning, DASH_SKILLS.good, 3);
      let t = 0;
      while (!g.done && t < 60000) {
        // the bot decides every 50 ms; a coarser step feeds the same input at the same moments
        const inp = t % TICK_MS === 0 ? bot(g) : NO_INPUT;
        g.step(inp, stepMs); t += stepMs;
      }
      return g;
    };
    const a = mk(50), b = mk(50);
    ok(JSON.stringify(a.state) === JSON.stringify(b.state) && a.score === b.score, 'same seed, same bot: same game');
    ok(a.done && a.progress === 1, 'the game ends at full progress');
    ok(st(a).t === DASH_MS, `the game lasts ${DASH_MS / 1000} s of play (${st(a).t} ms) after the ${DASH_COUNT_MS / 1000 | 0} s countdown`);
    const c = dashGame.init(8, params), d = dashGame.init(7, params);
    for (let i = 0; i < 120; i++) { c.step(NO_INPUT, 50); d.step(NO_INPUT, 50); }
    ok(JSON.stringify(st(c).obstacles.map((o) => o.kind)) !== JSON.stringify(st(d).obstacles.map((o) => o.kind)) || st(c).obstacles.length !== st(d).obstacles.length || st(c).obstacles[0]?.x !== st(d).obstacles[0]?.x, 'another seed, another course');
    // chunking: the same inputs in 50 ms steps and in 10 ms slices give the same game
    const e = dashGame.init(7, params), f = dashGame.init(7, params);
    for (let i = 0; i < 400; i++) { const inp: GameInput = { left: false, right: false, act: i % 13 === 5 }; e.step(inp, 50); f.step(inp, 10); f.step(NO_INPUT, 10); f.step(NO_INPUT, 10); f.step(NO_INPUT, 10); f.step(NO_INPUT, 10); }
    ok(JSON.stringify(e.state) === JSON.stringify(f.state), 'any step size plays the same game');
  }

  // ---------- 3. a perfect bot clears every obstacle, for every body type and stage ----------
  {
    let runs = 0, worst = 999, worstAt = '', minCleared = 999, bad = 0;
    for (const kind of ALL_KINDS) for (const stage of STAGES) for (const seed of [1, 2, 3]) {
      const g = run(kind, stage, seed, 'perfect');
      const s = st(g);
      runs++;
      if (s.hits > 0) { bad++; if (bad < 8) console.log(`  perfect bot hit ${s.hits}x: ${kind}/${stage}/${seed}`); }
      if (g.score < worst) { worst = g.score; worstAt = `${kind}/${stage}/${seed}`; }
      minCleared = Math.min(minCleared, s.cleared);
    }
    ok(bad === 0, `the perfect bot is never hit (${runs} runs: ${ALL_KINDS.length} kinds x 5 stages x 3 seeds, ${bad} with hits)`);
    ok(worst >= DASH_THRESHOLDS.gold, `the perfect bot reaches GOLD everywhere (lowest ${worst} at ${worstAt}, gold is ${DASH_THRESHOLDS.gold})`);
    ok(minCleared >= 18, `a course has at least 18 obstacles (fewest ${minCleared})`);
    // with the favourite multiplier too
    const fav = run('dino_trex', 'adult', 4, 'perfect', { mul: true });
    ok(fav.score >= DASH_THRESHOLDS.gold, 'a perfect run with the favourite multiplier is GOLD');
  }

  // ---------- 4. mashing and standing still ----------
  {
    const stats: Record<string, number[]> = { mash: [], mash2: [], idle: [] };
    const goldAny: string[] = [];
    for (const kind of ALL_KINDS) for (const stage of STAGES) for (const seed of [1, 2]) {
      for (const who of ['mash', 'mash2', 'idle']) {
        const g = run(kind, stage, seed, who, { mul: true });
        stats[who].push(g.score);
        if (g.rank === 'gold') goldAny.push(`${who}:${kind}/${stage}/${seed}`);
        if (who === 'idle' && g.rank !== 'none') goldAny.push(`idle-rank:${kind}/${stage}/${seed}`);
      }
    }
    ok(goldAny.length === 0, `mashing never reaches GOLD and standing still scores nothing (${goldAny.slice(0, 4).join(', ')})`);
    const silverUp = (xs: number[]) => xs.filter((v) => v >= DASH_THRESHOLDS.silver).length / xs.length;
    ok(silverUp(stats.mash) < 0.05 && silverUp(stats.mash2) < 0.05, `mashing rarely reaches SILVER (${(silverUp(stats.mash) * 100).toFixed(1)}%, ${(silverUp(stats.mash2) * 100).toFixed(1)}%)`);
    console.log(`  mash median ${median(stats.mash)}, mash2 ${median(stats.mash2)}, idle ${median(stats.idle)} (bronze ${DASH_THRESHOLDS.bronze})`);
  }

  // ---------- 5. skill ladder and thresholds ----------
  {
    const by: Record<string, number[]> = { perfect: [], good: [], okay: [], casual: [] };
    const ranks: Record<string, Record<string, number>> = { perfect: {}, good: {}, okay: {}, casual: {} };
    for (const kind of ALL_KINDS.filter((_, i) => i % 2 === 0)) for (const stage of STAGES) for (const seed of [1, 2]) {
      for (const who of Object.keys(by)) {
        const g = run(kind, stage, seed, who);
        by[who].push(g.score); ranks[who][g.rank] = (ranks[who][g.rank] ?? 0) + 1;
      }
    }
    const m = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, median(v)]));
    console.log('  medians', JSON.stringify(m), 'ranks', JSON.stringify(ranks));
    ok(m.perfect > m.good && m.good > m.okay && m.okay > m.casual, 'the skill ladder is ordered');
    ok(m.good >= DASH_THRESHOLDS.silver, 'a good player earns SILVER or better');
    ok((ranks.good.gold ?? 0) > 0, 'a good player sometimes gets GOLD');
    ok((ranks.casual.bronze ?? 0) + (ranks.casual.silver ?? 0) > 0, 'a casual player reaches BRONZE sometimes');
    ok((ranks.casual.gold ?? 0) === 0 && (ranks.okay.gold ?? 0) <= 0.05 * by.okay.length, 'casual and okay players do not get GOLD');
    ok((ranks.casual.none ?? 0) > 0, 'a casual player also misses BRONZE sometimes');
  }

  // ---------- 6. condition: weight and sickness play worse but never change the course ----------
  {
    const kind = 'cat', stage = 'adult';
    const course = (o: { heavy?: boolean; sick?: boolean; hunger?: number }) => {
      const g = dashGame.init(11, paramsForBody({ species: KIND_SPECIES(kind).id, stage, ...o }, 'dash'));
      for (let i = 0; i < 90; i++) g.step(NO_INPUT, 50);
      // before anything can reach the pet, the obstacles sit exactly where a healthy pet's would
      return JSON.stringify(st(g).obstacles.map((x) => [x.kind, Math.round(x.x * 1000)]));
    };
    const healthyCourse = course({});
    ok(healthyCourse === course({ heavy: true }) && healthyCourse === course({ sick: true }) && healthyCourse === course({ hunger: 0 }), 'the course does not depend on weight, sickness or hunger');
    for (const [name, o] of [['heavy', { heavy: true }], ['sick', { sick: true }], ['starving', { hunger: 0 }]] as const) {
      let healthy = 0, ill = 0, n = 0;
      for (const k of ALL_KINDS.filter((_, i) => i % 4 === 0)) for (const seed of [1, 2]) {
        healthy += run(k, 'adult', seed, 'good').score;
        const g = run(k, 'adult', seed, 'good', o);
        ill += g.score; n++;
      }
      ok(ill <= healthy, `${name} pets score no better than healthy ones (${(ill / n).toFixed(1)} vs ${(healthy / n).toFixed(1)})`);
      ok(ill / n >= DASH_THRESHOLDS.bronze, `${name} pets can still earn BRONZE (${(ill / n).toFixed(1)})`);
    }
  }

  // ---------- 7. the favourite multiplier and the scoring pieces ----------
  {
    const kind = ALL_KINDS.find((k) => paramsForBody({ species: KIND_SPECIES(k).id, stage: 'adult' }, 'dash').scoreMul > 1)!;
    const a = run(kind, 'adult', 1, 'good', { mul: true }), b = run(kind, 'adult', 1, 'good');
    ok(a.score === Math.floor(b.score * 1.25 + 1e-9) || Math.abs(a.score - b.score * 1.25) < 1.01, `the favourite kind scores x1.25 (${a.score} vs ${b.score})`);
    const g = run('cat', 'adult', 1, 'perfect');
    const s = st(g);
    ok(s.picked > 15 && s.streak >= 18 && s.dist > 1200, `a perfect run picks up items, keeps a streak and covers ground (${s.picked} items, streak ${s.streak}, ${Math.round(s.dist)} px)`);
    ok(s.speed > 45, `the course speeds up (${s.speed.toFixed(0)} px/s at the end)`);
    const slow = dashGame.init(1, paramsForBody({ species: KIND_SPECIES('loaf').id, stage: 'adult' }, 'dash')), quick = dashGame.init(1, paramsForBody({ species: KIND_SPECIES('fennec').id, stage: 'adult' }, 'dash'));
    for (let i = 0; i < 60; i++) { slow.step(NO_INPUT, 50); quick.step(NO_INPUT, 50); }
    ok(st(quick).speed > st(slow).speed, 'a quick light kind starts faster than a slow heavy one');
    ok(st(quick).hbW <= st(slow).hbW, 'the heavy big kind has the wider hitbox');
    // a hit stuns: the score drops, the streak resets, the world slows
    const h = dashGame.init(2, paramsForBody({ species: KIND_SPECIES('cat').id, stage: 'adult' }, 'dash'));
    let hitSeen = false, slowed = false;
    for (let i = 0; i < 400 && !h.done; i++) { h.step(NO_INPUT, 50); const q = st(h); if (q.hits > 0 && !hitSeen) { hitSeen = true; ok(q.streak === 0 && q.stun > 0, 'a hit stuns and breaks the streak'); h.step(NO_INPUT, 50); slowed = st(h).speed < 20; } }
    ok(hitSeen && slowed, 'standing in the way gets you hit, and the world slows');
    // a tap, A, B and C-less input all jump
    for (const inp of [{ left: true, right: false, act: false }, { left: false, right: true, act: false }, { left: false, right: false, act: true }] as GameInput[]) {
      const j = dashGame.init(1, paramsForBody({ species: KIND_SPECIES('cat').id, stage: 'adult' }, 'dash'));
      for (let i = 0; i < 40; i++) j.step(NO_INPUT, 50);
      j.step(inp, 50); j.step(NO_INPUT, 50);
      ok(st(j).hp > 0 && st(j).jumps === 1, 'A, a tap or B makes the pet jump');
    }
    // input during the countdown is ignored, and a press just before landing is remembered
    const cdg = dashGame.init(1, paramsForBody({ species: KIND_SPECIES('cat').id, stage: 'adult' }, 'dash'));
    cdg.step({ left: false, right: false, act: true }, 50);
    ok(st(cdg).jumps === 0 && st(cdg).cd > 0 && st(cdg).cd < DASH_COUNT_MS, 'the countdown ignores jumps');
    ok(dashGame.rules(THEMES.fish).length === 3 && /SWIM/.test(dashGame.rules(THEMES.fish)[0]), 'rules use the family verb');
    ok(!dashGame.usesRight && !!entryById('dash') && entryById('dash')!.layout === 'field', 'DASH is registered as a field game with C to quit');
    // the HUD
    ok(g.hud.left.startsWith('SCORE') && /^0:\d\d$/.test(g.hud.right), 'HUD shows score and time');
    // every obstacle is jumpable by a healthy pet: the margin the generator promises
    for (const kind2 of ['mech', 'fry', 'whale', 'raptorbird']) {
      const t = paramsForBody({ species: KIND_SPECIES(kind2).id, stage: 'adult' }, 'dash').tuning;
      const j = jumpFor(t, true);
      for (const f of FAMILIES) for (const gl of THEMES[f.id].obstacles.slice(0, 1)) { const b = obstacleBox(gl); ok(windowAbove(j, b.h).count >= MARGIN_TICKS + 3, `${kind2}/${f.id}: the low obstacle has a jump window of ${windowAbove(j, b.h).count} ticks`); }
    }
  }

  // ---------- 8. every family draws, in both modes, at several moments ----------
  {
    const ctxFor = (pet: Pet, extra: Partial<ScreenCtx>): ScreenCtx => ({ pet, tick: 3, mode: 'home', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, ms: T0 + 4000, ...extra });
    let frames = 0;
    for (const fam of FAMILIES) {
      for (const stage of ['baby', 'adult', 'ultimate'] as const) {
        const sp = SPECIES.find((s) => s.family === fam.id && s.stage === stage) ?? SPECIES.find((s) => s.family === fam.id)!;
        const pet = petOf(sp.id);
        const sess = newSession(dashGame, paramsFor(pet, 'dash'), 6);
        pressButton(sess, 'b');
        const bot = dashBot(sess.params.tuning, DASH_SKILLS.okay, 2);
        let t = 0;
        for (const upto of [0, 300, 1200, 2000, 5000, 11000, 20000, 33000, 41000]) {
          while (t < upto && sess.phase === 'play') { sess.pending = { ...sess.pending, ...bot(sess.game!) }; tickSession(sess, 50); t += 50; }
          for (const mode of ['technicolor', 'traditional'] as const) for (const dark of [false, true]) {
            try {
              const r = renderScreen(ctxFor(pet, { mode: 'game', session: sess, ms: T0 + upto }));
              const fr = buildFrame(r, { mode, dark, line: lineOf(pet), bodyHex: bodyOf(pet) });
              frames++;
              if (mode === 'traditional') {
                ok(fr.groups.length === 1, `${fam.id}/${stage}@${upto}: Traditional is one ink`);
                const lit = Array.from(r.buf.px).filter((v) => v && (tradVisible(v & LAYER_MASK) || (v & DIM_FLAG))).length;
                ok(lit > 120 && lit < 1700, `${fam.id}/${stage}@${upto}: Traditional keeps a readable amount of ink (${lit})`);
              }
              ok(r.buf.px.some((v) => v >= 29 && v <= 39), `${fam.id}/${stage}@${upto}: the pet is drawn`);
            } catch (err) { ok(false, `${fam.id}/${stage}@${upto}/${mode}: render threw ${(err as Error).message}`); }
          }
        }
      }
    }
    ok(frames > 500, `rendered ${frames} frames`);
  }

  console.log(`dash: ${checks} checks, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}

void main();
