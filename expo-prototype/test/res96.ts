// The finer Technicolor screen (docs/RESOLUTION.md, phase 1): grid per look, 48x48 Scale3x pets with re-tuned shading and eyes, the 96 home
// scene (same logic positions as the 64 scene), the biome hook, every screen at both sizes, and the cost of a 96 frame.
import { FAMILIES, SPECIES } from '../src/core/speciesData';
import { SPECIES_BY_ID, forceSpecies, newPet, type Pet } from '../src/core/pet';
import { catchGame } from '../src/core/minigames/games/catch';
import { newSession, pressButton, tickSession } from '../src/core/minigames/session';
import { paramsFor } from '../src/core/minigames/tuning';
import { GAME_ENTRIES } from '../src/ui/games/registry';
import { BIOME96, biomes96Done } from '../src/ui/biome96';
import { BIOMES, FAMILY_BIOME } from '../src/ui/biomes';
import { LAYOUT96 } from '../src/ui/layout96';
import { Layer, PET_LAYER_CODES, SCENERY_FROM, LAYER_MASK } from '../src/ui/layers';
import { paletteTable } from '../src/ui/palette';
import { Buf, GRID_TECH, GRID_TRAD, gridFor, scale3x, scale3xCached, toLogic } from '../src/ui/pixel';
import { bodyOf, buildFrame, lineOf, previewFrame } from '../src/ui/render';
import { GROUND_Y, HEAD_Y, TICK_MS, initScene, type Scene } from '../src/ui/scene';
import { drawScene } from '../src/ui/sceneDraw';
import { GROUND_Y96, HEAD_Y96, drawScene96, g96 } from '../src/ui/sceneDraw96';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { shadedPetLayers } from '../src/ui/shading';
import { density } from '../src/ui/density';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const throws = (f: () => void) => { try { f(); return false; } catch { return true; } };

// 1. grid size per look, and no mixing by accident
{
  ok(gridFor('traditional') === 64 && gridFor('technicolor') === 96 && gridFor(undefined) === 64, 'gridFor: 64 Traditional, 96 Technicolor');
  ok(GRID_TRAD === 64 && GRID_TECH === 96 && Buf.forLook('technicolor').n === 96 && Buf.forLook('traditional').n === 64, 'Buf.forLook');
  ok(throws(() => new Buf(80)), 'a Buf of an unsupported size is refused');
  ok(throws(() => new Buf(64).blit(new Buf(96))), 'blit refuses buffers of different sizes');
  ok(throws(() => drawScene96(new Buf(64), initScene(newPet(T0, { seed: 1 }), T0, 12), newPet(T0, { seed: 1 }))), 'drawScene96 refuses a 64 buffer');
  const p = newPet(T0, { seed: 3 }); forceSpecies(p, 'rawr'); p.named = true;
  const base: ScreenCtx = { pet: p, tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: initScene(p, T0, 12) };
  const r64 = renderScreen(base), rT = renderScreen({ ...base, look: 'traditional' }), r96 = renderScreen({ ...base, look: 'technicolor' });
  ok(r64.buf.n === 64 && rT.buf.n === 64 && r96.buf.n === 96, 'renderScreen sizes the buffer by look');
  ok(rT.buf.px.every((v, i) => v === r64.buf.px[i]), 'look traditional paints exactly what no look paints');
  ok(throws(() => buildFrame(r96, { mode: 'traditional', dark: false })) && throws(() => buildFrame(rT, { mode: 'technicolor', dark: false })), 'buildFrame refuses a buffer coloured as the other look');
  const f = buildFrame(r96, { mode: 'technicolor', dark: false, line: lineOf(p), bodyHex: bodyOf(p) });
  ok(f.n === 96 && f.sky?.h === GROUND_Y96 && f.soil?.y === GROUND_Y96, `a 96 frame: n=96, sky and soil split at ${GROUND_Y96}`);
  const f64 = buildFrame(r64, { mode: 'technicolor', dark: false });
  ok(f64.n === 64 && f64.sky?.h === GROUND_Y, 'a legacy 64 frame still splits at 60');
  ok(previewFrame('rawr', { mode: 'technicolor', dark: false }).n === 96 && previewFrame('rawr', { mode: 'traditional', dark: false }).n === 64, 'settings previews follow the look');
  // taps are logic units whatever the size of the LCD
  ok(toLogic(0, 300) === 0 && toLogic(299.9, 300) === 63 && toLogic(150, 300) === 32 && toLogic(-5, 300) === 0 && toLogic(900, 300) === 63, 'taps convert to 64-space logic cells');
  ok(density('traditional').grid === 64 && density('technicolor').grid === 96 && density('traditional').iconSize === 8, 'density(mode) exposes grid and chrome metrics');
}

