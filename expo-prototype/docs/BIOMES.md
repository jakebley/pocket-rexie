# Biomes

Each pet family has its own background, chosen by the species' family (`src/ui/biomes.ts`).

| family | biome | notes |
|---|---|---|
| dino | meadow | unchanged; Traditional goldens must stay byte-identical |
| fox | woods | trunks, canopy, ferns, moss, litter, mushrooms, fireflies at dusk and night |
| fish | underwater | water-tinted sky in every phase, light shafts, bubbles, seaweed, coral, sand |
| bird | sky | big clouds, distant hills, treetop canopy, branch floor, nest |
| cat | yard | fence, neighbour's roof and window glow, garden bed, flowerpot, yarn |
| spirits | clouds | pastel sky, cloud floor, twinkling stars by day |
| spirits (imp, horn, soot lines) | ember | warm glow, ash, embers, rocky floor |
| bunny | warren | burrow, clover, tall grass, carrots, daisies |
| dragon | crags | crags, cave mouth, volcano, rocky floor with lava cracks at night |
| bot | workshop | wall plates, gears, blinking LEDs, cables, monitor, grid floor |
| slime | swamp | stalactites and drips, glowing mushrooms, puddles |
| bug | garden | giant leaves, flower heads, dew, long grass |

## How it is drawn

* `drawScene` still paints the meadow (sky, sun/moon/stars, clouds, rain, ground band, tufts, flowers, butterfly) for every family.
  `biomeDraw.ts` adds scenery **under** it (`drawBackdrop`, an empty buffer) and floor props **over empty pixels** after it (`drawFore`).
* The palette re-colours the shared layers per biome (`REMAP` in `palette.ts`: sun becomes surface light underwater, clouds become smoke in the ember realm, grass becomes seaweed, ...), and gives every biome a sky per phase and a soil colour.
* Scenery uses Technicolor-only layer codes (`Layer.BARK` and up, `SCENERY_FROM`). Traditional renders them unlit, so Traditional stays the plain scene plus three tiny cues: `WAVE` (fish surface line), `HOLE` (bunny burrow arch), `PEAK` (dragon far peak).
* The pet clears a 1 px ring of scenery around its silhouette (`drawPet`); shared layers are never touched, so Traditional and the dino are unaffected.
* Static art is painted once per (biome, phase, rain) and blitted from a cache; only animated bits are drawn per frame.
* Caves, the ember realm and the lit workshop have a dark backdrop in every phase (`ALWAYS_DARK`): HUD glyphs use the night ink there.

Sheets: `node tools/biome-sheets.js` writes `docs/screens/biomes-*.png`. Tests: `test/biomes.ts`.
