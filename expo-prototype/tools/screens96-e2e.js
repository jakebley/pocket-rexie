#!/usr/bin/env node
/**
 * Real Expo web build, Technicolor: screenshots of the native 96 text screens (feed, play menu, stats pages, Dex) and a check that the
 * painted selection bar sits inside the tap row (logic units) the page exposes for it.
 *   npx expo export --platform web --output-dir /tmp/webdist && python3 -m http.server 8123 -d /tmp/webdist &
 *   node tools/screens96-e2e.js http://localhost:8123 /tmp/out [species]
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
const OUT = path.resolve(process.argv[3] || '/tmp/screens96-e2e');
const SPECIES = process.argv[4] || 'chomper';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });
const petJson = execSync(`npx tsx -e "import { forceSpecies, newPet } from './src/core/pet'; import { SPECIES } from './src/core/speciesData'; const p = newPet(0, { seed: 12345 }); forceSpecies(p, '${SPECIES}'); p.named = true; p.name = 'Rexie'; p.hunger = 3; p.happy = 2; p.dex = SPECIES.filter((s, i) => s.family === p.family && i % 2 === 0).map((s) => s.id).concat(p.dex); p.legacy = ['Old Pal the Pip: 2d, starved', 'Rex the Rawr: 5d, old age']; console.log(JSON.stringify(p));"`, { cwd: path.resolve(__dirname, '..') }).toString().trim();
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
  await page.addInitScript(([pj]) => {
    if (localStorage.getItem('seeded')) return;
    const now = Date.now(); const p = JSON.parse(pj);
    p.birth = now - 3 * 86400000; p.lastTick = now; p.modified = now;
    localStorage.setItem('pocket-rexie-v1', JSON.stringify({ pet: p, offset: 0 }));
    localStorage.setItem('seeded', '1');
    localStorage.setItem('pocket-rexie-colormode-v1', 'technicolor');
  }, [petJson]);
  await page.goto(URL);
  await page.waitForSelector('[aria-label="FEED"]', { timeout: 20000 });
  await sleep(900);
  const lcdBox = () => page.evaluate(() => {
    const svg = [...document.querySelectorAll('svg')].find((v) => /^0 0 (64|96) (64|96)$/.test(v.getAttribute('viewBox') || ''));
    const r = svg.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height, vb: svg.getAttribute('viewBox') };
  });
  const shot = async (n) => { const bx = await lcdBox(); await page.screenshot({ path: path.join(OUT, `${n}.png`), clip: { x: bx.x - 4, y: bx.y - 4, width: bx.width + 8, height: bx.height + 8 } }); };
  // the vertical band of the painted selection bar, read from the rendered svg (the lit cells of column 93, which only the bar reaches)
  const barBand = () => page.evaluate(() => {
    const svg = [...document.querySelectorAll('svg')].find((v) => v.getAttribute('viewBox') === '0 0 96 96');
    if (!svg) return null;
    const r = svg.getBoundingClientRect(); const cell = r.width / 96;
    const ys = [];
    for (const p of svg.querySelectorAll('path')) {
      if (p.getAttribute('opacity')) continue; // the faint LCD cell grid
      const d = p.getAttribute('d') || '';
      const re = /M(\d+)\.06 (\d+)\.06/g; let m;
      while ((m = re.exec(d))) if (Number(m[1]) === 93) ys.push(Number(m[2]));
    }
    if (!ys.length) return null;
    return { top: r.top + Math.min(...ys) * cell, bottom: r.top + (Math.max(...ys) + 1) * cell };
  });
  const rowBoxes = async (sel) => { const out = []; for (const el of await page.$$(sel)) out.push(await el.boundingBox()); return out; };
  await page.screenshot({ path: path.join(OUT, '00-home.png') });
  ok((await lcdBox()).vb === '0 0 96 96', 'Technicolor LCD is 96x96');

  // play menu: A moves the selection, the bar must sit inside the matching tap row
  await page.click('[aria-label="PLAY"]'); await sleep(500);
  await shot('01-play-menu');
  for (let k = 0; k < 5; k++) {
    const band = await barBand();
    const rows = await rowBoxes('[aria-label^="Play menu row"]');
    const inside = band && rows.some((r) => band.top >= r.y - 2 && band.bottom <= r.y + r.height + 2 && Math.abs((band.top + band.bottom) / 2 - (r.y + r.height / 2)) < r.height * 0.4);
    ok(!!inside, `play menu selection ${k}: bar ${band && band.top.toFixed(0)}..${band && band.bottom.toFixed(0)} inside a tap row (${rows.length} rows)`);
    if (k === 1) await shot('02-play-menu-sel2');
    await page.click('[aria-label="Button A"]'); await sleep(250);
  }
  await shot('03-play-menu-bottom');
  // tap row 1: that game opens its ready screen
  const rows = await rowBoxes('[aria-label^="Play menu row"]');
  await page.mouse.click(rows[1].x + rows[1].width / 2, rows[1].y + rows[1].height / 2); await sleep(600);
  await shot('04-ready');
  await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
  // feed menu
  await page.click('[aria-label="FEED"]'); await sleep(500);
  await shot('05-feed');
  await page.click('[aria-label="Button A"]'); await sleep(300);
  await shot('06-feed-sel');
  await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
  // stats pages
  await page.click('[aria-label="STATS"]'); await sleep(500);
  await shot('07-stats-care');
  // tapping the LCD turns the page; after the last stats page it opens the Dex
  for (const n of ['08-stats-growth', '09-stats-legacy', '10-dex', '11-dex-p2', '12-dex-p3']) { await page.click('[aria-label="Scene"]'); await sleep(400); await shot(n); }
  ok(errors.length === 0, `no page errors ${errors.slice(0, 2).join(' | ')}`);
  await b.close();
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
