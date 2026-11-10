# Pet shading and solid eyes (native)

Swift port of the Expo shading (`expo-prototype/src/ui/shading.ts`, `layers.ts`, `palette.ts`). The lit pixel set of a pet never changes; only the layer code of each pixel does. Traditional prints every Traditional-visible code as ink, so it stays pixel-identical.

## Where things live
| Piece | File |
| --- | --- |
| Shader (`PetShading.shade`, per-family `Style`, cache `PetShading.layers`) | `Shared/PetShading.swift` |
| Layer enum (`SceneLayer`), `isTraditionalLit`, `isPetLayer`, `drawPet(... family:)` | `Shared/SceneRenderer.swift` |
| Palette: `ScenePalette.shadeRamp`, ramp/eye/rim entries in `table` | `Shared/ColorMode.swift` |
| Tests (lit set, golden hashes from Expo, palette, ramp, eyes, cache) | `Tests/ShadingTests.swift`, `Tests/ShadingGolden.swift` |
| Golden generator | `tools/gen_shading_golden.ts` (run with tsx inside `expo-prototype`) |

## Layer table (numbers match `Layer` in layers.ts)
| Code | Case | Meaning | Traditional |
| --- | --- | --- | --- |
| 1..30 | existing (`ink` ... `ball`) | unchanged | ink |
| 31 | `shade` | shadow side (bottom-right, cool) | ink |
| 32 | `deep` | deep underside | ink |
| 33 | `belly` | lighter belly / chest | ink |
| 34 / 35 / 36 | `accent` / `accentDark` / `accentLight` | tips of ears, feet, tails (per-family table) | ink |
| 37 | `rim` | outline on the lit (top-left) side | ink |
| 38 | `eye` | ring of an eye hole (an outline cell) | ink |
| 39 | `glint` | sheen / catch-light | ink |
| 40 / 41 / 42 | `wave`, `hole`, `peak` | biome cues (fish wave line, bunny burrow arch, dragon peak) | ink (below `sceneryFrom`) |
| 43..86 | `bark` ... `leafBig` | biome scenery (see docs/BIOMES.md) | unlit |
| 87 / 88 | `eyeFill` / `eyeShine` | opaque pupil and catch-light filling the see-through eye hole | **unlit** |
| 89..94 | `starfield` ... `hull` | space biome (stars, planet, moon pits, crystals, saucer hull) | unlit |

* `SceneLayer.sceneryFrom` (43) is the Traditional cutoff: `isTraditionalLit(code) = code != 0 && code < sceneryFrom`. Use it for every "is this pixel lit" question (`isSet`, `ink`, `inkCount`, `invert`, `LCDPainter.path`). Eye fills and (later) scenery are unlit in Traditional.
* `SceneLayer.maxCode` is the highest code in use; `ScenePalette.tableSize = maxCode + 1`. The codes are now contiguous 0...94 (the biome layers landed with the Expo numbers, `maxCode` 94, `ScenePalette.tableSize` 95). `isPetLayer` is unchanged: scenery never overwrites pet codes.
* The pet shading colours are not in `techLight`: `ScenePalette.table` derives them from the body colour (`shadeRamp`) after the base layers, in light and dark appearance, and sets the eye and rim colours (`rim` glows on dark sky or dark appearance, is the ink softened toward the body on light sky; `eye` ring is the pupil colour, cream on very dark bodies).
* Outline lift at night: unchanged (outline becomes the cream rim colour for bodies with contrast >= 3). The Expo second lift (a dark outline too close to the biome sky becomes dim cream, `#CFC7AE`) is ported: it applies when the table is built with a `period` (the painter always passes it).

## Drawing
`SceneRaster.drawPet(rows, x:, y:, mirror:, family:)` shades the (mirrored) rows with `PetShading.layers`, cached per (family, sprite rows), so per (species, frame, facing). Light always comes from the top-left of the screen, so a mirrored sprite is shaded again. Eye fills are written only on cells that are not already Traditional-lit, so Traditional output is byte-identical. In a biome scene `SceneRaster.clearAroundPet` runs first (1px ring of scenery, and scenery, sky glyphs and cues inside the silhouette's row spans are cleared), so nothing shows through an eye hole; the dino meadow keeps its old picture exactly. See docs/BIOMES.md.

## Verification
`ShadingTests.testShadingMatchesTheExpoImplementation` compares an FNV-1a hash of the codes of every species frame (both facings) with the hashes produced by the Expo `shadedPetLayers`, so any drift from the tested implementation shows up as a failing frame list.

Status: unit tests (ShadingTests, including the Expo hash comparison) pass on CI.
