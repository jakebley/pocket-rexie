import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { Buf } from '../src/ui/pixel';
import { BED_X, MAX_X, POOP_X, SCENE_N, SCENE_STATES, TICK_MS, initScene, inkWidth, maxXFor, popcount, step, type Scene, type SceneEvent, type SceneInputs } from '../src/ui/scene';
import { awaySummary } from '../src/ui/away';
import { drawScene, poseOf } from '../src/ui/sceneDraw';

let fails = 0;
let checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };

const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const DAY: SceneInputs = { hour: 12, minute: 0, dayKey: 20260105 };
const NIGHT: SceneInputs = { hour: 23, minute: 0, dayKey: 20260105 };

function mkPet(seed = 4242, species = 'rawr'): Pet {
  const p = newPet(T0, { seed });
  forceSpecies(p, species);
  p.named = true;
  return p;
}
/** Advance n ticks; returns scenes after each tick. */
function run(s: Scene, pet: Pet, n: number, t: { now: number }, inp: SceneInputs = DAY, opts = {}, ev?: SceneEvent[]): Scene[] {
  const out: Scene[] = [];
  for (let i = 0; i < n; i++) {
    t.now += TICK_MS;
    s = step(s, pet, { ...inp, events: i === 0 ? ev : undefined }, t.now, opts);
    out.push(s);
  }
  return out;
}

// 1. determinism
{
  const a = mkPet(), b = mkPet();
  const ta = { now: T0 }, tb = { now: T0 };
  const ra = run(initScene(a, T0, 12), a, 600, ta);
  const rb = run(initScene(b, T0, 12), b, 600, tb);
  ok(JSON.stringify(ra) === JSON.stringify(rb), 'same seed + clock gives identical scenes');
  // stepping in coarser calls reaches the same place
  const c = mkPet(); const tc = { now: T0 };
  let s = initScene(c, T0, 12);
  for (let i = 0; i < 100; i++) { tc.now += TICK_MS * 4; s = step(s, c, DAY, tc.now); }
  const d = mkPet(); const td = { now: T0 };
  const rd = run(initScene(d, T0, 12), d, 400, td);
  ok(s.x === rd[399].x && s.state === rd[399].state, 'call cadence does not change the outcome');
  const e = mkPet(777); const te = { now: T0 };
  const re = run(initScene(e, T0, 12), e, 600, te);
  ok(JSON.stringify(re.map((q) => q.x)) !== JSON.stringify(ra.map((q) => q.x)), 'a different seed behaves differently');
}

// 2. x bounds for every species and stage
{
  for (const sp of SPECIES) {
    const p = mkPet(sp.id.length * 97 + 5, sp.id);
    if (sp.id.length % 3 === 0) p.hunger = 0;
    if (sp.id.length % 4 === 0) { p.sick = true; }
    const t = { now: T0 };
    const rs = run(initScene(p, T0, 12), p, 500, t, DAY, {}, [{ kind: 'fed', food: 'meat' }, { kind: 'played', wins: 4 }, { kind: 'greet' }]);
    ok(rs.every((q) => q.x >= 0 && q.x <= 32), `x in 0..32 for ${sp.id}`);
  }
}

// 3. sleeping pet ends on the bed at night
{
  const p = mkPet();
  const t = { now: T0 };
  let rs = run(initScene(p, T0, 12), p, 40, t);
  let s = rs[rs.length - 1];
  p.asleep = true;
  rs = run(s, p, 220, t, NIGHT);
  s = rs[rs.length - 1];
  ok(s.state === 'sleep' && s.x === BED_X, `sleeper ends on the bed (state ${s.state}, x ${s.x})`);
  p.asleep = false;
  rs = run(s, p, 3, t, DAY);
  ok(rs[0].state === 'stretch', 'waking up stretches');
}

// 4. hungry pet paces
{
  const p = mkPet(); p.hunger = 0;
  const t = { now: T0 };
  const rs = run(initScene(p, T0, 12), p, 480, t);
  const xs = rs.map((q) => q.x);
  ok(Math.max(...xs) - Math.min(...xs) >= 12, 'hungry pet paces across the floor');
  let turns = 0; let dir = 0;
  for (let i = 1; i < xs.length; i++) { const d = Math.sign(xs[i] - xs[i - 1]); if (d !== 0 && d !== dir) { if (dir !== 0) turns++; dir = d; } }
  ok(turns >= 2, `hungry pet turns around (${turns})`);
  ok(rs.some((q) => q.state === 'look' && q.lookUp), 'hungry pet looks up at the food drop');
}

