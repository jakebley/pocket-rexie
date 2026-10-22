import { advance, newPet, feed, petIt, finishPlay, leadFood, type Pet } from '../src/core/pet';
const base = Date.UTC(2026, 0, 5, 9, 0, 0);
const hourOf = (t: number) => new Date(t).getUTCHours();
function trace(label: string, policy: (p: Pet, t: number) => void) {
  const p = newPet(base, { seed: 777 });
  let t = base, last = '';
  const rows: string[] = [];
  for (let i = 0; i < 25 * 288 && p.stage !== 'ghost'; i++) {
    t += 300000; 
    const before = { m: p.stageMistakes, tr: p.stageTrain, w: p.stageWins, s: p.smarts, wt: p.weight - 0, lead: leadFood(p) };
    advance(p, t, hourOf); policy(p, t);
    if (p.species !== last) { if (last) rows.push(`${last}(mist ${before.m}, train ${before.tr}, wins ${before.w}, smarts ${before.s}, w ${before.wt}, lead ${before.lead}) -> ${p.species}`); last = p.species; }
  }
  console.log('--', label); rows.forEach((r) => console.log('  ', r));
}
trace('neglect', () => {});
trace('light-night only', (p) => { if (p.asleep) p.lightOn = false; });
let nap = 0;
trace('answers sometimes (every 3rd check)', (p, t) => { nap++; if (nap % 36 === 0) { if (p.hunger <= 1) feed(p, 'meat'); if (p.poops) p.poops = 0; if (p.sick) p.sick = false; if (p.temp) p.temp = 0; } if (p.asleep) p.lightOn = false; });
trace('casual: pets, plays, feeds, light', (p, t) => { if (p.asleep) { p.lightOn = false; return; } if (p.hunger <= 1) feed(p, 'veggie'); if (p.poops >= 2) p.poops = 0; if (p.sick) p.sick = false; if (p.temp) p.temp = 0; if (p.happy <= 1) { p.happy++; } if (Math.floor(t / 300000) % 24 === 0) { petIt(p); petIt(p); petIt(p); finishPlay(p, 4); } });
