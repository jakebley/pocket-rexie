#!/usr/bin/env node
/**
 * End-to-end check of ECHO on the real Expo web build: plays a whole run with the keyboard (A / B / C, chords for the in-between pads)
 * and with taps on the pads, and checks the result, the saved high score and the pet's reward.
 *   npx expo export --platform web --output-dir /tmp/webdist
 *   python3 -m http.server 8123 -d /tmp/webdist &
 *   node tools/echo-e2e.js http://localhost:8123 /tmp/out [species]
 * The game seed is pinned (Math.random is fixed for the instant the session is created) so the patterns are known from tools/echo-plan.ts.
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function load(name) {
  for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } }
  throw new Error(`${name} not found: npm i --no-save ${name}`);
}
const { chromium } = load('playwright-core');
const URL = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || '/tmp/echo-e2e');
const SPECIES = process.argv[4] || 'swiftail';
const MODE = process.env.MODE || 'technicolor';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SEED = 1 + Math.floor(0.5 * 0x7fffffff);
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '..');
const petJson = execSync(`npx tsx -e "import { forceSpecies, newPet } from './src/core/pet'; const p = newPet(0, { seed: 12345 }); forceSpecies(p, '${SPECIES}'); p.named = true; p.name = 'Fenny'; p.hunger = 4; p.happy = 2; console.log(JSON.stringify(p));"`, { cwd: ROOT }).toString().trim();
const smarts = JSON.parse(petJson).smarts ?? 0;
const plan = JSON.parse(execSync(`npx tsx tools/echo-plan.ts ${SPECIES} ${SEED} ${smarts}`, { cwd: ROOT }).toString().trim().split('\n').pop());
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(([pj, mode]) => {
    if (localStorage.getItem('seeded')) return;
    const now = Date.now();
    const p = JSON.parse(pj);
    p.birth = now - 3 * 86400000; p.lastTick = now; p.modified = now;
    localStorage.setItem('pocket-rexie-v1', JSON.stringify({ pet: p, offset: 0 }));
    localStorage.setItem('seeded', '1');
    if (mode === 'technicolor') localStorage.setItem('pocket-rexie-colormode-v1', 'technicolor');
  }, [petJson, MODE]);
  await page.goto(URL);
  await page.waitForSelector('[aria-label="PLAY"]', { timeout: 20000 });
  await sleep(800);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const store = () => page.evaluate(() => ({ pet: JSON.parse(localStorage.getItem('pocket-rexie-v1') || 'null')?.pet, scores: JSON.parse(localStorage.getItem('pocket-rexie-scores-v1') || 'null') }));
  const before = (await store()).pet;

  await page.click('[aria-label="PLAY"]');
  await sleep(400);
  const menu = await page.locator('[aria-label^="Play menu row"]').count();
  ok(menu >= 4, `the Play menu lists ECHO (rows: ${menu})`);
  // ECHO is the third game (HI-LO, CATCH, [DASH], ECHO): move down with A until its row, by tapping the row labelled by its index
  const idx = 3; // 0 HI-LO, 1 CATCH, 2 DASH, 3 ECHO
  // the session (and its seed) is created when the menu row is chosen, so pin Math.random around that click
  await page.evaluate(() => { const o = Math.random; Math.random = () => 0.5; setTimeout(() => { Math.random = o; }, 250); });
  await page.click(`[aria-label="Play menu row ${idx + 1}"]`);
  await sleep(400);
  await shot('01-echo-ready');
  // B starts it
  await page.keyboard.press('Enter');
  const t0 = Date.now();
  const lcd = page.locator('[aria-label="Game screen"]');
  ok(await lcd.count() === 1, 'the game screen takes taps');
  const box = await lcd.boundingBox();
  const keyOf = (slot) => (slot === 0 ? ['a'] : slot === 2 ? ['b'] : slot === 4 ? ['c'] : slot === 1 ? ['a', 'b'] : ['b', 'c']);
  const press = async (slot, r, viaTap) => {
    if (viaTap) {
      const pr = plan.rounds[r].pads[plan.rounds[r].active.indexOf(slot)];
      await page.mouse.click(box.x + ((pr.x + pr.w / 2) / 64) * box.width, box.y + ((pr.y + pr.h / 2) / 64) * box.height);
    } else {
      const ks = keyOf(slot);
      for (const k of ks) await page.keyboard.down(k);
      for (const k of ks) await page.keyboard.up(k);
    }
  };
  let at = 0; // ms since the start at which the current round's banner began
  await sleep(300);
  let shots = 0;
  for (let r = 0; r < plan.rounds.length; r++) {
    const R = plan.rounds[r];
    const wait = at + R.showMs + 700 - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    if (r === 0) { await shot('02-echo-input'); // taps on the stage must not count
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4); await sleep(150); }
    if (process.env.DEBUG_SHOTS) await shot('dbg-r' + (r + 1) + '-input');
    const viaTap = r % 2 === 1;
    for (const slot of R.pattern) { await press(slot, r, viaTap); await sleep(viaTap ? 380 : 420); }
    at = Date.now() - t0;
    if ((r === 3 || r === 7) && shots < 2) { await sleep(300); await shot(`03-echo-round-${r + 1}-ok`); shots++; }
    console.log(`round ${r + 1} answered (${viaTap ? 'taps' : 'keys'}, ${R.pattern.length} symbols, ${R.active.length} pads)`);
  }
  await sleep(2600);
  await shot('04-echo-result');
  const after = await store();
  const sc = after.scores && after.scores.echo;
  console.log('echo high score:', JSON.stringify(sc && sc.overall));
  ok(!!sc && sc.overall.rank === 'gold', `a clean run of all ${plan.rounds.length} rounds is GOLD (${sc && sc.overall.score})`);
  const expect = Math.floor(plan.rounds.reduce((a, R, i) => a + R.pattern.length * (1 + 0.1 * Math.min(i, 5)), 0) * plan.mul + 1e-9);
  ok(!!sc && sc.overall.score === expect, `the saved score matches the rules (${sc && sc.overall.score} vs ${expect})`);
  ok((after.pet.rewardedPlays || []).length === 1, `one rewarded play logged (${(after.pet.rewardedPlays || []).length})`);
  console.log('smarts', before.smarts, '->', after.pet.smarts, 'happy', before.happy, '->', after.pet.happy);
  ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all ECHO end-to-end checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