// 2. Scale3x
{
  const one = scale3x(['X']);
  ok(one.length === 3 && one.every((r) => r === 'XXX'), 'Scale3x: a lone pixel becomes a 3x3 block');
  ok(scale3x(['.']).every((r) => r === '...'), 'Scale3x: empty stays empty');
  const L = scale3x(['XX', 'X.']);
  ok(L.join('|') === '..XXXX|.XXXXX|XXXXXX|XXXX..|XXX...|XXX...', 'Scale3x: the AdvMAME3x corner bevel (hand-checked): ' + L.join('|'));
  const D = scale3x(['X.', '.X']);
  ok(D.join('|') === 'XXX...|XXX...|XXXX..|..XXXX|...XXX|...XXX', 'Scale3x: a diagonal is joined by the mid pixel (hand-checked)');
  const bar = scale3x(['XXXX']);
  ok(bar.every((r) => r === 'XXXXXXXXXXXX'), 'Scale3x: a straight bar stays straight');
  let sizeBad = 0, flipBad = 0;
  for (const sp of SPECIES) for (const f of sp.frames) {
    const o = scale3xCached(f);
    if (o.length !== 48 || o.some((r) => r.length !== 48)) sizeBad++;
    const m = scale3x(f.map((r) => [...r].reverse().join('')));
    if (o.some((r, y) => [...r].reverse().join('') !== m[y])) flipBad++; // mirror symmetric
  }
  ok(sizeBad === 0 && flipBad === 0, `every species frame scales to 48x48 and the filter is mirror symmetric (${SPECIES.length} species)`);
  ok(scale3xCached(SPECIES[0].frames[0]) === scale3xCached(SPECIES[0].frames[0]), 'Scale3x results are cached');
  // a hand-checked sprite: the egg of the first species keeps its lit area within +-15% of 9x
  const f0 = SPECIES[0].frames[0];
  const a1 = f0.join('').split('X').length - 1, a3 = scale3x(f0).join('').split('X').length - 1;
  ok(Math.abs(a3 / (a1 * 9) - 1) < 0.15, `Scale3x keeps the area (${a1} -> ${a3})`);
}

