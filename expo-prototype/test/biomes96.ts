// Biomes A at 96 (meadow, woods, underwater, sky, yard, clouds, ember): every biome has a painter, draws for every phase / rain /
// facing / stage without throwing, never touches a pet pixel, keeps the pet readable (contrast floors, a clean HUD corner), stays
// inside the draw budget, caches its static art, animates, and is deterministic.
import { SPECIES } from '../src/core/speciesData';
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { BIOME96 } from '../src/ui/biome96';
import { A_FIRST, A_LAST, biomeAColors } from '../src/ui/biome96/colorsA';
import { staticBuilds } from '../src/ui/biome96/kit';
import { biomeOf, ALWAYS_DARK, type Biome } from '../src/ui/biomes';
import { LAYER_COUNT, LAYER_MASK, Layer, PET_LAYER_CODES, SCENERY_FROM } from '../src/ui/layers';
import { contrast, darkSky, paletteTable, skyFor } from '../src/ui/palette';
import { Buf } from '../src/ui/pixel';
import { TICK_MS, initScene, type Phase, type Scene } from '../src/ui/scene';
import { drawScene96, GROUND_Y96 } from '../src/ui/sceneDraw96';

declare const process: { env: Record<string, string | undefined>; exit: (n: number) => never };
let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const HEX = /^#[0-9a-f]{6}$/i;
const SET: { biome: Biome; fam: string; ember?: boolean }[] = [
  { biome: 'meadow', fam: 'dino' }, { biome: 'woods', fam: 'fox' }, { biome: 'underwater', fam: 'fish' }, { biome: 'sky', fam: 'bird' },
  { biome: 'yard', fam: 'cat' }, { biome: 'clouds', fam: 'spirits' }, { biome: 'ember', fam: 'spirits', ember: true },
];
const HOURS: Record<Phase, number> = { dawn: 6, day: 12, dusk: 19, night: 23 };
const PHASES: Phase[] = ['dawn', 'day', 'dusk', 'night'];
const mk = (id: string): Pet => { const p = newPet(T0, { seed: 7 }); forceSpecies(p, id); p.named = true; p.hunger = 3; p.happy = 3; p.call = null; p.poops = 0; p.temp = 0; p.sick = false; p.asleep = false; p.lightOn = true; return p; };
const sceneOf = (p: Pet, hour: number, over: Partial<Scene> = {}): Scene => ({ ...initScene(p, T0, hour), state: 'idle', x: 14, facing: 1, still: true, dim: false, weather: 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T0 + 4200, ...over });
/** one species per stage of a family (ember: the ember-realm spirits only) */
function speciesOf(fam: string, ember?: boolean): string[] {
  const out = new Map<string, string>();
  for (const s of SPECIES) {
    if (s.family !== fam) continue;
    const e = biomeOf(mk(s.id)) === 'ember';
    if (fam === 'spirits' && e !== !!ember) continue;
    if (!out.has(s.stage)) out.set(s.stage, s.id);
  }
  return [...out.values()];
}
const adultOf = (fam: string, ember?: boolean) => { const l = speciesOf(fam, ember); return l[l.length - 1]; };
const isPet = (v: number) => !!v && PET_LAYER_CODES.has(v & LAYER_MASK);
const isScn = (v: number) => !!v && (v & LAYER_MASK) >= SCENERY_FROM && !PET_LAYER_CODES.has(v & LAYER_MASK);
const withoutPainter = (biome: Biome, f: () => void) => { const s = BIOME96[biome]; BIOME96[biome] = null; try { f(); } finally { BIOME96[biome] = s; } };

// 1. a painter for every biome of the set, slot codes in range, a colour for every slot
for (const { biome } of SET) {
  ok(!!BIOME96[biome], `${biome}: has a 96 painter`);
  ok(biomeAColors(biome, 'day', false) !== undefined, `${biome}: has slot colours`);
}
ok(A_FIRST === 95 && A_LAST < 128 && LAYER_COUNT >= A_LAST + 1 && LAYER_COUNT <= 128, `slot layers fit below the dim flag (95..${A_LAST}, LAYER_COUNT ${LAYER_COUNT})`);
for (const { biome } of SET) for (const ph of PHASES) for (const rain of [false, true]) for (const dark of [false, true]) {
  const t = paletteTable({ mode: 'technicolor', dark, line: 'meat', biome, phase: ph, rain, night: darkSky(biome, ph) });
  let bad = 0;
  for (let l = A_FIRST; l <= A_LAST; l++) if (!HEX.test(t[l])) bad++;
  ok(bad === 0, `${biome}/${ph}${rain ? '/rain' : ''}${dark ? '/dark' : ''}: every slot has a colour`);
}

