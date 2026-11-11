#!/usr/bin/env node
/**
 * Real Expo web build, both looks: screenshots of home, feed menu, stats and Dex, plus a tap on the ground.
 *   npx expo export --platform web --output-dir /tmp/webdist && python3 -m http.server 8123 -d /tmp/webdist &
 *   node tools/res96-e2e.js http://localhost:8123 /tmp/out [species]
 * Checks the LCD svg has the grid of the look (64 Traditional, 96 Technicolor) and that the page logs no errors.
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function load(name) {
  for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } }
  throw new Error(`${name} not found`);
}
const { chromium } = load('playwright-core');
const URL = process.argv[2] || 'http://localhost:8123';
const OUT = path.resolve(process.argv[3] || '/tmp/res96-e2e');
const SPECIES = process.argv[4] || 'chomper';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });
const petJson = execSync(`npx tsx -e "import { forceSpecies, newPet } from './src/core/pet'; const p = newPet(0, { seed: 12345 }); forceSpecies(p, '${SPECIES}'); p.named = true; p.name = 'Rexie'; p.hunger = 3; p.happy = 2; console.log(JSON.stringify(p));"`, { cwd: path.resolve(__dirname, '..') }).toString().trim();
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  for (const mode of ['traditional', 'technicolor']) {
    const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(([pj, md]) => {
      if (localStorage.getItem('seeded')) return;
      const now = Date.now(); const p = JSON.parse(pj);
      p.birth = now - 3 * 86400000; p.lastTick = now; p.modified = now;
      localStorage.setItem('pocket-rexie-v1', JSON.stringify({ pet: p, offset: 0 }));
      localStorage.setItem('seeded', '1');
      if (md === 'technicolor') localStorage.setItem('pocket-rexie-colormode-v1', 'technicolor');
    }, [petJson, mode]);
    await page.goto(URL);
    await page.waitForSelector('[aria-label="FEED"]', { timeout: 20000 });
    await sleep(900);
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${mode}-${n}.png`) });
    const grid = () => page.evaluate(() => { const s = [...document.querySelectorAll('svg')].find((v) => /^0 0 (64|96) (64|96)$/.test(v.getAttribute('viewBox') || '')); return s ? s.getAttribute('viewBox') : null; });
    await shot('01-home');
    const vb = await grid();
    ok(vb === (mode === 'technicolor' ? '0 0 96 96' : '0 0 64 64'), `${mode}: LCD viewBox ${vb}`);
    const sc = await page.$('[aria-label="Scene"]');
    const box = await sc.boundingBox();
    await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.93);
    await sleep(1800);
    await shot('02-after-ground-tap');
    // FEED icon then B opens the menu
    await page.click('[aria-label="FEED"]'); await sleep(500);
    await shot('03-feed-menu');
    await page.click('[aria-label="Button A"]'); await sleep(300);
    await shot('03b-feed-menu-sel');
    await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
    await page.click('[aria-label="STATS"]'); await sleep(200);
    await page.click('[aria-label="Button B"]'); await sleep(500);
    await shot('04-stats');
    await page.click('[aria-label="Button C"]'); await sleep(400);
    await shot('04b-stats2');
    await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
    await page.click('[aria-label="Button A"]'); await sleep(500);
    await shot('05-dex');
    ok(errors.length === 0, `${mode}: no page errors ${errors.slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
