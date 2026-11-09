import { GOLDEN } from './golden-traditional';
import { hashMask } from './hash';
import { SPECIES } from '../src/core/speciesData';
import { ALL_LAYERS, DIM_FLAG, LAYER_COUNT, LAYER_MASK, Layer, petLayers, type Line } from '../src/ui/layers';
import { COLOR_MODE_KEY, DEFAULT_COLOR_MODE, loadColorMode, saveColorMode, type KeyValueStore } from '../src/ui/colorModeStore';
import { colorFor, contrast, paletteTable, screenColors, skyFor, type PaletteCtx } from '../src/ui/palette';
import { Buf, litPath } from '../src/ui/pixel';
import { drawScene } from '../src/ui/sceneDraw';
import { buildFrame } from '../src/ui/render';
import { screenCases, sceneCases, lit, T0 } from './cases';
import { renderScreen } from '../src/ui/screens';
import { forceSpecies, newPet } from '../src/core/pet';
import { SCENE_N, initScene } from '../src/ui/scene';

let fails = 0;
let checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };

const LINES: Line[] = ['baby', 'meat', 'veggie', 'pasta', 'neglect'];
const HEX = /^#[0-9a-f]{6}$/i;
const PHASES = ['dawn', 'day', 'dusk', 'night'] as const;

// 1. Traditional output is pixel-for-pixel the previous bitmap (golden hashes made from the pre-layer drawing code)
{
  const golden = GOLDEN;
  const cases = [...sceneCases(), ...screenCases()];
  ok(Object.keys(golden).length === cases.length, `golden covers all ${cases.length} cases (has ${Object.keys(golden).length})`);
  const seen = new Set<number>();
  let bad = 0, pathBad = 0;
  for (const c of cases) {
    const b = c.draw();
    const h = hashMask(lit(b));
    if (golden[c.name] !== h) { bad++; if (bad < 4) console.log('  differs:', c.name); }
    for (const v of b.px) seen.add(v & LAYER_MASK);
    // the Traditional frame is one ink path equal to the old lit-cell path
    const frame = buildFrame({ buf: b, dark: false }, { mode: 'traditional', dark: false });
    const oldPath = litPath(Uint8Array.from(lit(b)), b.n);
    if (frame.groups.length !== 1 || frame.groups[0].d !== oldPath || frame.sky !== null) pathBad++;
  }
  ok(bad === 0, `Traditional mask equals the previous bitmap for all ${cases.length} cases (${bad} differ)`);
  ok(pathBad === 0, `Traditional frame is one ink path identical to the old one (${pathBad} differ)`);
  ok([...seen].every((v) => v < LAYER_COUNT), 'only known layer codes are drawn');
  // the ambient butterfly only flies in a time window: scan for it
  {
    const p = newPet(T0, { seed: 5 }); forceSpecies(p, 'rawr'); p.named = true;
    for (let t = 0; t < 90000 * 3 && !seen.has(Layer.BUTTERFLY); t += 700) {
      const b = new Buf(SCENE_N);
      drawScene(b, { ...initScene(p, T0, 12), nowMs: T0 + t, still: false, weather: 'clear' }, p);
      for (const v of b.px) seen.add(v & LAYER_MASK);
    }
  }
  const missing = ALL_LAYERS.filter((l) => l < Layer.WAVE && !(l >= Layer.SHADE && l <= Layer.GLINT) && !seen.has(l)); // the biome layers are covered by test/biomes.ts, the pet shading layers by test/shading.ts
  // every layer must be reachable by the drawing code; BODY_LIGHT etc. are covered via species cases
  ok(missing.length === 0, `every layer appears in some drawing (missing: ${missing.join(',')})`);
}