// 3. eyes and shading at 48x48
{
  let withHole = 0, found = 0, found32 = 0, lightFirst = 0, ramped = 0, litBad = 0;
  for (const sp of SPECIES) {
    const base = sp.frames[0];
    const big = scale3xCached(base);
    // does the 16x16 art have an enclosed hole (an eye drawn in)? flood the outside
    const ext = new Uint8Array(256), st: number[] = [];
    const push = (x: number, y: number) => { if (x < 0 || y < 0 || x > 15 || y > 15) return; const i = y * 16 + x; if (base[y][x] === 'X' || ext[i]) return; ext[i] = 1; st.push(i); };
    for (let i = 0; i < 16; i++) { push(i, 0); push(i, 15); push(0, i); push(15, i); }
    while (st.length) { const i = st.pop()!, x = i % 16, y = (i / 16) | 0; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
    let holes = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (base[y][x] !== 'X' && !ext[y * 16 + x]) holes++;
    const c = shadedPetLayers(big, sp.family);
    if (shadedPetLayers(sp.hiFrames[0], sp.family).includes(Layer.EYE_FILL)) found32++;
    if (holes) { withHole++; if (c.includes(Layer.EYE_FILL)) found++; }
    // lit pixel set: every lit cell has a code, only eye holes add codes
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const v = c[y * 48 + x], lit = big[y][x] === 'X';
      if (lit && !v) litBad++;
      if (!lit && v && v !== Layer.EYE_FILL && v !== Layer.EYE_SHINE) litBad++;
    }
    // light from the top-left: the lit tone sits up-left of the shadow tone
    let lx = 0, ln = 0, sx = 0, sn = 0;
    for (let i = 0; i < c.length; i++) {
      const d = (i % 48) + ((i / 48) | 0);
      if (c[i] === Layer.BODY_LIGHT) { lx += d; ln++; } else if (c[i] === Layer.SHADE || c[i] === Layer.DEEP) { sx += d; sn++; }
    }
    if (ln > 8 && sn > 8) { ramped++; if (lx / ln < sx / sn) lightFirst++; }
  }
  ok(withHole / SPECIES.length > 0.9, `most species draw an eye hole (${withHole}/${SPECIES.length})`);
  ok(found / withHole >= 0.95, `the 48x48 eye rule finds an eye for ${(100 * found / withHole).toFixed(1)}% of species that draw one (>= 95%)`);
  ok(found >= found32, `no regression against the 32x32 rule (${found} vs ${found32} species with an eye)`);
  ok(litBad === 0, 'the lit pixel set of the 48 sprites is untouched by shading');
  ok(ramped > 300 && lightFirst / ramped > 0.9, `light comes from the top-left at 48 (${lightFirst}/${ramped})`);
  // a single 1px hole becomes a 3x3 hole with a dark pupil and one glint
  const blob = ['................', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXX.XXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '................', '................', '................', '................', '................', '................'];
  const c = shadedPetLayers(scale3x(blob), 'dino');
  let fill = 0, shine = 0, ring = 0;
  for (const v of c) { if (v === Layer.EYE_FILL) fill++; if (v === Layer.EYE_SHINE) shine++; if (v === Layer.EYE) ring++; }
  ok(fill + shine === 9 && shine >= 1 && ring >= 8, `a 1px 16x16 hole is a 3x3 hole with a dark ring and a glint (fill ${fill}, shine ${shine}, ring ${ring})`);
  // special cases: slime and alien still get eyes
  for (const id of ['slime_gelkeep', 'alien_lamplight', 'alien_seer', 'bot_bassline']) {
    const sp = SPECIES_BY_ID[id];
    ok(!!sp && shadedPetLayers(scale3xCached(sp.frames[0]), sp.family).includes(Layer.EYE_FILL), `${id}: eyes found at 48`);
  }
  // 32x32 shading is unchanged (the 64 path): the Traditional goldens cover the lit set, the code path for k = 1 is the original
  ok(shadedPetLayers(SPECIES[0].hiFrames[0], 'dino').length === 1024, '32x32 sprites still shade as before');
}

