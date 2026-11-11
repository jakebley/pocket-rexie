#!/usr/bin/env node
/**
 * Technicolor 96x96 mini-game sheets from the real renderer (play-dump / dash-dump / echo-dump + buildFrame), one family per row, at 2x.
 *   node tools/games96-sheets.js <catch|dash|echo|hilo> [outDir] [fam,fam,...] [size]
 *   -> <outDir>/games96-<game>-<n>.png (three families per image; the first-listed shots per game, see SHOTS)
 */
/* global __dirname */
const fs = require('fs'), os = require('os'), path = require('path');
const { execSync } = require('child_process');
function load(name) { for (const p of [name, path.join('/tmp/pwtest/node_modules', name)]) { try { return require(p); } catch { /* next */ } } throw new Error(`${name} not found`); }
const { chromium } = load('playwright-core');
const ROOT = path.resolve(__dirname, '..');
const GAME = process.argv[2] || 'catch';
const OUT = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, '..', 'docs', 'screens');
const ALL = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
const FAMS = process.argv[4] ? process.argv[4].split(',') : ALL;
const SIZE = Number(process.argv[5] || 192);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const DUMP = { catch: 'play-dump.ts', hilo: 'play-dump.ts', dash: 'dash-dump.ts', echo: 'echo-dump.ts' }[GAME];
const SHOTS = {
  catch: ['game-a', 'game-b', 'over'],
  hilo: ['hilo-guess', 'hilo-reveal'],
  dash: ['count', 'go', 'jump', 'item', 'hit', 'fast', 'over'],
  echo: ['intro', 'show3', 'input3', 'ok', 'show5', 'input5', 'oops', 'over'],
}[GAME];
const tmp = path.join(os.tmpdir(), `g96-${process.pid}.json`);
execSync(`npx tsx tools/${DUMP} ${tmp} ${process.env.STAGE || 'adult'}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
function svg(c, size) {
  const f = c.frame, n = f.n;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  for (let i = 0; i * 3 < FAMS.length; i++) {
    const html = FAMS.slice(i * 3, i * 3 + 3).map((f) => `<div class="r"><b>${f}</b>${SHOTS.map((s) => {
      const c = data.find((d) => d.fam === f && d.mode === 'technicolor' && d.name === s);
      return c ? `<div class="c">${svg(c, SIZE)}<i>${s}</i></div>` : `<div class="c"><i>${s}: missing</i></div>`;
    }).join('')}</div>`).join('');
    await pg.setViewportSize({ width: 80 + SHOTS.length * (SIZE + 10), height: 400 });
    await pg.setContent(`<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}.r{display:flex;align-items:center;gap:6px;padding:3px 8px}.r>b{width:56px}.c{text-align:center}i{display:block;color:#666;font-style:normal}</style>${html}`);
    const file = path.join(OUT, `games96-${GAME}-${i + 1}.png`);
    await pg.screenshot({ path: file, fullPage: true });
    console.log('wrote', file);
  }
  await b.close();
})();