// 5. poop increase yields poop state
{
  const p = mkPet();
  const t = { now: T0 };
  let rs = run(initScene(p, T0, 12), p, 24, t);
  ok(popcount(rs[rs.length - 1].poopMask) === 0, 'no poops yet');
  p.poops = 1;
  rs = run(rs[rs.length - 1], p, 140, t);
  ok(rs.some((q) => q.state === 'poop'), 'poop count increase yields a poop state');
  ok(popcount(rs[rs.length - 1].poopMask) === 1, 'poop lands on the ground');
  p.poops = 0;
  rs = run(rs[rs.length - 1], p, 2, t);
  ok(rs[1].poopMask === 0, 'poops disappear when the engine clears them');
}

// 6. feeding ends in eat then autonomy
{
  const p = mkPet();
  const t = { now: T0 };
  const rs = run(initScene(p, T0, 12), p, 160, t, DAY, {}, [{ kind: 'fed', food: 'meat' }]);
  const names = rs.map((q) => q.state);
  const eatAt = names.indexOf('eat');
  ok(eatAt > 0, 'feeding reaches eat');
  ok(rs.slice(0, eatAt).some((q) => q.props.some((pr) => pr.g === 'food:meat')), 'food glyph falls before the pet eats');
  ok(names.filter((n) => n === 'eat').length >= 10, 'three chomps');
  const last = rs[rs.length - 1];
  ok(last.act === null, 'feeding act finishes');
  ok(rs.slice(eatAt).some((q) => q.pops.some((pp) => pp.g === 'heart')), 'heart pops after the meal');
  const after = run(last, p, 200, t);
  ok(after.some((q) => q.state === 'walk' || q.state === 'look' || q.state === 'sit' || q.state === 'hop'), 'autonomy resumes after eating');
}

// 7. reduced motion yields no x changes
{
  const p = mkPet(); p.hunger = 0;
  const t = { now: T0 };
  const s0 = initScene(p, T0, 12);
  const evs: SceneEvent[] = [{ kind: 'fed', food: 'veggie' }, { kind: 'tapGround', x: 40 }, { kind: 'cleaned' }, { kind: 'played', wins: 4 }, { kind: 'battle', win: true }];
  const rs = run(s0, p, 500, t, DAY, { reducedMotion: true }, evs);
  ok(rs.every((q) => q.x === s0.x), 'reduced motion never changes x');
  ok(rs.some((q) => q.state === 'eat'), 'events still play under reduced motion');
  const rg = run(s0, p, 60, t, DAY, { reducedMotion: true }, [{ kind: 'greet' }]);
  ok(rg.every((q) => q.x === s0.x) && rg.some((q) => q.state === 'greet'), 'greet waves in place under reduced motion');
  const q = mkPet(); q.stage = 'adult';
  const rs2 = run(initScene(q, T0, 12), q, 300, { now: T0 }, DAY, { reducedMotion: true });
  ok(!rs2.some((x) => x.state === 'walk' || x.state === 'hop' || x.state === 'dance'), 'idle under reduced motion has no walking or hopping');
}

// 8. scripted events all complete and leave the scene sane
{
  const evs: SceneEvent[] = [
    { kind: 'snack' }, { kind: 'cleaned' }, { kind: 'medicine' }, { kind: 'trained' }, { kind: 'battle', win: true }, { kind: 'battle', win: false },
    { kind: 'played', wins: 1 }, { kind: 'played', wins: 5 }, { kind: 'climate', cool: true }, { kind: 'climate', cool: false },
    { kind: 'light', on: false }, { kind: 'light', on: true }, { kind: 'petted' }, { kind: 'evolved' }, { kind: 'hatched' },
    { kind: 'greet' }, { kind: 'tapGround', x: 4 }, { kind: 'tapSky' },
  ];
  for (const e of evs) {
    const p = mkPet(); if (e.kind === 'cleaned') p.poops = 3;
    const t = { now: T0 };
    const rs = run(initScene(p, T0, 12), p, 260, t, DAY, {}, [e]);
    ok(rs[rs.length - 1].act === null, `${e.kind} act completes`);
    ok(rs.every((q) => q.x >= 0 && q.x <= 32), `${e.kind} keeps x in bounds`);
    const b = new Buf(SCENE_N); drawScene(b, rs[Math.min(10, rs.length - 1)], p);
  }
}

