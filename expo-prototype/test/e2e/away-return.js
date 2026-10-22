const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  const out = './docs/screens/';
  await pg.clock.install({ time: new Date('2026-10-22T13:00:00Z') });
  await pg.goto('http://localhost:8097/index.html');
  await pg.clock.runFor(2000);
  await pg.clock.runFor(11 * 60 * 1000);          // egg hatches
  await pg.mouse.click(195, 478);                 // name prompt OK
  await pg.clock.runFor(6000);                    // let the greeting message expire
  await pg.screenshot({ path: out + 'away-1-before.png' });
  const hide = () => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); };
  const show = () => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); };
  await pg.evaluate(hide);
  await pg.clock.fastForward(2.5 * 3600 * 1000);   // two and a half hours pass while the tab is hidden
  await pg.evaluate(show);
  await pg.clock.runFor(600);
  await pg.screenshot({ path: out + 'away-2-return.png' });
  await pg.clock.runFor(2500);
  await pg.screenshot({ path: out + 'away-3-greet.png' });
  console.log('page errors:', errs);
  await b.close();
})();
