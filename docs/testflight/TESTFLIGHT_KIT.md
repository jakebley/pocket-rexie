# Pocket Rexie: TestFlight kit

Prepared 11 November 2026. This kit has everything you need to put Pocket Rexie in front of public testers on iPhone: the steps in the order you do them, the text to paste into App Store Connect, a guide you can hand to testers, and an honest list of what has and has not been checked.

Contents: 1. Start here. 2. Fields to paste into App Store Connect. 3. Tester guide. 4. What was checked, and what was not. 5. Troubleshooting. 6. Reference values.

---

# 1. Start here

## What you need

- An Apple ID, and about 99 USD for the Apple Developer Program (one year).
- A web browser. You do not need Xcode or a Mac for the upload, because GitHub builds and uploads the app for you.
- An iPhone running iOS 17 or later, and ideally an Apple Watch running watchOS 10 or later, to test on.
- An email address to use as the public feedback address. Use one you do not mind showing to testers. This kit does not fill in your own address for you.

## The order of work

Most of it is waiting on Apple. The first two steps can run in parallel with everything else, so start them tonight or first thing tomorrow.

1. Join the Apple Developer Program at developer.apple.com/programs. Approval can take from a few minutes to two days.
2. Decide how to host the privacy policy page (see step 3 below). Public testers need a working privacy policy link.
3. When your membership is active, copy your 10 character Team ID from developer.apple.com/account under Membership details.
4. Create the identifiers: one App Group and four App IDs (list in section 6). Switch on the App Groups capability for each App ID and select the group.
5. Create the app in App Store Connect (Apps, plus button, New App). Name Pocket Rexie, bundle ID com.pocketrexie.app, SKU pocketrexie.
6. Create an App Store Connect API key with the App Manager role. Note the Key ID and the Issuer ID, and download the .p8 file. Apple lets you download it once.
7. Add four secrets in the GitHub repository (Settings, Secrets and variables, Actions): APPLE_TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8_BASE64 (the .p8 file encoded as base64).
8. In GitHub, open Actions, choose Release to TestFlight and run it on the main branch. It takes 15 to 30 minutes.
9. When Apple finishes processing the build (an email arrives, usually within 30 minutes), open the TestFlight tab of your app, add yourself to an internal group and install the build on your phone and watch. Test it yourself first.
10. Fill in the test information (section 2), create an external group, add the build and submit it for Beta App Review. The first build is reviewed by Apple, usually within a day.
11. When it is approved, switch on the public link for the external group, set the tester limit and share the link.

## Step 3 in detail: the privacy policy page

The repository already contains a support and privacy page at docs/index.html, written to say that the app collects nothing. To publish it as a web page you can use GitHub Pages, which serves the docs folder of the main branch at https://jakebley.github.io/pocket-rexie/.

- Before publishing, open docs/index.html and replace the text SUPPORT_EMAIL with your own support address.
- In the repository, go to Settings, then Pages, set Source to Deploy from a branch, choose main and the /docs folder, and save.
- GitHub Pages on a private repository needs a paid GitHub plan. If you make the repository private, either upgrade or host the same page somewhere else, and use that address instead. The repository is public today, and I could not change that from here.

## External testing, in the order App Store Connect asks

1. TestFlight tab, External Testing, plus button, New Group. Name it Public beta.
2. Test Information (left side, under TestFlight): paste the Beta App Description, Feedback Email, Privacy Policy URL, Marketing URL and the review contact details from section 2.
3. Add the uploaded build to the group. Paste the What to Test text. Submit for review.
4. When the build is approved, open the group and switch on Public Link. Choose a tester limit (the maximum is 10,000) and copy the link.
5. Share the link. Testers open it on an iPhone, install TestFlight if they do not have it, and tap Accept and Install.

TestFlight builds expire 90 days after upload. Each new upload needs its own run of the workflow, and a new build number is chosen automatically (100 plus the run number).

---

# 2. Fields to paste into App Store Connect

These are written to the limits Apple sets. Field names can differ slightly from the labels on your screen; the intent is the same.

### App information

| Field | Value |
|---|---|
| App name | Pocket Rexie (change it before public release if you pick a new name) |
| Bundle ID | com.pocketrexie.app (permanent once created) |
| SKU | pocketrexie |
| Primary language | English (U.S.) |
| Category | Games, Simulation |
| Price | Free |

### Beta App Description (4000 characters maximum)

```text
Pocket Rexie is a virtual pet that lives on a retro pixel screen, in the spirit of the handheld pets from the 1990s. Hatch an egg, feed it, play with it, clean up after it and put it to bed. What it eats and how you look after it decides which form it grows into.

This beta includes twelve animal families: dinosaurs, foxes, fish, birds, cats, bunnies, dragons, robots, slimes, bugs, aliens and halo and horn spirits. Each family has its own stages, evolution branches and background scene. There are about 440 forms to find in total, and the Dex records the ones you discover.

The app also has Home Screen and Lock Screen widgets, an Apple Watch app, a Traditional black and white look and a Technicolor look, and gentle and Classic care modes.

Everything stays on your device. There are no accounts, no ads and no tracking.
```

### Feedback Email

