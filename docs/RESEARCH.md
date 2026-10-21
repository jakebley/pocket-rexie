# Research memo: virtual pets and the iPhone landscape

**Provenance and honesty note.** This memo draws on secondary sources: fan wikis, collector listings, forums, app store pages, third-party analytics and press coverage, folded in from a strategy brief dated October 2026. Primary manufacturer documentation for Dinkie Dino was not found. Treat the memo as design inspiration and market context, not a citation-grade history, and not legal advice.

Pocket Rexie is an **independent homage** (see also `docs/EVOLUTION.md` and `docs/NAMING.md`). It does not use the Dinkie Dino or Tamagotchi names, art, sounds or code. All pixel art is original.

## Product decision that differs from the brief

The brief recommends a freemium model: a free core pet plus a subscription (about $4.99 per month or $29.99 to $39.99 per year) and cosmetic purchases. **Pocket Rexie does not follow that recommendation.** The owner's requirement is that the app stays free with:

- no ads
- no in-app purchases
- no subscription
- no energy gates or any other time-based paywall
- no accounts, analytics or data collection

Monetization is therefore **out of scope** for this project. Revenue benchmarks and pricing material below are kept as market context only. Where the brief ties features such as extra species, a wardrobe or co-parenting to a subscription, the backlog in `docs/APP_STORE.md` lists them as free features, if they are built at all.

## What Dinkie Dino is

Dinkie Dino is not an app. It is a late-1990s handheld LCD virtual pet, also sold as "RakuRaku Dinokun" under packaging code TK-910. The manufacturer is unverified; the fan-maintained Virtual Pets wiki lists it as "Unknown (Dinkie?)". The exact launch year is also unverified.