// 2. petLayers rule
{
  const rows = ['.....', '.XXX.', 'XXXXX', 'XXXXX', 'XXXXX', '.XXX.'];
  const L = petLayers(rows), w = 5;
  const at = (x: number, y: number) => L[y * w + x];
  ok(at(0, 0) === 0 && at(1, 0) === 0, 'unlit stays 0');
  ok(at(1, 1) === Layer.OUTLINE && at(0, 2) === Layer.OUTLINE && at(4, 3) === Layer.OUTLINE, 'edge pixels are outline');
  ok(at(2, 2) === Layer.BODY_LIGHT && at(1, 2) === Layer.BODY_LIGHT, 'interior pixel under or right of the outline is highlighted');
  ok(at(2, 3) !== Layer.BODY_LIGHT && at(3, 3) === Layer.BODY, 'deep interior is body');
  // a hole (eye) stays unlit and is ringed with outline
  const holed = ['XXXXX', 'XXXXX', 'XX.XX', 'XXXXX', 'XXXXX'];
  const H = petLayers(holed);
  ok(H[2 * 5 + 2] === 0 && H[1 * 5 + 2] === Layer.OUTLINE && H[2 * 5 + 1] === Layer.OUTLINE, 'eye hole stays unlit with outline around it');
  for (const sp of SPECIES) {
    for (const fr of sp.hiFrames) {
      const P = petLayers(fr);
      let litN = 0, litSrc = 0, outN = 0;
      fr.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'X') { litSrc++; if (P[y * r.length + x]) litN++; } }));
      P.forEach((v) => { if (v === Layer.OUTLINE) outN++; });
      if (litN !== litSrc || outN === 0) ok(false, `${sp.id} pet layers cover the sprite`);
    }
  }
}

// 3. palette completeness: a color for every layer in all four mode x appearance combos
{
  for (const mode of ['traditional', 'technicolor'] as const) for (const dark of [false, true]) for (const night of [false, true]) for (const line of LINES) {
    const ctx: PaletteCtx = { mode, dark, line, night };
    const sc = screenColors(mode, dark);
    ok(HEX.test(sc.ground) && HEX.test(sc.ink), `${mode} ${dark} screen colors`);
    for (const l of ALL_LAYERS) {
      const c = colorFor(l, ctx);
      if (!HEX.test(c)) ok(false, `no color for layer ${l} in ${mode}/${dark ? 'dark' : 'light'}/${line}`);
      if (mode === 'traditional' && c !== sc.ink) ok(false, `traditional layer ${l} must be ink`);
    }
    ok(paletteTable(ctx).length > LAYER_COUNT - 1, 'palette table is long enough');
  }
  ok(new Set(ALL_LAYERS.map((l) => colorFor(l, { mode: 'technicolor', dark: false, line: 'meat' }))).size >= 20, 'technicolor layers are visually distinct');
  for (const dark of [false, true]) for (const rain of [false, true]) for (const p of PHASES) ok(HEX.test(skyFor({ mode: 'technicolor', dark }, p, rain)), `sky ${p}`);
  ok(skyFor({ mode: 'technicolor', dark: false }, 'day', true) === '#9AA8B0' && skyFor({ mode: 'technicolor', dark: false }, 'night', true) === '#2F3A5A', 'rain overrides day and dusk only');
}

// 4. contrast (Technicolor, light and dark)
{
  for (const dark of [false, true]) {
    const tag = dark ? 'dark' : 'light';
    for (const mode of ['traditional', 'technicolor'] as const) {
      const sc = screenColors(mode, dark);
      ok(contrast(sc.ink, sc.ground) >= 3, `${mode} ${tag}: text vs ground ${contrast(sc.ink, sc.ground).toFixed(2)} >= 3`);
    }
    for (const line of LINES) {
      const t = paletteTable({ mode: 'technicolor', dark, line });
      const r = contrast(t[Layer.BODY], t[Layer.OUTLINE]);
      ok(r >= 3, `${tag}: ${line} body vs outline ${r.toFixed(2)} >= 3`);
    }
    if (!dark) for (const line of LINES) {
      const n = paletteTable({ mode: 'technicolor', dark, line, night: true });
      ok(contrast(n[Layer.BODY], n[Layer.OUTLINE]) >= 3, `light night: ${line} body vs outline ${contrast(n[Layer.BODY], n[Layer.OUTLINE]).toFixed(2)} >= 3`);
    }
    const day = paletteTable({ mode: 'technicolor', dark, night: false });
    const sky = skyFor({ mode: 'technicolor', dark }, 'day', false);
    for (const [name, l] of [['heart', Layer.HEART], ['ink', Layer.INK]] as const) ok(contrast(day[l], sky) >= 3, `${tag}: ${name} vs day sky ${contrast(day[l], sky).toFixed(2)} >= 3`);
    // scene ink and hearts stay readable on every sky (night uses the night palette)
    for (const p of PHASES) for (const rain of [false, true]) {
      const t = paletteTable({ mode: 'technicolor', dark, night: p === 'night' });
      const s = skyFor({ mode: 'technicolor', dark }, p, rain);
      ok(contrast(t[Layer.INK], s) >= 3, `${tag}: ink vs ${p}${rain ? '/rain' : ''} sky ${contrast(t[Layer.INK], s).toFixed(2)} >= 3`);
      if (!rain) ok(contrast(t[Layer.HEART], s) >= 2.4, `${tag}: heart vs ${p} sky ${contrast(t[Layer.HEART], s).toFixed(2)} >= 2.4`);
    }
  }
}

