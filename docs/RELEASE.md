# Releasing to TestFlight

This is the owner checklist for the steps that need your Apple account and a physical device. Nothing here has been run, because it needs credentials this repository does not have. Treat the workflow as untested until the first run.

## One-time setup
1. Enrol in the Apple Developer Program and note your 10-character Team ID.
2. In App Store Connect, create the app record with bundle ID `com.pocketrexie.app`. Add the widget (`com.pocketrexie.app.widget`), watch app (`com.pocketrexie.app.watchkitapp`) and watch widget (`com.pocketrexie.app.watchkitapp.widget`) identifiers, and the App Group `group.com.pocketrexie.shared`, under Certificates, Identifiers and Profiles. Automatic signing creates profiles for them.
3. Create an App Store Connect API key (Users and Access, Integrations, Keys) with the App Manager role. Download the `.p8` file once.
4. Add these repository secrets (Settings, Secrets and variables, Actions):
   - `APPLE_TEAM_ID`: your Team ID
   - `ASC_KEY_ID`: the key's ID
   - `ASC_ISSUER_ID`: the issuer ID shown above the keys list
   - `ASC_KEY_P8_BASE64`: the output of `base64 -i AuthKey_XXXX.p8`
5. Run the "Release to TestFlight" workflow from the Actions tab. It sets the team and build number, archives, exports and uploads. Builds appear in TestFlight after Apple's processing.

## Before you submit for review
- Test the TestFlight build on a physical iPhone and Apple Watch. Check: first launch and naming, notifications permission and delivery, the widget on the home and lock screens, the Watch app and iPhone sync, relaunch persistence, and that Classic and Vacation modes behave.
- Fill the listing from `docs/APP_STORE.md`. Upload screenshots from the `store/` folder on the `ci-screenshots` branch.
- Enable GitHub Pages (Settings, Pages, deploy from `main` `/docs`) and put your address in the support section of `docs/index.html` (`SUPPORT_EMAIL`). Use `https://<you>.github.io/pocket-rexie/` for the privacy and support URLs.
- Search "Pocket Rexie" in the USPTO, EUIPO and WIPO trademark databases and the App Store.
- Choose a license or leave it unlicensed, and decide whether the repository stays public.

## If something fails
Send the failing step's output or a crash log and it can be fixed from there. The most likely first-run problems are missing App Group or identifier setup (the archive step reports a provisioning error) and widget or watch targets needing their identifiers registered.
