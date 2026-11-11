#!/usr/bin/env node
/**
 * Interface chrome renders from the real Expo web build, both looks, two phone sizes + landscape:
 *   npx expo export --platform web --output-dir /tmp/webdist96 && python3 -m http.server 8124 -d /tmp/webdist96 &
 *   node tools/chrome96-e2e.js http://localhost:8124 /tmp/chrome96 [species] [dpr]
 * Screens: home, feed menu, stats, Dex, settings, egg chooser, name prompt, play menu, dev panel, plus close-up crops of the icon rows and A/B/C buttons.
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
const URL = process.argv[2] || 'http://localhost:8124';
const OUT = path.resolve(process.argv[3] || '/tmp/chrome96');
const SPECIES = process.argv[4] || 'chomper';
const DPR = Number(process.argv[5] || 3);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });
const petJson = (named, name) => execSync(`npx tsx -e "import { forceSpecies, newPet } from './src/core/pet'; const p = newPet(0, { seed: 12345 }); forceSpecies(p, '${SPECIES}'); p.named = ${named}; p.name = '${name}'; p.hunger = 3; p.happy = 2; console.log(JSON.stringify(p));"`, { cwd: path.resolve(__dirname, '..') }).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++; };
const SIZES = [['390x844', 390, 844], ['375x667', 375, 667], ['844x390', 844, 390]];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  for (const [sz, w, h] of SIZES) for (const mode of ['traditional', 'technicolor']) {
    // scenarios: normal pet (long name for one), unnamed pet (name prompt), no pet (egg chooser)
    for (const scen of ['pet', 'longname', 'name', 'egg']) {
      if (sz === '844x390' && scen !== 'pet') continue;
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      const pj = scen === 'name' ? petJson(false, 'Rexie') : scen === 'egg' ? null : petJson(true, scen === 'longname' ? 'Wonderbolt' : 'Rexie');
      await page.addInitScript(([pjs, md]) => {
        if (localStorage.getItem('seeded')) return;
        if (pjs) { const now = Date.now(); const p = JSON.parse(pjs); p.birth = now - 3 * 86400000; p.lastTick = now; p.modified = now; localStorage.setItem('pocket-rexie-v1', JSON.stringify({ pet: p, offset: 0 })); }
        localStorage.setItem('seeded', '1');
        if (md === 'technicolor') localStorage.setItem('pocket-rexie-colormode-v1', 'technicolor');
      }, [pj, mode]);
      await page.goto(URL);
      const tag = `${mode}-${sz}`;
      const shot = (n) => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
      if (scen === 'name') { await sleep(1500); await shot('07-name-prompt'); ok(errors.length === 0, `${tag} name: no errors ${errors[0] ?? ''}`); await ctx.close(); continue; }
      if (scen === 'egg') { await sleep(1500); await shot('06-egg-chooser'); ok(errors.length === 0, `${tag} egg: no errors ${errors[0] ?? ''}`); await ctx.close(); continue; }
      await page.waitForSelector('[aria-label="FEED"]', { timeout: 20000 });
      await sleep(900);
      if (scen === 'longname') {
        await shot('01b-home-longname');
        ok(errors.length === 0, `${tag} longname: no errors`);
        await ctx.close(); continue;
      }
      await shot('01-home');
      // close-ups: icon row and buttons
      const clipOf = async (sel, pad = 6) => { const bx = await (await page.$(sel)).boundingBox(); return { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.width + 2 * pad, height: bx.height + 2 * pad }; };
      const fb = await (await page.$('[aria-label="FEED"]')).boundingBox();
      const sb = await (await page.$('[aria-label="STATS"]')).boundingBox();
      await page.screenshot({ path: path.join(OUT, `${tag}-10-iconrow-crop.png`), clip: { x: 0, y: fb.y - 4, width: w, height: fb.height + 8 } });
      await page.screenshot({ path: path.join(OUT, `${tag}-11-iconrow2-crop.png`), clip: { x: 0, y: sb.y - 4, width: w, height: sb.height + 8 } });
      const ba = await clipOf('[aria-label="Button A"]', 4), bc = await clipOf('[aria-label="Button C"]', 4);
      await page.screenshot({ path: path.join(OUT, `${tag}-12-buttons-crop.png`), clip: { x: ba.x, y: ba.y, width: bc.x + bc.width - ba.x, height: ba.height } });
      // touch targets
      for (const sel of ['[aria-label="Button A"]', '[aria-label="Button B"]', '[aria-label="Button C"]', '[aria-label="Settings"]', '[aria-label="FEED"]', '[aria-label="MEDICINE"]']) {
        const bx = await (await page.$(sel)).boundingBox();
        ok(bx.width >= 44 && bx.height >= 44, `${tag} ${sel} is ${bx.width.toFixed(0)}x${bx.height.toFixed(0)} (>=44)`);
      }
      // feed menu
      await page.click('[aria-label="FEED"]'); await sleep(500); await shot('02-feed-menu');
      await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
      await page.click('[aria-label="STATS"]'); await sleep(200); await page.click('[aria-label="Button B"]'); await sleep(500); await shot('03-stats');
      await page.reload(); await page.waitForSelector('[aria-label="STATS"]'); await sleep(600);
      await page.click('[aria-label="Button A"]'); await sleep(500); await shot('04-dex');
      await page.reload(); await page.waitForSelector('[aria-label="PLAY"]'); await sleep(600);
      await page.click('[aria-label="PLAY"]'); await sleep(200); await page.click('[aria-label="Button B"]'); await sleep(500); await shot('05-play-menu');
      await page.reload(); await page.waitForSelector('[aria-label="Settings"]'); await sleep(600);
      await page.click('[aria-label="Settings"]'); await sleep(600); await shot('08-settings');
      await page.click('[aria-label="DEVELOPER TOOLS"]'); await sleep(600); await shot('09-dev-panel');
      ok(errors.length === 0, `${tag}: no page errors ${errors.slice(0, 2).join(' | ')}`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
