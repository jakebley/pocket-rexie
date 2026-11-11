// Biomes at 96, set B (bunny meadow with burrow, dragon crags, bot workshop, slime swamp cave, bug garden, alien space): every biome has a painter, draws in
// every phase / rain / facing / stage without throwing, never overwrites a pet pixel and keeps a clear ring, the pet and the HUD stay readable on the
// backdrop (contrast floors, per phase, appearance and rain), the static art is cached, animated parts move, and a frame is cheap.
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { BIOME96, biomes96Done } from '../src/ui/biome96';
import { cacheSize } from '../src/ui/biome96/kitB';
import { ALWAYS_DARK, FAMILY_BIOME, type Biome } from '../src/ui/biomes';
import { DIM_FLAG, LAYER_MASK, Layer, PET_LAYER_CODES, SCENERY_FROM } from '../src/ui/layers';
import { contrast, darkSky, paletteTable, skyFor, soilFor, type PaletteCtx } from '../src/ui/palette';
import { bodyOf, lineOf } from '../src/ui/render';
import { Buf } from '../src/ui/pixel';
import { TICK_MS, initScene, phaseOf, type Phase, type Scene } from '../src/ui/scene';
import { GROUND_Y96, drawScene96 } from '../src/ui/sceneDraw96';

declare const process: { env: Record<string, string | undefined>; hrtime: { bigint: () => bigint } };
let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const VERBOSE = !!process.env.VERBOSE;

const SET: Biome[] = ['warren', 'crags', 'workshop', 'swamp', 'garden', 'space'];
const FAM: Record<string, string> = { warren: 'bunny', crags: 'dragon', workshop: 'bot', slime: 'slime', swamp: 'slime', garden: 'bug', space: 'alien' };
const famOf = (b: Biome) => Object.keys(FAMILY_BIOME).find((f) => FAMILY_BIOME[f] === b)!;
void FAM;
const HOURS: Record<Phase, number> = { dawn: 6, day: 12, dusk: 19, night: 23 };
const PHASES: Phase[] = ['dawn', 'day', 'dusk', 'night'];

const petOf = (id: string, seed = 7): Pet => { const p = newPet(T0, { seed }); forceSpecies(p, id); p.named = true; p.hunger = 3; p.happy = 3; p.poops = 0; p.call = null; p.temp = 0; p.sick = false; p.asleep = false; p.lightOn = true; return p; };
const sceneOf = (p: Pet, hour: number, over: Partial<Scene> = {}): Scene => ({ ...initScene(p, T0, hour), state: 'idle', x: 14, facing: 1, still: false, dim: false, weather: 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T0 + 4200, ...over });
const draw = (p: Pet, s: Scene, biome?: Biome) => { const b = new Buf(96); drawScene96(b, s, p, biome); return b; };
const speciesOf = (fam: string, stage: string) => SPECIES.find((s) => s.family === fam && s.stage === stage);

// 1. every biome of the set has a painter, with its own ground
{
  for (const b of SET) {
    ok(!!BIOME96[b], `${b}: has a 96 painter`);
    ok(biomes96Done().includes(b), `${b}: listed as done`);
    ok(BIOME96[b]?.ground === 'own' && !!BIOME96[b]?.backdrop && !!BIOME96[b]?.fore, `${b}: backdrop, fore and its own ground`);
  }
}

// 2. draws for every stage, phase, rain, facing and a few positions and states without throwing; scenery is Technicolor scenery codes only
{
  let n = 0, thrown = 0, litBad = 0;
  for (const b of SET) {
    const fam = famOf(b);
    for (const sp of SPECIES.filter((s) => s.family === fam).filter((s, i, a) => a.findIndex((o) => o.stage === s.stage) === i)) {
      const p = petOf(sp.id);
      for (const ph of PHASES) for (const rain of [false, true]) for (const facing of [1, -1] as const) for (const x of [0, 20, 40]) for (const state of ['idle', 'sleep'] as const) {
        try {
          const buf = draw(p, sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', facing, x, state, dim: state === 'sleep' }));
          n++;
          for (const v of buf.px) if (v && (v & LAYER_MASK) === 0 && !(v & DIM_FLAG)) litBad++;
        } catch (e) { thrown++; if (VERBOSE) console.log(e); }
      }
    }
  }
  ok(thrown === 0 && n > 0, `drew ${n} scenes (every stage, phase, rain, facing, position, sleep) without throwing`);
  ok(litBad === 0, 'no lit pixel carries a zero layer (bar the lights-off dither)');
}

// 3. scenery never overwrites a pet pixel: the pet's pixels are identical with and without the painter; a 1px ring around it holds no scenery
{
  let compared = 0, petBad = 0, ringBad = 0;
  for (const b of SET) {
    const fam = famOf(b);
    for (const stage of ['baby', 'child', 'adult']) {
      const sp = speciesOf(fam, stage);
      if (!sp) continue;
      const p = petOf(sp.id);
      for (const ph of PHASES) for (const rain of [false, true]) for (const facing of [1, -1] as const) for (const x of [0, 18, 36]) {
        const s = sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', facing, x, still: stage === 'baby' });
        const withB = draw(p, s);
        const saved = BIOME96[b]; BIOME96[b] = null;
        const without = draw(p, s);
        BIOME96[b] = saved;
        compared++;
        for (let i = 0; i < withB.px.length; i++) {
          const a = withB.px[i] & LAYER_MASK, c = without.px[i] & LAYER_MASK;
          if (PET_LAYER_CODES.has(a) !== PET_LAYER_CODES.has(c) || (PET_LAYER_CODES.has(a) && a !== c)) petBad++;
          if (PET_LAYER_CODES.has(a) && withB.px[i]) {
            const x0 = i % 96, y0 = (i / 96) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
              const nx = x0 + dx, ny = y0 + dy;
              if (nx < 0 || ny < 0 || nx > 95 || ny > 95) continue;
              const v = withB.px[ny * 96 + nx], l = v & LAYER_MASK;
              if (v && l >= SCENERY_FROM && !PET_LAYER_CODES.has(l) && ny < GROUND_Y96 && !(ny >= 90)) ringBad++;
            }
          }
        }
      }
    }
  }
  ok(compared > 0 && petBad === 0, `scenery never overwrites a pet pixel (${compared} scenes compared, ${petBad} differ)`);
  ok(ringBad === 0, `the pet keeps a clear ring of at least 1px above the ground (${ringBad} scenery pixels touch it)`);
}