// 5. Technicolor frames: few paths, every lit pixel painted exactly once, dim darkens
{
  const p = newPet(T0, { seed: 5 }); forceSpecies(p, 'rawr'); p.named = true; p.call = 'hungry'; p.poops = 2;
  let maxGroups = 0;
  for (const dark of [false, true]) for (const hour of [6, 12, 19, 23]) {
    const sc = { ...initScene(p, T0, hour), nowMs: T0 + 5000, weather: 'rain' as const };
    const r = renderScreen({ pet: p, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: sc });
    const f = buildFrame(r, { mode: 'technicolor', dark, line: 'meat' });
    const litN = r.buf.px.reduce((a, v) => a + (v ? 1 : 0), 0);
    const painted = f.groups.reduce((a, g) => a + (g.d.match(/M/g)?.length ?? 0), 0);
    ok(painted === litN, `every lit pixel is painted once (${painted} vs ${litN})`);
    ok(f.sky !== null && f.soil !== null, 'scene frames get a sky and soil');
    maxGroups = Math.max(maxGroups, f.groups.length);
    const dimmed = buildFrame({ ...r, sky: { ...r.sky!, dim: true } }, { mode: 'technicolor', dark, line: 'meat' });
    ok(dimmed.sky!.color !== f.sky!.color, 'lights-off darkens the sky');
    ok(new Set(f.groups.map((g) => g.color)).size === f.groups.length, 'one path per color');
  }
  ok(maxGroups <= 40, `few SVG paths per frame (max ${maxGroups})`);
  const ghost = { ...p, stage: 'ghost' as const };
  const tr = renderScreen({ pet: ghost, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: null });
  const tf = buildFrame(tr, { mode: 'technicolor', dark: false, line: 'meat' });
  ok(tf.sky === null && tf.soil === null && tf.groups.length >= 1, 'text screens have no sky');
  void DIM_FLAG;
}

// 6. persistence round trip and immediate application
{
  const mem = new Map<string, string>();
  const store: KeyValueStore = { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } };
  (async () => {
    ok(COLOR_MODE_KEY === 'pocket-rexie-colormode-v1', 'storage key');
    ok(DEFAULT_COLOR_MODE === 'traditional' && (await loadColorMode(store)) === 'traditional', 'default is traditional');
    await saveColorMode(store, 'technicolor');
    ok(mem.get(COLOR_MODE_KEY) === 'technicolor', 'saved under the key');
    ok((await loadColorMode(store)) === 'technicolor', 'technicolor survives a relaunch');
    await saveColorMode(store, 'traditional');
    ok((await loadColorMode(store)) === 'traditional', 'traditional round trips');
    mem.set(COLOR_MODE_KEY, 'sepia');
    ok((await loadColorMode(store)) === 'traditional', 'unknown value falls back');
    const broken: KeyValueStore = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); } };
    ok((await loadColorMode(broken)) === 'traditional', 'unreadable store falls back');
    await saveColorMode(broken, 'technicolor');
    ok(true, 'unwritable store does not throw');
    console.log(fails ? `color: ${fails} FAILED of ${checks}` : `color: all ${checks} checks passed`);
    if (fails) process.exit(1);
  })();
}
