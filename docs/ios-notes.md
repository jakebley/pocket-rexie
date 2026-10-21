# iOS notes

Files: `iOS/PocketRexieApp.swift`, `ContentView.swift`, `SettingsView.swift`, `Beeper.swift`, `Notifier.swift`.
The app target also needs `Shared/` (Pet, PetStore, PetSync, Sprites, GameModel, LCDScreen, PetPixelView).

## Info.plist keys (project.yml generates the plist)

- `CFBundleDisplayName`: Pocket Rexie
- `UILaunchScreen`: empty dictionary
- `UISupportedInterfaceOrientations`: portrait only is recommended (the shell is a tall egg)
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