- **Care loop:** drink, feed, lights, petting (which raises education), status, game (rock-paper-scissors), study, cleaning, air-conditioning or temperature, and medicine given by injection.
- **Evolution:** three paths set by diet (the original toy; Pocket Rexie's tree is larger): meat and burgers, vegetables and fruit, or pasta and other foods.
- **Failure states:** leaving the lights on while the pet sleeps makes it wake up sick. Sickness needs an injection. Neglect shows as an angry face.
- **Hardware:** five buttons, colored shells, later 4-in-1 and 8-in-1 multi-pet variants.
- **Current status:** a collectible. Original units sell on Etsy for roughly $58 to $71. Nostalgia appears to skew toward Brazil, so treat the brand as a seed community, not a mass market.
- **Digital versions:** the only one found is DiNostalgia Widget, a fan-made Android home-screen widget. No iOS version was found. A well-made dinosaur pet with diet-driven evolution has no direct iOS competitor.

## Other games that shaped the design

**Original Tamagotchi** (Bandai, 1996 Japan, 1997 worldwide). Hunger and happiness are shown as hearts. Players feed meals and snacks, clean up poop, switch the lights off at sleep time, give medicine, discipline false calls and play a higher/lower guessing game. It grows through stages, evolves by care quality and dies of neglect or old age. Bandai reports 100 million units shipped as of July 2025.

**Digimon V-Pet.** Same care core plus training, battles and a pedometer, with evolution branching on care, training and battle results. Pocket Rexie borrows the branching idea, training and battles with original species and art, and omits the pedometer.

## Competitor summary

Figures are third-party estimates and directional only.

| Product | Platform | Model | Takeaway for Pocket Rexie |
|---|---|---|---|
| Finch | iOS, Android | Freemium subscription ($9.99 per month or $69.99 per year); 4.9 stars from about 764K ratings | Adults pay for a pet that rewards care. Immortal birds are praised for not making users feel bad. Benchmark for tone, not for pricing here. |
| Pixel Pals | iOS | Free plus premium ($1.99 per month or $14.99 per year) | Shows that Dynamic Island, interactive widgets and StandBy can be a whole product, though the loop is shallow. |
| Friends (formerly Pengu) | iOS, Android | Free plus subscription | Co-parenting a pet with a partner or friend is a working growth loop. |
| SUSH | iOS | Free plus subscription; plush merchandise | Social pet in iMessage; 4.8 stars from 43K ratings. |
| My Tamagotchi Forever | iOS, Android | Ads plus IAP | Official app is stagnant; developer Paladin Studios closed on May 1, 2024. |
| Tamagotchi Adventure Kingdom | Apple Arcade | Arcade subscription | Well made, but real-time energy gates drew backlash. |
| Pou | iOS ($1.99), Android (ads) | Paid or ad-supported | A simple feed, clean, play loop can last over a decade. |
| Outfit7 (Talking Tom family) | iOS, Android | Ads plus IAP plus subscriptions | Scale leader, kid-oriented, ad-heavy, with frequent ad complaints. |
| Neopets companion app | iOS, Android | Free | Late 2025 launch; shows adult nostalgia is being actively served. |
| Moshi Monsters relaunch | Planned | Kickstarter, 2027 | Upcoming competitor for the same nostalgia audience. |

The field splits into kid-oriented ad-funded care games, adult wellness and social pets, and utility pets on iOS system surfaces. Nobody combines a classic care-and-evolution loop with first-class iOS surfaces. A dinosaur pet with diet-driven evolution has no iOS heir.

## Sentiment lessons

What users praise: attachment to one pet, a forgiving default, low-grind progression, nostalgia and the absence of ads. What they complain about: energy and time gates, ad density, surprise subscription charges, content locked behind a paywall, guilt-driven notifications and streak anxiety.

Design rules that follow:

1. **Forgiving by default.** The pet should never die unless the player opts in to Classic mode.
2. **No energy gates.** Use real time for presence and mood, never as a gate on content. A reviewer of Adventure Kingdom wrote of waiting "2-3 real life days for resources to regenerate" and others lost interest.
3. **Restrained notifications.** Few, opt-in, and worded from the pet's curiosity, not its suffering.
4. **No ads.** Users call this out as a reason for goodwill.

## iOS surface constraints

- A Live Activity can be active for up to about eight hours before the system ends it and removes it from the Dynamic Island. It can stay on the Lock Screen for up to 12 hours. Low Power Mode switches Live Activities off.
- Because of this, a Live Activity cannot be the main presence surface. **Home Screen and Lock Screen widgets and Apple Watch complications are the primary surfaces.** A Live Activity is a possible later extra (see the backlog).
- Interactive widgets (iOS 17 and later) can run care actions without opening the app. StandBy suits a bedside display.

## Compliance and age rating

- **COPPA.** The amended FTC rule became fully enforceable on April 22, 2026. It expands the definition of personal information, requires a written data-security program and limits retention of children's data.
- **Apple 1.3 (Kids Category).** Kids Category apps should not include third-party analytics or advertising and need parental gates for purchases and links.
- **Apple 5.1.2(i).** Apps may not require notifications to unlock functionality. Pocket Rexie asks for notification permission only after the first hatch and works fully without it.
- **Apple 4.5.4.** Push notifications must be opt-in and not used for marketing.
- **Apple 2.3.8.** Metadata in a non-Kids app must not imply that children are the main audience.
- **Decision:** adult-first positioning, rated 12+, not in the Kids Category. The app collects no data, which keeps the COPPA surface minimal.

## Trademark guidance

Bandai holds multiple US TAMAGOTCHI registrations (for example Reg. No. 3552771 from 2008 and No. 6980095 from February 2023) and actively defends them.

- Do not use "Tamagotchi" or any "-gotchi" suffix in the name, subtitle, keywords or description.
- Do not use the "Dinkie" name or copy its sprites. No registered "Dinkie Dino" trademark was found, but the rights-holder is unclear, which is a reason to avoid it.
- Avoid egg-shaped device trade dress. Gameplay mechanics are generally not protectable, so original inspired-by mechanics are acceptable. Pixel art is original.
- Run USPTO and EUIPO clearance on the final name before release.

## Implemented design (mechanics mapping)

| Researched mechanic | Source | Pocket Rexie as implemented |
|---|---|---|
| Simulation clock | Both | 5-minute ticks |
| Sleep period | Dinkie Dino | Sleeps 21:00 to 08:00; stat decay pauses while asleep |
| Hunger and happiness | Tamagotchi | 4 hearts each |
| Poop and cleaning | Both | Poop appears over time and is cleaned up |
| Sickness and medicine | Both | A sick pet needs 2 medicine doses |
| Temperature | Dinkie Dino | Two-sided: the room can run hot or cold (-2 to +2), the target is about 25 C, and the climate icon restores it. A hot or cold pet raises a call and, if ignored, a care mistake. The 25 C target follows the Gotchi Garden care sheet and the TASVideos page as summarized by search results; direct page fetches were blocked, so these details come from search summaries and are unverified |
| Menu icons | Both | 10 icons: feed (meat, veggies, pasta or snack), light, play, train, medicine, clean, climate, scold, battle, stats |
| Branching evolution | Digimon V-Pet | 39 original species over 5 stages. The branch depends on care mistakes, diet, training, battle wins, smarts and weight; evolution is checked after the 08:00 wake-up. See `docs/EVOLUTION.md` |
| Dex | Digimon V-Pet | Every species discovered is remembered across generations |
| Training and battles | Digimon V-Pet | Training has a 15 minute cooldown and battles a 30 minute cooldown; battle odds come from training, smarts, discipline and stage. No pedometer |
| Lights while sleeping | Dinkie Dino | Leaving the light on during sleep for 30 minutes causes a care mistake and the pet wakes sick |
| Diet-driven evolution | Dinkie Dino | Diet (meat, veggies or pasta) steers the child stage and later branches; heavy neglect leads to rough forms such as Mudpie, Grimey and Gremlin |
| Petting | Dinkie Dino | Petting raises smarts |
| Mini-game | Tamagotchi | Higher/lower guessing game from the original |
| Gentle mode | Takeaway | ON by default. The pet never dies |
| Classic mode | Tamagotchi | Opt-in. Death by starvation or illness is possible after about 12 awake hours of neglect |
| Vacation or pause mode | Takeaway | Freezes time |
| Notifications | Takeaway | At most about one per day, worded from the pet's curiosity, requested through the system prompt after the first hatch |

## Out of scope

- Monetization of any kind (ads, IAP, subscription, energy gates, paid cosmetics).
- Accounts, analytics and any data collection.
- A pedometer.
- See the backlog in `docs/APP_STORE.md` for possible later features.

## Caveats
- **Dinkie Dino facts come from fan wikis, collector listings and forums.** No primary manufacturer documentation was found, and the launch year and manufacturer are unverified.
- **Revenue and download figures are third-party estimates** (Sensor Tower, AppSprint, AppMagic, newsletters, posts on X) and conflict with one another. Finch's figures range from about $380K to $4M a month depending on source and scope.
- **Tamagotchi Adventure Kingdom's launch date is inconsistent** across sources (December 2023 versus January 4, 2024).
- **Market-size reports are low-transparency and mutually inconsistent.**
- **Tamagotchi sales-multiple and pre-order figures come from a fan site** summarizing a Bandai Namco press release.
- **Review quotes are illustrative, not statistically representative.**
- **This is not legal advice.** Have trademark and COPPA questions reviewed by counsel.

## Sources
- [Virtual Pets wiki: Dinkie Dino](https://virtual-pets.fandom.com/wiki/Dinkie_Dino)
- [TASVideos: Dinkie Dino (MUGG)](https://TASVideos.org/HomePages/MUGG/DinkieDino)
- [Gotchi Garden: Dinkie Dino / RakuRaku Dinokun care guide](http://gotchi-garden.blogspot.com/p/dinkie-dino-care-sheet.html)
- [TamaTalk: Dinkie Dino on your phone?](https://www.tamatalk.com/threads/dinkie-dino-on-your-phone.192390/)
- [Wikipedia: Tamagotchi](https://en.wikipedia.org/wiki/Tamagotchi)
- [Wikipedia: Digital pet](https://en.wikipedia.org/wiki/Digital_pet)
- [Bandai Namco IR newsletter, special feature](https://www.bandainamco.co.jp/en/ir/library/newsletter82_special.html)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Paladin Studios: My Tamagotchi Forever](https://paladinstudios.com/tamagotchi/)
- [Tamagotchi Adventure Kingdom reviews, App Store](https://apps.apple.com/us/app/tamagotchi-adventure-kingdom/id1614952689?see-all=reviews&platform=iphone)
- [Finch: Self-Care Pet, App Store](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748?see-all=reviews)
- [Pixel Pals, App Store](https://apps.apple.com/us/app/pixel-pals-widget-pet-game/id6443919232)
- [SUSH Virtual Pet, App Store](https://apps.apple.com/us/app/sush-virtual-pet-grow-evolve/id1622502023)
- [Neopets companion app, App Store](https://apps.apple.com/us/app/neopets-companion-app/id6748764985)
- [COPPA Compliance 2026: The Amended FTC Rule](https://privacylawmap.com/blog/coppa-compliance-guide-2026)
- [TAMAGOTCHI trademark, Reg. No. 3552771 (Justia)](https://trademarks.justia.com/773/16/tamagotchi-77316788.html)
- [Bandai: protecting Tamagotchi IP](https://tamagotchi-official.com/gb/anti-counterfeiting/)