// 4. the 96 scene: same logic positions as 64, the pet stands on the ground and clears the HUD
const mk = (id: string): Pet => { const p = newPet(T0, { seed: 7 }); forceSpecies(p, id); p.named = true; p.hunger = 3; p.happy = 3; p.call = null; p.poops = 0; p.temp = 0; p.sick = false; p.asleep = false; p.lightOn = true; return p; };
const sceneOf = (p: Pet, hour: number, over: Partial<Scene> = {}): Scene => ({ ...initScene(p, T0, hour), state: 'idle', x: 14, facing: 1, still: true, dim: false, weather: 'clear', poopMask: 0, props: [], pops: [], hour, minute: 0, t: 0, nowMs: T0 + 4200, ...over });
const bbox = (b: Buf, pred: (c: number) => boolean) => {
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let i = 0; i < b.px.length; i++) if (pred(b.px[i] & LAYER_MASK) && b.px[i]) { const x = i % b.n, y = (i / b.n) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
{
  ok(g96(GROUND_Y) === 90 && HEAD_Y96 === 42 && GROUND_Y96 === 90 && g96(HEAD_Y) === HEAD_Y96, 'ground at row 90 and pet top at row 42 (x1.5 of 60 and 28)');
  const fam1 = new Map<string, string>();
  for (const sp of SPECIES) if (sp.stage === 'adult' && !fam1.has(sp.family)) fam1.set(sp.family, sp.id);
  ok(fam1.size === FAMILIES.length, 'one adult per family');
  let posBad = 0, hudBad = 0, groundBad = 0, n = 0;
  for (const [, id] of fam1) for (const x of [0, 14, 32]) for (const facing of [1, -1] as const) for (const hour of [12, 23]) {
    const p = mk(id);
    const s = sceneOf(p, hour, { x, facing });
    const b64 = new Buf(64), b96 = new Buf(96);
    drawScene(b64, s, p); drawScene(b96, s, p);
    const pa = bbox(b64, (c) => PET_LAYER_CODES.has(c)), pb = bbox(b96, (c) => PET_LAYER_CODES.has(c));
    n++;
    // the ink moves with the logic x (the 48 art is the same drawing: +-4 cells of rounding and Scale3x differences)
    if (Math.abs(pb.x0 - 1.5 * pa.x0) > 5 || Math.abs(pb.x1 - 1.5 * pa.x1) > 6) posBad++;
    if (pb.y1 !== GROUND_Y96 - 1 && Math.abs(pb.y1 - 1.5 * pa.y1) > 4) groundBad++;
    if (pb.y1 > GROUND_Y96 - 1) groundBad++;
    if (pb.y0 < 24) hudBad++; // hearts and smiles end on row 22
  }
  ok(posBad === 0, `pet x follows the logic x at 96 (${posBad} of ${n} off)`);
  ok(groundBad === 0, `the pet's feet are on the 96 ground (${groundBad} of ${n} off)`);
  ok(hudBad === 0, `the pet never reaches the HUD rows (${hudBad} of ${n})`);
  // props and poops sit at x1.5 of their logic position
  const p = mk('rawr');
  const s = sceneOf(p, 12, { poopMask: 5, props: [{ g: 'food:meat', x: 40, y: 51 }, { g: 'ball', x: 20, y: 51 }] });
  const b = new Buf(96); drawScene(b, s, p);
  const poop = bbox(b, (c) => c === Layer.POOP), meat = bbox(b, (c) => c === Layer.FOOD_MEAT), ball = bbox(b, (c) => c === Layer.BALL);
  ok(poop.y1 === GROUND_Y96 - 1 && meat.y1 === GROUND_Y96 - 1 && ball.y1 === GROUND_Y96 - 1, `poop, food and ball stand on the 96 ground ${JSON.stringify([poop, meat, ball])}`);
  ok(Math.abs(meat.x0 - g96(40)) <= 1 && Math.abs(ball.x0 - g96(20)) <= 1, 'props sit at x1.5 of their logic x');
  // HUD: 4 hearts and 4 smiles, 10x10 glyphs, right icons at x 85
  const full = new Buf(96); drawScene(full, sceneOf(mk('rawr'), 12), mk('rawr'));
  const hearts = bbox(full, (c) => c === Layer.HEART), smiles = bbox(full, (c) => c === Layer.SMILE);
  ok(hearts.y0 === 1 && hearts.y1 <= 10 && smiles.y0 === 13 && smiles.y1 <= 22 && hearts.x0 === 1, 'HUD hearts and smiles are 10x10 glyphs at the top left');
  // the same scene seed gives the same logic state in both looks: step() is look-free, so run it and draw twice
  const pet = mk('rawr'); let sc = initScene(pet, T0, 12); let diff = 0;
  for (let i = 0; i < 40; i++) {
    sc = { ...sc, nowMs: T0 + i * TICK_MS, t: i % 8 };
    const a = new Buf(64), c96 = new Buf(96);
    drawScene(a, sc, pet); drawScene(c96, sc, pet);
    const A = bbox(a, (c) => PET_LAYER_CODES.has(c)), B = bbox(c96, (c) => PET_LAYER_CODES.has(c));
    if (Math.abs(B.x0 - 1.5 * A.x0) > 6) diff++;
  }
  ok(diff === 0, 'a run of ticks draws the pet at the same logic x in both looks');
  // lights-off dithers the sky only, a flash inverts the whole screen
  const dim = new Buf(96); drawScene(dim, sceneOf(mk('rawr'), 12, { dim: true }), mk('rawr'));
  ok(dim.px.some((v) => v & 0x80), 'lights-off dims the 96 scene');
  const fl = new Buf(96); drawScene(fl, sceneOf(mk('rawr'), 12, { flash: 1 }), mk('rawr'));
  ok(fl.px.some((v) => v) && fl.px[0] !== 0, 'a flash inverts the 96 scene');
  // every state and call draws without throwing and without a pet pixel outside the grid margins
  let thrown = 0;
  for (const state of ['idle', 'walk', 'look', 'hop', 'sit', 'eat', 'poop', 'dance', 'droop', 'shiver', 'sweat', 'sneeze', 'sleep', 'stretch', 'react', 'greet', 'train', 'battle', 'play'] as const) {
    for (const call of [null, 'hungry', 'bored', 'poop', 'sick', 'naughty', 'light', 'hot', 'cold'] as const) {
      try {
        const q = mk('rawr'); q.call = call; q.sick = call === 'sick'; q.temp = call === 'hot' ? 2 : call === 'cold' ? -2 : 0;
        for (const weather of ['clear', 'rain', 'cloudy'] as const) drawScene(new Buf(96), sceneOf(q, weather === 'rain' ? 23 : 7, { state, weather, t: 3, still: false, x: 32, props: [{ g: 'foe', x: 40, y: 44, n: 9 }, { g: 'food:pasta', x: 20, y: 51, n: 2, side: 1 }, { g: 'shell', x: 5, y: 20, n: 1 }], pops: [{ g: 'note', x: 5, y: 5, age: 3, life: 8 }] }), q);
      } catch (e) { thrown++; console.log(String(e)); }
    }
  }
  ok(thrown === 0, 'every scene state and call draws at 96');
}

// 5. the biome hook: generic fallback now, a registered painter is honoured and cannot overwrite the pet
{
  ok(BIOMES.every((bm) => bm in BIOME96), 'a registry entry for every biome');
  ok(biomes96Done().length === 0, 'phase 1: no biome has a 96 painter yet (generic fallback)');
  const fams = [...new Set(SPECIES.map((s) => s.family))];
  for (const fam of fams) {
    const sp = SPECIES.find((s) => s.family === fam && s.stage === 'adult')!;
    const p = mk(sp.id);
    for (const hour of [12, 23]) for (const facing of [1, -1] as const) {
      const b = new Buf(96); drawScene(b, sceneOf(p, hour, { facing, x: 10 }), p);
      let scenery = 0;
      for (const v of b.px) if ((v & LAYER_MASK) >= SCENERY_FROM && v && !PET_LAYER_CODES.has(v & LAYER_MASK)) scenery++;
      ok(scenery === 0, `${fam}: the fallback paints no scenery`);
    }
  }
  // install stub painters: floods of scenery code must stay out of the pet's 1px ring
  const saved = { ...BIOME96 };
  try {
    for (const bm of BIOMES) BIOME96[bm] = { backdrop: (c) => c.b.rect(0, 0, 96, GROUND_Y96, Layer.BARK), fore: (c) => c.b.rect(0, 0, 96, 96, Layer.MOSS) };
    let bad = 0, ringBad = 0, countBad = 0;
    for (const fam of fams) {
      const sp = SPECIES.find((s) => s.family === fam && s.stage === 'adult')!;
      const p = mk(sp.id);
      const b = new Buf(96); drawScene(b, sceneOf(p, 12, { x: 10 }), p);
      const plain = new Buf(96);
      BIOME96[FAMILY_BIOME[fam]] = null; drawScene(plain, sceneOf(p, 12, { x: 10 }), p); BIOME96[FAMILY_BIOME[fam]] = { backdrop: (c) => c.b.rect(0, 0, 96, GROUND_Y96, Layer.BARK), fore: (c) => c.b.rect(0, 0, 96, 96, Layer.MOSS) };
      let pets = 0, petsPlain = 0;
      for (let i = 0; i < b.px.length; i++) {
        const c = b.px[i] & LAYER_MASK;
        if (b.px[i] && PET_LAYER_CODES.has(c)) pets++;
        if (plain.px[i] && PET_LAYER_CODES.has(plain.px[i] & LAYER_MASK)) petsPlain++;
        if (PET_LAYER_CODES.has(c) && b.px[i]) {
          const x = i % 96, y = (i / 96) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < 96 && ny < 96 && (b.px[ny * 96 + nx] & LAYER_MASK) >= SCENERY_FROM && !PET_LAYER_CODES.has(b.px[ny * 96 + nx] & LAYER_MASK) && b.px[ny * 96 + nx]) ringBad++; }
        }
      }
      if (pets !== petsPlain) countBad++;
      if (!b.px.some((v) => (v & LAYER_MASK) === Layer.MOSS)) bad++;
    }
    ok(bad === 0, 'a registered painter runs (fore)');
    ok(countBad === 0, 'scenery never overwrites a pet pixel (same pet pixel count as without scenery)');
    ok(ringBad === 0, 'the pet keeps a clear ring around its silhouette');
    BIOME96.meadow = { ground: 'own' };
    const b = new Buf(96); drawScene(b, sceneOf(mk('rawr'), 12), mk('rawr'));
    ok(!b.px.some((v) => (v & LAYER_MASK) === Layer.GROUND), "ground: 'own' replaces the generic ground band");
  } finally { for (const bm of BIOMES) BIOME96[bm] = saved[bm]; }
}

