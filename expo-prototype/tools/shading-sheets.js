#!/usr/bin/env node
/**
 * Shading contact sheets from the real scene renderer (tools/shading-dump.ts), composed as SVG like Toy.tsx and screenshotted with
 * playwright-core + chromium.
 *   node tools/shading-sheets.js <out.png> "<title>" species_a species_b ...   (one row per species: day, dusk, night, dark day, dark night)
 * env: CROP=1 zoom on the pet (default: whole scene)   SIZE=176 cell size   VARS="day,night" which variants   CHROME=/path/to/chrome
 *      BEFORE=<dir of another checkout's expo-prototype, with tools/shading-dump.ts copied in>  -> each variant shows before | after
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
function dump(cwd) {
  const tmp = path.join(os.tmpdir(), `shading-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  execSync(`npx tsx tools/${process.env.DUMP || "shading-dump.ts"} ${tmp} ${ids.join(' ')}`, { cwd, stdio: 'inherit' });
  const d = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.unlinkSync(tmp);
  return d;
}
const after = dump(ROOT);
const before = process.env.BEFORE ? dump(process.env.BEFORE) : null;
const SIZE = Number(process.env.SIZE || 176);
const VARS = process.env.VARS ? process.env.VARS.split(',') : null;
const VIEW = process.env.CROP ? [10, 22, 40, 40] : null; // the pet stands near x 14..46, y 26..58 (64 grid; frames at 96 are scaled by 1.5)
function svg(c) {
  const f = c.frame, n = f.n, vb = VIEW ? VIEW.map((v) => v * n / 64).join(' ') : `0 0 ${n} ${n}`;
  return `<svg width="${SIZE}" height="${SIZE}" viewBox="${vb}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const pick = (data, id) => data.filter((d) => d.id === id && (!VARS || VARS.includes(d.label)));
  const rows = ids.map((id) => {
    const cs = pick(after, id), bs = before ? pick(before, id) : null;
    const cells = cs.map((c, i) => (bs ? `<div class="c">${svg(bs[i])}<i>${c.label} before</i></div>` : '') + `<div class="c">${svg(c)}<i>${c.label}${bs ? ' after' : ''}</i></div>`).join('');
    return `<div class="r"><b>${id}<br>${cs[0].stage}</b>${cells}</div>`;
  }).join('');
  const cols = (VARS ? VARS.length : new Set(after.filter((d) => d.id === ids[0]).map((d) => d.label)).size) * (before ? 2 : 1);
  await pg.setViewportSize({ width: 100 + cols * (SIZE + 10), height: 400 });
  await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
    .r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:84px;overflow:hidden}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1>${rows}`);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  await pg.screenshot({ path: outFile, fullPage: true });
  console.log('wrote', outFile);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
