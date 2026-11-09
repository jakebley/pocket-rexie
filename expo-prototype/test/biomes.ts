// Biomes: family mapping, drawing in every stage and phase, the pet is never covered, Traditional stays plain, palette completeness.
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { ALWAYS_DARK, BIOMES, EMBER_SPIRITS, FAMILY_BIOME, biomeOf, biomeOfSpecies, type Biome } from '../src/ui/biomes';
import { ALL_LAYERS, DIM_FLAG, LAYER_COUNT, LAYER_MASK, Layer, PET_LAYER_CODES, SCENERY_FROM, tradVisible } from '../src/ui/layers';
import { contrast, darkSky, paletteTable, skyFor, soilFor, type PaletteCtx } from '../src/ui/palette';
import { Buf, litPath } from '../src/ui/pixel';
import { buildFrame } from '../src/ui/render';
import { GROUND_TAP_Y, GROUND_Y, SCENE_N, TICK_MS, initScene, phaseOf, type Phase, type Scene } from '../src/ui/scene';
import { drawScene } from '../src/ui/sceneDraw';
import { renderScreen } from '../src/ui/screens';
import { hashMask } from './hash';
import { sceneCases, lit, T0 } from './cases';
import { GOLDEN } from './golden-traditional';

declare const require: (m: string) => any; // node types are not installed; this file runs under tsx
const { existsSync, readFileSync } = require('fs');
let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const HEX = /^#[0-9a-f]{6}$/i;
const PHASES: Phase[] = ['dawn', 'day', 'dusk', 'night'];
const HOURS: Record<Phase, number> = { dawn: 6, day: 12, dusk: 19, night: 23 };
const PET_LAYERS = PET_LAYER_CODES;
const isCue = (l: number) => l === Layer.WAVE || l === Layer.HOLE || l === Layer.PEAK;

function petOf(id: string, seed = 11): Pet {
  const p = newPet(T0, { seed }); forceSpecies(p, id); p.named = true; p.hunger = 3; p.happy = 3; p.poops = 0; p.call = null;
  return p;
}
function sceneOf(p: Pet, hour: number, x: number, facing: 1 | -1, rain = false, extra: Partial<Scene> = {}): Scene {
  return { ...initScene(p, T0, hour), state: 'idle', x, facing, still: false, dim: false, weather: rain ? 'rain' : 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T0 + 3700, ...extra };
}
const render = (p: Pet, sc: Scene, biome?: Biome) => { const b = new Buf(SCENE_N); drawScene(b, sc, p, biome); return b; };

// 1. every family maps to a biome; spirits split by line
{
  for (const f of FAMILIES) ok(!!FAMILY_BIOME[f.id] && BIOMES.includes(FAMILY_BIOME[f.id]), `family ${f.id} has a biome`);
  ok(Object.keys(FAMILY_BIOME).length === FAMILIES.length, 'no stray family in FAMILY_BIOME');
  ok(new Set(Object.values(FAMILY_BIOME)).size === FAMILIES.length, 'each family has its own biome');
  ok(FAMILY_BIOME.dino === 'meadow', 'dino keeps the meadow');
  for (const s of SPECIES) {
    const b = biomeOfSpecies(s.id, s.family);
    ok(BIOMES.includes(b) && b !== 'meadow' === (s.family !== 'dino'), `${s.id} biome ${b}`);
    ok(biomeOf(petOf(s.id)) === b, `${s.id}: pet biome follows the species`);
    if (s.family === 'spirits') ok((b === 'ember') === EMBER_SPIRITS.has(s.id), `${s.id} ember split`);
    else ok(b === FAMILY_BIOME[s.family], `${s.id} follows its family`);
  }
  ok(biomeOf(newPet(T0, { family: 'fish' })) === 'underwater', 'an unhatched fish egg already maps to underwater');
  const py = '../tools/families/spirits.py';
  if (existsSync(py)) {
    const txt = readFileSync(py, 'utf8');
    const m = txt.match(/LINE = \{([\s\S]*?)\n\}/);
    const pairs = [...(m?.[1] ?? '').matchAll(/'(spirits_\w+)': '(\w+)'/g)];
    ok(pairs.length >= 30, `parsed ${pairs.length} spirit lines from spirits.py`);
    for (const [, id, line] of pairs) ok(EMBER_SPIRITS.has(id) === ['imp', 'horn', 'soot'].includes(line), `${id} (${line}) ember membership matches spirits.py`);
    ok(pairs.filter(([, , l]) => l === 'halo' || l === 'baby').every(([, id]) => biomeOfSpecies(id, 'spirits') === 'clouds'), 'halo and baby spirits stay in the cloud realm');
  }
}

