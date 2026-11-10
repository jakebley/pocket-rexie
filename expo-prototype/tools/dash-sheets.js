#!/usr/bin/env node
/**
 * DASH contact sheets from the real renderer (tools/dash-dump.ts), composed as SVG like tools/play-sheets.js and screenshotted with playwright-core.
 *   node tools/dash-sheets.js [outDir] [stage]  -> <outDir>/play-dash-technicolor.png, play-dash-traditional.png, play-dash-frames-{1,2,3}.png
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
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'docs', 'screens');
const STAGE = process.argv[3] || 'adult';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const tmp = path.join(os.tmpdir(), `dash-${process.pid}.json`);
execSync(`npx tsx tools/dash-dump.ts ${tmp} ${STAGE}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const ALL = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];

function svg(c, size) {
  const f = c.frame, n = f.n;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}
const CSS = `<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
  .r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:60px}.c{text-align:center}i{display:block;color:#666;font-style:normal}
  .g{display:flex;flex-wrap:wrap;gap:10px;padding:6px 10px}</style>`;
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const find = (f, mode, name) => data.find((d) => d.fam === f && d.mode === mode && d.name === name);
  const shoot = async (file, title, html, w) => {
    await pg.setViewportSize({ width: w, height: 400 });
    await pg.setContent(`${CSS}<h1>${title}</h1>${html}`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  // one jump frame per family, both modes: the close-up sheets
  for (const mode of ['technicolor', 'traditional']) {
    const cells = ALL.map((f) => { const c = find(f, mode, 'jump'); return `<div class="c">${svg(c, 200)}<i>${f} (${c.id})</i></div>`; }).join('');
    await shoot(`play-dash-${mode}.png`, `DASH mid-jump, ${mode} (${STAGE})`, `<div class="g">${cells}</div>`, 6 * 214 + 20);
  }
  // the moments of one run, per family
  const shots = ['ready', 'count', 'go', 'jump', 'item', 'hit', 'fast', 'over', 'result'];
  const BIG = ['dino', 'fish', 'bird', 'bot', 'dragon', 'alien'];
  await shoot('play-dash-closeup.png', `DASH close-ups: GO, mid-jump, hit, late (${STAGE})`, BIG.map((f) => `<div class="r"><b>${f}</b>${['go', 'jump', 'hit', 'fast'].map((s) => { const c = find(f, 'technicolor', s); return `<div class="c">${svg(c, 250)}<i>${s}</i></div>`; }).join('')}</div>`).join(''), 1200);
  for (let i = 0; i < 3; i++) {
    const rows = ALL.slice(i * 4, i * 4 + 4).map((f) => `<div class="r"><b>${f}</b>${shots.map((s) => { const c = find(f, 'technicolor', s); return c ? `<div class="c">${svg(c, 120)}<i>${s}</i></div>` : ''; }).join('')}</div>`).join('');
    await shoot(`play-dash-frames-${i + 1}.png`, `DASH moments, Technicolor (${STAGE})`, rows, 90 + shots.length * 130);
  }
  const rows = ['dino', 'fish', 'bot', 'space' === 'x' ? '' : 'alien'].map((f) => `<div class="r"><b>${f}</b>${shots.map((s) => { const c = find(f, 'traditional', s); return c ? `<div class="c">${svg(c, 120)}<i>${s}</i></div>` : ''; }).join('')}</div>`).join('');
  await shoot('play-dash-frames-traditional.png', `DASH moments, Traditional (${STAGE})`, rows, 90 + shots.length * 130);
  await b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
