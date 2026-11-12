import { ART96, G10, TUFT96, FLOWER96 } from '../expo-prototype/src/ui/art96';
// FNV-1a 32 of every 96-grid art bitmap (rows joined with '|') -> Tests/ShadingGolden96.swift `art`
const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const out: string[] = [];
for (const [k, v] of Object.entries(G10)) out.push(`G10.${k}|${fnv(v.join('|'))}`);
for (const [k, v] of Object.entries(ART96)) out.push(`ART96.${k}|${fnv(v.join('|'))}`);
for (const [k, v] of Object.entries(TUFT96)) out.push(`TUFT96.${k}|${fnv(v.join('|'))}`);
FLOWER96.forEach((v, i) => out.push(`FLOWER96.${i}|${fnv(v.join('|'))}`));
console.log(out.join('\n'));