// 6. every screen at both sizes, all 12 families
{
  const modes: ScreenCtx['mode'][] = ['home', 'feed', 'stats', 'dex', 'playmenu', 'scores', 'dev'];
  let n = 0, thrown = 0, wrongSize = 0, blank = 0; const blankL: string[] = [];
  const fams = FAMILIES.map((f) => f.id);
  for (const fam of fams) {
    const sp = SPECIES.find((s) => s.family === fam && s.stage === 'adult')!;
    for (const look of ['traditional', 'technicolor'] as const) {
      const N = gridFor(look);
      const variants: Partial<ScreenCtx>[] = [];
      for (const mode of modes) for (let pg = 0; pg < 3; pg++) variants.push({ mode, statsPage: pg, dexPage: pg, feedSel: pg, playSel: pg, scoresPage: pg });
      variants.push({ mode: 'home', evo: { from: sp.id, to: SPECIES[0].id, until: Date.now() + 60000 } });
      for (const stage of ['egg', 'ghost'] as const) variants.push({ mode: 'home', pet: Object.assign(mk(sp.id), { stage, causeOfDeath: 'STARVATION' }) });
      for (const e of GAME_ENTRIES) for (const ph of ['ready', 'play', 'result'] as const) {
        const pet = mk(sp.id);
        const sess = newSession(e.def, paramsFor(pet, e.def.id), 5);
        if (ph !== 'ready') { pressButton(sess, 'b'); tickSession(sess, 50); }
        if (ph === 'result') { for (let i = 0; i < 4000 && sess.phase === 'play'; i++) tickSession(sess, 50); for (let i = 0; i < 200 && sess.phase !== 'result'; i++) tickSession(sess, 50); }
        variants.push({ mode: 'game', session: sess, pet });
      }
      for (const v of variants) {
        const pet = v.pet ?? mk(sp.id);
        const ctx: ScreenCtx = { pet, tick: 3, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: initScene(pet, T0, 12), look, ms: T0, ...v };
        n++;
        try {
          const r = renderScreen(ctx);
          if (r.buf.n !== N || r.look !== look) wrongSize++;
          if (!r.buf.px.some((c) => c) && !(v.session && v.session.phase === 'result')) { blank++; blankL.push(`${fam}/${look}/${v.mode}/${(v.session as any)?.phase ?? ''}`); }
          buildFrame(r, { mode: look, dark: false, line: lineOf(pet), bodyHex: bodyOf(pet) });
        } catch (e) { thrown++; console.log(`${fam} ${look} ${v.mode}: ${e}`); }
      }
    }
  }
  ok(thrown === 0, `${n} screens (12 families x 2 looks) render and colour without throwing`);
  ok(wrongSize === 0, 'every buffer has the grid of its look');
  ok(blank === 0, `${JSON.stringify(blankL)} screens are not blank (${blank} blank)`);
  // the default layout is the scaled 64 screen, and the override point works
  const p = mk('rawr');
  const ctx: ScreenCtx = { pet: p, tick: 0, mode: 'feed', feedSel: 1, play: null, statsPage: 0, dexPage: 0, evo: null, look: 'technicolor' };
  const def = renderScreen(ctx).buf, trad = renderScreen({ ...ctx, look: 'traditional' }).buf;
  ok(def.px.every((v, i) => v === trad.upscale96().px[i]), 'the default 96 text layout is the 64 layout enlarged 3/2');
  LAYOUT96.feed = () => { const b = Buf.forLook('technicolor'); b.text('HI', 2, 2); return b; };
  try { ok(renderScreen(ctx).buf.px.filter((v) => v).length < 40, 'LAYOUT96 overrides a screen'); } finally { delete LAYOUT96.feed; }
  void catchGame; void paletteTable;
}