// 9. every state draws, for every species and stage, both facings
{
  let n = 0;
  for (const sp of SPECIES) {
    for (const facing of [1, -1] as const) {
      const p = mkPet(31, sp.id);
      p.call = 'hungry'; p.poops = 2; p.temp = sp.id.length % 2 ? 2 : -2; p.sick = sp.id.length % 3 === 0;
      for (const state of SCENE_STATES) {
        for (let tt = 0; tt < 8; tt += 3) {
          const base = initScene(p, T0, 12);
          const s: Scene = {
            ...base, state, facing, t: tt, x: facing === 1 ? 0 : 32, lookUp: tt === 3, nowMs: T0 + tt * 700, still: false,
            weather: tt === 0 ? 'rain' : tt === 3 ? 'cloudy' : 'clear', dim: tt === 6, poopMask: 7, hour: [5, 12, 19, 23][(tt / 3) | 0 % 4] ?? 12,
            props: [{ g: 'food:meat', x: 24, y: 23, n: 1, side: 1 }, { g: 'foe', x: 23, y: 20, n: 3 }, { g: 'broom', x: 5, y: 23 }, { g: 'syringe', x: 9, y: 9 }],
            pops: [{ g: 'heart', x: 8, y: 10, age: 2, life: 10 }, { g: 'note', x: 10, y: 8, age: 0, life: 6 }],
          };
          const b = new Buf(SCENE_N);
          try { drawScene(b, s, p); n++; } catch (e) { ok(false, `draw ${sp.id} ${state} facing ${facing}: ${e}`); }
          const sleeper = { ...p, asleep: true, call: 'light' as const };
          try { drawScene(new Buf(SCENE_N), s, sleeper as Pet); } catch (e) { ok(false, `draw asleep ${sp.id} ${state}: ${e}`); }
          ok(b.px.some((v) => v === 1), `${sp.id} ${state} paints something`);
        }
      }
    }
  }
  ok(n > 0, `drew ${n} frames`);
}

// 10. while-you-were-away summary
{
  const p = mkPet(); p.name = 'Rexie'; p.events = [];
  ok(awaySummary(p, 0) === 'REXIE MISSED YOU', 'no events: missed you');
  p.events.push({ kind: 'sleep', detail: '', at: 10 }, { kind: 'wake', detail: '', at: 20 }, { kind: 'poop', detail: '', at: 30 }, { kind: 'poop', detail: '', at: 31 }, { kind: 'call', detail: 'poop', at: 32 });
  const m = awaySummary(p, 5);
  ok(m.startsWith('WHILE YOU WERE AWAY\n') && m.includes('SLEPT THROUGH THE NIGHT') && m.includes('MADE 2 MESSES'), `summary text: ${m}`);
  ok(awaySummary(p, 25) === 'WHILE YOU WERE AWAY\nMADE 2 MESSES, WANTED ATTENTION', 'only newer events counted');
}

