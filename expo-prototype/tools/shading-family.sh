#!/bin/sh
# Contact sheets of one species per stage for every family: docs/screens/shading-<family>.png (day, night, dark night)
# usage: tools/shading-family.sh [outdir]   (set PICK=1 to take the second species of each stage)
cd "$(dirname "$0")/.." || exit 1
OUT=${1:-docs/screens}
PICK=${PICK:-0}
for fam in dino fox fish bird cat spirits bunny dragon bot slime bug; do
  ids=$(npx tsx -e "
import { SPECIES } from './src/core/speciesData';
const pick = ${PICK};
console.log(['baby','child','teen','adult','ultimate'].map((st) => { const l = SPECIES.filter((s) => s.family === '${fam}' && s.stage === st); return l[Math.min(pick, l.length - 1)].id; }).join(' '));
")
  CROP=1 SIZE=200 VARS="day,night,dark day,dark night" node tools/shading-sheets.js "$OUT/shading-$fam.png" "Technicolor shading: $fam (baby to ultimate; light day and night, dark appearance day and night)" $ids
done
