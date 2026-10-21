# Pocket Rexie watchOS notes

Assume the iOS bundle ID is `com.pocketrexie.app` (adjust to yours).

| Target | Bundle ID |
| --- | --- |
| iOS app | `com.pocketrexie.app` |
| watchOS app | `com.pocketrexie.app.watchkitapp` |
| watch widget extension | `com.pocketrexie.app.watchkitapp.widgets` |

## Watch app Info.plist

```xml
<key>WKApplication</key>
<true/>
<key>WKCompanionAppBundleIdentifier</key>
<string>com.pocketrexie.app</string>
<key>WKRunsIndependentlyOfCompanionApp</key>
<true/>
```

In Xcode 15+ with a single-target watch app these are the build settings
`INFOPLIST_KEY_WKCompanionAppBundleIdentifier` and `INFOPLIST_KEY_WKRunsIndependentlyOfCompanionApp = YES`;
`WKApplication` is implied by the product type. Do not set `WKWatchKitApp` (that is the legacy
WatchKit-extension model).

Because the watch app runs independently, it works with no phone present.

## Entitlements

- App Group `group.com.pocketrexie.shared` on: iOS app, iOS widget, watch app, watch widget.
  The watch and phone do not share a group container, so the watch app's group is only shared with
  its own widget extension. `PetSync` (WatchConnectivity) reconciles the two stores.
- WatchConnectivity needs no entitlement.
- Optional: Background Modes are not needed. Notifications on watch are mirrored from the iPhone
  or scheduled locally with `UNUserNotificationCenter` (no entitlement beyond user permission).

## Frameworks / target membership

- Watch app target: `Shared/*.swift` (Pet, PetStore, Sprites, PetSync, GameModel, LCDScreen) and `Watch/*.swift`.
- iOS app target: also includes `Shared/PetSync.swift`, and calls `PetSync.activate()` at launch.
- Link `WatchConnectivity` (automatic with `import`).

## Sync rules

- `PetSync.push(pet)` is called by `GameModel` after every save: `updateApplicationContext` (latest
  state is delivered when the other side wakes) plus `sendMessage` when reachable.
- On receipt: a higher `generation` wins; otherwise the newer `modified` wins; ties keep local.
  The winner is saved with `PetStore.save` and `.petSynced` is posted on the main queue.
- The iOS side only pushes if the watch app is paired and installed.

## Complication

The watch widget extension target reuses the `Widget/` sources (written separately). Add those files
and `Shared/Pet.swift`, `Shared/PetStore.swift`, `Shared/Sprites.swift` to that target. Nothing in
`Watch/` is needed for it.
