// Regenerates Shared/MiniGames/MiniGameData.swift from the Expo mini-game sources, so the Swift port cannot drift from them.
// Run from expo-prototype (CI checks the output is up to date):
//     cd expo-prototype && npx tsx ../tools/gen_minigames.ts
// Data is emitted as compact strings (never big nested array literals: they make the Swift compiler crawl) that
// Shared/MiniGames/MiniThemes.swift and MiniTuning.swift split at runtime.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, THEME_FAMILIES, type Glyph } from '../expo-prototype/src/core/minigames/themes';
import { KIND_TUNING, STAGE_TUNING, HEAVY_SPEED, SICK, HUNGRY, STARVING, FAVOURITE_MUL, ALL_KINDS, paramsForBody } from '../expo-prototype/src/core/minigames/tuning';
import * as C from '../expo-prototype/src/core/minigames/games/catch';
import * as H from '../expo-prototype/src/core/minigames/games/hilo';
import * as D from '../expo-prototype/src/core/minigames/games/dash';
import { dashBot, DASH_SKILLS } from '../expo-prototype/test/dash-bots';
import * as E from '../expo-prototype/src/core/minigames/games/echo';
import { echoBot, ECHO_SKILLS } from '../expo-prototype/test/echo-bots';
import { playOut } from '../expo-prototype/src/core/minigames/session';
import { makeRng } from '../expo-prototype/src/core/minigames/rng';
import { TICK_MS, NO_INPUT } from '../expo-prototype/src/core/minigames/types';
import { SPECIES } from '../expo-prototype/src/core/speciesData';

