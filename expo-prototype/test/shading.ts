// Pet shading (src/ui/shading.ts): the lit pixel set never changes (Traditional stays pixel-identical), every new layer has a colour in every
// mode, the ramp is ordered light to dark, the light comes from the top-left, the pet stays readable on every biome sky, and the cost is flat.
import { GOLDEN } from './golden-traditional';
import { hashMask } from './hash';
import { screenCases, sceneCases, lit, T0 } from './cases';
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { SPECIES_BY_ID, forceSpecies, newPet } from '../src/core/pet';
import { BIOMES, FAMILY_BIOME, type Biome } from '../src/ui/biomes';
import { ALL_LAYERS, Layer, PET_LAYER_CODES, petLayers, tradVisible } from '../src/ui/layers';
import { contrast, darkSky, paletteTable, shadeRamp, skyFor, type PaletteCtx } from '../src/ui/palette';
import { Buf } from '../src/ui/pixel';
import { buildFrame } from '../src/ui/render';
import { SCENE_N, initScene } from '../src/ui/scene';
import { drawScene } from '../src/ui/sceneDraw';
import { shadedPetLayers } from '../src/ui/shading';
import type { Phase } from '../src/ui/scene';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const HEX = /^#[0-9a-f]{6}$/i;
const SHADING_LAYERS = [Layer.BODY_LIGHT, Layer.SHADE, Layer.DEEP, Layer.BELLY, Layer.ACCENT, Layer.ACCENT_DARK, Layer.ACCENT_LIGHT, Layer.RIM, Layer.EYE, Layer.GLINT];
const flip = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// 1. the lit pixel set (and the outline set) of every species frame, both facings, equals the flat split's
{
  let frames = 0, litBad = 0, outlineBad = 0, unknown = 0;
  const seen = new Set<number>();
  for (const sp of SPECIES) for (const fr of sp.hiFrames) for (const rows of [fr, flip(fr)]) {
    const old = petLayers(rows), now = shadedPetLayers(rows, sp.family);
    frames++;
    if (now.length !== old.length) { litBad++; continue; }
    for (let i = 0; i < old.length; i++) {
      if ((old[i] !== 0) !== (now[i] !== 0 && tradVisible(now[i]))) litBad++; // Traditional-visible cells only: eye fills print as unlit
      const wasOutline = old[i] === Layer.OUTLINE;
      const isOutline = now[i] === Layer.OUTLINE || now[i] === Layer.RIM || now[i] === Layer.EYE;
      if (wasOutline !== isOutline) outlineBad++;
      if (now[i]) { seen.add(now[i]); if (!PET_LAYER_CODES.has(now[i])) unknown++; }
    }
  }
  ok(frames >= 1600, `shaded ${frames} species frames (both facings)`);
  ok(litBad === 0, `lit pixel set unchanged for every species frame (${litBad} cells differ)`);
  ok(outlineBad === 0, `outline cells unchanged (${outlineBad} differ): OUTLINE / RIM / EYE are exactly the old outline`);
  ok(unknown === 0, 'shading only emits pet layer codes');
  for (const l of [...SHADING_LAYERS, Layer.BODY, Layer.OUTLINE]) ok(seen.has(l), `layer ${l} is produced by some species`);
}

