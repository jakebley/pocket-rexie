# Pocket Rexie

A free, nostalgic virtual pet for iOS 17 and watchOS 10: a tiny pixel dino on a retro LCD screen. It is an independent homage to 1990s egg-style pets, with original species, names and pixel art, and no use of others' names or art. See [docs/RESEARCH.md](docs/RESEARCH.md).

## Design pillars
- **Forgiving by default:** gentle mode is on, so the pet never dies. Classic mode is opt-in.
- **No monetization:** free, with no ads, no in-app purchases, no subscription and no energy gates.
- **System-native:** widgets and Apple Watch complications are the primary surfaces, with restrained, opt-in notifications.

## Features
- 39 original species across 5 stages (egg, baby, child, teen, adult, ultimate), inspired by the Digimon V-Pet style of branching: the form depends on diet, care mistakes, training, battle wins, smarts and weight. See [docs/EVOLUTION.md](docs/EVOLUTION.md)
- Evolution is checked after the pet wakes at 08:00; neglect leads to rougher forms
- The Dex remembers every species discovered, across generations
- 10 menu icons: feed (meat, veggies, pasta or snack), light, play, train, medicine, clean, climate, scold, battle and stats
- Training (15 minute cooldown) and battles (30 minute cooldown) whose odds depend on training, smarts, discipline and stage
- Two-sided temperature: the room can run hot or cold, and the target is about 25 C
- 5-minute simulation ticks; sleeps 21:00-08:00 with decay paused; 4 hearts each for hunger and happiness
- Leaving the light on during sleep causes a care mistake and the pet wakes sick
- Gentle mode on by default (no death); opt-in Classic mode; vacation mode freezes time
- iOS widget, watchOS widget and a standalone Watch app
- Restrained local notifications; no ads, no IAP, no data collection

## Build and run
1. `brew install xcodegen`
2. `xcodegen generate` (creates `PocketRexie.xcodeproj`)
3. Open the project and replace `DEVELOPMENT_TEAM` in `project.yml` (or set your team in Xcode Signing for all four targets). Change the `com.pocketrexie` prefix if it is taken.
4. Select the **PocketRexie** scheme and run on a device or simulator. Select **PocketRexieWatch** for the watch.
5. Widgets: long-press the Home Screen, tap +, and add Pocket Rexie. On Apple Watch, add it to a watch face or the Smart Stack.
6. Watch: the Watch app is standalone and installs with the iPhone app (or run its scheme on a watch simulator).

## Layout
- `project.yml` - XcodeGen spec; `config/` - entitlements (App Group `group.com.pocketrexie.shared`) and generated Info.plists
- `iOS/` - iPhone app; `Watch/` - watch app; `Widget/` - widget shared by both widget extensions
- `Shared/` - pet model, store, sprites, game logic, screen views, intents, sync
- `docs/` - research, evolution guide, naming note, App Store notes, privacy policy
- `tools/species.py` - the evolution tree; run `python3 tools/gen_swift.py` after editing

## Backlog
Possible later features (HealthKit evolution, Live Activity, StandBy night light, co-parenting, share card, more species) are listed in the backlog section of [docs/APP_STORE.md](docs/APP_STORE.md).

## Status

Verified by CI on every push (GitHub Actions, `.github/workflows/ci.yml`). Fast jobs run on every push; renders and simulator UI tests run on `main`, on manual dispatch, or when a commit message contains `[full]`.
- The iPhone app, widget and watch app build on macOS with Xcode.
- 62 XCTest unit tests pass: game engine, evolution tree, save compatibility, balance rules, animal families, colour modes, living-scene director, render and store-screenshot harnesses.
- 18 XCUITest UI tests pass on both an iPhone SE (3rd generation) and an iPhone 16 Pro simulator. They drive the real app by tapping: naming alert, feeding, the play game, stats and dex, the settings sheet (Look tiles, Classic and Vacation, About), a dead pet starting a new egg, and persistence across relaunch.
- The Expo prototype type-checks, lints with zero errors, passes its engine, scene and colour tests, and bundles for web, iOS and Android (Hermes).
- The SwiftUI screens, widgets (small, medium, large, accessory) and the Watch face are rendered to PNGs on `[full]` runs and published to the `ci-screenshots` branch, as are App Store screenshots at the required sizes.
- `expo-prototype/test/balance.ts` simulates 11 play styles and checks every species is reachable and that ordinary care never lands on the neglect line.

Features: 39 species across five stages with branching evolution; a living 64x64 scene (wandering, eating, sleeping, weather and sky by the real hour, a "while you were away" summary); Traditional (monochrome) and Technicolor (muted colour) looks, chosen in Settings and shared with the widgets and Watch; Classic and Vacation modes.

Not yet verified:
- It has not been run on a physical iPhone or Apple Watch, or with a widget on a real home screen. Watch sync of the colour look and of the pet has only been exercised in simulator-level tests.
- Expo Go on a device has not been tried (only the web build and the native bundles).
- The Watch app has no UI tests, only renders.
- Signing, TestFlight and App Store submission need the owner's Apple account (see `docs/RELEASE.md`). Enable GitHub Pages (main /docs) and set `SUPPORT_EMAIL` in `docs/index.html`.
- Evolution thresholds come from simulation and need real play-testing.
- No licence has been chosen; repository visibility is the owner's call.

Plans: `docs/PLUS.md` (free now, paid animal families later), `docs/COLOR_MODES.md`, `docs/LIVING_SCENE.md`, `docs/EVOLUTION.md`.