// 2. draws for every stage x phase x rain x facing (still and moving) and uses only valid codes
let thrown = 0, drawn = 0;
for (const { biome, fam, ember } of SET) for (const id of speciesOf(fam, ember)) {
  const p = mk(id);
  ok(biomeOf(p) === biome, `${id} lives in ${biome}`);
  for (const ph of PHASES) for (const rain of [false, true]) for (const facing of [1, -1] as const) for (const still of [true, false]) {
    try {
      const b = new Buf(96);
      drawScene96(b, sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', facing, still, x: facing === 1 ? 6 : 30, nowMs: T0 + 3300 }), p);
      drawn++;
      for (const v of b.px) if ((v & LAYER_MASK) >= LAYER_COUNT) { thrown++; break; }
    } catch (e) { thrown++; console.log(String(e)); }
  }
}
ok(thrown === 0 && drawn > 500, `every stage, phase, rain, facing and motion draws with valid layer codes (${drawn} scenes)`);

// 3. scenery never overwrites a pet pixel and keeps the 1px ring; the HUD corner stays clear
{
  let petBad = 0, ringBad = 0, hudBad = 0, scenes = 0, richMin = 1e9;
  for (const { biome, fam, ember } of SET) for (const id of speciesOf(fam, ember)) {
    const p = mk(id);
    for (const ph of PHASES) for (const facing of [1, -1] as const) for (const x of [0, 14, 30]) {
      const sc = sceneOf(p, HOURS[ph], { facing, x, weather: ph === 'dusk' ? 'rain' : 'clear' });
      const a = new Buf(96), plain = new Buf(96);
      drawScene96(a, sc, p);
      withoutPainter(biome, () => drawScene96(plain, sc, p));
      scenes++;
      for (let i = 0; i < a.px.length; i++) {
        if (isPet(plain.px[i]) !== isPet(a.px[i]) || (isPet(plain.px[i]) && plain.px[i] !== a.px[i])) { petBad++; break; }
      }
      for (let i = 0; i < a.px.length; i++) {
        if (!isPet(a.px[i])) continue;
        const cx = i % 96, cy = (i / 96) | 0;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < 96 && ny < 96 && isScn(a.px[ny * 96 + nx])) { hit = true; break; } }
        if (hit) { ringBad++; break; }
      }
      // scenery in the HUD corner (hearts and smileys: x < 50, y < 23): at most a few percent of the cells
      let hud = 0;
      for (let y = 0; y < 23; y++) for (let xx = 0; xx < 50; xx++) if (isScn(a.px[y * 96 + xx])) hud++;
      if (hud > 0.04 * 23 * 50) hudBad++;
      let scn = 0; for (const v of a.px) if (isScn(v)) scn++;
      richMin = Math.min(richMin, scn);
    }
  }
  ok(petBad === 0, `scenery never overwrites or removes a pet pixel (${petBad} of ${scenes} scenes)`);
  ok(ringBad === 0, `the pet keeps a clear 1px ring (${ringBad} of ${scenes} scenes)`);
  ok(hudBad === 0, `the HUD corner stays almost free of scenery (${hudBad} of ${scenes} scenes)`);
  ok(richMin >= 600, `every scene has real detail (fewest scenery cells ${richMin} >= 600)`);
}

// 4. contrast floors: pet outline against the sky and against the scenery just behind the ring; HUD glyphs against the sky
{
  let worstSky = 99, worstNear = 99, worstHud = 99;
  const cases: string[] = [];
  for (const { biome, fam, ember } of SET) {
    const p = mk(adultOf(fam, ember));
    for (const ph of PHASES) for (const rain of [false, true]) for (const dark of [false, true]) {
      const night = darkSky(biome, ph);
      const t = paletteTable({ mode: 'technicolor', dark, line: 'meat', biome, phase: ph, rain, night });
      const sky = skyFor({ mode: 'technicolor', dark }, ph, rain, biome);
      const cs = contrast(t[Layer.OUTLINE], sky);
      if (cs < worstSky) worstSky = cs;
      const hu = Math.min(contrast(t[Layer.HEART], sky), contrast(t[Layer.SMILE], sky));
      if (hu < worstHud) { worstHud = hu; if (hu < 1.6) console.log('hud', biome, ph, rain, dark, hu.toFixed(2), contrast(t[Layer.HEART], sky).toFixed(2), contrast(t[Layer.SMILE], sky).toFixed(2)); }
      // scenery within 2..4 cells of the pet (the layers that stand directly behind the ring)
      const sc = sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', x: 14 });
      const b = new Buf(96); drawScene96(b, sc, p);
      const petCells: number[] = [];
      for (let i = 0; i < b.px.length; i++) if (isPet(b.px[i])) petCells.push(i);
      const near = new Set<number>();
      for (const i of petCells) {
        const cx = i % 96, cy = (i / 96) | 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= 96 || ny >= 96) continue;
          const v = b.px[ny * 96 + nx];
          if (isScn(v)) near.add(v & LAYER_MASK);
        }
      }
      let minC = 99;
      for (const l of near) { if (l < A_FIRST + 6) continue; /* glow slots are single bright sparkles */ const cc = contrast(t[Layer.OUTLINE], t[l]); if (cc < 1.25 && process.env.DBG) console.log('near', biome, ph, rain, dark, l, t[l], t[Layer.OUTLINE], cc.toFixed(2)); minC = Math.min(minC, cc); }
      if (minC < worstNear) { worstNear = minC; cases.push(`${biome}/${ph}${rain ? '/rain' : ''}${dark ? '/dark' : ''} ${minC.toFixed(2)}`); }
    }
  }
  console.log(`worst outline vs sky ${worstSky.toFixed(2)}, vs nearby scenery ${worstNear.toFixed(2)} (${cases[cases.length - 1]}), HUD vs sky ${worstHud.toFixed(2)}`);
  ok(worstSky >= 2.4, `pet outline vs sky >= 2.4 in every phase, rain and appearance (worst ${worstSky.toFixed(2)})`);
  ok(worstNear >= 1.2, `pet outline vs the scenery tones behind it >= 1.2 (worst ${worstNear.toFixed(2)})`);
  ok(worstHud >= 1.3, `HUD glyphs vs sky >= 1.3 (worst ${worstHud.toFixed(2)})`);
}