// 1b. eyes are opaque in Technicolor: the see-through eye holes (and only those) are filled; blink frames without a hole draw nothing
{
  let frames = 0, withEye = 0, seeThrough = 0, tooMany = 0, notHole = 0, noShine = 0, speciesWithEye = 0, blinkEyeless = 0;
  for (const sp of SPECIES) {
    let any = false;
    sp.hiFrames.forEach((fr, fi) => {
      const L = shadedPetLayers(fr, sp.family), w = fr[0].length;
      let fill = 0, shine = 0;
      for (let i = 0; i < L.length; i++) {
        if (L[i] !== Layer.EYE_FILL && L[i] !== Layer.EYE_SHINE) continue;
        fill++; if (L[i] === Layer.EYE_SHINE) shine++;
        if (fr[(i / w) | 0][i % w] === 'X') notHole++; // only unlit cells (the holes) are filled
        const x = i % w, y = (i / w) | 0;
        for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (!L[ay * w + ax]) seeThrough++; // every fill cell is enclosed by body, ring or fill
      }
      frames++;
      // a lone one-pixel pupil has no room for a shine: the ring corner carries the glint
      if (fill) { withEye++; any = true; if (!shine && fill > 2) noShine++; }
      if (fill > (sp.family === 'alien' ? 64 : 12)) tooMany++; // aliens carry big eyes (up to three)
      if (fi === 1 && !fill && sp.hiFrames[0].join('') !== fr.join('')) blinkEyeless++;
    });
    if (any) speciesWithEye++;
  }
  ok(notHole === 0, `eye fills only cover unlit hole cells (${notHole} on lit cells)`);
  ok(seeThrough === 0, `eye fills are enclosed, no see-through gap around them (${seeThrough})`);
  ok(tooMany === 0, 'at most two small eyes per frame: spots, windows and cut-outs stay holes');
  ok(noShine === 0, 'every filled eye has a catch-light');
  ok(speciesWithEye >= SPECIES.length * 0.78, `${speciesWithEye} of ${SPECIES.length} species have an opaque eye`);
  console.log(`  eyes: ${withEye} of ${frames} frames filled; ${blinkEyeless} blink frames without a hole draw none`);
  const cat = SPECIES.find((s) => s.id === 'cat_brindle')!;
  const Lc = shadedPetLayers(cat.hiFrames[0], 'cat');
  let unlitInside = 0;
  cat.hiFrames[0].forEach((r, y) => [...r].forEach((c, x) => { if (c !== 'X' && Lc[y * 32 + x] === 0 && x > 5 && x < 27) unlitInside++; }));
  ok(unlitInside > 20, 'cat back spots are still holes');
  // Technicolor frame: the eye cells are painted with the pupil and shine colours; Traditional prints them as unlit
  const fox = /* a dino: fox eyes are one cell, which carries no catch-light */ newPet(T0, { seed: 5 }); forceSpecies(fox, 'chomper'); fox.named = true;
  const b = new Buf(SCENE_N);
  drawScene(b, { ...initScene(fox, T0, 12), nowMs: T0 + 1234, still: true, weather: 'clear' }, fox);
  const eyeCells = [...b.px].filter((v) => v === Layer.EYE_FILL || v === Layer.EYE_SHINE).length;
  ok(eyeCells >= 2, `the scene buffer carries the eye fill (${eyeCells} cells)`);
  const col = buildFrame({ buf: b, dark: false }, { mode: 'technicolor', dark: false, bodyHex: '#D09A40' });
  const t = paletteTable({ mode: 'technicolor', dark: false, bodyHex: '#D09A40' });
  ok(col.groups.some((g) => g.color === t[Layer.EYE_FILL]) && col.groups.some((g) => g.color === t[Layer.EYE_SHINE]), 'Technicolor paints the pupil and the shine');
  const tr = buildFrame({ buf: b, dark: false }, { mode: 'traditional', dark: false });
  const noEye = Uint8Array.from(b.px, (v) => (v === Layer.EYE_FILL || v === Layer.EYE_SHINE ? 0 : v));
  ok(tr.groups.length === 1 && tr.groups[0].d === buildFrame({ buf: { ...b, px: noEye } as unknown as Buf, dark: false }, { mode: 'traditional', dark: false }).groups[0].d, 'Traditional frame is the same with or without the eye fill');
}

// 2. Traditional is pixel-identical: the dino golden (same hashes as test/color.ts) and one ink path for every family
{
  const cases = [...sceneCases(), ...screenCases()];
  let bad = 0;
  for (const c of cases) if (GOLDEN[c.name] !== hashMask(lit(c.draw()))) bad++;
  ok(bad === 0 && cases.length === Object.keys(GOLDEN).length, `dino Traditional golden unchanged (${cases.length} cases, ${bad} differ)`);
  let multi = 0, n = 0;
  for (const f of FAMILIES) {
    const sp = SPECIES.filter((s) => s.family === f.id);
    for (const s of [sp[0], sp[sp.length >> 1], sp[sp.length - 1]]) {
      const p = newPet(T0, { seed: 5 }); forceSpecies(p, s.id); p.named = true;
      const b = new Buf(SCENE_N);
      drawScene(b, { ...initScene(p, T0, 12), nowMs: T0 + 1234, still: true, weather: 'clear' }, p);
      const fr = buildFrame({ buf: b, dark: false }, { mode: 'traditional', dark: false });
      n++;
      if (fr.groups.length !== 1 || fr.sky !== null) multi++;
    }
  }
  ok(multi === 0, `Traditional frames are a single ink path for every family (${n} checked)`);
}

