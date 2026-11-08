// Multi-family wiring: per-family colour, hatching, feed labels, every species renders, egg gating, Dex.
import { advance, newEgg, newPet, forceSpecies, dexSizeOf, SPECIES_BY_ID, type Pet } from '../src/core/pet';
import { BABIES, FAMILIES, SPECIES } from '../src/core/speciesData';
import {
  NO_ENTITLEMENTS, familyIdUnlocked, familyUnlocked, foodLabels, hasPlus, loadPreviewPlus, resolveEggFamily, savePreviewPlus, type Entitlements,
} from '../src/core/entitlements';
import { Layer } from '../src/ui/layers';
import { paletteTable } from '../src/ui/palette';
import { bodyOf, buildFrame, previewFrame } from '../src/ui/render';
import { dexLines, dexPageCount, dexUnlocked, feedRows, nextDexFamily, renderScreen, type ScreenCtx } from '../src/ui/screens';

let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };

const T0 = 1_800_000_000_000;
const COUNTS: Record<string, number> = { dino: 39, fox: 36, fish: 38, bird: 36, cat: 36, spirits: 36, bunny: 35, dragon: 35, bot: 36, slime: 36, bug: 37 };
const PREVIEW: Entitlements = { plus: false, previewPlus: true };

// 1. family counts and structure
for (const [fam, n] of Object.entries(COUNTS)) {
  const sp = SPECIES.filter((s) => s.family === fam);
  ok(sp.length === n, `${fam} has ${n} species (got ${sp.length})`);
  ok(dexSizeOf(fam) === n, `${fam} Dex size`);
  ok(BABIES.filter((b) => SPECIES_BY_ID[b]?.family === fam).length >= 2, `${fam} has at least two hatchlings`);
  ok(sp.every((s) => s.evolutions.every((e) => SPECIES_BY_ID[e.to]?.family === fam)), `${fam} evolutions stay inside the family`);
  for (const st of ['baby', 'child', 'teen', 'adult', 'ultimate']) ok(sp.some((s) => s.stage === st), `${fam} has a ${st}`);
}

