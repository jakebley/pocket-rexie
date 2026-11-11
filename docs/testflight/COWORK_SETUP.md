# Cowork task: set up Pocket Rexie for TestFlight

You are doing the one-time Apple and GitHub setup so the repo's "Release to TestFlight" workflow can upload a build. The owner already has a paid Apple Developer account and is signed in to the browser you control. Work in the owner's signed-in browser and Mac.

## Ground rules
- Never type, read aloud, or paste any secret into chat or into a file in the repo. That covers the .p8 key, its base64 text, the Key ID, the Issuer ID and the Team ID. They go only into the GitHub secret form fields.
- If Apple or GitHub asks for a password, 2FA code, passkey or CAPTCHA, stop and hand control to the owner. Resume after they finish.
- Do not change anything not listed here. Do not delete or edit existing identifiers, apps or keys. If something with the same name already exists, reuse it and tell the owner.
- Do not run any other workflow. Do not change repo visibility, settings or code.
- Report back at the end with a short list of what was created, what already existed, and anything that needs the owner.

## Fixed values
- GitHub repo: `jakebley/pocket-rexie` (branch `main`)
- App name: Pocket Rexie (if taken, use "Pocket Rexie Pet" and tell the owner)
- SKU: `pocketrexie`
- App Group: `group.com.pocketrexie.shared`
- Bundle IDs (explicit, type App):
  - `com.pocketrexie.app`
  - `com.pocketrexie.app.widget`
  - `com.pocketrexie.app.watchkitapp`
  - `com.pocketrexie.app.watchkitapp.widget`

## Step 1: Team ID
1. Open developer.apple.com/account and go to Membership details.
2. Note the 10-character Team ID. Keep it in your working memory only, for step 6.

## Step 2: App Group
1. Certificates, Identifiers and Profiles, Identifiers, plus button.
2. Choose App Groups, description "Pocket Rexie shared", identifier `group.com.pocketrexie.shared`. Register.

## Step 3: Four App IDs
For each of the four bundle IDs above:
1. Identifiers, plus button, App IDs, type App.
2. Description: "Pocket Rexie" plus the suffix (App, Widget, Watch, Watch Widget). Bundle ID: Explicit, the exact value above.
3. Capabilities: tick App Groups only. Then Configure and select `group.com.pocketrexie.shared`.
4. Continue, Register.
Afterwards open each one and confirm App Groups is enabled with that group.

## Step 4: App Store Connect record
1. appstoreconnect.apple.com, Apps, plus button, New App.
2. Platforms: iOS. Name: Pocket Rexie. Primary language: English (U.S.). Bundle ID: `com.pocketrexie.app` (pick it from the list). SKU: `pocketrexie`. User access: Full Access.
3. Create. Do not fill in store listing details.

## Step 5: API key
1. App Store Connect, Users and Access, Integrations, App Store Connect API, Team Keys.
2. If this is the first key, request access if prompted.
3. Plus button. Name: `GitHub Pocket Rexie`. Access: App Manager. Generate.
4. Copy the Issuer ID (shown above the key list) and the Key ID for this key.
5. Download the API key (.p8). It can be downloaded once. Save it to a folder outside the repo, for example `~/Documents/Keys/`. Do not open it in an editor that syncs to the cloud.

## Step 6: GitHub secrets
Open github.com/jakebley/pocket-rexie, Settings, Secrets and variables, Actions, New repository secret. Create exactly these four, pasting each value straight into the form:

| Name | Value |
|---|---|
| `APPLE_TEAM_ID` | Team ID from step 1 |
| `ASC_KEY_ID` | Key ID from step 5 |
| `ASC_ISSUER_ID` | Issuer ID from step 5 |
| `ASC_KEY_P8_BASE64` | the .p8 file as one-line base64 |

For the last one, in Terminal run `base64 -i ~/Documents/Keys/AuthKey_XXXXXXXXXX.p8 | tr -d '\n' | pbcopy` (use the real file name), then paste into the secret field. Do not print the output. Afterwards copy any harmless text to clear the clipboard.

If a secret with the same name exists, tell the owner and ask before overwriting.

## Step 7: Run the release
1. GitHub, Actions, "Release to TestFlight", Run workflow, branch `main`, Run.
2. Watch the run. It takes about 15 to 30 minutes. Do not use "Re-run" on a run that uploaded a build.
3. If it fails, open the failed step, read the error, and download the `release-logs` artifact if present. Do not try to fix signing by changing repo files. Report the failing step name and the exact error text (it will not contain secrets) to the owner.
4. If it succeeds, open App Store Connect, the app, TestFlight tab. Wait for the build to finish processing (5 to 30 minutes).

## Step 8: Testers (only after a build shows as Ready to Test)
1. TestFlight, Internal Testing, plus button, group name "Owner". Add the owner's Apple ID as a tester and add the processed build.
2. Do not create an external group or a public link yet. The owner will decide.

## Done report
Tell the owner:
- Which items were created and which already existed.
- The workflow run result and the build number.
- Whether the build is visible in TestFlight.
- Anything left for the owner (for example, install the TestFlight app on the iPhone and accept the invite).
