#!/usr/bin/env node
/**
 * Play screen contact sheets from the real renderer (renderScreen + buildFrame, via tools/play-dump.ts), composed as SVG
 * exactly like Toy.tsx FrameSvg and screenshotted with playwright-core + chromium.
 *   node tools/play-sheets.js [outDir] [stage]   -> <outDir>/play-technicolor-{1,2,3}.png, play-traditional.png
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
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'docs', 'screens');
const STAGE = process.argv[3] || 'adult';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const tmp = path.join(os.tmpdir(), `play-${process.pid}.json`);
execSync(`npx tsx tools/play-dump.ts ${tmp} ${STAGE}`, { cwd: ROOT, stdio: 'inherit' });
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
  const shots = ['menu', 'ready', 'game-a', 'game-b', 'over', 'result', 'scores'];
  const sheet = async (file, title, fams, mode, size) => {
    const html = fams.map((f) => `<div class="r"><b>${f}</b>${shots.map((s) => {
      const c = data.find((d) => d.fam === f && d.mode === mode && d.name === s);
      return `<div class="c">${svg(c, size)}<i>${s}</i></div>`;
    }).join('')}</div>`).join('');
    await pg.setViewportSize({ width: 90 + shots.length * (size + 10), height: 400 });
    await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
      .r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:60px}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1>${html}`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  const all = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
  for (let i = 0; i < 3; i++) await sheet(`play-technicolor-${i + 1}.png`, `Technicolor: Play menu, CATCH ready, two mid-game frames, time up, result, high scores (${STAGE})`, all.slice(i * 4, i * 4 + 4), 'technicolor', 150);
  // close-ups of one mid-game frame per family
  const close = async (file, title, mode, shot, size) => {
    const cells = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'].map((f) => {
      const c = data.find((d) => d.fam === f && d.mode === mode && d.name === shot);
      return `<div class="c">${svg(c, size)}<i>${f} (${c.id})</i></div>`;
    }).join('');
    await pg.setViewportSize({ width: 6 * (size + 14) + 20, height: 400 });
    await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}
      .g{display:flex;flex-wrap:wrap;gap:10px;padding:6px 10px}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style><h1>${title}</h1><div class="g">${cells}</div>`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  await close('play-catch-technicolor.png', `CATCH mid-game, Technicolor (${STAGE})`, 'technicolor', 'game-b', 200);
  await close('play-catch-traditional.png', `CATCH mid-game, Traditional (${STAGE})`, 'traditional', 'game-b', 200);
  await close('play-result-technicolor.png', `CATCH result, Technicolor (${STAGE})`, 'technicolor', 'result', 200);
  await sheet('play-traditional.png', `Traditional (${STAGE})`, ['dino', 'fox', 'fish', 'bot'], 'traditional', 150);
  await b.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