// 11. poops at x = 41, 35, 29; the pet's range shrinks with the poop count and its ink never meets a poop
{
  ok(POOP_X.join() === '41,35,29', 'poop spots run right to left from the right edge');
  ok(MAX_X === 32 && SCENE_N === 48, 'scene grid is 48 with pet x range 0..32');
  // limit formula and per-species ink width
  for (const sp of SPECIES) {
    const w = inkWidth(sp.id);
    let hi = -1, lo = 99;
    for (const f of sp.frames) for (const r of f) for (let i = 0; i < r.length; i++) if (r[i] === 'X') { hi = Math.max(hi, i); lo = Math.min(lo, i); }
    ok(w >= hi - lo + 1 && w >= hi + 1 && w >= 16 - lo && w <= 16, `inkWidth covers ${sp.id}'s occupied columns (${w})`);
    const lims = [0, 1, 3, 7].map((m) => maxXFor(sp.id, m));
    ok(lims[0] === 32 && lims[1] === Math.max(0, Math.min(32, 41 - w - 1)) && lims[2] === Math.max(0, 35 - w - 1) && lims[3] === Math.max(0, 29 - w - 1), `${sp.id} limits ${lims}`);
    ok(lims[0] >= lims[1] && lims[1] >= lims[2] && lims[2] >= lims[3] && lims[1] < lims[0], `${sp.id} limit shrinks as poops grow`);
  }
  // ink columns the pet really paints (mirror + pose offsets) never touch a poop column, 1-3 poops, 3000 ticks
  for (const sp of SPECIES) {
    for (let n = 1; n <= 3; n++) {
      const p = mkPet(sp.id.length * 31 + n, sp.id);
      p.poops = n;
      if (n === 2) p.happy = 4;
      if (n === 3 && sp.id.length % 2) p.hunger = 0;
      const t = { now: T0 };
      const rs = run(initScene(p, T0, 12), p, 3000, t);
      const left = POOP_X[n - 1];
      const lim = maxXFor(sp.id, (1 << n) - 1);
      let bad = 0, over = 0, widest = 0;
      for (const q of rs) {
        if (q.x > lim) over++;
        const pose = poseOf(q);
        const px = Math.min(Math.round(q.x + pose.dx * pose.facing), lim);
        const spr = pose.blink && sp.frames[1] ? sp.frames[1] : sp.frames[0];
        for (const f of [sp.frames[0], spr]) {
          for (const r of f) {
            const row = pose.facing === 1 ? r : [...r].reverse().join('');
            const hiC = row.lastIndexOf('X');
            if (hiC >= 0) { widest = Math.max(widest, px + hiC); if (px + hiC >= left) bad++; }
          }
        }
      }
      ok(bad === 0, `${sp.id} ink stays left of the poops with ${n} poop(s) (rightmost ${widest} vs ${left})`);
      ok(over === 0, `${sp.id} x never exceeds the limit with ${n} poop(s)`);
      ok(rs.some((q) => q.state === 'walk') || lim < 4, `${sp.id} still wanders with ${n} poop(s)`);
    }
  }
}

// 12. a pet beyond the new limit walks left first, and the squat walks to just left of the free spot
{
  const sp = SPECIES.find((q) => q.id === 'rawr')!;
  const p = mkPet(99, sp.id);
  const t = { now: T0 };
  const s0 = { ...initScene(p, T0, 12), x: 30, state: 'idle' as const, left: 40 };
  p.poops = 1;
  let rs = run(s0, p, 6, t);
  ok(rs.every((q) => q.state === 'walk' || q.state === 'idle' || q.state === 'poop'), 'pet walks to the poop spot first');
  rs = run(rs[rs.length - 1], p, 200, t);
  const w = inkWidth(sp.id);
  ok(popcount(rs[rs.length - 1].poopMask) === 1, 'first poop dropped');
  const sq = rs.find((q) => q.state === 'poop')!;
  ok(sq && Math.abs(sq.x - Math.min(32, 41 - w - 1)) < 0.01, `squats just left of the spot (x ${sq?.x})`);
  // second poop appears while the pet is far right of the new limit via a scripted position
  p.poops = 2;
  const far = { ...rs[rs.length - 1], x: 24, state: 'idle' as const, left: 60, act: null };
  const r2 = run(far, p, 300, t);
  const lim2 = maxXFor(sp.id, 3);
  ok(r2.every((q) => q.x <= 24.0001) && r2[r2.length - 1].x <= lim2 + 0.0001, `pet ends within the new limit (${r2[r2.length - 1].x} <= ${lim2})`);
  const firstWalk = r2.findIndex((q) => q.state === 'poop');
  ok(firstWalk > 0 && r2.slice(0, firstWalk).every((q) => q.state === 'walk' || q.state === 'idle'), 'walks before the squat');
  // pet beyond the limit with no new act: only walking left until inside
  const q3 = mkPet(5, sp.id); q3.poops = 3;
  const base = initScene(q3, T0, 12);
  const out = run({ ...base, x: 30, limit: 32, state: 'idle', left: 100, act: null }, q3, 60, { now: T0 });
  const lim3 = maxXFor(sp.id, 7);
  let k = 0; while (k < out.length && out[k].x > lim3) k++;
  ok(out.slice(0, k).every((q) => q.state === 'walk'), 'beyond the limit it only walks left');
  ok(out.slice(0, k).every((q, i) => i === 0 || q.x <= out[i - 1].x), 'and only leftward');
  ok(k < out.length, 'and gets inside the limit');
}

console.log(fails === 0 ? `scene: all ${checks} checks passed` : `scene: ${fails} FAILED of ${checks}`);
process.exit(fails === 0 ? 0 : 1);