// 2. biomes draw without throwing for every species (all stages), every phase, dry and rainy, both facings, with props and poops
{
  let drawn = 0, threw = 0;
  const stages = new Set<string>();
  for (const sp of SPECIES) {
    stages.add(sp.stage);
    const p = petOf(sp.id);
    for (const ph of PHASES) for (const rain of [false, true]) {
      try {
        const sc = sceneOf(p, HOURS[ph], ph === 'dawn' ? 0 : 32, ph === 'dusk' ? -1 : 1, rain, { poopMask: ph === 'night' ? 7 : 0, props: [{ g: 'food:meat', x: 40, y: 51, n: 1, side: 1 }, { g: 'broom', x: 5, y: 51 }, { g: 'foe', x: 30, y: 44, n: 3 }], dim: ph === 'night' && rain });
        render(p, sc); drawn++;
      } catch (e) { threw++; console.log('  threw', sp.id, ph, String(e)); }
    }
  }
  ok(threw === 0, `no biome draw throws (${drawn} draws, ${threw} threw)`);
  ok(stages.size === 5, 'all five stages covered');
  // every state of the scene director draws in every biome
  const p = petOf(SPECIES.find((s) => s.family === 'fox' && s.stage === 'adult')!.id);
  for (const b of BIOMES) for (const st of ['idle', 'walk', 'sleep', 'eat', 'battle', 'dance', 'poop'] as const) {
    try { render(p, sceneOf(p, 12, 10, 1, false, { state: st }), b); } catch { ok(false, `state ${st} in ${b}`); }
  }
}

// 3. the pet is never overwritten, scenery keeps off its silhouette, and the shared meadow layers are untouched
{
  let petPix = 0, bad = 0, ringBad = 0, sharedBad = 0, cases = 0;
  for (const sp of SPECIES.filter((s) => s.family !== 'dino')) {
    const p = petOf(sp.id, 3);
    for (const [ph, x, facing] of [['day', 0, 1], ['night', 16, -1], ['dusk', 32, 1], ['dawn', 9, -1]] as [Phase, number, 1 | -1][]) {
      const sc = sceneOf(p, HOURS[ph], x, facing, ph === 'dawn');
      const a = render(p, sc), m = render(p, sc, 'meadow');
      cases++;
      for (let i = 0; i < a.px.length; i++) {
        const la = a.px[i] & LAYER_MASK, lm = m.px[i] & LAYER_MASK;
        if (PET_LAYERS.has(lm)) { petPix++; if (a.px[i] !== m.px[i]) bad++; }
        // shared layers identical to the meadow render, ignoring scenery and cue pixels
        const na = la >= Layer.WAVE ? a.px[i] & DIM_FLAG : a.px[i], nm = lm >= Layer.WAVE ? m.px[i] & DIM_FLAG : m.px[i];
        if (na !== nm) sharedBad++;
        if (la >= SCENERY_FROM && !PET_LAYERS.has(la)) {
          const cx = i % SCENE_N, cy = (i / SCENE_N) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < SCENE_N && ny < SCENE_N && PET_LAYERS.has(a.px[ny * SCENE_N + nx] & LAYER_MASK)) ringBad++;
          }
        }
      }
    }
  }
  ok(petPix > 100000, `pet pixels checked (${petPix} over ${cases} renders)`);
  ok(bad === 0, `the pet's footprint is never overwritten by background pixels (${bad} differ)`);
  ok(ringBad === 0, `no scenery pixel touches the pet silhouette (${ringBad})`);
  ok(sharedBad === 0, `shared meadow layers are identical to the meadow render outside scenery and cues (${sharedBad} differ)`);
}

// 4. dino stays the meadow: byte-identical Traditional (golden) and no biome layer ever drawn for it
{
  const cases = sceneCases();
  let bad = 0;
  for (const c of cases) if (GOLDEN[c.name] !== hashMask(lit(c.draw()))) bad++;
  ok(bad === 0, `dino Traditional golden unchanged (${cases.length} cases, ${bad} differ)`);
  let stray = 0;
  for (const sp of SPECIES.filter((s) => s.family === 'dino')) {
    const p = petOf(sp.id);
    for (const ph of PHASES) for (const rain of [false, true]) {
      const sc = sceneOf(p, HOURS[ph], 10, 1, rain);
      const a = render(p, sc), m = render(p, sc, 'meadow');
      for (let i = 0; i < a.px.length; i++) { if ((a.px[i] & LAYER_MASK) >= Layer.WAVE && !PET_LAYERS.has(a.px[i] & LAYER_MASK)) stray++; if (a.px[i] !== m.px[i]) stray++; }
    }
  }
  ok(stray === 0, `dino scenes contain no biome pixels (${stray})`);
}