// 3. every new layer has a colour in every mode: light, dark, night, every biome and phase, rain
{
  let missing = 0, tables = 0;
  const phases: Phase[] = ['dawn', 'day', 'dusk', 'night'];
  for (const biome of BIOMES) for (const dark of [false, true]) for (const ph of phases) for (const rain of [false, true]) {
    for (const bodyHex of [undefined, '#E7DCC0', '#8B3E1C', '#535B7E', '#2F4F3A', '#F2F0E8']) {
      const ctx: PaletteCtx = { mode: 'technicolor', dark, line: 'meat', bodyHex, biome, phase: ph, rain, night: darkSky(biome, ph) };
      const t = paletteTable(ctx);
      tables++;
      for (const l of ALL_LAYERS) if (!HEX.test(t[l])) missing++;
      for (const l of SHADING_LAYERS) if (!HEX.test(t[l])) missing++;
    }
  }
  ok(missing === 0, `every layer has a hex colour in ${tables} palette tables (${missing} missing)`);
  const trad = paletteTable({ mode: 'traditional', dark: false });
  ok(SHADING_LAYERS.every((l) => trad[l] === trad[Layer.OUTLINE]), 'Traditional prints every shading layer as the one ink');
}

// 4. the ramp: highlight lighter than base lighter than shadow lighter than deep, for every species in light and dark; belly lighter than base
{
  let order = 0, belly = 0, distinct = 0, hue = 0, sp = 0;
  for (const s of SPECIES) {
    for (const dark of [false, true]) {
      const t = paletteTable({ mode: 'technicolor', dark, line: s.line as any, bodyHex: s.bodyHex, biome: FAMILY_BIOME[s.family] as Biome });
      sp++;
      const L = [t[Layer.BODY_LIGHT], t[Layer.BODY], t[Layer.SHADE], t[Layer.DEEP]].map(lum);
      if (!(L[0] > L[1] && L[1] > L[2] && L[2] > L[3])) order++;
      if (lum(t[Layer.BELLY]) <= L[1]) belly++;
      if (contrast(t[Layer.BODY_LIGHT], t[Layer.BODY]) < 1.08 || contrast(t[Layer.BODY], t[Layer.SHADE]) < 1.08) distinct++;
      void hue;
    }
  }
  ok(order === 0, `ramp is ordered highlight > base > shadow > deep for all ${sp} species/modes (${order} wrong)`);
  ok(belly === 0, `belly is lighter than the base (${belly} wrong)`);
  ok(distinct === 0, `highlight and shadow are distinguishable from the base (${distinct} too close)`);
  // hue shift, not just darkening: a saturated warm body gets a cooler shadow
  const r = shadeRamp('#C27358');
  const hueOf = (h: string) => { const [R, G, B] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.atan2(Math.sqrt(3) * (G - B), 2 * R - G - B) * 180 / Math.PI; };
  ok(hueOf(r.shade) < hueOf('#C27358') - 3 && hueOf(r.hi) > hueOf('#C27358') + 3, 'shadow hue shifts cool, highlight hue shifts warm');
}

// 5. light from the top-left, whatever the facing: highlights sit up-left of shadows, and the shading is not noisy
{
  let wrong = 0, tested = 0, noisy = 0, worst = 0;
  for (const sp of SPECIES) for (const fr of sp.hiFrames) for (const rows of [fr, flip(fr)]) {
    const L = shadedPetLayers(rows, sp.family), w = rows[0].length;
    let hn = 0, hs = 0, sn = 0, ss = 0, interior = 0, edges = 0;
    for (let i = 0; i < L.length; i++) {
      const x = i % w, y = (i / w) | 0;
      if (L[i] === Layer.BODY_LIGHT) { hn++; hs += x + y; }
      if (L[i] === Layer.SHADE || L[i] === Layer.DEEP) { sn++; ss += x + y; }
      const c = L[i];
      if (c && c !== Layer.OUTLINE && c !== Layer.RIM && c !== Layer.EYE) {
        interior++;
        for (const j of [i + 1, i + w]) if (L[j] && L[j] !== Layer.OUTLINE && L[j] !== Layer.RIM && L[j] !== Layer.EYE && L[j] !== c && (j !== i + 1 || x < w - 1)) edges++;
      }
    }
    if (hn >= 6 && sn >= 6) { tested++; if (hs / hn >= ss / sn) wrong++; }
    if (interior >= 30) { const r = edges / interior; if (r > worst) worst = r; if (r > 0.95) noisy++; }
  }
  ok(tested > 1500 && wrong <= tested * 0.01, `highlights sit up-left of shadows (${wrong} of ${tested} frames wrong)`);
  ok(noisy === 0, `tone changes stay calm: at most 0.95 per interior pixel (worst ${worst.toFixed(2)}, ${noisy} frames over)`);
}