// 4. readability: pet outline vs the backdrop, HUD vs the backdrop (per biome, phase, rain and appearance)
{
  const eff = (buf: Buf, tbl: string[], sky: string, soil: string, i: number): string => { const v = buf.px[i]; if (!v) return i >= GROUND_Y96 * 96 ? soil : sky; return tbl[v & LAYER_MASK]; };
  const worst: Record<string, number> = {};
  for (const b of SET) {
    const fam = famOf(b);
    for (const stage of ['baby', 'adult']) {
      const sp = speciesOf(fam, stage)!;
      const p = petOf(sp.id);
      for (const ph of PHASES) for (const rain of [false, true]) for (const dark of [false, true]) {
        if (rain && (ph === 'dawn' || ph === 'night')) continue;
        const phase = phaseOf(HOURS[ph]);
        const ctx: PaletteCtx = { mode: 'technicolor', dark, line: lineOf(p), bodyHex: bodyOf(p), night: darkSky(b, phase), biome: b, phase, rain };
        const tbl = paletteTable(ctx), sky = skyFor(ctx, phase, rain, b), soil = soilFor(ctx, b);
        const buf = draw(p, sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', x: 16, still: true }));
        // the pet: for every outline pixel, the 3px neighbourhood of backdrop pixels; the 10th percentile of the contrast must hold
        const cs: number[] = [], hs: number[] = [];
        for (let i = 0; i < buf.px.length; i++) {
          const l = buf.px[i] & LAYER_MASK;
          if (!buf.px[i]) continue;
          const x0 = i % 96, y0 = (i / 96) | 0;
          if (l === Layer.OUTLINE || l === Layer.RIM) {
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
              const nx = x0 + dx, ny = y0 + dy;
              if (nx < 0 || ny < 0 || nx > 95 || ny > 95 || ny >= 90) continue;
              const j = ny * 96 + nx, nl = buf.px[j] & LAYER_MASK;
              if (buf.px[j] && PET_LAYER_CODES.has(nl)) continue;
              cs.push(contrast(tbl[l], eff(buf, tbl, sky, soil, j)));
            }
          } else if ((l === Layer.HEART || l === Layer.SMILE) && y0 < 23) {
            for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
              const nx = x0 + dx, ny = y0 + dy;
              if (nx < 0 || ny < 0 || nx > 95 || ny > 95) continue;
              const j = ny * 96 + nx, nl = buf.px[j] & LAYER_MASK;
              if (buf.px[j] && (nl === Layer.HEART || nl === Layer.SMILE)) continue;
              hs.push(contrast(tbl[l], eff(buf, tbl, sky, soil, j)));
            }
          }
        }
        cs.sort((a, c) => a - c); hs.sort((a, c) => a - c);
        const p10 = cs[Math.floor(cs.length * 0.1)] ?? 99, h10 = hs[Math.floor(hs.length * 0.1)] ?? 99, hMin = hs[Math.floor(hs.length * 0.02)] ?? 99;
        const key = `${b} ${ph}${rain ? '/rain' : ''} ${dark ? 'dark' : 'light'} ${stage}`;
        worst[key] = p10;
        if (VERBOSE) console.log(key.padEnd(34), 'pet p10', p10.toFixed(2), 'hud p10', h10.toFixed(2), 'hud p2', hMin.toFixed(2));
        ok(p10 >= 1.25, `${key}: pet outline vs backdrop p10 ${p10.toFixed(2)} >= 1.25`);
        ok(h10 >= 1.25, `${key}: HUD glyphs vs backdrop p10 ${h10.toFixed(2)} >= 1.25`);
        ok(hMin >= 1.1, `${key}: HUD glyphs vs backdrop p2 ${hMin.toFixed(2)} >= 1.1`);
        if (ALWAYS_DARK.has(b)) ok(darkSky(b, phase), `${b}: always-dark backdrop uses the night ink in ${ph}`);
      }
    }
  }
  ok(Object.keys(worst).length > 0, 'readability measured');
}

