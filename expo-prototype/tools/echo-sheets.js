#!/usr/bin/env node
/**
 * ECHO contact sheets from the real renderer (tools/echo-dump.ts), composed as SVG like Toy.tsx FrameSvg and screenshotted with playwright-core + chromium.
 *   node tools/echo-sheets.js [outDir] [stage]  -> <outDir>/echo-technicolor-{1,2,3}.png, echo-traditional.png, echo-close-{technicolor,traditional}.png
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
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, '..', 'docs', 'screens');
const STAGE = process.argv[3] || 'adult';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const tmp = path.join(os.tmpdir(), `echo-${process.pid}.json`);
execSync(`npx tsx tools/echo-dump.ts ${tmp} ${STAGE}`, { cwd: ROOT, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
fs.unlinkSync(tmp);
const svg = (c, size) => {
  const f = c.frame, n = f.n;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${c.ground}"/>`
    + (f.soil ? `<rect y="${f.soil.y}" width="${n}" height="${n - f.soil.y}" fill="${f.soil.color}"/>` : '')
    + (f.sky ? `<rect width="${n}" height="${f.sky.h}" fill="${f.sky.color}"/>` : '')
    + f.groups.map((g) => `<path d="${g.d}" fill="${g.color}"/>`).join('') + '</svg>';
};
const ALL = ['dino', 'fox', 'fish', 'bird', 'cat', 'spirits', 'bunny', 'dragon', 'bot', 'slime', 'bug', 'alien'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const css = `<style>body{margin:0;background:#fff;font:12px ui-monospace,monospace;color:#111}h1{margin:8px 10px;font-size:15px}.r{display:flex;align-items:center;gap:8px;padding:4px 10px}.r>b{width:60px}.c{text-align:center}i{display:block;color:#666;font-style:normal}.g{display:flex;flex-wrap:wrap;gap:10px;padding:6px 10px}</style>`;
  const sheet = async (file, title, fams, mode, shots, size) => {
    const html = fams.map((f) => `<div class="r"><b>${f}</b>${shots.map((s) => `<div class="c">${svg(data.find((d) => d.fam === f && d.mode === mode && d.name === s), size)}<i>${s}</i></div>`).join('')}</div>`).join('');
    await pg.setViewportSize({ width: 90 + shots.length * (size + 10), height: 400 });
    await pg.setContent(`${css}<h1>${title}</h1>${html}`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  const close = async (file, title, mode, shot, size) => {
    const cells = ALL.map((f) => { const c = data.find((d) => d.fam === f && d.mode === mode && d.name === shot); return `<div class="c">${svg(c, size)}<i>${f} (${c.id})</i></div>`; }).join('');
    await pg.setViewportSize({ width: 6 * (size + 14) + 20, height: 400 });
    await pg.setContent(`${css}<h1>${title}</h1><div class="g">${cells}</div>`);
    await pg.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log('wrote', path.join(OUT, file));
  };
  const shots = ['ready', 'intro', 'show3', 'input3', 'ok', 'show5', 'oops', 'result'];
  for (let i = 0; i < 3; i++) await sheet(`echo-technicolor-${i + 1}.png`, `ECHO, Technicolor: ready, round banner, pet shows (3 pads), player answers, round cleared, 5 pads, mistake, result (${STAGE})`, ALL.slice(i * 4, i * 4 + 4), 'technicolor', shots, 140);
  await sheet('echo-traditional.png', `ECHO, Traditional (${STAGE})`, ['dino', 'fox', 'fish', 'bot'], 'traditional', shots, 140);
  await close('echo-show5-technicolor.png', `ECHO with 5 pads: the pet shows the pattern, Technicolor (${STAGE})`, 'technicolor', 'show5', 200);
  await close('echo-show3-technicolor.png', `ECHO with 3 pads: the pet shows the pattern, Technicolor (${STAGE})`, 'technicolor', 'show3', 200);
  await close('echo-input5-traditional.png', `ECHO answering with 5 pads, Traditional (${STAGE})`, 'traditional', 'input5', 200);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
