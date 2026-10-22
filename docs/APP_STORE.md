# App Store notes

Final copy for App Store Connect. Character limits are noted; every field below fits.

## Metadata
- **Name:** Pocket Rexie (13)
- **Subtitle (30 max):** A tiny pixel dino to raise (26)
- **Promotional text (170 max):** Raise a tiny pixel dinosaur from egg to adult on a retro LCD screen. Feed it, play, tuck it in at night, and see who it grows into. Free, no ads. (145)
- **Category:** Primary Games > Simulation. Secondary: Entertainment.
- **Price:** Free. No ads, no in-app purchases, no subscription, no accounts, no tracking.
- **Copyright:** the owner's name and year.
- **Positioning:** adult nostalgia. Metadata should not imply that children are the main audience (guideline 2.3.8).

## URLs (GitHub Pages)
- **Support URL:** https://jakebley.github.io/pocket-rexie/#support
- **Privacy Policy URL:** https://jakebley.github.io/pocket-rexie/#privacy
- **Marketing URL (optional):** https://jakebley.github.io/pocket-rexie/

**Owner steps before submitting**
1. Enable GitHub Pages: repository Settings > Pages > Build and deployment > Deploy from a branch > `main` and folder `/docs`. The page is docs/index.html.
2. Edit docs/index.html and replace `SUPPORT_EMAIL` with a real support address (also mentioned in docs/PRIVACY.md), then check the URLs above load.

## Description
Pocket Rexie is a tiny dinosaur that lives on a retro pixel screen, like the handheld pets you may remember from the 1990s. Feed it, play with it, clean up after it, tuck it in at bedtime, and watch it grow from an egg into one of many adult forms. What it eats and how you care for it shapes who it becomes.

- A classic care loop: meals, snacks, play, training, medicine, lights and a comfy room
- Hearts for hunger and happiness
- A Dex that fills in as you discover new forms
- Branching evolution, set by diet, training and care
- Gentle mode is on by default, so your tiny dinosaur never passes away
- An optional Classic mode for players who want real consequences
- Vacation mode pauses time while you are away
- Widgets for iPhone and Apple Watch, and a standalone Watch app
- A light and a dark LCD look
- At most about one gentle reminder a day, and only if you opt in
- Free. No ads, no purchases, no accounts, no data collection.

An independent nostalgic homage to 1990s virtual pets, with original pixel art.

## Keywords (100 max, 98 used)
`virtual pet,pixel,dino,dinosaur,retro,lcd,nostalgia,widget,watch,pet care,egg,cozy,evolve,creature`

Do **not** use "Tamagotchi", "Dinkie", "Dinkie Dino", "Digimon", "Bandai" or any "-gotchi" term in the name, subtitle, keywords, description or screenshots. They are trademarks or names of others. Describe the app as a "tiny dinosaur" and a "virtual pet".

## What's New (first release)
Welcome to Pocket Rexie! Hatch your egg, care for your tiny dinosaur and discover how it evolves. Includes Home Screen and Lock Screen widgets and an Apple Watch app.

## Age rating answers (questionnaire)
Resulting rating: **12+** (conservative; the content is mild). Not in the Kids Category.
- Cartoon or fantasy violence: **Infrequent/Mild** (the pet can have pixel "battles"; no blood or realistic violence)
- Realistic violence, sexual content, nudity, profanity, horror, drugs, alcohol, tobacco, gambling (real or simulated), contests: **None**
- Medical or treatment information: **None** (the pet takes pretend medicine in the game)
- Unrestricted web access, user-generated content, chat or messaging: **No**
- In-app purchases, loot boxes: **None**
- Not directed at children under 13. The pet may pass away in the opt-in Classic mode, shown gently.

## App Privacy
**Data Not Collected.** Select "No, we do not collect data from this app". There are no third-party SDKs, analytics, ads or tracking, and no HealthKit. Tracking: No. Privacy Policy URL as above.

## Review notes
No login, account or special setup is needed; the app works fully offline and collects no data. A new egg hatches after about 10 minutes of real time (the first launch shows it). The pet then grows in real time: baby at 8 hours, child at 36 hours, teen at 72 hours, adult at 7 days, and evolves on the first morning check (after 08:00) once a stage ends. To see evolution in review, open Stats and the Dex page, which list every form and fill in as forms are found; the app screenshots show a populated Dex. Gentle mode is the default; reviewers can switch to Classic mode in Settings. Notifications are local only and optional; the system prompt appears only after the first hatch and the app works fully if declined. Apple Watch sync between the user's own devices uses WatchConnectivity; widgets and the Watch app share the pet through an App Group. No HealthKit, no network requests.

## Assets
- App icon: tools/make_icon.py generates 1024x1024 light, dark and tinted icons (no alpha) into iOS/ and Watch/ `AppIcon.appiconset`.
- Screenshots: the `Store assets` workflow (.github/workflows/store-assets.yml) renders plain screenshots with `Tests/StoreScreenshotTests.swift` and publishes them to the `ci-screenshots` branch under `store/<sha8>/`:
  - `iphone-6.9` (1320x2868), `iphone-6.5` (1284x2778), `watch-ultra` (410x502), `watch-series10` (396x484)
  - Files `01-hatchling-day`, `02-hungry-food-menu`, `02b-hungry-bubble`, `03-evolution-dex`, `04-night-asleep`, `05-play-minigame`. Captions are added outside the app image (for example in Figma or Keynote).

## Screenshot checklist
- [ ] iPhone 6.9" (1320x2868) set; 6.5" (1284x2778) set if required
- [ ] Apple Watch Ultra 410x502 (and Series 10 396x484) set
- [ ] Home Screen widget (small and medium) if wanted
- [ ] No third-party trademarks visible
- [ ] App icon 1024x1024 without alpha
- [ ] Privacy "Data Not Collected"; support URL and privacy policy URL live (see owner steps)

## Backlog (not in the current build)
These are ideas only. Anything added must keep the app free with no ads, IAP, subscription or energy gates, and must keep the privacy label accurate.

- **HealthKit-driven evolution:** optional steps and sleep as "food" that shapes the adult form. Manual play must stay complete without it. Adding this requires updating docs/PRIVACY.md and the privacy label first.
- **Live Activity:** a pet on the Lock Screen and Dynamic Island. The system ends a Live Activity after about 8 hours (it can stay on the Lock Screen up to 12), and Low Power Mode disables it, so it can only be an extra, never the main surface.
- **StandBy night-light mode:** a sleeping dinosaur on the bedside display during the 21:00 to 08:00 sleep period.
- **Co-parenting an egg:** care for one egg with a friend or partner.
- **Evolution share card:** a shareable image when the pet reaches an adult form.
- **More species:** additional dinosaurs with their own evolution paths.
