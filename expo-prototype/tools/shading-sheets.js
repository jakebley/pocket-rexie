#!/usr/bin/env node
/**
 * Shading contact sheets from the real scene renderer (tools/shading-dump.ts), composed as SVG like Toy.tsx and screenshotted with
 * playwright-core + chromium.
 *   node tools/shading-sheets.js <out.png> "<title>" species_a species_b ...   (one row per species: day, dusk, night, dark day, dark night)
 *   CROP=1 zooms on the pet (default: whole scene)    SIZE=176 cell size    CHROME=/path/to/chrome    DUMPCWD=dir (render another checkout)
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
const [outFile, title, ...ids] = process.argv.slice(2);
const tmp = path.join(os.tmpdir(), `shading-${process.pid}.json`);
execSync(`npx tsx tools/shading-dump.ts ${tmp} ${ids.join(' ')}`, { cwd: process.env.DUMPCWD || ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const SIZE = Number(process.env.SIZE || 176);
const VIEW = process.env.CROP ? [10, 22, 40, 40] : null; // the pet stands near x 14..46, y 26..58
function svg(c) {
  const f = c.frame, n = f.n, vb = VIEW ? VIEW.join(' ') : `0 0 ${n} ${n}`;
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="${vb}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const rows = ids.map((id) => {
    const cs = data.filter((d) => d.id === id && (!process.env.VARS || process.env.VARS.split(",").includes(d.label)));
    return `<div class="r"><b>${id}<br>${cs[0].stage}</b>${cs.map((c) => `<div class="c">${svg(c)}<i>${c.label}</i></div>`).join('')}</div>`;
  }).join('');
  await pg.setViewportSize({ width: 100 + (process.env.VARS ? process.env.VARS.split(",").length : 5) * (SIZE + 10), height: 400 });
  await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
    .r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:84px;overflow:hidden}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1>${rows}`);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  await pg.screenshot({ path: outFile, fullPage: true });
  console.log('wrote', outFile);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