// 2. per-family Technicolor body colour (line names collide across families)
{
  for (const s of SPECIES) {
    if (s.family === 'dino') ok(s.bodyHex === undefined, `${s.id}: dino keeps the line palette`);
    else ok(/^#[0-9A-Fa-f]{6}$/.test(s.bodyHex ?? ''), `${s.id}: has a bodyHex`);
  }
  const strays = new Set(SPECIES.filter((s) => s.line === 'stray' && s.bodyHex).map((s) => s.bodyHex));
  ok(strays.size >= 3, `'stray' differs per family (${[...strays].join(' ')})`);
  const babies = new Set(SPECIES.filter((s) => s.line === 'baby' && s.bodyHex).map((s) => s.bodyHex));
  ok(babies.size >= 3, `'baby' differs per family (${[...babies].join(' ')})`);
  for (const s of SPECIES.filter((x) => x.bodyHex)) {
    for (const dark of [false, true]) {
      const t = paletteTable({ mode: 'technicolor', dark, line: 'baby', bodyHex: s.bodyHex });
      ok(dark || t[Layer.BODY] === s.bodyHex, `${s.id}: Technicolor light body is its bodyHex`);
      ok(/^#[0-9a-f]{6}$/i.test(t[Layer.BODY]), `${s.id}: body colour valid (dark=${dark})`);
    }
  }
  const dinoLine = paletteTable({ mode: 'technicolor', dark: false, line: 'meat' });
  ok(dinoLine[Layer.BODY] === '#C27358', 'dino meat body unchanged');
  ok(bodyOf({ species: 'rawr' } as Pet) === undefined && bodyOf({ species: 'stalker' } as Pet) === SPECIES_BY_ID['stalker'].bodyHex && /^#[0-9A-F]{6}$/.test(bodyOf({ species: 'stalker' } as Pet) ?? ''), 'bodyOf reads the species');
}

// 3. hatch picks from the family's own babies
{
  for (const fam of FAMILIES) {
    const babies = BABIES.filter((b) => SPECIES_BY_ID[b]?.family === fam.id);
    const got = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const p = newPet(T0, { seed, family: fam.id });
      let t = T0;
      for (let i = 0; i < 400 && p.stage === 'egg'; i++) { t += 5 * 60000; advance(p, t, () => 12); }
      ok(p.stage === 'baby', `${fam.id} seed ${seed} hatched (stage ${p.stage})`);
      ok(babies.includes(p.species), `${fam.id} seed ${seed} hatched ${p.species}, a ${fam.id} baby`);
      ok(p.family === fam.id && SPECIES_BY_ID[p.species]?.family === fam.id, `${fam.id} hatchling stays in family`);
      got.add(p.species);
    }
    ok(got.size === babies.length, `${fam.id}: all ${babies.length} hatchlings reachable (got ${got.size})`);
  }
}

// 4. every species renders in both modes at every stage without throwing
{
  let threw = 0;
  for (const s of SPECIES) {
    for (const mode of ['traditional', 'technicolor'] as const) for (const dark of [false, true]) {
      try {
        const f = previewFrame(s.id, { mode, dark }, 12);
        ok(f.groups.length > 0 && f.groups.every((g) => g.d.length > 0), `${s.id} ${mode} draws pixels`);
        if (mode === 'traditional') ok(f.groups.length === 1, `${s.id} traditional is one ink path`);
      } catch (e) { threw++; ok(false, `${s.id} ${mode} dark=${dark} threw ${e}`); }
    }
  }
  const base: Omit<ScreenCtx, 'pet'> = { tick: 0, mode: 'home', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null };
  // the Traditional picture never depends on the family palette
  const p = newPet(T0, { seed: 3, family: 'fox' }); forceSpecies(p, 'stalker'); p.named = true;
  const a = buildFrame(renderScreen({ ...base, pet: p }), { mode: 'traditional', dark: false });
  const b = buildFrame(renderScreen({ ...base, pet: p }), { mode: 'traditional', dark: false, line: 'meat', bodyHex: '#123456' });
  ok(a.key === b.key, 'Traditional ignores line and bodyHex');
  // egg and ghost screens for every family
  for (const fam of FAMILIES) for (const stage of ['egg', 'ghost'] as const) {
    const e = newPet(T0, { seed: 5, family: fam.id });
    if (stage === 'ghost') { forceSpecies(e, BABIES.find((x) => SPECIES_BY_ID[x]?.family === fam.id)!); e.stage = 'ghost'; }
    for (const mode of ['home', 'feed', 'stats', 'dex'] as const) {
      try { renderScreen({ ...base, pet: e, mode, tick: 1 }); } catch (err) { ok(false, `${fam.id} ${stage} ${mode} threw ${err}`); }
    }
  }
  ok(threw === 0, 'no species threw while rendering');
}

// 5. feed labels per family
{
  ok(foodLabels('dino').join() === 'MEAT,VEGGIES,PASTA', 'dino feed labels unchanged');
  ok(foodLabels('fox').join() === 'MICE,BERRIES,FISH', 'fox feed labels');
  ok(foodLabels('fish').join() === 'SHRIMP,ALGAE,PLANKTON', 'fish feed labels');
  ok(foodLabels('bird').join() === 'WORMS,SEEDS,MINNOWS', 'bird feed labels');
  ok(foodLabels('cat').join() === 'TUNA,CATNIP,MILK', 'cat feed labels');
  ok(foodLabels('nope').join() === 'MEAT,VEGGIES,PASTA', 'unknown family falls back to dino labels');
  ok(feedRows('cat').join() === 'TUNA,CATNIP,MILK,SNACK,CANCEL', 'feed rows end with SNACK and CANCEL');
  ok(FAMILIES.every((f) => f.foods.length === 3 && f.foods.every((x) => x.length > 0 && x.length <= 11)), 'food labels fit the feed row');
}

// 6. egg gating
{
  const dino = FAMILIES[0];
  ok(familyUnlocked(dino, NO_ENTITLEMENTS), 'free family is always selectable');
  for (const f of FAMILIES.slice(1)) {
    ok(!familyUnlocked(f, NO_ENTITLEMENTS), `${f.id} is locked without an entitlement`);
    ok(familyUnlocked(f, PREVIEW), `${f.id} unlocks with the preview toggle`);
    ok(familyUnlocked(f, { plus: true, previewPlus: false }), `${f.id} unlocks with the plus flag`);
    ok(resolveEggFamily(f.id, NO_ENTITLEMENTS) === 'dino', `${f.id} egg request falls back to dino when locked`);
    ok(resolveEggFamily(f.id, PREVIEW) === f.id, `${f.id} egg request honoured when unlocked`);
  }
  ok(resolveEggFamily('dino', NO_ENTITLEMENTS) === 'dino', 'dino egg always allowed');
  ok(resolveEggFamily('no-such', PREVIEW) === 'dino', 'unknown family becomes dino');
  ok(!familyIdUnlocked('no-such', PREVIEW), 'unknown family is not unlocked');
  ok(!hasPlus(NO_ENTITLEMENTS) && hasPlus(PREVIEW), 'hasPlus follows either flag');
  ok(newEgg(newPet(T0), T0, resolveEggFamily('cat', NO_ENTITLEMENTS)).family === 'dino', 'a locked request yields a dino egg');
  ok(newEgg(newPet(T0), T0, resolveEggFamily('cat', PREVIEW)).family === 'cat', 'an unlocked request yields a cat egg');
}

// 7. Dex per family
{
  const p = newPet(T0, { seed: 9, family: 'dino' });
  ok(dexUnlocked(p, 'dino') && !dexUnlocked(p, 'fox') && dexUnlocked(p, 'fox', PREVIEW), 'Dex locks other Plus families');
  const fp = newPet(T0, { seed: 9, family: 'fox' });
  ok(dexUnlocked(fp, 'fox'), "a pet's own family Dex is always open");
  ok(dexPageCount(p, 'fox') === 1, 'a locked Dex is one page');
  ok(dexPageCount(p, 'fox', PREVIEW) > 1 && dexLines(p, 'fox').length > 36, 'an open Dex lists the family');
  let f = 'dino'; const order: string[] = [];
  for (let i = 0; i < FAMILIES.length; i++) { f = nextDexFamily(f); order.push(f); }
  ok(order.join() === 'fox,fish,bird,cat,spirits,bunny,dragon,bot,slime,bug,dino', 'the switcher cycles every family and wraps');
  const base: Omit<ScreenCtx, 'pet'> = { tick: 0, mode: 'dex', feedSel: 0, play: null, statsPage: 0, dexPage: 0, evo: null };
  const lockedFrame = buildFrame(renderScreen({ ...base, pet: p, dexFamily: 'fox' }), { mode: 'traditional', dark: false }).key;
  const openFrame = buildFrame(renderScreen({ ...base, pet: p, dexFamily: 'fox', ent: PREVIEW }), { mode: 'traditional', dark: false }).key;
  ok(lockedFrame !== openFrame, 'locked and open Dex pages look different');
  for (const fam of FAMILIES) for (let page = 0; page < dexPageCount(p, fam.id, PREVIEW); page++) {
    try { renderScreen({ ...base, pet: p, dexFamily: fam.id, dexPage: page, ent: PREVIEW }); } catch (e) { ok(false, `${fam.id} Dex page ${page} threw ${e}`); }
  }
}

// 8. the preview toggle persists; a broken store means off
(async () => {
  const mem = new Map<string, string>();
  const store = { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => { mem.set(k, v); } };
  const broken = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); } };
  ok(!(await loadPreviewPlus(store)), 'preview defaults to off');
  await savePreviewPlus(store, true);
  ok(await loadPreviewPlus(store), 'preview saved on');
  await savePreviewPlus(store, false);
  ok(!(await loadPreviewPlus(store)), 'preview saved off');
  ok(!(await loadPreviewPlus(broken)), 'unreadable store means off');
  await savePreviewPlus(broken, true);
  console.log(`families: ${checks} checks, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
