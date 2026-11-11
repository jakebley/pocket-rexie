#!/bin/sh
# Contact sheets of the home scene: Technicolor at 64 next to the 96 painter. Usage: tools/res96-sheets.sh <outdir>
# one adult per family; scenarios: base (day, dusk, night, rain, dark), hud, events, props.
OUT=${1:-docs/screens}
mkdir -p "$OUT"
export DUMP=res96-dump.ts
A="chomper stalker fish_spineball bird_lark cat_brindle spirits_brightwing"
B="bunny_longleap dr_emberwing bot_bassline slime_gelkeep bug_swallowtail alien_lamplight"
for S in base hud events props; do
  SCEN=$S SIZE=${SIZE:-160} node tools/shading-sheets.js "$OUT/res96-$S-1.png" "Technicolor 64 vs 96: $S" $A || exit 1
  SCEN=$S SIZE=${SIZE:-160} node tools/shading-sheets.js "$OUT/res96-$S-2.png" "Technicolor 64 vs 96: $S" $B || exit 1
done
