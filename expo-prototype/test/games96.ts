// The mini-games at 96x96 (Technicolor): the 10x10 family glyph sets, their fit against the logic hit boxes, native painters for HI-LO / CATCH / DASH / ECHO in every
// family and phase, pets and items staying inside the buffer, the draw-time budget, and Traditional frames staying byte-identical to before the 96 work.
import { forceSpecies, newPet, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import { makeRng } from '../src/core/minigames/rng';
import { THEMES, THEME_FAMILIES, GLYPH_SIZE, allGlyphs } from '../src/core/minigames/themes';
import { THEMES96, GLYPH96_SIZE, allGlyphs96, themeFor96 } from '../src/core/minigames/themes96';
import { SHAPES } from '../src/core/minigames/glyphs96';
import { paramsFor } from '../src/core/minigames/tuning';
import { newSession, pressButton, tickSession } from '../src/core/minigames/session';
import { catchDims, ITEM, type CatchState } from '../src/core/minigames/games/catch';
import { obstacleBox, type DashState } from '../src/core/minigames/games/dash';
import { GAME_ENTRIES } from '../src/ui/games/registry';
import { HUD96_H, N96, g96, petArt96 } from '../src/ui/games/common96';
import { LAYER_COUNT } from '../src/ui/layers';
import { bodyOf, buildFrame, lineOf } from '../src/ui/render';
import { TICK_MS } from '../src/ui/scene';
import { renderScreen, type ScreenCtx } from '../src/ui/screens';
import { catchBot, SKILLS } from './minigame-bots';
import { dashBot, DASH_SKILLS } from './dash-bots';
import { echoBot, ECHO_SKILLS } from './echo-bots';
import { tradHashes, TRAD_FAMS } from './games96-trad';

declare const process: { exit: (n: number) => void };
declare const performance: { now: () => number };
let fails = 0, checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const T0 = 1_800_000_000_000 - (1_800_000_000_000 % TICK_MS);
const FAM_SPECIES = (fam: string, stage = 'adult') => SPECIES.find((s) => s.family === fam && s.stage === stage) ?? SPECIES.find((s) => s.family === fam)!;
const petOf = (species: string): Pet => { const p = newPet(T0, { seed: 9 }); forceSpecies(p, species); p.named = true; p.name = 'Rexie'; p.hunger = 4; p.happy = 2; return p; };
const lit = (rows: string[]) => rows.join('').replace(/\./g, '').length;
const key = (g: { main: string; acc?: string; rows: string[] }) => `${g.main}|${g.acc ?? ''}|${g.rows.join('/')}`;

// Traditional frames of every game and family, hashed on the commit before the 96 painters (see games96-trad.ts)
const TRAD_GOLDEN: Record<string, string> = {
  "dino/hilo/400": "5dc07421c5bf4604",
  "dino/hilo/9000": "f3541e18c3cd0f75",
  "dino/hilo/99999": "9da46d010e8381b4",
  "dino/catch/400": "961fca593515d252",
  "dino/catch/9000": "83162d6883996669",
  "dino/catch/99999": "d715580bb0d2cc86",
  "dino/dash/400": "14a8cf7bccf204a8",
  "dino/dash/9000": "6c036aab4141b83e",
  "dino/dash/99999": "3dfd0f55ad20e382",
  "dino/echo/400": "2ea804bb62b3fbe0",
  "dino/echo/9000": "89287a8c84100a01",
  "dino/echo/99999": "50ecff7d4616f138",
  "fox/hilo/400": "e3ef66031aff9dec",
  "fox/hilo/9000": "724bdc4ad029136d",
  "fox/hilo/99999": "7638ccfb38dbfa28",
  "fox/catch/400": "0679a7da39689437",
  "fox/catch/9000": "f87832b7301afe5c",
  "fox/catch/99999": "03d722ae957d639b",
  "fox/dash/400": "73b2de80dff4dfef",
  "fox/dash/9000": "495b3784f826c5c9",
  "fox/dash/99999": "f3ebbdbe71b8b51b",
  "fox/echo/400": "7562d41e5065ae5d",
  "fox/echo/9000": "f84bc3c63c977a71",
  "fox/echo/99999": "e421899e3177cc89",
  "fish/hilo/400": "4218a7cb31ca6c28",
  "fish/hilo/9000": "1c752b96668e334d",
  "fish/hilo/99999": "4f73f60f102ca268",
  "fish/catch/400": "e680e8572418e862",
  "fish/catch/9000": "ba80a618843ee1a1",
  "fish/catch/99999": "ba4ec8000db3d6cb",
  "fish/dash/400": "4408c45c1e29df95",
  "fish/dash/9000": "ba1eaa8156fb3358",
  "fish/dash/99999": "c18ff83f7f914490",
  "fish/echo/400": "86d3ea9ccf74c77d",
  "fish/echo/9000": "78368150db0494c1",
  "fish/echo/99999": "102d00f1951ab49a",
  "bird/hilo/400": "429bca83367245cc",
  "bird/hilo/9000": "14db49d6bd8d7661",
  "bird/hilo/99999": "dcff8befb697ee24",
  "bird/catch/400": "c2e1f88e2a8a4969",
  "bird/catch/9000": "23cbababbe0ce978",
  "bird/catch/99999": "b0f3f5624281c7e5",
  "bird/dash/400": "8fa0bfb78a02ee6e",
  "bird/dash/9000": "046be3446df2d5e5",
  "bird/dash/99999": "32183a5c4bb4a351",
  "bird/echo/400": "3e50b39005d0e5a7",
  "bird/echo/9000": "601d6744ad609d7f",
  "bird/echo/99999": "cf6fc6cd74944c5e",
  "cat/hilo/400": "87be75338d0bbee0",
  "cat/hilo/9000": "7fd1cda6b1c4d2a5",
  "cat/hilo/99999": "d217f80f971abc40",
  "cat/catch/400": "6795c21c088feb8f",
  "cat/catch/9000": "d8f6ca64cbf61267",
  "cat/catch/99999": "f4844883928ee444",
  "cat/dash/400": "0c431603bf4a78bc",
  "cat/dash/9000": "06266912f0502a65",
  "cat/dash/99999": "0543f6620da3feb7",
  "cat/echo/400": "b982a1f13cdc5b9e",
  "cat/echo/9000": "304add6499e94dff",
  "cat/echo/99999": "ae3479f6fb498681",
  "spirits/hilo/400": "f7bcaf7fea6282b8",
  "spirits/hilo/9000": "9e45243a5d5b4ddd",
  "spirits/hilo/99999": "50037bffe52e2614",
  "spirits/catch/400": "bba29642f948cd59",
  "spirits/catch/9000": "629e76fb7987af5c",
  "spirits/catch/99999": "a6dcf56a627a430f",
  "spirits/dash/400": "fc3d19c2a21d8071",
  "spirits/dash/9000": "2dfba0295adbaefa",
  "spirits/dash/99999": "e495983dc4009e64",
  "spirits/echo/400": "564808eb5ed7756c",
  "spirits/echo/9000": "0e7d898224d8ffbd",
  "spirits/echo/99999": "3a39a518a6271457",
  "bunny/hilo/400": "112ca333d13b8a34",
  "bunny/hilo/9000": "9a3f918a5c8e7425",
  "bunny/hilo/99999": "1c43487b8214fab8",
  "bunny/catch/400": "3a163ebf2905f5fa",
  "bunny/catch/9000": "7c2c70294348ef22",
  "bunny/catch/99999": "7207ff2a9d19dcf1",
  "bunny/dash/400": "9d0a9a56443c71b5",
  "bunny/dash/9000": "091da76b44afa1ce",
  "bunny/dash/99999": "de346e2541bc35b2",
  "bunny/echo/400": "75d1f13108487f3c",
  "bunny/echo/9000": "a47554129cce125d",
  "bunny/echo/99999": "ba1a11f9edf39da2",
  "dragon/hilo/400": "1417db972bedac8c",
  "dragon/hilo/9000": "551674e638fabe75",
  "dragon/hilo/99999": "635d375ba49490c4",
  "dragon/catch/400": "9a9015e31102775e",
  "dragon/catch/9000": "8837c9f11a692edc",
  "dragon/catch/99999": "41fa45bec63221fd",
  "dragon/dash/400": "9ea44b284d5b0339",
  "dragon/dash/9000": "a97a9683792dc39c",
  "dragon/dash/99999": "00690083fe52b184",
  "dragon/echo/400": "e245bfefa1b2ad98",
  "dragon/echo/9000": "668e1e2ca4a66d67",
  "dragon/echo/99999": "3eb1a32f629ec2ae",
  "bot/hilo/400": "5e0fcc5797614a48",
  "bot/hilo/9000": "f413507aa8c783cd",
  "bot/hilo/99999": "e8cd167f5bc9cb74",
  "bot/catch/400": "98f1356a7b10577b",
  "bot/catch/9000": "6cd37e584ca4c0ad",
  "bot/catch/99999": "7b67b70b885bfaf8",
  "bot/dash/400": "cba9f34e53fc6503",
  "bot/dash/9000": "1ce7367628415e35",
  "bot/dash/99999": "4bbdab4fbb1350b6",
  "bot/echo/400": "c6bb2e3f42fe574c",
  "bot/echo/9000": "70e829efd4a9e6c2",
  "bot/echo/99999": "04025d4b5212dd56",
  "slime/hilo/400": "47425b37ce22f23c",
  "slime/hilo/9000": "d0e80e7e9937557d",
  "slime/hilo/99999": "feee9ff7cf22d748",
  "slime/catch/400": "5aa035489cf8e80f",
  "slime/catch/9000": "d4a2759eabcd3689",
  "slime/catch/99999": "58d99f554f8f6cd0",
  "slime/dash/400": "8dfd012f9fec84ee",
  "slime/dash/9000": "df5d18d1aff87de0",
  "slime/dash/99999": "fd00f87425a5e40b",
  "slime/echo/400": "fad9f8558e8944fc",
  "slime/echo/9000": "e2d00de4c4d31789",
  "slime/echo/99999": "552aa78a470cdaf3",
  "bug/hilo/400": "f231ded79d569f54",
  "bug/hilo/9000": "821afb46c184ddbd",
  "bug/hilo/99999": "ecfefc4f1005d558",
  "bug/catch/400": "db31ba0770d16160",
  "bug/catch/9000": "0103d84b710c78a8",
  "bug/catch/99999": "25491ed03d0d3c83",
  "bug/dash/400": "dd055f616220cfca",
  "bug/dash/9000": "2a6625c9dcd8cb88",
  "bug/dash/99999": "f8210bed2c953bfa",
  "bug/echo/400": "52dd72ccc6bea061",
  "bug/echo/9000": "c3e125cdc684e410",
  "bug/echo/99999": "2e7090214305f756",
  "alien/hilo/400": "d30200d5abbb8c60",
  "alien/hilo/9000": "4aa0e6008e642bb9",
  "alien/hilo/99999": "b43e671198ef35f8",
  "alien/catch/400": "124d10dda811b534",
  "alien/catch/9000": "637686d6617b7529",
  "alien/catch/99999": "e7db82b298369b35",
  "alien/dash/400": "db12cdc95fd56258",
  "alien/dash/9000": "f713353709c559b6",
  "alien/dash/99999": "022dc5d7db5db0de",
  "alien/echo/400": "bb482855cdb943b0",
  "alien/echo/9000": "710d48dd1f5125a2",
  "alien/echo/99999": "97b7e7b243408a4d"
};

async function main() {
  // ---------- 1. glyph sets: same keys as the 7x7 themes, complete, distinct ----------
  {
    ok(GLYPH96_SIZE === 10 && GLYPH_SIZE === 7, 'glyphs are 7x7 in logic and 10x10 at 96');
    ok(Object.keys(THEMES96).sort().join() === Object.keys(THEMES).sort().join() && THEME_FAMILIES.length === 12, 'themes96 has the same 12 family keys as themes');
    ok(Object.values(SHAPES).every((r) => r.length === 10 && r.every((x) => x.length === 10 && /^[.#aow]+$/.test(x))), 'every shape is ten rows of ten');
    const sets = new Set<string>();
    for (const fam of THEME_FAMILIES) {
      const t7 = THEMES[fam], t = themeFor96(fam);
      ok(t.good.length === t7.good.length && t.bad.length === t7.bad.length && t.obstacles.length === 3 && t7.obstacles.length === 3 && t.symbols.length === 5 && t7.symbols.length === 5, `${fam}: same slots as the 7x7 theme`);
      const names7 = allGlyphs(t7).map((g) => g.name).join('|'), names = allGlyphs96(t).map((g) => g.name).join('|');
      ok(names7 === names, `${fam}: the same glyph names in the same order (${names})`);
      const tones7 = allGlyphs(t7).map((g) => g.main).join('|'), tones = allGlyphs96(t).map((g) => g.main).join('|');
      ok(tones7 === tones, `${fam}: the same main tones as the 7x7 theme`);
      for (const g of allGlyphs96(t)) {
        ok(g.rows.length === 10 && g.rows.every((r) => r.length === 10 && /^[.#aow]+$/.test(r)), `${fam}/${g.name}: 10x10 of . # a o w`);
        ok(lit(g.rows) >= 24 && lit(g.rows) <= 90, `${fam}/${g.name}: ${lit(g.rows)} lit cells reads as a shape`);
        ok(!g.rows.join('').includes('a') || g.acc !== undefined, `${fam}/${g.name}: an accent cell needs an accent tone`);
      }
      for (const [label, list] of [['symbols', t.symbols], ['good', t.good], ['obstacles', t.obstacles], ['bad', t.bad], ['items', [...t.good, t.bonus, ...t.bad]]] as const) {
        ok(new Set(list.map(key)).size === list.length, `${fam}: ${label} are pairwise distinct`);
      }
      // the five symbols must also differ by silhouette (ECHO is played by shape): no two share both shape rows
      ok(new Set(t.symbols.map((g) => g.rows.join('/'))).size === 5, `${fam}: the five symbols have five different shapes`);
      sets.add(t.symbols.map(key).join(';'));
    }
    ok(sets.size === 12, 'no two families share a symbol set');
  }

  // ---------- 2. no glyph larger than its hit box ----------
  {
    // items: the logic box is ITEM (7) cells = 10.5 at 96, a 10x10 glyph fits
    ok(Math.round(ITEM * 1.5) >= GLYPH96_SIZE - 1 && GLYPH96_SIZE <= ITEM * 1.5, 'a 10x10 glyph fits the 7-unit item box (10.5 cells)');
    for (const fam of THEME_FAMILIES) {
      const t7 = THEMES[fam], t = themeFor96(fam);
      t.obstacles.forEach((g, i) => {
        // ink extent of the 10x10 obstacle against the 7x7 twin the hit box is derived from
        const box = obstacleBox(t7.obstacles[i]);
        let l = 10, r = 0, top = 10;
        g.rows.forEach((row, y) => { for (let x = 0; x < 10; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x + 1); top = Math.min(top, y); } });
        const h = 10 - top;
        ok(l >= Math.floor(box.left * 1.5) - 1 && r <= Math.ceil(box.right * 1.5) + 1, `${fam}/${g.name}: width ${l}..${r} stays within the hit box columns ${box.left}..${box.right} x1.5`);
        ok(h <= Math.ceil(box.ho * 1.5) + 1 && h >= Math.floor(box.ho * 1.5) - 1, `${fam}/${g.name}: height ${h} matches the logic height ${box.ho} x1.5`);
        ok(/[#a]/.test(g.rows[9]) || (box.ho >= 6 && box.ho - (7 - 1 - t7.obstacles[i].rows.reduce((last, r, y) => (/[^.]/.test(r) ? y : last), -1)) < box.ho && /[#a]/.test(g.rows[8])), `${fam}/${g.name}: it stands on the ground row (or floats as far above it as its 7x7 twin)`);
      });
    }
  }

  // ---------- 3. Traditional is byte-identical ----------
  {
    const now = tradHashes();
    let bad = 0;
    for (const k of Object.keys(TRAD_GOLDEN)) if (now[k] !== TRAD_GOLDEN[k]) { bad++; if (bad < 5) console.log('  trad mismatch', k); }
    ok(bad === 0 && Object.keys(now).length === Object.keys(TRAD_GOLDEN).length && Object.keys(TRAD_GOLDEN).length === TRAD_FAMS.length * GAME_ENTRIES.length * 3, `Traditional renders of ${Object.keys(TRAD_GOLDEN).length} game frames are byte-identical to before the 96 painters`);
  }

  // ---------- 4. every game paints at 96 for all 12 families in every phase ----------
  const times: number[] = [];
  const seen: Record<string, Set<string>> = { echo: new Set(), dash: new Set(), catch: new Set(), hilo: new Set() };
  for (const fam of THEME_FAMILIES) {
    const sp = FAM_SPECIES(fam);
    const pet = petOf(sp.id);
    for (const e of GAME_ENTRIES) {
      ok(typeof e.paint96 === 'function', `${e.def.id}: has a 96 painter`);
      for (const variant of ['good', 'sloppy']) {
        const params = paramsFor(pet, e.def.id);
        const s = newSession(e.def, params, 5 + (variant === 'good' ? 0 : 3));
        pressButton(s, 'b');
        const rng = makeRng(11);
        const bot = e.def.id === 'catch' ? catchBot({ ...SKILLS[variant === 'good' ? 'good' : 'casual'], vp: catchDims(params).vp }, 2)
          : e.def.id === 'dash' ? dashBot(params.tuning, DASH_SKILLS.casual, 5)
            : e.def.id === 'echo' ? echoBot(ECHO_SKILLS[variant === 'good' ? 'good' : 'random'], 4) : () => ({ left: rng.chance(0.3), right: false, act: rng.chance(0.5) });
        let t = 0, n = 0;
        const shoot = (extra = '') => {
          const ctx: ScreenCtx = { pet, tick: n & 7, mode: 'game', feedSel: 0, statsPage: 0, dexPage: 0, evo: null, scene: null, ms: T0 + t, session: s, look: 'technicolor' };
          const a = performance.now();
          let r: ReturnType<typeof renderScreen> | null = null;
          try { r = renderScreen(ctx); buildFrame(r, { mode: 'technicolor', dark: n % 2 === 1, line: lineOf(pet), bodyHex: bodyOf(pet) }); } catch (err) { ok(false, `${fam}/${e.def.id}${extra}: paint at 96 threw ${(err as Error).message}`); }
          times.push(performance.now() - a);
          if (r) {
            if (n % 20 === 0) ok(r.buf.n === N96 && r.look === 'technicolor', `${fam}/${e.def.id}: the game screen is a 96 buffer`);
            let bigCode = 0, litN = 0;
            for (let i = 0; i < r.buf.px.length; i++) { const v = r.buf.px[i] & 0x7f; if (v >= LAYER_COUNT) bigCode++; if (v) litN++; }
            if (bigCode) ok(false, `${fam}/${e.def.id}: layer code out of range`);
            if (n % 20 === 0) ok(litN > 800, `${fam}/${e.def.id}@${t}: ${litN} lit cells`);
          }
          n++;
        };
        for (let k = 0; t < e.def.maxMs + 3000 && s.phase === 'play'; k++) {
          s.pending = { ...s.pending, ...bot(s.game!, t) };
          tickSession(s, 50); t += 50;
          const st = s.game!.state as { phase?: string };
          if (st.phase) seen[e.def.id].add(st.phase);
          if (e.def.id === 'dash' && (s.game!.state as DashState).cd > 0) seen.dash.add('count');
          if (k % 7 === 0) shoot();
        }
        shoot('@over');
        while (!tickSession(s, 100)) { /* to the result */ }
      }
    }
  }
  ok(['intro', 'show', 'input', 'ok', 'oops'].every((p) => seen.echo.has(p)), `ECHO painted in every phase (${[...seen.echo].join(',')})`);
  ok(seen.dash.has('count'), 'DASH painted through the countdown');
  {
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length, p95 = sorted[Math.floor(sorted.length * 0.95)];
    console.log(`  painted ${times.length} 96 game frames: avg ${avg.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, max ${sorted[sorted.length - 1].toFixed(2)} ms`);
    ok(avg < 12 && p95 < 30, `draw-time budget at 96: avg ${avg.toFixed(2)} ms < 12, p95 ${p95.toFixed(2)} ms < 30`);
  }

  // ---------- 5. pets and items stay inside the buffer ----------
  {
    let petsChecked = 0;
    for (const sp of SPECIES) {
      for (const [w, h] of [[18, 18], [24, 24], [30, 30], [42, 40]] as const) {
        const a = petArt96(sp.id, w, h, false, false);
        ok(!!a && a.w <= w && a.h <= h && a.w >= 6 && lit([...(a?.rows ?? [])]) >= 25, `${sp.id}: 96 sprite fits ${w}x${h} (${a?.w}x${a?.h})`);
        petsChecked++;
      }
    }
    for (const fam of THEME_FAMILIES) {
      const pet = petOf(FAM_SPECIES(fam).id);
      // CATCH: the pet at both walls and the items anywhere in their range
      const params = paramsFor(pet, 'catch');
      const d = catchDims(params);
      const s = newSession(GAME_ENTRIES.find((e) => e.def.id === 'catch')!.def, params, 8); pressButton(s, 'b');
      const bot = catchBot({ ...SKILLS.good, vp: d.vp }, 3);
      let t = 0;
      while (s.phase === 'play') {
        s.pending = { ...s.pending, ...bot(s.game!, t) }; tickSession(s, 50); t += 50;
        const st = s.game!.state as CatchState;
        const a = petArt96(pet.species, g96(st.petW), g96(st.petH), st.stun > 0, st.face === -1)!;
        const x0 = Math.round(g96(st.petX) - a.w / 2);
        if (!(x0 >= -1 && x0 + a.w <= N96 + 1)) { ok(false, `${fam}: CATCH pet inside the buffer (x ${x0}..${x0 + a.w}; the painter clamps a one-cell rounding overshoot)`); break; }
        let itemsOk = true;
        for (const it of st.items) { const ix = g96(it.x) - 5; if (ix < -1 || ix + 10 > N96 + 1) itemsOk = false; }
        if (!itemsOk) { ok(false, `${fam}: CATCH items inside the buffer`); break; }
      }
      ok(true, `${fam}: CATCH pet and items stay inside the buffer`);
      // DASH: pet column fixed, jump apex below the HUD strip, items and obstacles within the screen while visible
      const dp = paramsFor(pet, 'dash');
      const ds = newSession(GAME_ENTRIES.find((e) => e.def.id === 'dash')!.def, dp, 6); pressButton(ds, 'b');
      const dbot = dashBot(dp.tuning, DASH_SKILLS.casual, 5);
      let top = 999, itemsOk = true;
      while (ds.phase === 'play') {
        ds.pending = { ...ds.pending, ...dbot(ds.game!) }; tickSession(ds, 50);
        const st = ds.game!.state as DashState;
        const a = petArt96(pet.species, g96(st.petW), g96(st.petH), false, false)!;
        top = Math.min(top, g96(59) - Math.round(st.hp * 1.5) - a.h + 1);
        const x0 = Math.round(g96(st.petX) - a.w / 2);
        if (!(x0 >= -1 && x0 + a.w <= N96 + 1)) itemsOk = false;
      }
      ok(itemsOk, `${fam}: DASH pet column inside the buffer`);
      ok(top >= HUD96_H - 1, `${fam}: DASH pet stays below the HUD strip at the top of the jump (top row ${top})`);
    }
    console.log(`  ${petsChecked} pet sprite fits checked`);
  }

  console.log(`games96: ${checks} checks, ${fails} failed`);
  process.exit(fails ? 1 : 0);
}

void main();