// 5. static art is cached; the animated parts move; drawing is a pure function of the inputs
{
  for (const b of SET) {
    const p = petOf(speciesOf(famOf(b), 'adult')!.id);
    const s = sceneOf(p, 12, { still: false });
    draw(p, s);
    const before = cacheSize();
    for (let k = 0; k < 6; k++) draw(p, { ...s, nowMs: s.nowMs + k * 400 });
    ok(cacheSize() === before, `${b}: the static layers come from the cache (${before} grids, none added by 6 more frames)`);
    const a = draw(p, s), c = draw(p, { ...s });
    ok(a.px.every((v, i) => v === c.px[i]), `${b}: same inputs, same pixels`);
    let moved = 0;
    for (const dt of [500, 900, 1300, 2100, 3300]) { const d = draw(p, { ...s, nowMs: s.nowMs + dt }); let df = 0; for (let i = 0; i < d.px.length; i++) if (d.px[i] !== a.px[i]) df++; if (df > 4) moved++; }
    ok(moved >= 3, `${b}: animated parts move (${moved} of 5 later frames differ)`);
    const st1 = draw(p, sceneOf(p, 12, { still: true, nowMs: T0 }));
    const st2 = draw(p, sceneOf(p, 12, { still: true, nowMs: T0 + 9000 }));
    ok(st1.px.every((v, i) => v === st2.px[i]), `${b}: a still picture does not depend on the time`);
  }
}

// 6. the sky objects of the indoor biomes are gone (workshop, swamp, space): no sun, moon, cloud or rain pixel; outdoor biomes keep the sky
{
  for (const b of ['workshop', 'swamp', 'space'] as Biome[]) {
    const p = petOf(speciesOf(famOf(b), 'adult')!.id);
    for (const ph of PHASES) for (const rain of [false, true]) {
      const buf = draw(p, sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', still: true }));
      let sky = 0;
      for (let i = 0; i < 90 * 96; i++) { const l = buf.px[i] & LAYER_MASK; if (buf.px[i] && (l === Layer.SUN || l === Layer.MOON || l === Layer.STAR || l === Layer.CLOUD || l === Layer.RAIN)) sky++; }
      ok(sky === 0, `${b} ${ph}${rain ? '/rain' : ''}: no outdoor sky objects (${sky})`);
    }
  }
  const p = petOf(speciesOf('bunny', 'adult')!.id);
  const day = draw(p, sceneOf(p, 12, { still: true }));
  ok(day.px.some((v) => (v & LAYER_MASK) === Layer.SUN), 'warren: the sun is still in the sky by day');
  // the volcano hides the sun low in the sky? the dragon's day sky keeps sun and clouds
  const d = petOf(speciesOf('dragon', 'adult')!.id);
  ok(draw(d, sceneOf(d, 12, { still: true })).px.some((v) => (v & LAYER_MASK) === Layer.SUN), 'crags: the sun is still in the sky by day');
}

// 7. cost: a 96 frame with a set-B biome is cheap
{
  for (const b of SET) {
    const p = petOf(speciesOf(famOf(b), 'adult')!.id);
    const buf = new Buf(96);
    const s0 = sceneOf(p, 23);
    for (let i = 0; i < 20; i++) { buf.px.fill(0); drawScene96(buf, { ...s0, nowMs: s0.nowMs + i * 125 }, p); } // warm up the caches
    const N = 300, t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) { buf.px.fill(0); drawScene96(buf, { ...s0, nowMs: s0.nowMs + i * 125 }, p); }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
    if (VERBOSE) console.log(b, 'ms/frame', ms.toFixed(3));
    ok(ms < 4, `${b}: a 96 frame draws in ${ms.toFixed(2)} ms (< 4)`);
  }
}

// 8. a backdrop never leaves an unreadable HUD: the always-dark biomes keep their sky distinct from the soil, and the lights-off dither stays non-zero
{
  for (const b of SET) {
    const p = petOf(speciesOf(famOf(b), 'adult')!.id);
    const buf = draw(p, sceneOf(p, 12, { dim: true, still: true }));
    ok(buf.px.some((v) => (v & DIM_FLAG) !== 0), `${b}: lights off dims the scenery`);
    const ctx: PaletteCtx = { mode: 'technicolor', dark: false, biome: b, phase: 'day' };
    ok(contrast(skyFor(ctx, 'day', false, b), soilFor(ctx, b)) >= 1.05, `${b}: sky and soil differ`);
  }
}

console.log(`biomes96b: ${fails === 0 ? 'all' : checks - fails + ' of'} ${checks} checks passed`);
if (fails) { console.log(`${fails} FAILED`); (process as unknown as { exit: (c: number) => void }).exit(1); }
