#!/bin/sh
# Per-biome 96 sheets (biomes A: meadow, woods, underwater, sky, yard, clouds, ember). Usage: tools/biomes96-sheets.sh <outdir> [biome ...]
# one adult per family; sheets: base (day, dusk, night, rain, dark day, dark night), anim (not still, three times), pos (pet left/right, dawn, dark dusk).
OUT=${1:-docs/screens}; shift
mkdir -p "$OUT"
export DUMP=biomes96-dump.ts
SEL=${*:-"meadow woods underwater sky yard clouds ember"}
for B in $SEL; do
  case $B in
    meadow) SP=chomper;; woods) SP=stalker;; underwater) SP=fish_spineball;; sky) SP=bird_lark;; yard) SP=cat_brindle;; clouds) SP=spirits_brightwing;; ember) SP=spirits_emberhorn;;
    *) echo "unknown biome $B"; exit 1;;
  esac
  for S in base anim pos; do
    SCEN=$S SIZE=${SIZE:-288} node tools/shading-sheets.js "$OUT/biome96-$B-$S.png" "96 $B: $S" $SP || exit 1
  done
done
