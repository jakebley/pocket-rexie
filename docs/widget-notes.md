# Widget notes

Files: `Widget/PocketRexieWidget.swift` (own `@main`; one per extension target) plus shared
`Shared/Pet.swift`, `PetStore.swift`, `Sprites.swift`, `PetPixelView.swift` (and whatever it needs,
e.g. `LCDScreen.swift`), `PetIntents.swift`. No asset catalog is needed.

## Targets

- iOS widget extension (`com.pocketrexie.app.widget`, iOS 17): all families.
- watchOS widget extension (watchOS 10): same source file; `#if os(watchOS)` restricts to accessory families.
- `PetIntents.swift` must be in the app, watch app and every widget extension (interactive buttons run in the extension process).
- Frameworks: WidgetKit, SwiftUI, AppIntents (auto-linked).

## Entitlements (every target: iOS app, widget, watch app, watch widget)

```xml
<key>com.apple.security.application-groups</key>
<array><string>group.com.pocketrexie.shared</string></array>
```

The App Group must be enabled in the Apple Developer portal / Signing & Capabilities for each target.
Note: the watch and the phone have separate containers; the watch app keeps its own save.

## Info.plist (widget extension)

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.widgetkit-extension</string>
</dict>
```

(XcodeGen: `type: app-extension` with `NSExtension` as above. watchOS widget extension uses the same
extension point.) `CFBundleDisplayName` is optional. No `NSSupportsLiveActivities` needed.

## Host app Info.plist

Register the URL scheme the widget opens via `widgetURL`:

```xml
<key>CFBundleURLTypes</key>
<array><dict>
  <key>CFBundleURLSchemes</key><array><string>pocketrexie</string></array>
</dict></array>
```

## Behavior

- Timeline: 13 entries (now + 12 at 15-minute steps) built by advancing a copy of the pet; policy `.after(last)`.
- Entries ignore future user actions; every action (in-app or via intent) calls `PetStore.save`, which calls `WidgetCenter.reloadAllTimelines()`.
- Widget kind: `PocketRexieWidget`.
