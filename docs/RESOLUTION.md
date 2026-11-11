# Finer Technicolor screen (spec)

Owner decision: Traditional keeps the 64x64 LCD and its current chunky interface (pure nostalgia, unchanged). Technicolor gets a 96x96 LCD with more detail, and the whole interface around it gets finer pixels too: the icon rows, the title and message text, the A, B and C buttons, the settings and egg-chooser sheets, the Dex and every pop-up, plus everything drawn inside the LCD. The phone, widgets and Watch follow the same rule: the look chosen in Settings decides the density.

## Principles
- Traditional is untouched: every golden, every Traditional test and every Traditional render stays byte-identical.
- The pet's life (positions, wandering, props, events, taps) stays simulated in 64-space "logic units". The Technicolor painter converts logic coordinates to the 96 grid (multiply by 1.5 and round) so behaviour and tests do not fork.
- Pet sprites in Technicolor are 48x48: the 16x16 base art enlarged with Scale3x (not the 32x32 Scale2x frames), so edges stay crisp and chunky. The shading and eye rules are re-tuned for 48x48 (hole sizes and edge distances scale by 1.5).
- The extra pixels buy detail, not realism: finer scenery (leaves, grass blades, windows, bubbles), larger HUD glyphs (10x10 hearts and faces), a 3x5 font used at scale 1 for small text and scale 2 for titles, and room for more information on the text screens.
- Cells keep the visible LCD grid look at the new size.

## Interface chrome (outside the LCD)
In Technicolor the pixel-drawn interface outside the LCD uses a finer pixel density as well:
- Text: a finer pixel font (about 5x7, with the 3x5 font kept for Traditional) drawn at a smaller pixel size, so letters have more shape and strings fit.
- Icons: the ten action icons redrawn at 16x16 (12x12 minimum), with the same meanings, plus the gear, lock, tick and similar glyphs.
- Buttons, tiles, borders and selection highlights are drawn from finer pixel rows (rounded corners made of pixels, not CSS), the title bar and message line get the same treatment.
- Settings, egg chooser, name prompt, Dex pop-ups, dev panel, play menus and high scores follow.
Traditional keeps the current 3x5 font, 8x8 icons and chunky buttons exactly.

## Work breakdown (Expo first, then Swift port)
1. Foundation: resolution plumbing (grid size per mode through Buf, renderScreen, buildFrame, Toy and the sheet tools), 48x48 Scale3x pets with re-tuned shading and eyes, Technicolor home scene painter at 96 (sky, sun/moon/stars, clouds, weather, ground, HUD, props, poop, food, ball, event animations), generic backdrop until the biomes arrive, tests.
2. Biomes at 96 (12 biomes, split across two agents): finer scenery per family.
3. Text screens at 96: feed menu, stats, Dex, egg chooser, settings previews, ghost, play menu and high scores, with the extra room used for useful detail.
4. Mini games at 96: HI-LO, CATCH, DASH and ECHO painters.
5. Interface chrome at finer pixels (font, icons, buttons, sheets, pop-ups), Technicolor only.
6. Swift port of 1 to 5, then widgets and Watch tiles.

## Text screens at 96 (phase 3, done)
Every non-scene LCD screen in Technicolor has a native 96x96 layout (`expo-prototype/src/ui/screens96.ts`, registered in `LAYOUT96`): feed, play menu, stats (care, growth, legacy), Dex, high scores, ready, result, ghost and the evolution flash. The HI-LO screen and the text mini-games stay on the scaled default (the games agent owns them).
- Fonts: the 5x7 chrome font for titles and list rows, the LCD 3x5 font at scale 1 for dense text and at scale 2 for the score.
- Extra detail: hunger in the feed title bar, food glyphs, best score and favourite star in the play menu, hearts and bars (discipline, weight with its heavy mark, smarts), the pet portrait and the next evolution's conditions with progress bars and ticks, a 24x24 thumbnail Dex (found forms in ink, locked forms as flat silhouettes, stage pips, a cycling highlight with name and blurb), record-holder sprites and rank stars on the scores, rank goals on the ready screen.
- Tap rows stay in logic units: Technicolor lists start at logic row 12 (cell 18) so each 10-unit row is exactly 15 cells (`feedTop(look)` / `menuTop(look)`); Traditional keeps 11.
- Dex paging is unchanged (8 Dex lines per page); a 96 page draws the species lines of its range as a 4-column thumbnail grid.
- Tools: `tools/screens96-sheets.sh`, `tools/screens96-e2e.js`; tests: `test/screens96.ts`.
