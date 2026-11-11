# Play: mini-games (spec)

Goal: Play stops being one higher/lower guess and becomes a small arcade of mini-games, themed to the pet's family, tuned by the pet's body type and growth stage, with high scores that last across pets.

## Menu
Play opens a menu on the LCD (like the Feed menu): the games, then HIGH SCORES, then CANCEL. A/B/C and taps work as in the Feed menu.

## Games (four mechanics, each re-skinned per family)
1. HI-LO (the existing guess game, 5 rounds). Skin: family name for the cards or tokens.
2. CATCH (reflex): items fall, the pet slides left and right under them. Catch good items, dodge bad ones. 30 seconds. Skin: fox catches mice and berries, avoids thorns; fish catch bubbles and plankton, avoid jellyfish; birds catch seeds, avoid cats' paws; bots catch batteries, avoid water drops; and so on for all 12 families.
3. DASH (timing): the pet runs, hops, swims or flies through a scrolling course; one input jumps or flaps. Obstacles and the ground come from the family's biome (rocks, reeds, pipes, crystals).
4. ECHO (memory): the pet shows a pattern of 3 to 8 symbols from the family's symbol set; the player repeats it. Longer patterns for higher smarts.
More games can plug into the same interface later.

## Species tuning (nothing is one-size-fits-all)
- Family skin (items, obstacles, symbols, names, win lines).
- Body type (the reaction `kind`, e.g. fennec, dragonfly, mech, loaf, jelly): a small modifier table gives speed, size (hitbox), luck (bonus items) and memory (extra pattern time). Light and quick kinds are fast and small; heavy kinds are slow and big but forgiving.
- A favourite game per kind (a fennec loves CATCH, a heron loves DASH, a brain loves ECHO): the score is multiplied by 1.25 and the menu marks it with a star.
- Stage scales size and speed; weight (overweight pets) slows the pet slightly; sick or hungry pets play worse.

## Scoring, rewards, high scores
- Every game ends with a score and a rank (BRONZE, SILVER, GOLD) with fixed thresholds per game.
- Rewards stay inside the existing balance: BRONZE counts as a win (the existing finishPlay rule: smarts +3, weight -1), SILVER or better adds +1 happy heart (still capped by MAX_HEARTS). A day cap (3 rewarded plays per 24 h of game time) stops farming; extra plays still score but give no reward and say so. Gentle mode never punishes.
- High scores are stored per game per species (best score and date) and per game overall, persist across pets and restarts (AsyncStorage on Expo; UserDefaults in the shared app group on Swift so the Watch and widgets can read them), and show on the HIGH SCORES screen with the pet's name and species. New records get a short celebration and the app plays the existing win beeps.
- Seeded randomness: each game takes a seed; tests run deterministic games.

## Architecture (Expo)
- src/core/minigames/: pure TypeScript, no rendering. A `MiniGame` interface (init(seed, params), step(input, dtMs), state, done, score, rank), the four games, `themes.ts` (per family: names, glyph bitmaps for items, obstacles, symbols), `tuning.ts` (kind modifiers, favourites, stage and weight scaling), `scores.ts` (high score store with an injectable storage), `rewards.ts` (rank to engine reward, daily cap).
- src/ui: the Play menu, a generic game screen that paints a game state into the 64x64 layer buffer (pet sprite from the species hiFrames, family biome colours via existing layers; Technicolor gets extra detail, Traditional stays simple), input from the A/B/C buttons and screen taps, and the HIGH SCORES screen.
- Tests: deterministic game simulations, tuning tables cover every species kind, scores store, reward cap, render of each game for every family without throwing.
- The Swift port comes after the Expo version is stable and reuses the same constants (generated from one source where practical: tools/gen_*.py).

## Status and how to add a game (Expo)
Phase 1 (the foundation) is in: the `MiniGame`/`GameDef` contract (`src/core/minigames/types.ts`), `themes.ts` (all 12 families), `tuning.ts` (all 123 body kinds),
`scores.ts`, `rewards.ts` (`Pet.rewardedPlays` holds the day-cap log), `session.ts` (ready, play, time up, result), HI-LO and CATCH, the Play menu, the generic game screen,
the result screen and HIGH SCORES. Tests: `test/minigames.ts` (bots in `test/minigame-bots.ts`). Sheets: `node tools/play-sheets.js` (docs/screens/play-*.png).
End-to-end on the web build: `tools/play-e2e.js`.

To add a game (DASH, ECHO, ...), touch exactly:
1. `src/core/minigames/games/<id>.ts`: export a `GameDef`. `init(seed, params)` returns a `MiniGame`; read `params.tuning` (speed, size, luck, memory, condition),
   `params.theme` (items, obstacles, symbols, titles, win lines), `params.scoreMul` (the favourite x1.25) and `params.smarts`. Run on `makeTicker` so any step size plays the same game.
   Keep the score a plain number; `rankOf(score, thresholds)` gives the rank.
2. `src/ui/games/<id>.ts`: export `entry: GameEntry = { def, layout, paint }`. `layout: 'field'` gets the family biome backdrop and the HUD strip for free (draw the pet with
   `drawPetFit`, glyphs with `drawGlyph`); `'text'` owns the whole screen. Layers below 43 print in Traditional; scenery layers and `'o'`/`'w'` glyph details are Technicolor-only.
3. `src/ui/games/registry.ts`: one line `load(require('./<id>')),` inside your slot.
Inputs are edges: A = `left`, B = `act`, C = `right` (when `usesRight` is false, C quits), a tap on the left or right half is `left` or `right`, and a tap on a row from `tapRows` is `pick`.
The menu, scores, rewards, high scores and the tests (a monkey bot plays every registered game for every family and renders every screen) pick the new game up automatically.
Tune thresholds with bots like the CATCH ones in the tests: a perfect player gold, a good one silver, a casual one bronze, standing still nothing.