// 5. Traditional mode: scenery prints unlit, only a handful of cue pixels differ from the meadow
{
  let worst = 0, leaked = 0, cueSeen = new Set<number>();
  for (const sp of SPECIES.filter((s) => s.stage === 'adult')) {
    const p = petOf(sp.id, 5);
    for (const ph of PHASES) for (const rain of [false, true]) {
      const sc = sceneOf(p, HOURS[ph], 14, 1, rain);
      const a = render(p, sc), m = render(p, sc, 'meadow');
      const f = buildFrame({ buf: a, dark: false }, { mode: 'traditional', dark: false });
      const px = Uint8Array.from(a.px, (v) => ((v & LAYER_MASK) >= SCENERY_FROM ? v & DIM_FLAG : v));
      ok(f.groups.length === 1 && f.groups[0].d === litPath(px, SCENE_N), `${sp.id} ${ph}: Traditional drops scenery`);
      let extra = 0;
      for (let i = 0; i < a.px.length; i++) {
        const l = a.px[i] & LAYER_MASK;
        if (isCue(l)) cueSeen.add(l);
        const shown = (l < SCENERY_FROM) ? (a.px[i] ? 1 : 0) : (a.px[i] & DIM_FLAG ? 1 : 0);
        if (shown !== (m.px[i] ? 1 : 0)) extra++;
        if (l >= SCENERY_FROM && !(a.px[i] & DIM_FLAG) && shown) leaked++;
      }
      worst = Math.max(worst, extra);
    }
  }
  ok(leaked === 0, 'no scenery pixel is lit in Traditional');
  ok(worst <= 80, `Traditional differs from the meadow by at most ${worst} cue pixels (<= 80)`);
  ok(cueSeen.size === 3, `all three cue layers appear (${[...cueSeen].join(',')})`);
  ok(tradVisible(Layer.PEAK) && !tradVisible(Layer.BARK) && SCENERY_FROM === Layer.BARK, 'layer visibility split');
}

// 6. Technicolor palette: every layer coloured for every biome x appearance x phase x rain; sky and soil per biome
{
  const seen = new Set<number>();
  let drawnPx = 0, maxScenery = 0, maxGroups = 0;
  for (const b of BIOMES) {
    for (const dark of [false, true]) for (const ph of PHASES) for (const rain of [false, true]) {
      const ctx: PaletteCtx = { mode: 'technicolor', dark, line: 'meat', biome: b, phase: ph, rain, night: darkSky(b, ph) };
      const t = paletteTable(ctx);
      ok(t.length === LAYER_COUNT + 1, 'palette table sized by LAYER_COUNT');
      for (const l of ALL_LAYERS) if (!HEX.test(t[l])) ok(false, `layer ${l} colour in ${b}/${ph}`);
      ok(HEX.test(skyFor(ctx, ph, rain, b)) && HEX.test(soilFor(ctx, b)), `sky and soil colours for ${b} ${ph}`);
    }
  }
  // fish: water-tinted in every phase, deeper at night, darker for rain
  for (const ph of PHASES) { const c = skyFor({ mode: 'technicolor', dark: false }, ph, false, 'underwater'); const [r, g, bl] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); ok(bl > r && bl >= g - 30, `underwater ${ph} sky is water-blue (${c})`); }
  const lum = (c: string) => contrast(c, '#000000');
  const uw = (ph: Phase, rain = false) => skyFor({ mode: 'technicolor', dark: false }, ph, rain, 'underwater');
  ok(lum(uw('day')) > lum(uw('dusk')) && lum(uw('dusk')) > lum(uw('night')) && lum(uw('day')) > lum(uw('day', true)), 'underwater: brighter by day, deep at night, darker in rain');
  ok(new Set(BIOMES.map((b) => skyFor({ mode: 'technicolor', dark: false }, 'day', false, b))).size >= 9, 'biomes have distinct day skies');
  // render every family in every phase and appearance
  const fams = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
  const ids = [...fams.map((f) => SPECIES.find((s) => s.family === f && s.stage === 'adult')!.id), 'spirits_emberhorn'];
  for (const id of ids) {
    const p = petOf(id, 8);
    const biome = biomeOf(p);
    for (const ph of PHASES) for (const rain of [false, true]) for (const dark of [false, true]) {
      const sc = sceneOf(p, HOURS[ph], 16, 1, rain);
      const r = renderScreen({ pet: p, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc });
      ok(r.sky?.biome === biome && r.sky.phase === phaseOf(HOURS[ph]), `${id} ${ph}: sky info carries the biome`);
      const f = buildFrame(r, { mode: 'technicolor', dark, line: 'meat', bodyHex: undefined });
      let sc2 = 0;
      for (const v of r.buf.px) { const l = v & LAYER_MASK; if (l) seen.add(l); if (l >= SCENERY_FROM) sc2++; }
      drawnPx++;
      maxScenery = Math.max(maxScenery, sc2); maxGroups = Math.max(maxGroups, f.groups.length);
      const painted = f.groups.reduce((a, g) => a + (g.d.match(/M/g)?.length ?? 0), 0);
      ok(painted === r.buf.px.reduce((a, v) => a + (v ? 1 : 0), 0), `${id} ${ph}: every lit pixel painted once`);
      ok(new Set(f.groups.map((g) => g.color)).size === f.groups.length, 'one path per colour');
      // readability on this biome's backdrop: ink and the hearts against the sky
      const sky = skyFor({ mode: 'technicolor', dark }, phaseOf(HOURS[ph]), rain, biome);
      const t = paletteTable({ mode: 'technicolor', dark, line: 'meat', biome, phase: phaseOf(HOURS[ph]), rain, night: darkSky(biome, phaseOf(HOURS[ph])) });
      ok(contrast(t[Layer.INK], sky) >= 3, `${biome} ${ph}${rain ? '/rain' : ''} ${dark ? 'dark' : 'light'}: ink vs sky ${contrast(t[Layer.INK], sky).toFixed(2)} >= 3`);
      ok(contrast(t[Layer.HEART], sky) >= 1.6, `${biome} ${ph}${rain ? '/rain' : ''} ${dark ? 'dark' : 'light'}: heart vs sky ${contrast(t[Layer.HEART], sky).toFixed(2)} >= 1.6`);
    }
  }
  const missing = ALL_LAYERS.filter((l) => l >= Layer.WAVE && !PET_LAYERS.has(l) && !seen.has(l));
  ok(missing.length === 0, `every biome layer appears in some scene (missing: ${missing.join(',')})`);
  ok(maxScenery <= 1300, `background pixel budget (max ${maxScenery} scenery pixels <= 1300)`);
  ok(maxGroups <= 70, `few SVG paths per biome frame (max ${maxGroups} <= 70)`);
  ok(ALWAYS_DARK.has('swamp') && !ALWAYS_DARK.has('woods'), 'always-dark biomes');
  void drawnPx;
}