Use your own address. Testers see it, and replies from TestFlight feedback go there.

### Marketing URL and Privacy Policy URL

| Field | Value |
|---|---|
| Marketing URL | https://jakebley.github.io/pocket-rexie/ |
| Privacy Policy URL | https://jakebley.github.io/pocket-rexie/#privacy |

### Beta App Review contact

First name, last name, phone number and email of the person Apple can contact about the review. Use your own details. Sign-in is not required, so leave the sign-in box off.

### Review notes (for Apple)

```text
No sign-in or special setup is needed. The app works fully offline and collects no data. A new egg hatches after about ten minutes of real time. Later stages follow real time (baby at 8 hours, child at 36 hours, teen at 72 hours, adult at 7 days), so to see other forms during review, open Settings, then the Testing section and use New egg of any family, and open the Dex from the Stats screen. The Testing section only appears in TestFlight builds. The app has no purchases, no accounts and makes no network requests. Notifications are local and optional. The Apple Watch app and widgets share the pet through an App Group on the same device, and the Watch syncs with the paired iPhone through Apple's WatchConnectivity framework.
```

### What to Test (per build, 4000 characters maximum)

```text
Thanks for testing Pocket Rexie.

1. Hatch an egg and name your pet. Close the app and reopen it a few times; your pet should still be there.
2. Open Settings and the Testing section. Every animal family is unlocked in this beta, so start an egg from several families with the New egg of any family menu. Check that each family looks right and that the feed menu uses its own food names.
3. Try feeding, playing, cleaning, turning the light off and the other care icons. Hold an icon for a moment to read what it does.
4. Switch the look between Traditional and Technicolor, and between light and dark mode.
5. Add a widget to the Home Screen and the Lock Screen and check that it updates after you care for your pet.
6. If you have an Apple Watch, open the Watch app and the Watch widget and check that the pet matches your phone.
7. Allow notifications once and see whether the reminder arrives at a sensible time.

Known limits: the Play game on the phone is still the simple higher or lower game; new mini games are not in this build. The other animal families are free during the beta and may become optional add-ons later.

Please tell us about crashes, anything that looks wrong or is hard to read, and anything that feels confusing. To send feedback, take a screenshot in the app and use the share sheet that TestFlight offers, or use Send Beta Feedback in TestFlight.
```

### App privacy answers

- Data collection: select that you do not collect data from this app. The app has no accounts, no analytics, no advertising, no third party code and no network requests.
- Tracking: no.
- Export compliance: the app declares that it uses no non exempt encryption (ITSAppUsesNonExemptEncryption is set to false), so the build should not ask. If App Store Connect asks anyway, answer that the app does not use encryption beyond what the operating system provides, and that it qualifies for the exemption.
- Content rights: you made the art and code; nothing is taken from other games.
- Age rating answers (for later, at public release): infrequent or mild cartoon and fantasy violence (pixel battles), everything else none. The suggested result is 12+.

### Words to avoid anywhere in the listing

Do not use Tamagotchi, Dinkie, Dinkie Dino, Digimon, Bandai or any word ending in gotchi in the name, description, keywords or screenshots. They belong to other companies. The copy above avoids them.

---

# 3. Tester guide

Hand this page to testers, or paste it where you share the link.

## Welcome to the Pocket Rexie beta

Pocket Rexie is a small virtual pet on a retro pixel screen. This beta has twelve animal families and about 440 forms to discover. Thank you for helping to test it.

### Getting started

1. Install TestFlight from the App Store if you do not have it. You need an iPhone with iOS 17 or later.
2. Open the invitation link and tap Accept, then Install.
3. Open Pocket Rexie, hatch your egg and give your pet a name.
4. If you have an Apple Watch, open the Watch app on your iPhone and make sure Pocket Rexie is installed on the watch.

### What to try

- Care: feed, play, clean, put the light out at bedtime. Hold any icon to see what it does.
- Animal families: open Settings, then Testing, then New egg of any family. This replaces your pet with a fresh egg but keeps your Dex, so try a few.
- Looks: switch between Traditional (black and white) and Technicolor, and between light and dark.
- Widgets: add one to the Home Screen or Lock Screen and see whether it updates.
- Watch: check that the pet on the watch matches the phone.
- Reminders: allow notifications once and see whether the reminder feels useful and not annoying.

### Things to know

- Pets grow in real time, over days. The Testing section lets you start with any family, and the Dex lists every form.
- The Play game on the phone is still the original higher or lower game. New mini games exist in a separate preview and are not in this build.
- Extra animal families are free while testing. They may become optional add-ons later.
- Your pet is stored only on your device. Deleting the app deletes it.
- Beta builds stop working after 90 days. We will post a newer build before then.

### How to send feedback

Take a screenshot in the app and tap Share Beta Feedback when TestFlight offers it, or open TestFlight, choose Pocket Rexie and tap Send Beta Feedback. Please say what you were doing, what you expected and what happened, and include your iPhone model. Crash reports are sent automatically if you allow TestFlight to share them.

---

# 4. What was checked, and what was not

This section lists the checks behind the build as it stands. I could not run the app on a physical iPhone or Apple Watch, and I do not have your Apple credentials, so everything on that side is untested.

