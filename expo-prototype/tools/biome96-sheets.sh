#!/bin/sh
# Per-biome sheets of the Technicolor 96 scene: dawn, day, dusk, night, rain, dark day, dark night (one adult per family).
# Usage: tools/biome96-sheets.sh <outdir> [biome ...]   (biomes: warren crags workshop swamp garden space; default: all six). env: SIZE=220 X=12 T=4200
OUT=${1:-docs/screens}; shift
mkdir -p "$OUT"
export DUMP=biome96-dump.ts
[ $# -eq 0 ] && set -- warren crags workshop swamp garden space
for B in "$@"; do
  case $B in
    warren) S=bunny_longleap;; crags) S=dr_emberwing;; workshop) S=bot_bassline;; swamp) S=slime_gelkeep;; garden) S=bug_swallowtail;; space) S=alien_lamplight;;
    meadow) S=chomper;; woods) S=stalker;; underwater) S=fish_spineball;; sky) S=bird_lark;; yard) S=cat_brindle;; clouds) S=spirits_brightwing;; ember) S=spirits_emberhorn;;
    *) echo "unknown biome $B"; exit 1;;
  esac
  SIZE=${SIZE:-288} node tools/shading-sheets.js "$OUT/biome96-$B.png" "Technicolor 96: $B" $S || exit 1
done
