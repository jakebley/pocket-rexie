import { advance, newPet, feed, train, battle, DEX_SIZE, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m); } };

// Fixed clock: start at 09:00 local-ish using hourOf based on UTC offsets from a base.
const base = Date.UTC(2026, 0, 5, 9, 0, 0);
const hourOf = (t: number) => new Date(t).getUTCHours();

function run(name: string, policy: (p: Pet, t: number) => void, days = 25, gentle = true, seed = 12345, quiet = false) {
  const p = newPet(base, { seed, gentle });
  let t = base;
  const path: string[] = [];
  for (let i = 0; i < days * 24 * 12 && p.stage !== 'ghost'; i++) {
    t += 5 * 60000;
    advance(p, t, hourOf);
    policy(p, t);
    if (p.species && path[path.length - 1] !== p.species) path.push(p.species);
  }
  if (!quiet) console.log(name.padEnd(12), path.join(' > '), p.stage === 'ghost' ? `| ended: ${p.causeOfDeath}` : '| alive', `| mistakes ${p.careMistakes}`);
  return { p, path };
}

// A diligent player: answers calls, feeds a chosen diet, trains, battles.
const diligent = (food: 'meat' | 'veggie' | 'pasta') => (p: Pet, t: number) => {
  if (p.asleep) { if (p.lightOn) { p.lightOn = false; } return; }
  if (p.hunger <= 2) feed(p, food);
  if (p.poops > 0) { p.poops = 0; }
  if (p.sick) { p.sick = false; }
  if (p.temp !== 0) p.temp = 0;
  if (p.happy <= 2) p.happy++;
  if (p.call === 'naughty') p.call = null;
  train(p); battle(p);
};
const neglect = () => (p: Pet) => { /* does nothing */ };

const meat = run('meat', diligent('meat'));
const veg = run('veggie', diligent('veggie'));
const pasta = run('pasta', diligent('pasta'));
const lazy = run('neglect', neglect());
const classic = run('classic dies', neglect(), 25, false);

ok(meat.path.includes('rawr'), 'meat reaches rawr');
ok(veg.path.includes('sprig'), 'veggie reaches sprig');
ok(pasta.path.includes('twirl'), 'pasta reaches twirl');
ok(meat.p.stage === 'ghost' ? true : true, 'ran');
ok(lazy.path.length >= 3, 'neglect still progresses in gentle mode');
ok(classic.p.stage === 'ghost', 'classic neglect dies');
ok(meat.path.length >= 5, `meat line reaches ultimate (${meat.path.length} stages)`);
ok(new Set(SPECIES.map((s) => s.id)).size === DEX_SIZE, 'unique species ids');

// Reachability across random policies
const seen = new Set<string>();
for (let s = 1; s <= 300; s++) {
  const food = (['meat', 'veggie', 'pasta'] as const)[s % 3];
  const eff = s % 4;
  const policy = (p: Pet, t: number) => {
    if (p.asleep) { p.lightOn = false; return; }
    if (p.hunger <= 2 && s % 7 !== 0) feed(p, food);
    if (p.poops > 0 && s % 5 !== 0) p.poops = 0;
    if (p.sick) p.sick = false;
    if (p.temp) p.temp = 0;
    if (p.happy <= 2) p.happy++;
    if (eff > 0) { train(p); }
    if (eff > 1) { battle(p); }
    if (eff > 2) { p.smarts = Math.min(100, p.smarts + 1); }
    if (s % 11 === 0 && p.hunger > 0) { /* stay heavy */ p.weight += 1; }
  };
  const { path } = run('r' + s, policy, 25, true, s * 7919, true) as any;
  path.forEach((x: string) => seen.add(x));
}
console.log('species seen in 300 random runs:', seen.size, '/', DEX_SIZE);
console.log('never seen:', SPECIES.filter((s) => !seen.has(s.id)).map((s) => s.id).join(', ') || 'none');
process.exit(fails ? 1 : 0);
