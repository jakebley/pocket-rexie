# Finer Technicolor screen (spec)

Owner decision: Traditional keeps the 64x64 LCD (pure nostalgia, unchanged). Technicolor gets a 96x96 LCD with more detail. The phone, widgets and Watch follow the same rule: the look chosen in Settings decides the grid.

## Principles
- Traditional is untouched: every golden, every Traditional test and every Traditional render stays byte-identical.
- The pet's life (positions, wandering, props, events, taps) stays simulated in 64-space "logic units". The Technicolor painter converts logic coordinates to the 96 grid (multiply by 1.5 and round) so behaviour and tests do not fork.
- Pet sprites in Technicolor are 48x48: the 16x16 base art enlarged with Scale3x (not the 32x32 Scale2x frames), so edges stay crisp and chunky. The shading and eye rules are re-tuned for 48x48 (hole sizes and edge distances scale by 1.5).
- The extra pixels buy detail, not realism: finer scenery (leaves, grass blades, windows, bubbles), larger HUD glyphs (10x10 hearts and faces), a 3x5 font used at scale 1 for small text and scale 2 for titles, and room for more information on the text screens.
- Cells keep the visible LCD grid look at the new size.

## Work breakdown (Expo first, then Swift port)
1. Foundation: resolution plumbing (grid size per mode through Buf, renderScreen, buildFrame, Toy and the sheet tools), 48x48 Scale3x pets with re-tuned shading and eyes, Technicolor home scene painter at 96 (sky, sun/moon/stars, clouds, weather, ground, HUD, props, poop, food, ball, event animations), generic backdrop until the biomes arrive, tests.
2. Biomes at 96 (12 biomes, split across two agents): finer scenery per family.
3. Text screens at 96: feed menu, stats, Dex, egg chooser, settings previews, ghost, play menu and high scores, with the extra room used for useful detail.
4. Mini games at 96: HI-LO, CATCH, DASH and ECHO painters.
5. Swift port of 1 to 4, then widgets and Watch tiles.
