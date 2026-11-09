#!/usr/bin/env node
/**
 * Biome contact sheets from the real scene renderer (renderScreen + buildFrame, via tools/biome-dump.ts), composed as SVG
 * exactly like Toy.tsx FrameSvg and screenshotted with playwright-core + chromium.
 *   node tools/biome-sheets.js        -> docs/screens/biomes-light-{1,2,3}.png, biomes-dark.png, biomes-traditional.png
 *   CHROME=/path/to/chrome            (default /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
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
const OUT = path.join(ROOT, 'docs', 'screens');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const tmp = path.join(os.tmpdir(), `biomes-${process.pid}.json`);
execSync(`npx tsx tools/biome-dump.ts ${tmp}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);

function svg(c, size) {
  const f = c.frame, n = f.n;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const sheet = async (file, title, rows, cols, size) => {
    // rows: [{label, cells:[{c, label}]}]
    const html = rows.map((r) => `<div class="r"><b>${r.label}</b>${r.cells.map(({ c, label }) => `<div class="c">${svg(c, size)}<i>${label}</i></div>`).join('')}</div>`).join('');
    await pg.setViewportSize({ width: 100 + cols * (size + 10), height: 400 });
    await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
      .r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:70px}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1>${html}`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', file);
  };
  const pick = (fam, mode, dark, ph) => data.find((d) => d.fam === fam && d.mode === mode && d.dark === dark && d.ph === ph);
  const lightGroups = [['dino', 'fox', 'fish', 'bird'], ['cat', 'spirits', 'ember', 'bunny'], ['dragon', 'bot', 'slime', 'bug'], ['alien']];
  for (let i = 0; i < lightGroups.length; i++) {
    await sheet(`biomes-light-${i + 1}.png`, 'Technicolor, light appearance: day, dusk, night, rain (one adult per family)',
      lightGroups[i].map((f) => ({ label: f, cells: ['day', 'dusk', 'night', 'rain'].map((ph) => ({ c: pick(f, 'technicolor', false, ph), label: `${pick(f, 'technicolor', false, ph).id.replace(/^.*?_/, '')} ${ph}` })) })), 4, 192);
  }
  const all = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'ember', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
  await sheet('biomes-dark.png', 'Technicolor, dark appearance: day, night, rain', all.map((f) => ({ label: f, cells: ['day', 'night', 'rain'].map((ph) => ({ c: pick(f, 'technicolor', true, ph), label: ph })) })), 3, 128);
  await sheet('biomes-traditional.png', 'Traditional mode, day and night (fox, fish and dino: the background stays the plain scene)',
    ['dino', 'fox', 'fish', 'bunny', 'dragon'].map((f) => ({ label: f, cells: ['day', 'night'].map((ph) => ({ c: pick(f, 'traditional', false, ph), label: `traditional ${ph}` })) })), 2, 192);
  await b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
