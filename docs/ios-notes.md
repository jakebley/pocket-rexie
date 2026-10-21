# iOS notes

Files: `iOS/PocketRexieApp.swift`, `ContentView.swift`, `SettingsView.swift`, `Beeper.swift`, `Notifier.swift`.
The app target also needs `Shared/` (Pet, PetStore, PetSync, Sprites, GameModel, LCDScreen, PetPixelView).

## Info.plist keys (project.yml generates the plist)

- `CFBundleDisplayName`: Pocket Rexie
- `UILaunchScreen`: empty dictionary
- `UISupportedInterfaceOrientations`: portrait only is recommended (the phone layout is a tall column)
- `ITSAppUsesNonExemptEncryption`: NO
- `UIApplicationSceneManifest` with `UIApplicationSupportsMultipleScenes` = NO (or let Xcode generate it)

No usage-description strings are needed. Local notifications and AVAudioPlayer do not require one.
No background modes are needed.

## Entitlements

- App Groups: `group.com.pocketrexie.shared` (shared with the widget and, where supported, the watch)

## Settings keys (UserDefaults.standard)

- `soundEnabled` (Bool, default true)
- `notificationsEnabled` (Bool, default true)
- `askedNotificationPermission` (Bool, set once the permission prompt has been shown after first hatch)

## Notes

- Notification permission is requested after the first hatch, never at launch.
- At most two notifications are pending (`rexie.call`, `rexie.soon`), plus `rexie.hatch` while the pet is an egg.
- `GameModel.onSave` is how the app reschedules notifications after every save.

## Phone layout (no device shell)

- The phone is the device: the whole screen is the LCD ground. Light mode uses `LCDStyle.background` with `LCDStyle.ink`; dark mode is a backlit look (ground `#1E2418`, ink is the light LCD green).
- `LCDPalette` (background, ink) and `LCDStyle.palette(for:)` pick the palette. LCD views read it from the `\.lcdPalette` environment value, which defaults to the light palette, so widgets and the watch are unchanged. `ContentView` and `SettingsView` inject it from `colorScheme`.
- `LCDScreen(model:framed:)`: `framed: true` gives square corners and a full-ink hairline. `PetPixelView(pet:palette:)` takes an optional palette. `PixelText`, `PixelParagraph` and `PixelGlyphView` take an optional color and fall back to the palette ink.
- The square is sized from both width (minus a 16pt gutter, max 440pt) and the height left after the gear row, two 48pt icon rows, the message and the 56pt A/B/C controls, so small phones (SE) need no scrolling.
- Menu glyphs and A/B/C have at least 44pt hit areas; the gear is an 8x8 bitmap (`PixelBitmap.gear`) in a 44pt button.

## Living scene (see LIVING_SCENE.md)

- `Shared/LivingScene.swift`: the pure, seeded behaviour director (`SceneState.step(pet:inputs:now:)`, 8 ticks per second, random choices from `rng(pet.seed, tick)`), `SceneEvent`, `SceneTap`, `SceneInputs` (events, tap, `reducedMotion`, `raining`) and `AwaySummary` (the "WHILE YOU WERE AWAY" line). No UIKit or SwiftUI.
- `Shared/SceneRenderer.swift` + `SceneGlyphs.swift`: draw the 32x32 room into a `SceneRaster` (plain `[Bool]` ink and dither-shade layers); `LCDPainter.path(_:shade:size:)` turns it into a SwiftUI `Path`. `SceneRenderer.still(pet:)` is the static picture the widget uses (pet standing, or on the bed asleep; sky for the hour of `pet.lastTick`; poops; thought bubble).
- `LCDScreen` owns a `SceneDirector` (class in `@State`), steps it from a `TimelineView(.animation(minimumInterval: 0.125, paused:))`, and pauses it when the scene phase is not active or a text screen is open. It honours `accessibilityReduceMotion` (no wandering, drift, blink or flashes; reaction poses still play). Taps: pet = pet it, ground = walk and look, sky = look up.
- `GameModel.sceneEvents` is a display-only queue (fed, snack, cleaned, medicine, trained, battle, played, climate, light, petted, evolved, hatched, returned); the screen drains it. `onSceneEvent` fires as each is queued; `ContentView` uses it for a light haptic on petting (hatch and evolve already buzz from the stage/species change handlers).
- `lastSeen` is stored in `UserDefaults.standard` (key `rexie.lastSeen`, per device, not in the synced pet). `welcomeBack()` runs on foreground; after 15+ minutes it sets `awayLine`, shows it in the message line for 8 s (tap the line to dismiss) and sends the `returned` event so the pet runs in and waves. `noteLeaving()` runs when the app goes to the background.
- Hatching now alternates the baby with the cracked shell for 4 s (was 20 s) before the shells fall and the baby hops out.
- Tests: `Tests/LivingSceneTests.swift`; `PocketRexieTests` compiles `Sprites.swift`, `LivingScene.swift`, `SceneGlyphs.swift` and `SceneRenderer.swift` alongside the engine.