const out: string[] = [];
const safe = (s: string) => { if (/["\\|\n]/.test(s)) throw new Error(`unsafe text in generated data: ${s}`); return s; };

// ---------- themes ----------
const KIND_TAG = (list: string, g: Glyph) => `G|${list}|${safe(g.name)}|${g.main}|${g.acc ?? '-'}|${g.rows.join('/')}`;
const themeLines: string[] = [];
for (const fam of THEME_FAMILIES) {
  const t = THEMES[fam];
  themeLines.push(['F', fam, t.titles.hilo, t.titles.catch, t.titles.dash, t.titles.echo, t.goodNoun, t.badNoun, t.move, t.wins.none, t.wins.bronze, t.wins.silver, t.wins.gold].map(safe).join('|'));
  for (const g of t.good) themeLines.push(KIND_TAG('good', g));
  themeLines.push(KIND_TAG('bonus', t.bonus));
  for (const g of t.bad) themeLines.push(KIND_TAG('bad', g));
  for (const g of t.obstacles) themeLines.push(KIND_TAG('obstacle', g));
  for (const g of t.symbols) themeLines.push(KIND_TAG('symbol', g));
}

// ---------- tuning ----------
const kinds = ALL_KINDS.map((k) => {
  const t = KIND_TUNING[k];
  return `${k}:${t.speed}:${t.size}:${t.luck}:${t.memory}:${t.favourite}`;
});
const stages = Object.entries(STAGE_TUNING).map(([s, v]) => `${s}:${v.speed}:${v.size}`);

// ---------- golden traces (Expo plays, Swift must reproduce) ----------
const fam = (id: string, stage = 'adult') => SPECIES.find((s) => s.family === id && s.stage === stage) ?? SPECIES.find((s) => s.family === id)!;
const goldenCatch: string[] = [];
const cases: { species: string; stage: string; seed: number; sick?: boolean; heavy?: boolean; hunger?: number }[] = [];
THEME_FAMILIES.forEach((f, i) => cases.push({ species: fam(f).id, stage: 'adult', seed: 3 + i }));
cases.push({ species: fam('fox', 'baby').id, stage: 'baby', seed: 21 }, { species: fam('bot').id, stage: 'ultimate', seed: 22 },
  { species: fam('bird').id, stage: 'teen', seed: 23, sick: true }, { species: fam('slime').id, stage: 'child', seed: 24, heavy: true },
  { species: fam('dragon').id, stage: 'adult', seed: 25, hunger: 0 }, { species: fam('cat').id, stage: 'adult', seed: 26, hunger: 1, heavy: true });
for (const c of cases) {
  const params = paramsForBody({ species: c.species, stage: c.stage as never, sick: c.sick, heavy: c.heavy, hunger: c.hunger }, 'catch');
  const rng = makeRng(c.seed * 977 + 5);
  const g = C.catchGame.init(c.seed, params);
  let t = 0;
  while (!g.done && t <= C.catchGame.maxMs + 5000) {
    const left = rng.chance(0.15), right = rng.chance(0.15), act = rng.chance(0.2);
    g.step({ left, right, act }, 50); t += 50;
  }
  const s = g.state as C.CatchState;
  goldenCatch.push([c.species, c.stage, c.sick ? 1 : 0, c.heavy ? 1 : 0, c.hunger ?? 4, c.seed, g.score, s.points, s.caught, s.hits, s.missed, s.petX.toFixed(6)].join('|'));
}
const goldenHilo: string[] = [];
for (let seed = 1; seed <= 8; seed++) {
  const g = H.hiloGame.init(seed, paramsForBody({ species: fam('dino').id, stage: 'adult' }, 'hilo'));
  let trace = '';
  let t = 0;
  while (!g.done && t < 60000) {
    const s = g.state as H.HiLoState;
    if (s.phase === 'guess') { const shown = s.shown; g.step({ ...NO_INPUT, act: true }, 50); trace += `${shown}${(g.state as H.HiLoState).revealed}`; } else g.step(NO_INPUT, 100);
    t += 100;
  }
  goldenHilo.push(`${seed}|${trace}|${(g.state as H.HiLoState).won}|${g.score}`);
}

// ---------- DASH golden traces ----------
// Mashing (seeded random presses) and the lookahead bot play whole games; the course snapshot pins the obstacle generator.
const dashCases: { species: string; stage: string; seed: number; sick?: boolean; heavy?: boolean; hunger?: number }[] = [];
THEME_FAMILIES.forEach((f, i) => dashCases.push({ species: fam(f).id, stage: 'adult', seed: 31 + i }));
dashCases.push({ species: fam('fox', 'baby').id, stage: 'baby', seed: 51 }, { species: fam('bot').id, stage: 'ultimate', seed: 52 },
  { species: fam('bird').id, stage: 'teen', seed: 53, sick: true }, { species: fam('slime').id, stage: 'child', seed: 54, heavy: true },
  { species: fam('dragon').id, stage: 'adult', seed: 55, hunger: 0 }, { species: fam('cat').id, stage: 'adult', seed: 56, hunger: 1, heavy: true });
const dashRow = (c: (typeof dashCases)[number], g: { score: number; state: unknown }) => {
  const s = g.state as D.DashState;
  return [c.species, c.stage, c.sick ? 1 : 0, c.heavy ? 1 : 0, c.hunger ?? 4, c.seed, g.score, s.points, s.cleared, s.hits, s.near, s.picked, s.jumps, s.dist.toFixed(4)];
};
const goldenDash: string[] = [];
for (const c of dashCases) {
  const params = paramsForBody({ species: c.species, stage: c.stage as never, sick: c.sick, heavy: c.heavy, hunger: c.hunger }, 'dash');
  const rng = makeRng(c.seed * 977 + 5);
  const g = D.dashGame.init(c.seed, params);
  let t = 0;
  while (!g.done && t <= D.dashGame.maxMs + 5000) {
    const left = rng.chance(0.1), right = rng.chance(0.1), act = rng.chance(0.15);
    g.step({ left, right, act }, 50); t += 50;
  }
  goldenDash.push(dashRow(c, g).join('|'));
}
const goldenDashBot: string[] = [];
for (const c of dashCases.filter((_, i) => i % 2 === 0 || i >= 12)) for (const skill of ['perfect', 'good']) {
  const params = paramsForBody({ species: c.species, stage: c.stage as never, sick: c.sick, heavy: c.heavy, hunger: c.hunger }, 'dash');
  const bot = dashBot(params.tuning, DASH_SKILLS[skill], c.seed);
  const g = D.dashGame.init(c.seed, params);
  let t = 0;
  while (!g.done && t <= D.dashGame.maxMs + 5000) { g.step(bot(g), 50); t += 50; }
  goldenDashBot.push([...dashRow(c, g).slice(0, 6), skill, ...dashRow(c, g).slice(6)].join('|'));
}
const goldenDashCourse: string[] = [];
for (const c of dashCases.slice(0, 14)) {
  const g = D.dashGame.init(c.seed, paramsForBody({ species: c.species, stage: c.stage as never, sick: c.sick, heavy: c.heavy, hunger: c.hunger }, 'dash'));
  for (let i = 0; i < 90; i++) g.step(NO_INPUT, 50);
  const s = g.state as D.DashState;
  goldenDashCourse.push([c.species, c.stage, c.sick ? 1 : 0, c.heavy ? 1 : 0, c.hunger ?? 4, c.seed,
    s.obstacles.map((o) => `${o.kind}:${Math.round(o.x * 1000)}:${o.h}`).join('/'), s.items.map((it) => `${Math.round(it.x * 1000)}:${Math.round(it.hc * 1000)}:${it.bonus ? 1 : 0}:${it.glyph}`).join('/')].join('|'));
}
const dashBoxes = THEME_FAMILIES.map((f) => `${f}:` + THEMES[f].obstacles.map((o) => { const b = D.obstacleBox(o); return [b.left, b.right, b.hl, b.hr, b.ho, b.h].join('.'); }).join('/'));

// ---------- write ----------
out.push('// GENERATED by tools/gen_minigames.ts from expo-prototype/src/core/minigames (themes, tuning, catch, hilo, dash). Do not edit by hand.');
// ECHO: pattern generator output for seeds 1..12 (digits = slots 0-4, rounds joined with "/"), and scripted bots playing whole runs.
const goldenEchoPatterns: string[] = [];
for (let seed = 1; seed <= 12; seed++) goldenEchoPatterns.push(`${seed}:${E.makePatterns(seed).map((p) => p.join('')).join('/')}`);
const goldenEcho: string[] = [];
const echoCases: { species: string; stage: string; skill: string; seed: number; sick?: boolean }[] = [];
const echoSkillNames = ['good', 'okay', 'casual', 'random'];
THEME_FAMILIES.forEach((f, i) => echoCases.push({ species: fam(f).id, stage: 'adult', skill: echoSkillNames[i % 4], seed: 1 + i }));
echoCases.push({ species: fam('fox', 'baby').id, stage: 'baby', skill: 'good', seed: 31 }, { species: fam('bot').id, stage: 'ultimate', skill: 'okay', seed: 32 },
  { species: fam('bird').id, stage: 'teen', skill: 'good', seed: 33, sick: true }, { species: fam('slime').id, stage: 'child', skill: 'casual', seed: 34 },
  { species: fam('cat').id, stage: 'adult', skill: 'perfect', seed: 35 }, { species: fam('dragon').id, stage: 'adult', skill: 'perfect', seed: 36 });
for (const c of echoCases) {
  const params = paramsForBody({ species: c.species, stage: c.stage as never, sick: c.sick }, 'echo', 30);
  const g = playOut(E.echoGame, params, c.seed, echoBot(ECHO_SKILLS[c.skill], c.seed));
  const s = g.state as E.EchoState;
  goldenEcho.push([c.species, c.stage, c.sick ? 1 : 0, c.skill, c.seed, g.score, s.points.toFixed(6), s.cleared, s.mistakes, s.round, s.retries, s.won ? 1 : 0, s.t].join('|'));
}

// ---------- write ----------
out.push('// GENERATED by tools/gen_minigames.ts from expo-prototype/src/core/minigames (themes, tuning, catch, hilo, echo). Do not edit by hand.');
out.push('// Run: cd expo-prototype && npx tsx ../tools/gen_minigames.ts');
out.push('enum MiniGameData {');
out.push(`    static let tickMs: Double = ${TICK_MS}`);
out.push(`    static let familyOrder: String = "${THEME_FAMILIES.join(',')}"`);
out.push('    /// F| family | titles (hilo catch dash echo) | nouns | move | win lines (none bronze silver gold)');
out.push('    /// G| list | name | main tone | accent tone ("-" none) | seven rows joined by "/"');
out.push('    static let themes: String = """');
out.push(...themeLines);
out.push('"""');
out.push('    /// kind:speed:size:luck:memory:favourite (hilo, catch, dash, echo)');
out.push(`    static let kinds: String = "${kinds.join(',')}"`);
out.push('    /// stage:speed:size');
out.push(`    static let stages: String = "${stages.join(',')}"`);
out.push(`    static let favouriteMul: Double = ${FAVOURITE_MUL}`);
out.push(`    static let heavySpeed: Double = ${HEAVY_SPEED}`);
out.push(`    static let sickSpeed: Double = ${SICK.speed}`);
out.push(`    static let sickLuck: Double = ${SICK.luck}`);
out.push(`    static let sickMemory: Double = ${SICK.memory}`);
out.push(`    static let hungrySpeed: Double = ${HUNGRY.speed}`);
out.push(`    static let hungryLuck: Double = ${HUNGRY.luck}`);
out.push(`    static let starvingSpeed: Double = ${STARVING.speed}`);
out.push(`    static let starvingLuck: Double = ${STARVING.luck}`);
const num = (name: string, v: number) => out.push(`    static let ${name}: Double = ${Number.isInteger(v) ? v.toFixed(1) : v}`);
out.push('    // CATCH');
num('catchMs', C.CATCH_MS); num('catchW', C.CATCH_W); num('catchGround', C.CATCH_GROUND); num('catchItem', C.ITEM);
num('catchBaseSpeed', C.BASE_SPEED); num('catchFallFrom', C.FALL_FROM); num('catchFallTo', C.FALL_TO);
num('catchSpawnFrom', C.SPAWN_FROM); num('catchSpawnTo', C.SPAWN_TO); num('catchBadFrom', C.BAD_FROM); num('catchBadTo', C.BAD_TO);
num('catchBonusChance', C.BONUS_CHANCE); num('catchStunMs', C.STUN_MS); num('catchBadPenalty', C.BAD_PENALTY); num('catchBonusPoints', C.BONUS_POINTS);
out.push(`    static let catchThresholds: [Int] = [${C.CATCH_THRESHOLDS.bronze}, ${C.CATCH_THRESHOLDS.silver}, ${C.CATCH_THRESHOLDS.gold}]`);
out.push('    // HI-LO');
out.push(`    static let hiloRounds: Int = ${H.HILO_ROUNDS}`);
num('hiloRevealMs', H.HILO_REVEAL_MS);
out.push(`    static let hiloThresholds: [Int] = [${H.HILO_THRESHOLDS.bronze}, ${H.HILO_THRESHOLDS.silver}, ${H.HILO_THRESHOLDS.gold}]`);
out.push('    // DASH');
num('dashMs', D.DASH_MS); num('dashCountMs', D.DASH_COUNT_MS); num('dashW', D.DASH_W); num('dashGround', D.DASH_GROUND); num('dashPetX', D.DASH_PET_X);
num('dashVStart', D.V_START); num('dashVEnd', D.V_END); num('dashDistPerPoint', D.DIST_PER_POINT); num('dashStunMs', D.STUN_MS); num('dashInvulMs', D.INVUL_MS);
num('dashStunSlow', D.STUN_SLOW); num('dashHitPenalty', D.HIT_PENALTY); num('dashNearMissPx', D.NEAR_MISS_PX); num('dashNearMissPoints', D.NEAR_MISS_POINTS);
num('dashStreakEvery', D.STREAK_EVERY); num('dashStreakPoints', D.STREAK_POINTS); num('dashItemPoints', D.ITEM_POINTS); num('dashBonusPoints', D.BONUS_POINTS);
num('dashBonusChance', D.BONUS_CHANCE); num('dashJumpBufferMs', D.JUMP_BUFFER_MS); num('dashLandLagMs', D.LAND_LAG_MS); num('dashMarginTicks', D.MARGIN_TICKS);
num('dashLandSlackS', D.LAND_SLACK_S); num('dashItemSize', D.ITEM_SIZE); num('dashPaceS', D.PACE_S);
out.push(`    static let dashThresholds: [Int] = [${D.DASH_THRESHOLDS.bronze}, ${D.DASH_THRESHOLDS.silver}, ${D.DASH_THRESHOLDS.gold}]`);
out.push('    /// move:verb on the jump button');
out.push(`    static let dashVerbs: String = "${Object.entries(D.JUMP_VERB).map(([k, v]) => `${k}:${v}`).join(',')}"`);
out.push('    // Golden traces: Expo played these games with the scripted input in MiniGameTests; Swift must reproduce them.');
out.push('    /// species|stage|sick|heavy|hunger|seed|score|points|caught|hits|missed|petX');
out.push(`    static let goldenCatch: String = "${goldenCatch.join(',')}"`);
out.push('    /// seed|shown+revealed digits per round|wins|score');
out.push(`    static let goldenHilo: String = "${goldenHilo.join(',')}"`);
out.push('    /// DASH, mashing: species|stage|sick|heavy|hunger|seed|score|points|cleared|hits|near|picked|jumps|dist');
out.push(`    static let goldenDash: String = "${goldenDash.join(',')}"`);
out.push('    /// DASH, lookahead bot: species|stage|sick|heavy|hunger|seed|skill|score|points|cleared|hits|near|picked|jumps|dist');
out.push(`    static let goldenDashBot: String = "${goldenDashBot.join(',')}"`);
out.push('    /// DASH course after 90 idle ticks: species|stage|sick|heavy|hunger|seed|obstacles kind:x*1000:h joined by /|items x*1000:hc*1000:bonus:glyph joined by /');
out.push(`    static let goldenDashCourse: String = "${goldenDashCourse.join(',')}"`);
out.push('    /// family:obstacle boxes (left.right.hl.hr.ho.h) of its three obstacles joined by /');
out.push(`    static let dashBoxes: String = "${dashBoxes.join(',')}"`);
out.push('    // ECHO');
out.push(`    static let echoRounds: Int = ${E.ECHO_ROUNDS}`);
out.push(`    static let echoLengths: String = "${E.ECHO_LENGTHS.join(',')}"`);
out.push(`    static let echoUnlockAB: Int = ${E.ECHO_UNLOCK_AB}`);
out.push(`    static let echoUnlockBC: Int = ${E.ECHO_UNLOCK_BC}`);
out.push(`    static let echoThresholds: [Int] = [${E.ECHO_THRESHOLDS.bronze}, ${E.ECHO_THRESHOLDS.silver}, ${E.ECHO_THRESHOLDS.gold}]`);
out.push(`    static let echoSlotNotes: [Double] = [${E.SLOT_NOTES.map((n) => n.toFixed(1)).join(', ')}]`);
out.push(`    static let echoChordTicks: Int = ${E.CHORD_TICKS}`);
num('echoIntroMs', E.INTRO_MS); num('echoLeadMs', E.LEAD_MS); num('echoOkMs', E.OK_MS); num('echoOopsMs', E.OOPS_MS);
num('echoPadFlashMs', E.PAD_FLASH_MS); num('echoIdleBase', E.IDLE_BASE); num('echoStreakStep', E.STREAK_STEP);
out.push(`    static let echoStreakCap: Int = ${E.STREAK_CAP}`);
out.push(`    static let echoPadY: Int = ${E.PAD_Y}`);
out.push(`    static let echoPadH: Int = ${E.PAD_H}`);
out.push(`    /// stage:extra display ms`);
out.push(`    static let echoStageMemory: String = "${Object.entries(E.STAGE_MEMORY).map(([k, v]) => `${k}:${v}`).join(',')}"`);
out.push(`    static let echoMaxMs: Double = ${E.echoGame.maxMs}.0`);
out.push('    /// seed:pattern of each round (digits are pad slots 0-4), rounds joined with "/"');
out.push(`    static let goldenEchoPatterns: String = "${goldenEchoPatterns.join(',')}"`);
out.push('    /// species|stage|sick|skill|seed|score|points|cleared|mistakes|round|retries|won|t (ECHO bots from expo-prototype/test/echo-bots.ts, smarts 30)');
out.push(`    static let goldenEcho: String = "${goldenEcho.join(',')}"`);
out.push('}');
writeFileSync(resolve(__dirname, '../Shared/MiniGames/MiniGameData.swift'), out.join('\n') + '\n');
console.log(`MiniGameData.swift: ${THEME_FAMILIES.length} families, ${kinds.length} kinds, ${goldenCatch.length} catch traces`);