## Status
Expo: HI-LO, CATCH, DASH and ECHO are built (src/core/minigames/games/, src/ui/games/), with themes for all 12 families, tuning for all 123 body types, high scores and the daily reward cap. Swift port: not started.
Swift: HI-LO, CATCH and DASH are ported (DASH: `Shared/MiniGames/DashGame.swift`, golden traces in `Tests/DashTests.swift`). ECHO is ported too (`Shared/MiniGames/EchoGame.swift`, `Tests/EchoTests.swift`). The 96-grid painters are not ported yet.

## Status and how to add a game (Swift)
Where things are:
- `Shared/MiniGames/MiniGameData.swift`: GENERATED by `tools/gen_minigames.ts` from the Expo sources (the 12 family themes with their glyph bitmaps, tuning for all 123 body types,
  favourites, stage and health factors, the CATCH and HI-LO constants and rank thresholds, and golden traces Expo played). Regenerate with `cd expo-prototype && npx tsx ../tools/gen_minigames.ts`;
  CI fails if the file is stale. Data is compact strings split at runtime (never nested array literals: they make the Swift compiler crawl).
- `MiniGameTypes.swift` (the `MiniGame` protocol, `GameDef`, `GameInput` edge inputs left/right/act/pick), `MiniRng.swift` (the same mulberry32 as Expo), `MiniThemes.swift`, `MiniTuning.swift`,
  `MiniScores.swift` (high scores in UserDefaults; the shared app group by default so the watch and widgets can read them; injectable defaults for tests), `MiniRewards.swift`
  (rank to reward, `Pet.rewardedPlays` holds the 3-per-24-hours log; old saves without it load fine), `MiniSession.swift` (ready, play, time up, result),
  `HiLoGame.swift`, `CatchGame.swift`, `MiniPaint.swift` (painting helpers into the 64x64 `SceneRaster`), `MiniGameRegistry.swift`.
- `Shared/PlayScreens.swift`: the Play menu, ready, result and HIGH SCORES panels (pixel-font SwiftUI, like the Feed menu). The games themselves are painted into the raster and shown by `LCDScreen`.
- Model: `GameModel.mode` has `.playMenu`, `.game` and `.scores`; `GameModel.session` is the running `MiniSession`, stepped 20 times a second by its own timer (the 5-minute pet tick is untouched).

To add a game (DASH, ECHO, ...) touch exactly:
1. A new file `Shared/MiniGames/<Name>Game.swift`: a `final class <Name>Game: MiniGame` (seeded `MiniRng`, fixed tick via `MiniTicker`, read `params.tuning`, `params.theme`, `params.scoreMul`) and
   `static let entry = GameEntry(def: GameDef(...), layout: .field or .text) { raster, ctx in ... }`. A `.field` painter gets the family biome backdrop, the HUD strip and the time-up banner for free
   (draw the pet with `raster.petFit`, glyphs with `raster.glyph`); `.text` owns the whole screen. Layers below `SceneLayer.sceneryFrom` print in Traditional; scenery layers and the 'o'/'w' glyph details are Technicolor-only.
   Constants that exist in Expo should come from the generator: add them to `tools/gen_minigames.ts` and regenerate (and a golden trace if the rules are intricate).
2. One line in `MiniGames.all` (`MiniGameRegistry.swift`): `<Name>Game.entry,`.
Nothing else changes: the menu, ready, result and HIGH SCORES screens, scores, rewards and the tests (a monkey bot plays every registered game for every family and every frame is painted) pick it up.
Tune thresholds with bots like the CATCH ones in `Tests/MiniGameTests.swift` (they are ports of the Expo bots).
Inputs are edges: A = left, B = act, C = right (C quits when `usesRight` is false), a tap on the left or right half is left or right, and a tap on a `GameDef.tapRows` row is pick.
The Watch shows the same LCD: the menu and result rows are tappable, taps on the screen halves steer, and B is the selected-tile tap.


## Technicolor 96x96 painters (res96)
Technicolor draws the four games natively on the 96 grid; Traditional's 64 painters are untouched (a test hashes their frames). A `GameEntry` may carry an optional `paint96` (and `hud96` for HUD extras):
- `src/core/minigames/themes96.ts` + `glyphs96.ts`: the 10x10 glyphs for all 12 families, same slots and names as `themes.ts` (good, bonus, bad, obstacles low / tall / spiky, five symbols). Rules, hit boxes and tuning stay in the 7x7 logic units; an obstacle's 10x10 silhouette follows its 7x7 twin (checked by `test/games96.ts`).
- `src/ui/games/common96.ts`: glyph drawing with a sticker outline (CABLE / DAISY, which keep their polarity on dark skies), the pet fitted to a box (32x32 art for small boxes, the 48x48 Scale3x art for big ones), the field backdrop (the family's 96 biome through `drawBackdrop96` in sceneDraw96.ts) and the HUD strip.
- `catch96.ts`, `dash96.ts`, `echo96.ts`, `hilo96.ts`: positions are logic units times 1.5 (`g96`); animation reads the game state or the wall clock exactly as the 64 painters do.
- `screens.ts` uses `paint96` for Technicolor game screens (field games get `paintField96`, `paintHud96` and the TIME UP banner around it); a game without one falls back to its 64 painter enlarged 3/2.
Sheets: `node tools/games96-sheets.js <catch|dash|echo|hilo> [outDir] [fams] [size]`, `node tools/glyph96-sheets.js`. End to end: `MODE=technicolor node tools/play-e2e.js | dash-e2e.js | echo-e2e.js`.
