#!/usr/bin/env node
/**
 * Technicolor contact sheets rendered with the REAL Expo scene renderer.
 *
 * For every family (or the ones named on the command line) it drives the Expo web build with
 * playwright-core, forces each species through the Dev Panel (daytime, clear weather, light
 * appearance, technicolor mode), screenshots the LCD scene and lays the shots out in a labelled
 * 10-column sheet: docs/screens/technicolor-<family>.png, plus technicolor-all.png (index of
 * every species, small, grouped by family).
 *
 *   npm run contact-sheet                 # all 11 families + index
 *   npm run contact-sheet -- bird cat     # only some families (no index)
 *   CHROME=/path/to/chrome   chromium binary (default /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
 *   SHEET_URL=http://localhost:8081      use a running web build instead of exporting + serving one
 *   SHEET_COLS=10                        columns per family sheet
 *
 * Needs playwright-core (resolved from this package or /tmp/pwtest/node_modules) and tsx.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

function load(name) {
  for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } }
  throw new Error(`${name} not found: npm i --no-save ${name}`);
}
const { chromium } = load('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screens');
const FAMILIES = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug'];
const STAGES = ['baby', 'child', 'teen', 'adult', 'ultimate'];
const COLS = +(process.env.SHEET_COLS || 10);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function loadSpecies() {
  const tmp = path.join(os.tmpdir(), `species-${process.pid}.json`);
  const script = path.join(ROOT, `.dump-species-${process.pid}.ts`);
  fs.writeFileSync(script, `import { SPECIES } from './src/core/speciesData';
import { writeFileSync } from 'fs';
writeFileSync(${JSON.stringify(tmp)}, JSON.stringify(SPECIES.map(({ id, name, stage, family, line, bodyHex }) => ({ id, name, stage, family, line, bodyHex }))));`);
  try { execSync(`npx tsx ${script}`, { cwd: ROOT, stdio: 'inherit' }); } finally { fs.unlinkSync(script); }
  return JSON.parse(fs.readFileSync(tmp, 'utf8'));
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.css': 'text/css' };
  const srv = http.createServer((req, res) => {
    let f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
    res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function main() {
  const want = process.argv.slice(2).filter((a) => FAMILIES.includes(a));
  const families = want.length ? want : FAMILIES;
  const species = loadSpecies();
  fs.mkdirSync(OUT, { recursive: true });

  let url = process.env.SHEET_URL, srv;
  if (!url) {
    const dist = path.join(os.tmpdir(), `sheet-dist-${process.pid}`);
    execSync(`npx expo export --platform web --output-dir ${dist}`, { cwd: ROOT, stdio: 'inherit' });
    srv = await serve(dist);
    url = `http://127.0.0.1:${srv.address().port}`;
  }

  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e)));
  const click = async (l, w = 120) => { await pg.getByLabel(l, { exact: true }).first().click(); await pg.waitForTimeout(w); };
  const dev = async () => { await click('Settings'); await click('DEVELOPER TOOLS'); };

  await pg.goto(url); await pg.waitForTimeout(1000);
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('pocket-rexie-colormode-v1', 'technicolor'); localStorage.setItem('pocket-rexie-previewplus-v1', '1'); });
  await pg.goto(url); await pg.waitForTimeout(1500);
  if (await pg.getByLabel('Dinos egg', { exact: true }).count()) await click('Dinos egg', 400);   // first-run picker
  await dev(); await click('Skip +1 hour'); await click('CLOSE'); await click('OK');   // hatch
  await dev(); await click('To 9:00 (wake up)'); await click('Day 12');
  // Rain cycles auto -> ON -> off; we want clear weather
  for (let i = 0; i < 3 && !(await pg.getByLabel('Rain: off', { exact: true }).count()); i++) {
    await pg.getByLabel(/^Rain: /).first().click(); await pg.waitForTimeout(150);
  }
  await click('CLOSE');

  // Dev Panel "Force species" lists SPECIES grouped by stage, in file order; names can repeat across families
  const forceOrder = STAGES.flatMap((st) => species.filter((s) => s.stage === st));
  const shots = {};
  for (const fam of families) {
    const list = species.filter((s) => s.family === fam).sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
    shots[fam] = [];
    for (const sp of list) {
      const nth = forceOrder.slice(0, forceOrder.findIndex((s) => s.id === sp.id)).filter((s) => s.name === sp.name).length;
      await dev();
      const force = pg.locator('xpath=//*[normalize-space(text())="Force species"]/following::*[@aria-label]');
      const labels = await force.evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
      const hit = labels.map((l, i) => [l, i]).filter(([l]) => l === sp.name)[nth];
      if (!hit) throw new Error('no Force species button for ' + sp.id);
      await force.nth(hit[1]).click(); await pg.waitForTimeout(80);
      await click('CLOSE', 60);
      await pg.waitForTimeout(2900);   // let the evolve flash/animation finish
      const clip = await pg.getByLabel('Scene').first().boundingBox();
      shots[fam].push({ sp, png: (await pg.screenshot({ clip })).toString('base64') });
    }
    console.log(fam, shots[fam].length);
  }

  // compose sheets in a plain page
  const sp = await ctx.newPage();
  const sheet = async (title, items, file, cols, cell, label) => {
    const cells = items.map(({ sp: s, png }) => `<div class="c"><img src="data:image/png;base64,${png}">${label
      ? `<b>${s.name}</b><i>${s.stage}</i><u><span style="background:${s.bodyHex || '#888'}"></span>${s.bodyHex || s.line}</u>` : ''}</div>`).join('');
    await sp.setViewportSize({ width: cols * (cell + 8) + 20, height: 400 });
    await sp.setContent(`<style>body{margin:0;background:#fff;font:11px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:16px}
      .g{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:8px;padding:8px 10px}.c{text-align:center;width:${cell}px}
      img{display:block;width:${cell}px;image-rendering:pixelated;border:1px solid #aaa;box-sizing:border-box}b{display:block;margin-top:2px}i{display:block;color:#666}u{text-decoration:none;display:block}
      span{display:inline-block;width:10px;height:10px;border:1px solid #000;margin-right:3px;vertical-align:middle}</style>
      <h1>${title}</h1><div class="g">${cells}</div>`);
    await sp.waitForTimeout(300);
    await sp.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  for (const fam of families) await sheet(`Technicolor, light, day, clear: ${fam} (${shots[fam].length} species; name, stage, bodyHex)`, shots[fam], `technicolor-${fam}.png`, COLS, 150, true);
  if (families.length > 1) {
    const all = families.flatMap((f) => shots[f]);
    await sheet(`Technicolor, all ${all.length} species by family (${families.join(', ')}); rows follow the family order`, all, 'technicolor-all.png', 40, 44, false);
  }
  console.log('page errors', errs.slice(0, 5));
  await b.close(); if (srv) srv.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
