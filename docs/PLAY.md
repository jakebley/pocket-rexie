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