// 5. static art is cached; animated parts change the frame; frames are deterministic
{
  for (const { biome, fam, ember } of SET) {
    const p = mk(adultOf(fam, ember));
    for (const ph of PHASES) for (const rain of [false, true]) {
      for (let k = 0; k < 8; k++) drawScene96(new Buf(96), sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', still: false, nowMs: T0 + k * 900 }), p); // warm every variant
    }
    const before = staticBuilds();
    for (const ph of PHASES) for (const rain of [false, true]) {
      for (let k = 0; k < 8; k++) drawScene96(new Buf(96), sceneOf(p, HOURS[ph], { weather: rain ? 'rain' : 'clear', still: false, nowMs: T0 + k * 900 + 450 }), p);
    }
    ok(staticBuilds() === before, `${biome}: the static layers are cached (no new paint on later frames)`);
    const f = (ms: number, hour: number) => { const b = new Buf(96); drawScene96(b, sceneOf(p, hour, { still: false, nowMs: T0 + ms }), p); return b.px; };
    const diff = (a: Uint8Array, b: Uint8Array) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
    const hours = [12, 23];
    let moved = 0;
    for (const h of hours) for (let k = 1; k < 6; k++) moved = Math.max(moved, diff(f(0, h), f(k * 700, h)));
    ok(moved >= 8, `${biome}: animated parts move the picture (${moved} cells differ)`);
    ok(diff(f(1234, 12), f(1234, 12)) === 0, `${biome}: a frame is a pure function of the clock`);
    const still1 = new Buf(96), still2 = new Buf(96);
    drawScene96(still1, sceneOf(p, 12, { still: true, nowMs: T0 + 100 }), p); drawScene96(still2, sceneOf(p, 12, { still: true, nowMs: T0 + 9000 }), p);
    ok(diff(still1.px, still2.px) === 0, `${biome}: a still scene (reduced motion) is frame zero`);
  }
}

// 6. draw-time budget per biome (warm)
{
  let worst = 0, worstId = '';
  for (const { biome, fam, ember } of SET) {
    const p = mk(adultOf(fam, ember));
    for (const ph of ['day', 'night'] as Phase[]) {
      const mkS = (i: number) => sceneOf(p, HOURS[ph], { still: false, nowMs: T0 + i * 125, state: 'walk', t: 2 });
      for (let i = 0; i < 24; i++) drawScene96(new Buf(96), mkS(i), p);
      const N = 120, t0 = performance.now();
      for (let i = 0; i < N; i++) drawScene96(new Buf(96), mkS(i), p);
      const ms = (performance.now() - t0) / N;
      if (ms > worst) { worst = ms; worstId = `${biome}/${ph}`; }
    }
  }
  console.log(`worst warm 96 scene draw: ${worst.toFixed(2)} ms (${worstId})`);
  ok(worst < 4, `a warm 96 scene costs ${worst.toFixed(2)} ms (< 4 ms) in every biome`);
  // a cold first draw (static art painted) stays far under a frame budget
  let coldWorst = 0;
  for (const { biome, fam, ember } of SET) {
    const p = mk(adultOf(fam, ember));
    drawScene96(new Buf(96), sceneOf(p, 12), p);
    const t0 = performance.now();
    drawScene96(new Buf(96), sceneOf(p, 3), p); // a phase not drawn yet
    coldWorst = Math.max(coldWorst, performance.now() - t0);
    void biome;
  }
  ok(coldWorst < 60, `a cold static paint costs ${coldWorst.toFixed(1)} ms (< 60 ms)`);
}

// 7. phases differ and ground / HUD geometry hold
{
  const p = mk('chomper');
  const d = new Buf(96), n = new Buf(96);
  drawScene96(d, sceneOf(p, 12), p); drawScene96(n, sceneOf(p, 23), p);
  ok(ALWAYS_DARK.has('ember') && GROUND_Y96 === 90, 'ground row unchanged');
  let night = 0, day = 0;
  for (let i = 0; i < d.px.length; i++) { if ((d.px[i] & LAYER_MASK) === Layer.FIREFLY) day++; if ((n.px[i] & LAYER_MASK) >= A_FIRST) night++; }
  ok(night > 300 && day === 0, 'meadow slots are drawn at night');
}

if (fails) { console.log(`biomes96: ${fails} FAILED of ${checks}`); process.exit(1); }
console.log(`biomes96: all ${checks} checks passed`);
