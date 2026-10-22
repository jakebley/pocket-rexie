// Balance report: simulates 7 player styles x 4 diets x N seeds and reports how often each species is reached.
// Usage: npx tsx test/balance.ts [seeds=30]
import { advance, battle, clean, climate, feed, feedSnack, finishPlay, giveMedicine, newPet, petIt, scold, toggleLight, train, type Pet } from '../src/core/pet';
import { SPECIES } from '../src/core/speciesData';
import type { Food } from '../src/core/types';

const SEEDS = Number(process.argv[2] ?? 30);
const base = Date.UTC(2026, 0, 5, 9, 0, 0);
const hourOf = (t: number) => new Date(t).getUTCHours();
const DAYS = 25;

type Style = { name: string; checks: number[]; care: (p: Pet, food: () => Food, day: number) => void };

const fullCare = (p: Pet, food: () => Food) => {
  for (let i = 0; i < 4 && p.hunger < 4; i++) feed(p, food());
  if (p.poops) clean(p);
  if (p.sick) { giveMedicine(p); giveMedicine(p); }
  if (p.temp) climate(p);
  if (p.call === 'naughty') scold(p);
  if (p.happy < 3) finishPlay(p, 4);
};

const STYLES: Style[] = [
  { name: 'devoted (hourly)', checks: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], care: (p, f) => fullCare(p, f) },
  { name: 'casual (3x/day)', checks: [9, 13, 19], care: (p, f) => { fullCare(p, f); petIt(p); } },
  { name: 'busy (2x/day)', checks: [8, 19], care: (p, f) => fullCare(p, f) },
  { name: 'trainer (3x/day)', checks: [9, 13, 19], care: (p, f) => { fullCare(p, f); train(p); battle(p); } },
  { name: 'scholar (3x/day)', checks: [9, 13, 19], care: (p, f) => { fullCare(p, f); petIt(p); petIt(p); petIt(p); finishPlay(p, 4); finishPlay(p, 4); } },
  { name: 'snacker (3x/day)', checks: [9, 13, 19], care: (p, f) => { for (let i = 0; i < 4 && p.hunger < 4; i++) feed(p, f()); if (p.poops) clean(p); if (p.sick) { giveMedicine(p); giveMedicine(p); } if (p.temp) climate(p); for (let i = 0; i < 4 && p.happy < 4; i++) feedSnack(p); } },
  { name: 'delinquent (1x/day, trains)', checks: [18, 18], care: (p, f) => { fullCare(p, f); train(p); battle(p); } },
  { name: 'forgetful (1x/day)', checks: [18], care: (p, f) => { fullCare(p, f); } },
];

const DIETS: { name: string; pick: (n: number) => Food }[] = [
  { name: 'meat', pick: () => 'meat' },
  { name: 'veggie', pick: () => 'veggie' },
  { name: 'pasta', pick: () => 'pasta' },
  { name: 'mixed', pick: (n) => (['meat', 'veggie', 'pasta'] as const)[n % 3] },
];

const reached = new Map<string, number>();
const byStyle = new Map<string, Map<string, number>>();
const ultimates = new Map<string, number>();
let runs = 0, retired = 0;
const lastSpecies = new Map<string, number>();
const finalByStyle = new Map<string, Map<string, number>>();

for (const st of STYLES) for (const diet of DIETS) for (let s = 1; s <= SEEDS; s++) {
  const p = newPet(base, { seed: s * 7919 + 13, gentle: true });
  let t = base, feeds = 0;
  const food = () => diet.pick(feeds++);
  const seen = new Set<string>();
  while (t < base + DAYS * 86400000 && p.stage !== 'ghost') {
    t += 300000;
    advance(p, t, hourOf);
    const h = hourOf(t), m = Math.floor(t / 60000) % 60;
    if (p.asleep && p.lightOn && h >= 21) { toggleLight(p); }
    if (!p.asleep && p.stage !== 'egg' && m < 5 && st.checks.includes(h)) st.care(p, food, 0);
    if (p.species) seen.add(p.species);
  }
  runs++; if (p.stage === 'ghost') retired++;
  for (const id of seen) {
    reached.set(id, (reached.get(id) ?? 0) + 1);
    const sm = byStyle.get(st.name) ?? new Map(); sm.set(id, (sm.get(id) ?? 0) + 1); byStyle.set(st.name, sm);
  }
  const lastUlt = [...seen].filter((id) => SPECIES.find((x) => x.id === id)?.stage === 'ultimate').pop();
  if (lastUlt) ultimates.set(lastUlt, (ultimates.get(lastUlt) ?? 0) + 1);
  lastSpecies.set(p.species, (lastSpecies.get(p.species) ?? 0) + 1);
  const fm = finalByStyle.get(st.name) ?? new Map(); fm.set(lastUlt ?? p.species, (fm.get(lastUlt ?? p.species) ?? 0) + 1); finalByStyle.set(st.name, fm);
}

console.log(`runs: ${runs} (${STYLES.length} styles x ${DIETS.length} diets x ${SEEDS} seeds), reached end of life: ${retired}`);
const stages = ['baby', 'child', 'teen', 'adult', 'ultimate'] as const;
for (const stage of stages) {
  console.log(`\n${stage.toUpperCase()}`);
  for (const sp of SPECIES.filter((x) => x.stage === stage)) {
    const n = reached.get(sp.id) ?? 0;
    const pct = ((100 * n) / runs).toFixed(1).padStart(5);
    console.log(`  ${sp.id.padEnd(13)} ${pct}%  ${'#'.repeat(Math.round((40 * n) / runs))}`);
  }
}
const never = SPECIES.filter((s) => !(reached.get(s.id) ?? 0)).map((s) => s.id);
const rare = SPECIES.filter((s) => s.stage !== 'baby' && (reached.get(s.id) ?? 0) / runs < 0.01 && (reached.get(s.id) ?? 0) > 0).map((s) => s.id);
console.log('\nnever reached:', never.join(', ') || 'none');
console.log('rare (<1%):', rare.join(', ') || 'none');
console.log('\nreached species by style (count of species out of ' + SPECIES.length + '):');
for (const [name, m] of byStyle) console.log('  ' + name.padEnd(22), m.size);
console.log('\nfinal form by style:');
for (const [name, m] of finalByStyle) console.log('  ' + name.padEnd(22), [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', '));
process.exit(never.length > 4 ? 1 : 0);
