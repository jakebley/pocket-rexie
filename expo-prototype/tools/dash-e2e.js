#!/usr/bin/env node
/**
 * End-to-end check of DASH on the real Expo web build, driven with simulated key presses and taps.
 *   npx expo export --platform web --output-dir /tmp/webdist && python3 -m http.server 8123 -d /tmp/webdist &
 *   node tools/dash-e2e.js http://localhost:8123 /tmp/out [species]
 * Opens PLAY, picks DASH (a tap on its menu row), starts it with B, hops with B, A and taps on both halves, waits for the result screen
 * and checks what was saved (high score, the pet's rewarded play). Screenshots of every step go to the out directory.
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
const OUT = path.resolve(process.argv[3] || '/tmp/dash-e2e');
const SPECIES = process.argv[4] || 'swiftail';
const MODE = process.env.MODE || 'technicolor';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });
const petJson = execSync(`npx tsx -e "import { forceSpecies, newPet } from './src/core/pet'; const p = newPet(0, { seed: 12345 }); forceSpecies(p, '${SPECIES}'); p.named = true; p.name = 'Fenny'; p.hunger = 4; p.happy = 2; console.log(JSON.stringify(p));"`, { cwd: path.resolve(__dirname, '..') }).toString().trim();
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
  await page.click('[aria-label="PLAY"]');
  await sleep(400);
  await shot('01-menu');
  await page.click('[aria-label="Play menu row 3"]'); // HI-LO, CATCH, DASH
  await sleep(400);
  await shot('02-dash-ready');
  await page.keyboard.press('Enter');
  await sleep(900);
  await shot('03-countdown');
  await sleep(1500);
  const lcd = page.locator('[aria-label="Game screen"]');
  ok(await lcd.count() === 1, 'the game screen takes taps');
  const box = await lcd.boundingBox();
  const t0 = Date.now();
  let n = 0, shots = 0;
  // hop at a steady rhythm with a mix of B, A and taps: a casual player
  while (Date.now() - t0 < 42000) {
    const m = n++ % 4;
    if (m === 0) await page.keyboard.press('b');
    else if (m === 1) await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5);
    else if (m === 2) await page.keyboard.press('a');
    else await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await sleep(900 + (n % 3) * 150);
    const el = Date.now() - t0;
    if (el > 8000 * (shots + 1) && shots < 4) { await shot(`04-play-${shots + 1}`); shots++; }
  }
  await sleep(2500);
  await shot('05-result');
  const after = await store();
  ok(!!after.pet && (after.pet.rewardedPlays || []).length === 1, `DASH: one rewarded play logged (${(after.pet.rewardedPlays || []).length})`);
  const sc = after.scores && after.scores.dash;
  console.log('dash high score:', JSON.stringify(sc && sc.overall));
  ok(!!sc && sc.overall.score >= 0, 'DASH: a high score was saved');
  await page.keyboard.press('Enter');
  await sleep(300);
  await shot('06-back-in-menu');
  await page.click('[aria-label="Play menu row 4"]'); // HIGH SCORES
  await sleep(400);
  await shot('07-high-scores');
  ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all DASH end-to-end checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
