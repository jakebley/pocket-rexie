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

Verified by CI on every push (GitHub Actions, `.github/workflows/ci.yml`):
- The iPhone app, widget and watch app build on macOS with Xcode.
- 34 XCTest unit tests pass (game engine, evolution tree, save compatibility, living-scene director).
- The Expo prototype type-checks, lints with zero errors, passes its engine and scene tests, and bundles for web, iOS and Android (Hermes).
- The SwiftUI screens, widgets and watch view are rendered to PNGs by a test (`Tests/UIRenderTests.swift`) and published to the `ci-screenshots` branch for review.

Not yet verified:
- It has not been run on a physical iPhone or Apple Watch, or on a widget placed on a real home screen.
- Expo Go on a device has not been tried (only the web build and the native bundles).
- The settings sheet, the naming alert and the lock-screen inline widget are not covered by the render test.
- Signing, TestFlight and App Store assets (icon, screenshots, hosted privacy page) are still to do. Set `DEVELOPMENT_TEAM` in `project.yml` first.
- Evolution thresholds come from simulation and need real play-testing.