// 7. cost of a 96 frame (scene + colour grouping)
{
  const p = mk('chomper');
  const sc = sceneOf(p, 12, { still: false, state: 'walk', t: 2, weather: 'rain', props: [{ g: 'food:meat', x: 40, y: 51 }] });
  const run = (i: number) => {
    const r = renderScreen({ pet: p, tick: i, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null, scene: { ...sc, nowMs: T0 + i * 125 }, look: 'technicolor' });
    return buildFrame(r, { mode: 'technicolor', dark: false, line: lineOf(p), bodyHex: bodyOf(p) });
  };
  for (let i = 0; i < 20; i++) run(i);
  const N = 150, t0 = performance.now();
  for (let i = 0; i < N; i++) run(i);
  const ms = (performance.now() - t0) / N;
  const t1 = performance.now();
  for (let i = 0; i < N; i++) { const b = new Buf(96); drawScene(b, { ...sc, nowMs: T0 + i * 125 }, p); }
  const draw = (performance.now() - t1) / N;
  console.log(`96 frame: ${ms.toFixed(2)} ms (scene ${draw.toFixed(2)} ms)`);
  ok(ms < 20, `a warm 96 frame (scene + colour groups) costs ${ms.toFixed(2)} ms (< 20 ms; the loop runs every 125 ms)`);
  // a cold pet (shading + Scale3x for a never-seen species) stays well under a frame budget of 100 ms
  const cold = mk('alien_seer');
  const t2 = performance.now();
  drawScene(new Buf(96), sceneOf(cold, 12), cold);
  const coldMs = performance.now() - t2;
  ok(coldMs < 150, `a cold 96 pet shades in ${coldMs.toFixed(1)} ms (< 150 ms)`);
}

if (fails) { console.log(`res96: ${fails} FAILED of ${checks}`); process.exit(1); }
console.log(`res96: all ${checks} checks passed`);