## Checked by automated builds on macOS

- The iPhone app, its widget, the Watch app and the Watch widget build together as an unsigned Release archive on every relevant change (the Release dry run workflow). A first run of this check found a real fault: the generated project was leaving the App Group out of every target. It is fixed.
- The dry run also confirms matching bundle IDs, display name, version and build numbers on all four targets, 1024 pixel icons without transparency for iPhone and Watch, privacy manifests that declare no tracking and no collected data, and the App Group on all four targets.
- Unit tests on the iOS simulator: 111 tests, no failures, on the build that precedes the final change below.
- UI tests on two simulators (iPhone SE and iPhone 16 Pro): 18 of 18 passed on each in the most recent complete run. The Pro simulator failed twice earlier on unrelated simulator timeouts and then passed.
- Screenshot renders of the phone, widgets and Watch passed, and I looked at several of them: icon labels, shading, backgrounds and the egg chooser.
- The web preview of the same game logic, which the native app was ported from, passes its own suite of several thousand checks.

## Changed last, and still being built when this kit was written

- TestFlight builds now start with Preview Plus switched on, so public testers can try every family without finding the setting. It has a unit test and a full CI run was started on the change. If that run is red when you read this, the previous commit (1089828) is the last fully verified state; tell me and I will fix the failure.

## Not checked

- Code signing, provisioning and the upload itself. They need your Apple account. The first run of the release workflow may need a fix or two, and the run log will say which.
- Anything on a real device: the Apple Watch sync, widgets on the Lock Screen, notifications and their timing, haptics and sound, touch comfort of the small icons, battery use, and memory on older phones.
- The Pro iPhone UI tests have failed twice in earlier runs on simulator timeouts. They pass on a clean run, but I would expect an occasional red run to be simulator noise.
- How the app feels to people other than the owner. The tuning of growth speed, mood decay and reminder timing comes from simulation, not from players.
- Language other than English, accessibility with VoiceOver and Dynamic Type beyond the basic labels, and iPad layouts (the app is iPhone only).

## Known limits in this build

- The native Play game is the original guess game. The four new mini games (higher or lower, catch, dash and echo, with high scores) exist in the web preview and are being ported.
- Some art is weaker than the rest. Examples are a few moth and bat shapes among the bugs, the lops among the bunnies, some drakes among the dragons, and the babies of several families.
- The extra families cannot be bought, because purchases are not built. In TestFlight they are all unlocked; in an App Store build they would be locked.
- The app icon shows the dinosaur from the first version. It does not yet show the other families.
- Only the dinosaur family has been tested for long play over many days in simulation.

---

# 5. Troubleshooting

| What you see | Likely cause and fix |
|---|---|
| Release workflow stops at Check secrets | One of the four secrets is missing or misspelled. Names are APPLE_TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8_BASE64. |
| No profiles for com.pocketrexie... or App Group not available | An App ID or the App Group is missing, or the App Groups capability is not switched on for one of the four App IDs. Fix it in Certificates, Identifiers and Profiles and run again. |
| Authentication failed or 401 | Wrong Key ID or Issuer ID, a damaged base64 key, or the key does not have App Manager access. |
| No app record found | The app was not created in App Store Connect, or its bundle ID is not com.pocketrexie.app. |
| Upload rejected: build number already used | Start a new run. Do not use Re-run after a build was uploaded. |
| Build shows Processing for a long time | This is normal for up to an hour. Apple emails you when it is done. |
| Missing Compliance | Open the build and answer that the app uses no encryption beyond the operating system. The app already declares this, so it should not appear. |
| Beta App Review rejects the build | Read the message. Common causes are a privacy policy link that does not load or review notes that do not explain the Testing section. Fix the link or add a sentence to the notes and resubmit. |
| Testers cannot install | They need iOS 17 or later. The public link must be switched on, and the tester limit must not be full. |
| Where are the logs | The failed run in GitHub Actions has a release-logs artifact with the archive, export and verification logs. |

If something fails and the message is not clear, send me the red step's text from the run, or a crash log from TestFlight, and it can usually be fixed in one change.

# 6. Reference values

| Item | Value |
|---|---|
| Display name | Pocket Rexie |
| iPhone app bundle ID | com.pocketrexie.app |
| Widget bundle ID | com.pocketrexie.app.widget |
| Watch app bundle ID | com.pocketrexie.app.watchkitapp |
| Watch widget bundle ID | com.pocketrexie.app.watchkitapp.widget |
| App Group | group.com.pocketrexie.shared |
| Minimum versions | iOS 17.0, watchOS 10.0 |
| Version | 1.0 |
| Build number | 100 plus the workflow run number |
| Workflow to run | Release to TestFlight (Actions tab, branch main) |
| GitHub secrets | APPLE_TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8_BASE64 |
| Privacy and support page | docs/index.html, published at https://jakebley.github.io/pocket-rexie/ once Pages is on |
| Repository | github.com/jakebley/pocket-rexie |

Secrets belong in the GitHub settings page only. Do not paste the .p8 key, the Team ID or any password into a chat, an email or a file in the repository.
