# Releasing to TestFlight

A click-by-click checklist for your first upload. You need an Apple ID, a Mac or any browser (no Xcode needed), and an iPhone (ideally with an Apple Watch).

## What is already proven, and what is not
Verified in CI (workflow "Release dry run", runs on every change to the app code):
- The iPhone app builds as a **Release archive** with its widget, Watch app and Watch widget embedded.
- Bundle ids, display name "Pocket Rexie", version and build number are identical across all four targets.
- App icons (iPhone and Watch, 1024 px, no transparency), privacy manifests (no tracking, no collected data) and the App Group `group.com.pocketrexie.shared` on all four targets are present.

Not verified (needs your Apple account, so it is untested until you run it): code signing and provisioning, the upload itself, App Store Connect processing, and anything on a real device. The first run may need one or two fixes; the failing step and the `release-logs` artifact will say which.

## Names
TestFlight and the first build use the display name **Pocket Rexie** and bundle ids `com.pocketrexie.*`. The bundle ids are permanent once the app exists in App Store Connect. The display name can still be changed before public release, in App Store Connect (app name) and in `CFBundleDisplayName` in `project.yml`.

## One-time setup
1. **Apple Developer Program.** Enrol at developer.apple.com/programs (99 USD per year, can take a day or two to approve). Use an individual account unless you have a company.
2. **Team ID.** developer.apple.com/account, Membership details, copy the 10-character Team ID.
3. **Identifiers.** developer.apple.com/account, Certificates, Identifiers and Profiles, Identifiers, plus button. You need to create these (automatic signing creates certificates and profiles, but not always identifiers and groups):
   - App Group: `group.com.pocketrexie.shared`
   - App IDs (type App, explicit), each with the App Groups capability switched on and set to that group:
     - `com.pocketrexie.app`
     - `com.pocketrexie.app.widget`
     - `com.pocketrexie.app.watchkitapp`
     - `com.pocketrexie.app.watchkitapp.widget`
4. **App Store Connect app record.** appstoreconnect.apple.com, Apps, plus button, New App. Platform iOS, name "Pocket Rexie" (if taken, pick another; the name is only the store name), primary language, bundle ID `com.pocketrexie.app`, SKU `pocketrexie`.
5. **API key.** App Store Connect, Users and Access, Integrations, App Store Connect API, Team Keys, plus button. Name "GitHub", access **App Manager**. Copy the Issuer ID (above the list) and the Key ID, and download the `.p8` file (one time only).
6. **Four GitHub secrets.** github.com/jakebley/pocket-rexie, Settings, Secrets and variables, Actions, New repository secret:
   - `APPLE_TEAM_ID`: the Team ID from step 2
   - `ASC_KEY_ID`: the Key ID
   - `ASC_ISSUER_ID`: the Issuer ID
   - `ASC_KEY_P8_BASE64`: the `.p8` file as base64. On a Mac run `base64 -i AuthKey_XXXX.p8 | pbcopy` and paste. Without a Mac, any online "file to base64" tool works for a file you trust it with; better use a local tool.

## Upload
1. Make sure the code you want is on `main` (the release workflow refuses other branches).
2. GitHub, Actions, "Release to TestFlight", Run workflow, branch `main`.
3. Wait about 15 to 30 minutes. The run summary shows the version and build number. Build numbers are 100 plus the run number, so they always go up. Do not use "Re-run" after a build was uploaded; start a new run.
4. In App Store Connect, your app, TestFlight tab: the build appears after Apple's processing (5 to 30 minutes, you get an email). If it says "Missing Compliance", the app already declares no non-exempt encryption, so it should not.

## Testers and installing
1. App Store Connect, your app, TestFlight, Internal Testing, plus button, create a group, add yourself (you must be a user in Users and Access; add others there first). Internal testers need no Apple review.
2. Add the build to the group. Install the TestFlight app on your iPhone, sign in with the same Apple ID, install Pocket Rexie.
3. The Watch app installs automatically on the paired watch (iPhone Watch app, Available Apps, Pocket Rexie, Install if needed).

## What to check on device
- First launch, naming the pet, relaunch keeps the pet.
- Settings, Testing section (only in TestFlight builds): Preview Plus, Show egg chooser, New egg of any family (try every animal family and its look), Version and build number.
- Notifications: permission prompt, a reminder arrives, turning it off stops it.
- Widgets: home screen and lock screen widget show the pet and update after feeding.
- Watch: app opens, pet matches the phone after a change on either side, Watch widget.
- Classic and Vacation modes; Look (Traditional and Technicolor) applies to phone, widgets and Watch.
- Send crash logs or screenshots of anything wrong.

## If something fails
Open the failed run, read the red step, and download the `release-logs` artifact (archive, export and verification logs). Likely first-run problems:
- "No profiles for ..." or "App Group ... not available": an identifier or the App Group from setup step 3 is missing, or the App Group is not enabled on one of the four App IDs.
- "Authentication failed" or 401: wrong Key ID, Issuer ID or a mis-encoded key; the API key needs App Manager access.
- "No app record found": step 4 was not done or the bundle id differs.
- Upload rejected for a build number already used: start a new run.

## Before public release (not needed for TestFlight)
- Fill the listing from `docs/APP_STORE.md` and add screenshots from the `store/` folder on the `ci-screenshots` branch. The Testing section is hidden automatically in App Store builds.
- Enable GitHub Pages (Settings, Pages, deploy from `main`, `/docs`), set `SUPPORT_EMAIL` in `docs/index.html`, and use `https://jakebley.github.io/pocket-rexie/` as privacy and support URL.
- Search "Pocket Rexie" in the USPTO, EUIPO and WIPO trademark databases and the App Store, and decide the final display name.
- Public TestFlight and App Store review require the listing, privacy answers (collects no data) and an age rating; external testers need a short Beta App Review.
