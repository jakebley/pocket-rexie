# Color modes: Traditional and Technicolor

The settings gear offers two looks. **Form factor, layout, pixel grid, sprites and behaviour are identical in both.** Only colors differ.

- **Traditional** (default): the monochrome LCD exactly as today (green-gray ground with dark ink in light mode, backlit dark ground with light ink in dark mode).
- **Technicolor**: a muted, nostalgic color palette in the spirit of early handheld and 90s toy plastics: soft, slightly chalky, never neon. Everything keeps a dark outline so it still reads as a pixel toy.

The choice is stored per device (Expo: AsyncStorage `pocket-rexie-colormode-v1`; Swift: App Group UserDefaults key `colorMode`, values `traditional` and `technicolor`) so widgets and the Watch read the same value. It is independent of the system light and dark appearance, and both modes support both appearances.

## How the drawing changes
The scene is drawn into a framebuffer of **layer codes** instead of on/off bits. A code of 0 is "unlit". In Traditional mode every non-zero code renders as the ink color, so the picture is pixel-for-pixel what it is today (a regression test asserts `layer != 0` equals the old bitmap). In Technicolor mode each layer maps to a palette color.

| Layer | What |
|---|---|
| 1 INK | default dark ink: outlines, HUD frames, text, icons, anything not listed |
| 2 BODY | pet interior (pixels of the sprite that are not on its outline) |
| 3 OUTLINE | pet outline: a sprite pixel with at least one unlit 4-neighbour (or at the edge) |
| 4 SUN | sun disc and rays |
| 5 MOON | moon |
| 6 STAR | stars |
| 7 CLOUD | clouds |
| 8 RAIN | raindrops |
| 9 GRASS | grass tufts |
| 10 GROUND | ground band |
| 11 DIRT | dirt dither under the ground, pebbles |
| 12 FLOWER_A / 13 FLOWER_B | the two flower colors |
| 14 HEART | hunger hearts |
| 15 SMILE | happiness faces |
| 16 POOP | poop |
| 17 FOOD_MEAT / 18 FOOD_VEG / 19 FOOD_PASTA / 20 SNACK | food glyphs |
| 21 TOOL | broom, dumbbell, syringe, ball |
| 22 SPARK | sparks, hearts popping, sparkles |
| 23 BUBBLE | thought bubble frame (ink) and its icon uses the icon's own layer |
| 24 WATER_DROP / 25 SNOW | temperature glyphs |
| 26 MAT | the night bed mat |
| 27 BUTTERFLY | ambient butterfly |
| 28 ALERT | alert glyph |

Sprites: the pet body color comes from its **lineage** (see below). Outline pixels use OUTLINE, which is a deep tone (near the ink), the eye hole stays unlit (sky shows through), and an interior pixel whose upper or left neighbour is an outline pixel uses BODY_LIGHT (a lighter tint of the body) to give a soft top-left highlight with no extra art.

Lineage colors (`line` in `tools/species.py`, generated into the data): `meat` (terracotta), `veggie` (sage), `pasta` (mustard), `neglect` (storm gray), `baby` (eggshell cream). A species shared by several lines (for example the ultimates) takes the color of the line it is most commonly reached from, listed explicitly in `tools/species.py`.

## Palette (muted). Hex values are the design; tune by eye
Technicolor, light appearance ("day"):
- Screen ground (outside the scene) `#EAE2CB`, ink `#34384A`, unlit-pixel grid is a faint tint of the ground.
- Sky by local hour: dawn `#E3C9A9`, day `#A9C9D6`, dusk `#D0A38F`, night `#2F3A5A`. Rain overrides day and dusk with `#9AA8B0`. The sky fills the scene area above the ground, and the grid texture stays visible.
- Sun `#E2B94B`, moon `#EDE6C8`, stars `#F2EBCF`, clouds `#F1EDE0`, rain `#6F8FA6`.
- Grass `#7C9C63`, ground `#A98F67`, dirt `#8F7752`, pebbles `#CDBA93`, flowers `#C9707A` and `#E0B84F`.
- Hearts `#B8574E`, smiles `#D9AE4A`, poop `#8D6A47`, drop `#6FA3B8`, snow `#BFD8E2`, sparks `#F0D77A`, mat `#8E6F8F`, butterfly `#C98AA0`, alert `#C4584A`.
- Food: meat `#A9573E`, veggie `#6F9A5B`, pasta `#D8B65D`, snack `#C98AA0`. Tools `#9A7B52`, ball `#C0634F`.
- Pet bodies: meat `#B9684C`, veggie `#6E9A6B`, pasta `#D1A94A`, neglect `#8A8F96`, baby `#E7DCC0`. Outline is `#34384A`.
Technicolor, dark appearance: screen ground `#20243A`, ink `#E4DCC4`; the night sky `#1B2240`; every other color is the light value blended 18% toward the ground color so it sits comfortably on dark; the pet outline stays near-ink light (`#E4DCC4`).
In the dark and night scenes the lights-off dim (asleep, light off) applies as today, as a darkening of the final colors.

Menu glyphs and text keep using INK in both modes. The unlit-pixel grid keeps its subtle look.

## Settings UI
In the settings sheet, a **Look** section with two large tiles: "Traditional" and "Technicolor", each showing a tiny live preview of the pet scene in that mode, with the selected tile marked (checkmark and inverted frame). Changing the choice applies immediately without restarting, persists, and syncs to widgets and Watch on Apple platforms.

## Widgets and Watch
Read the same `colorMode` from the App Group (Watch uses its own default `traditional` and follows a synced value). Widgets render the still scene in the chosen mode. Lock Screen accessory widgets stay ink-only (they are tinted by the system).

## Testing
- Traditional output equals the previous bitmap for every species, stage and facing (regression).
- Every drawn pixel has a non-zero layer exactly where the old bitmap had a lit pixel, and a palette color exists for every layer in all four mode and appearance combinations (no missing colors).
- Contrast: BODY vs OUTLINE, HEART vs sky, text ink vs ground are at least 3:1 in Technicolor light and dark.
- Setting persists across relaunch and applies immediately.
