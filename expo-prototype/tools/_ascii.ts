import { SPECIES } from '../src/core/speciesData';
if (process.argv[2] === 'list') {
  const c: any = {};
  for (const s of SPECIES) { c[s.family] = c[s.family] || {}; (c[s.family][s.stage] = c[s.family][s.stage] || []).push(s.id); }
  for (const f in c) console.log(f, Object.entries(c[f]).map(([k, v]: any) => k + ':' + v.length + ' ' + v.slice(0, 2).join(',')).join(' | '));
  console.log(SPECIES.length);
} else for (const id of process.argv.slice(2)) { const s = SPECIES.find((x) => x.id === id)!; console.log(id, s.family, s.stage, s.bodyHex); console.log(s.hiFrames[0].join('\n')); }