// 6. the pet stays readable on every biome sky, phase, weather and appearance: its outline or body clears a contrast floor against the sky
{
  const FLOOR = 3.0, RIM_FLOOR = 2.3;
  let worst = 99, worstWhere = '', bad = 0, n = 0, rimWorst = 99, rimWhere = '';
  const phases: Phase[] = ['dawn', 'day', 'dusk', 'night'];
  for (const s of SPECIES) {
    const biome = FAMILY_BIOME[s.family] as Biome;
    for (const dark of [false, true]) for (const ph of phases) for (const rain of [false, true]) {
      if (rain && (ph === 'dawn' || ph === 'night')) continue;
      const ctx: PaletteCtx = { mode: 'technicolor', dark, line: s.line as any, bodyHex: s.bodyHex, biome, phase: ph, rain, night: darkSky(biome, ph) };
      const t = paletteTable(ctx);
      const sky = skyFor(ctx, ph, rain, biome);
      const body = contrast(t[Layer.BODY], sky);
      const edge = Math.max(contrast(t[Layer.OUTLINE], sky), body);
      const rim = Math.max(contrast(t[Layer.RIM], sky), body);
      n++;
      if (edge < worst) { worst = edge; worstWhere = `${s.id} ${biome} ${ph}${rain ? '/rain' : ''} ${dark ? 'dark' : 'light'}`; }
      if (rim < rimWorst) { rimWorst = rim; rimWhere = `${s.id} ${biome} ${ph}${rain ? '/rain' : ''} ${dark ? 'dark' : 'light'}`; }
      if (edge < FLOOR || rim < RIM_FLOOR) { bad++; if (process.env.VERBOSE) console.log("  low", s.id, biome, ph, rain, dark, "edge", edge.toFixed(2), "rim", rim.toFixed(2), "body", s.bodyHex, t[Layer.OUTLINE], t[Layer.RIM], sky); }
    }
  }
  console.log(`  pet vs sky: worst outline-or-body ${worst.toFixed(2)} (${worstWhere}); worst rim-or-body ${rimWorst.toFixed(2)} (${rimWhere}) over ${n} cases`);
  ok(bad === 0, `pet outline or body vs biome sky >= ${FLOOR}, rim or body >= ${RIM_FLOOR} everywhere (${bad} of ${n} below)`);
}

// 7. cost: shading is cached per (species frame, facing); drawing a cached frame costs the same as before
{
  const now = () => Number(process.hrtime.bigint()) / 1e6;
  let t0 = now(), frames = 0;
  for (const sp of SPECIES) for (const fr of sp.hiFrames) { shadedPetLayers(fr, sp.family); shadedPetLayers(flip(fr), sp.family); frames++; }
  const cold = now() - t0;
  ok(cold / (frames * 2) < 3, `shading one frame costs ${(cold / (frames * 2)).toFixed(2)} ms on average (< 3 ms), all ${frames * 2} frames in ${cold.toFixed(0)} ms`);
  const p = newPet(T0, { seed: 5 }); forceSpecies(p, SPECIES.find((s) => s.family === 'fox' && s.stage === 'adult')!.id); p.named = true;
  const sc = { ...initScene(p, T0, 12), nowMs: T0 + 2000, still: true, weather: 'clear' as const };
  const b = new Buf(SCENE_N);
  drawScene(b, sc, p); // warm the cache
  t0 = now();
  for (let i = 0; i < 300; i++) drawScene(new Buf(SCENE_N), { ...sc, nowMs: T0 + 2000 + i * 100 }, p);
  const warm = (now() - t0) / 300;
  ok(warm < 2.5, `a warm scene draw costs ${warm.toFixed(2)} ms (< 2.5 ms)`);
  // the cache: the same array comes back for the same sprite rows
  const sp = SPECIES_BY_ID[p.species];
  const b1 = new Buf(SCENE_N), b2 = new Buf(SCENE_N);
  drawScene(b1, sc, p); drawScene(b2, sc, p);
  ok(sp && b1.px.every((v, i) => v === b2.px[i]), 'drawing is deterministic');
}

if (fails) { console.log(`shading: ${fails} FAILED of ${checks}`); process.exit(1); }
console.log(`shading: all ${checks} checks passed`);
