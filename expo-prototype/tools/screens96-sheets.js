#!/usr/bin/env node
/**
 * Contact sheets of the Technicolor text screens: one row per "family:screen", old (3/2 upscale) next to new (native 96).
 *   node tools/screens96-sheets.js <out.png> "<title>" fox:feed fox:stats-care ...      env: SIZE=288  OLD=0 (new only)  DARK=1  CHROME=...
 */
/* global __dirname */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
function load(name) {
  for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } }
  throw new Error(`${name} not found: npm i --no-save ${name}`);
}
const { chromium } = load('playwright-core');
const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [outFile, title, ...specs] = process.argv.slice(2);
const tmp = path.join(os.tmpdir(), `screens96-${process.pid}.json`);
execSync(`npx tsx tools/screens96-dump.ts ${tmp} ${specs.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const SIZE = Number(process.env.SIZE || 288);
const COLS = Number(process.env.COLS || 0);
function svg(c) {
  const f = c.frame, n = f.n;
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const cells = data.map((c) => `<div class="c">${svg(c)}<i>${c.id} ${c.label}</i></div>`).join('');
  const per = COLS || (process.env.OLD === '0' ? 4 : 4);
  await pg.setViewportSize({ width: 20 + per * (SIZE + 12), height: 400 });
  await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
    .g{display:flex;flex-wrap:wrap;gap:8px 12px;padding:4px 10px}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1><div class="g">${cells}</div>`);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  await pg.screenshot({ path: outFile, fullPage: true });
  console.log('wrote', outFile);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
