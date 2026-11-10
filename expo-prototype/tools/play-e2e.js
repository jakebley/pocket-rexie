#!/usr/bin/env node
/**
 * End-to-end check of the Play mini-games on the real Expo web build, driven with simulated key presses and taps.
 *   npx expo export --platform web --output-dir /tmp/webdist
 *   python3 -m http.server 8123 -d /tmp/webdist &
 *   node tools/play-e2e.js http://localhost:8123 /tmp/out [species]
 * It seeds a saved pet (like a returning player), opens PLAY, plays HI-LO and CATCH to the result screen with the keyboard
 * (A = left, B = act, C = right) and with taps on the left and right half of the screen, and checks what was saved
 * (high scores, the pet's rewards). Screenshots of every step go to the out directory.
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
const OUT = path.resolve(process.argv[3] || '/tmp/play-e2e');
const SPECIES = process.argv[4] || 'swiftail';
const MODE = process.env.MODE || 'traditional';
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
  await shot('01-home');
  const before = (await store()).pet;

  // the Play icon opens the Play menu
  await page.click('[aria-label="PLAY"]');
  await sleep(400);
  await shot('02-play-menu');
  // A moves down to CATCH, B opens its ready screen, B starts it
  await page.keyboard.press('a');
  await sleep(200);
  await shot('03-menu-catch-selected');
  await page.keyboard.press('Enter');
  await sleep(300);
  await shot('04-catch-ready');
  await page.keyboard.press('Enter');
  await sleep(500);
  await shot('05-catch-start');
  // play: sweep with the keys (A left, C right, B stop), and a few taps on the screen halves
  const lcd = page.locator('[aria-label="Game screen"]');
  ok(await lcd.count() === 1, 'the game screen takes taps');
  const box = await lcd.boundingBox();
  const t0 = Date.now();
  let step = 0, shots = 0;
  while (Date.now() - t0 < 29000) {
    const m = step++ % 8;
    if (m === 0) await page.keyboard.press('ArrowLeft');
    else if (m === 1) await sleep(500);
    else if (m === 2) await page.keyboard.press('b');
    else if (m === 3) await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5); // tap right half
    else if (m === 4) await sleep(700);
    else if (m === 5) await page.keyboard.press('c');
    else if (m === 6) await sleep(600);
    else if (m === 7) await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5); // tap left half
    await sleep(250);
    const el = Date.now() - t0;
    if (el > 9000 * (shots + 1) && shots < 3) { await shot(`06-catch-play-${shots + 1}`); shots++; }
  }
  await sleep(4500); // time up beat and the result
  await shot('07-catch-result');
  const afterCatch = await store();
  ok(!!afterCatch.pet && (afterCatch.pet.rewardedPlays || []).length === 1, `CATCH: one rewarded play logged (${(afterCatch.pet.rewardedPlays || []).length})`);
  const catchScores = afterCatch.scores && afterCatch.scores.catch;
  console.log('catch high score:', JSON.stringify(catchScores && catchScores.overall));
  ok(!catchScores || catchScores.overall.score > 0, 'CATCH: a saved high score is positive');
  console.log('smarts', before.smarts, '->', afterCatch.pet.smarts, 'happy', before.happy, '->', afterCatch.pet.happy);

  // B on the result goes back to the menu; HI-LO: B starts, B chooses (HIGHER) five times
  await page.keyboard.press('Enter');
  await sleep(300);
  await shot('08-menu-again');
  await page.click('[aria-label="Play menu row 1"]'); // a tap on HI-LO
  await sleep(300);
  await shot('09-hilo-ready');
  await page.keyboard.press('Enter');
  await sleep(300);
  for (let r = 0; r < 5; r++) {
    if (r === 1) await page.keyboard.press('a'); // switch to LOWER
    await page.keyboard.press('Enter');
    await sleep(r === 0 ? 700 : 300);
    if (r === 0) await shot('10-hilo-reveal');
    await sleep(1400);
  }
  await sleep(1800);
  await shot('11-hilo-result');
  const afterHilo = await store();
  ok(afterHilo.pet.rewardedPlays.length === 2, `HI-LO: a second rewarded play logged (${afterHilo.pet.rewardedPlays.length})`);
  console.log('hilo high score:', JSON.stringify(afterHilo.scores && afterHilo.scores.hilo && afterHilo.scores.hilo.overall));

  // C goes home; reopen the menu, open HIGH SCORES with taps
  await page.keyboard.press('c');
  await sleep(400);
  await page.click('[aria-label="PLAY"]');
  await sleep(300);
  await page.click('[aria-label="Play menu row 3"]'); // HIGH SCORES
  await sleep(400);
  await shot('12-high-scores-1');
  await page.keyboard.press('b');
  await sleep(300);
  await shot('13-high-scores-2');
  await page.keyboard.press('c'); // back to the menu
  await sleep(300);
  await shot('14-back-in-menu');
  await page.click('[aria-label="Play menu row 4"]'); // CANCEL
  await sleep(300);
  await shot('15-home-again');

  // the daily cap: two more quick HI-LO games reach 3 rewarded, the fourth says so
  const play = async () => {
    await page.click('[aria-label="PLAY"]'); await sleep(250);
    await page.keyboard.press('Enter'); await sleep(250); // HI-LO
    await page.keyboard.press('Enter'); await sleep(250); // start
    for (let r = 0; r < 5; r++) { await page.keyboard.press('Enter'); await sleep(1700); }
    await sleep(1700);
  };
  await play(); await play();
  ok((await store()).pet.rewardedPlays.length === 3, 'three plays rewarded today');
  await play();
  await shot('16-fourth-play-result');
  const last = await store();
  ok(last.pet.rewardedPlays.length === 3, 'the fourth play of the day is not rewarded');
  ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all end-to-end checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
