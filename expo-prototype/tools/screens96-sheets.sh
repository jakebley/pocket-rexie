#!/bin/sh
# Contact sheets of the Technicolor text screens: the old 3/2 upscale next to the native 96 layout. Usage: tools/screens96-sheets.sh <outdir>
OUT=${1:-../docs/screens}
mkdir -p "$OUT"
S="SIZE=${SIZE:-288}"
env $S node tools/screens96-sheets.js "$OUT/res96-screens-menus.png" "Feed and play menus, 96 native vs old upscale" fox:feed dragon:feed alien:playmenu-4 bird:playmenu-0 || exit 1
env $S node tools/screens96-sheets.js "$OUT/res96-screens-stats.png" "Stats pages, native vs old" fox:stats-care cat:stats-growth dragon:stats-growth2 bot:stats-legacy || exit 1
env $S node tools/screens96-sheets.js "$OUT/res96-screens-dex.png" "Dex: thumbnails, silhouettes, locked family" fox:dex-0 slime:dex-2 spirits:dex-2 fish:dex-locked || exit 1
env $S node tools/screens96-sheets.js "$OUT/res96-screens-play.png" "Scores, ready, result" bunny:scores-1 dragon:ready-3 fox:ready-1 bird:result-2 || exit 1
env $S node tools/screens96-sheets.js "$OUT/res96-screens-misc.png" "Ghost and evolution" fox:ghost alien:ghost bug:evo-a bug:evo-b || exit 1
env $S OLD=0 COLS=6 SIZE=192 node tools/screens96-sheets.js "$OUT/res96-screens-families-dex.png" "Dex page 3 of every family" dino:dex-2 fox:dex-2 fish:dex-2 bird:dex-2 cat:dex-2 spirits:dex-2 bunny:dex-2 dragon:dex-2 bot:dex-2 slime:dex-2 bug:dex-2 alien:dex-2 || exit 1
env $S OLD=0 COLS=6 SIZE=192 node tools/screens96-sheets.js "$OUT/res96-screens-families-stats.png" "Stats growth page of every family" dino:stats-growth fox:stats-growth fish:stats-growth bird:stats-growth cat:stats-growth spirits:stats-growth bunny:stats-growth dragon:stats-growth bot:stats-growth slime:stats-growth bug:stats-growth alien:stats-growth || exit 1