// 7. gameplay geometry is untouched: ground row, ground tap row, ground band in every biome, props drawn over the scenery
{
  ok(GROUND_Y === 60 && GROUND_TAP_Y === 52, 'ground and tap rows unchanged');
  for (const b of BIOMES) {
    const p = petOf(SPECIES.find((s) => s.family === 'fox' && s.stage === 'adult')!.id);
    const buf = render(p, sceneOf(p, 12, 0, 1, false, { props: [{ g: 'food:meat', x: 52, y: 50, n: 0, side: 1 }, { g: 'broom', x: 38, y: 50 }, { g: 'ball', x: 44, y: 34 }, { g: 'foe', x: 12, y: 40, n: 3 }] }), b);
    let ground = 0, food = 0, tool = 0, ball = 0;
    for (let x = 0; x < SCENE_N; x++) if ((buf.px[GROUND_Y * SCENE_N + x] & LAYER_MASK) === Layer.GROUND) ground++;
    for (const v of buf.px) { const l = v & LAYER_MASK; if (l === Layer.FOOD_MEAT) food++; if (l === Layer.TOOL) tool++; if (l === Layer.BALL) ball++; }
    ok(ground >= 56, `${b}: ground band intact (${ground}/64 columns)`);
    ok(food > 30 && tool > 15 && ball > 20, `${b}: food, broom and ball props are drawn (${food}/${tool}/${ball})`);
  }
}

// 8. cost: a biome frame is cheap (no per-frame allocation of the static art; budget generous for CI)
{
  const p = petOf(SPECIES.find((s) => s.family === 'bot' && s.stage === 'adult')!.id);
  const sc = sceneOf(p, 12, 10, 1);
  const buf = new Buf(SCENE_N);
  for (let i = 0; i < 20; i++) drawScene(buf, sc, p);
  const t0 = process.hrtime.bigint();
  const N = 300;
  for (let i = 0; i < N; i++) { buf.px.fill(0); drawScene(buf, { ...sc, nowMs: T0 + i * TICK_MS }, p); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  ok(ms < 3, `biome scene draws in ${ms.toFixed(2)} ms/frame (< 3)`);
}

console.log(fails ? `biomes: ${fails} FAILED of ${checks}` : `biomes: all ${checks} checks passed`);
if (fails) process.exit(1);
