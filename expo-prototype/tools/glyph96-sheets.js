#!/usr/bin/env node
/**
 * 10x10 mini-game glyph sheets (themes96.ts), one row per family: good, bonus, bad, obstacles, symbols. Plain tone colours (the games draw them through the layer palette).
 *   node tools/glyph96-sheets.js [outDir]   -> <outDir>/games96-glyphs-{1,2,3}.png
 */
/* global __dirname */
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
function load(name) { for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } } throw new Error(`${name} not found`); }
const { chromium } = load('playwright-core');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, '..', 'docs', 'screens');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const tmp = path.join(os.tmpdir(), `glyph96-${process.pid}.json`);
execSync(`npx tsx tools/glyph96-dump.ts ${tmp}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const TONE = { red: '#d33', rust: '#a4452c', orange: '#f08a1c', yellow: '#f2d23c', gold: '#e8b21a', green: '#3a9a3a', pink: '#f08ab4', blue: '#3a6ad8', ice: '#bfe8ff', cyan: '#33c8d8', brown: '#8a5a2c', dbrown: '#5a3a1c', purple: '#8a4ac8', white: '#f4f4f4', grey: '#8a8f99', ink: '#222' };
function svg(gl, k) {
  const main = TONE[gl.main], acc = TONE[gl.acc || gl.main];
  let r = '';
  gl.rows.forEach((row, y) => [...row].forEach((c, x) => {
    const col = c === '#' ? main : c === 'a' ? acc : c === 'o' ? '#1b1b2a' : c === 'w' ? '#fff' : null;
    if (col) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
  }));
  return `<svg width="${10 * k}" height="${10 * k}" viewBox="0 0 10 10" shape-rendering="crispEdges" style="background:#b8dca0;margin:2px">${r}</svg>`;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  for (let i = 0; i < 3; i++) {
    const fams = data.slice(i * 4, i * 4 + 4);
    const html = fams.map((f) => `<div class="r"><b>${f.family}</b>${f.groups.map((grp) => `<span class="g">${grp.map((gl) => svg(gl, 6)).join('')}</span>`).join('')}</div>`).join('');
    await pg.setViewportSize({ width: 1500, height: 300 });
    await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace}.r{display:flex;align-items:center;padding:6px 10px;gap:14px}.r>b{width:60px}.g{display:flex;gap:2px;padding:2px;border:1px solid #ccc}</style>${html}`);
    const file = path.join(OUT, `games96-glyphs-${i + 1}.png`);
    await pg.screenshot({ path: file, fullPage: true });
    console.log('wrote', file);
  }
  await b.close();
})();
