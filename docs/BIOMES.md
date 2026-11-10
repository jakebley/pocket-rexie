# Biomes (native)

Swift port of the Expo per-family backgrounds (`expo-prototype/src/ui/biomes.ts`, `biomeDraw.ts`, `layers.ts`, `palette.ts`; the design is `expo-prototype/docs/BIOMES.md`). Every family has its own scene; spirits on the imp, horn and soot lines live in the ember realm. The dino keeps the meadow, byte for byte.

## Where things live
| Piece | File |
| --- | --- |
| `Biome`, family map, ember spirits, always-dark set, `Biome.of(pet)` | `Shared/Biomes.swift` |
| Painters (static art cached per biome/period/rain, animated parts per frame), `BiomeCanvas` helpers | `Shared/BiomeDraw.swift` |
| Layer colours, per-biome re-colouring of shared layers, phase shade, sky and soil per biome | `Shared/BiomePalette.swift`, `ScenePalette.table/sky/soil(... biome:)` in `Shared/ColorMode.swift` |
| Layer enum (codes 40...86 and 89...94), `SceneLayer.isScenery`, `SceneRaster.clearAroundPet`, scene order | `Shared/SceneRenderer.swift` |
| Tests | `Tests/BiomeTests.swift` (mirrors `expo-prototype/test/biomes.ts`) |
| Render scenes (every family, day and night) | `UIRenderTests.testRenderBiomes` -> `biomes/` on the `ci-screenshots` branch |

## How a scene is built
1. `BiomeDraw.backdrop` (static back art plus the live parts) is copied into the empty raster.
2. The meadow sky, sun, clouds, butterfly and ground are drawn over it (their layers are re-coloured per biome by the palette, the pixels are the meadow's).
3. `BiomeDraw.fore` paints floor props into cells still unlit.
4. `SceneRaster.clearAroundPet` clears scenery 1px around the pet and scenery, sky glyphs and cue pixels inside the silhouette's row spans (this also fixes a cloud showing through an eye hole), then the pet, HUD and effects are drawn as before.

The art is written in the Expo coordinates (ground at row 60); the native ground line is row 58, so rows are mapped with `BiomeDraw.rowMap` (rows 18...20, just under the HUD, merge into one). Animation uses 125 ms ticks like Expo (`t * 8`); a still picture or reduced motion draws frame zero.

## Traditional
Scenery layers (43...86, 89...94) print unlit. Only the three cues are ink: `wave` (fish), `hole` (bunny), `peak` (dragon). `SceneRenderOptions.biome` overrides the family biome (tests, previews).

## Palette
`ScenePalette.table(... biome:, period:, rain:)`: shared layers re-coloured per biome, non-glowing scenery shaded by period (night per biome, rain, dusk, dawn), `night` is true for the night period and for always-dark biomes (workshop, swamp, ember, space), which flips the HUD ink light. The painter passes all of this from `SceneRaster.biome`. Lights off darkens scenery on the dither cells in Technicolor.

## Not ported / differences
* Expo `stamp(..., halo)` (1px clear around clouds, butterfly, poop) is not applied; only the pet gets the clear ring.
* Pet interior clearing leaves grass, flowers and ground in place (Expo clears every layer inside the span), so the meadow render stays identical.
