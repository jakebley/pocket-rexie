# Free now, Plus later

Plan: launch free with the complete dino family, then add a paid **Plus** plan that unlocks other animals. This document is the product and technical plan. Nothing here is charged or built yet, and nothing in the free app depends on it, except one small decision made now so Plus does not require a data migration later: every species and every pet belongs to a **family**.

## What stays free, forever
- The dino family: all 39 species across five stages, with every mechanic (care, Classic and Vacation modes, training, battles, Dex, living scene, widgets, Apple Watch).
- No ads, no tracking, no energy gates, no timers that make you wait or pay. Free users are never degraded to sell Plus.

## What Plus adds (candidates, in priority order)
1. **More animal families.** Each is a full evolution tree of its own (about 25 to 39 species), with its own diet-driven branching, its own look in the LCD pixel style and its own hatchling. First three to design: a fox-like family, a rabbit-like family and a bird-like family. Choosing a family when you start a new egg is the feature.
2. **A second pet slot** (two eggs at once, one on the Watch face, one on the phone).
3. **Extra scenes**: night forest, beach, snow, with their own sky and ground (the scene renderer already separates ground, sky and weather).
4. **Watch and widget extras**: alternate complication styles.

Rule of thumb: Plus sells more of what the app is, never access to the basics.

## Pricing options (decide with real data, not now)
| Option | Shape | Notes |
|---|---|---|
| Plus subscription | about $4.99 per month or $29.99 to $39.99 per year, 7-day free trial | Fits ongoing new families and scenes. Needs clear trial and renewal wording, a trial-ending reminder, and Restore Purchases (Apple 3.1.2). |
| Lifetime unlock | one-time, about $24.99 to $39.99 | Simpler and friendlier for a nostalgia audience, no recurring revenue. |
| Family packs | $2.99 to $4.99 each | Good for testing demand before committing to a subscription. |

Recommendation: ship v1 free, watch which families people ask for, then launch **Plus (subscription) with a lifetime option**, and keep packs as a fallback. The brief's competitor data (Finch, Pixel Pals) supports a low-priced adult subscription, but that is a pricing hypothesis, not a result.

## Data model (do now, free)
- `Species.family: String` (all existing species get `"dino"`) and `Pet.family: String` (default `"dino"`). Saves written before this field existed decode as dino through the tolerant decoder (`tools/gen_decoder.py`).
- `Family` metadata: id, display name, hatchling ids, `isFree`, sprite archetype set. Evolution trees stay per family in `tools/families/<id>.py`, merged into the generated data by `tools/gen_swift.py` and `tools/gen_ts.py`. The Dex counts per family (`DEX 12/39`).
- A pet keeps living after a Plus lapse: its family is locked only for **new eggs**. Nobody loses a pet they already raised.

## App architecture (when Plus ships)
- `Entitlements` protocol (`isPlus`, `canHatch(family:)`, `restore()`), with a `FreeEntitlements` (dino only) for development and tests, and a `StoreKitEntitlements` using StoreKit 2 (`Transaction.currentEntitlements`, `Product.products(for:)`, `AppStore.sync()` for Restore). The widget and Watch read a cached `isPlus` flag from the App Group so they never touch StoreKit.
- Gating happens in exactly one place: the "choose your egg" screen shown by `GameModel.startNewEgg()`. Locked families show their pixel hatchling silhouette and a "Plus" tile; tapping opens the paywall.
- Paywall: pixel-LCD styled sheet, plain price and renewal terms, trial length, a visible Restore button and Terms and Privacy links; no dark patterns, no countdowns, closeable at once.
- Local testing uses an Xcode StoreKit configuration file (`Plus.storekit`) so purchase flows can be tested in the simulator and in UI tests without Apple credentials.
- Family Sharing on (a single Plus covers the household).

## App Store and legal notes
- In-app purchases need App Store Connect products, and review needs a working Restore Purchases path.
- Age rating and the privacy label are unaffected (no data collected). StoreKit purchase data stays with Apple.
- Names and art for new families must be original. Do not use existing game creatures or names; run the same trademark searches as for "Pocket Rexie".
- Changing the price or moving existing free features behind Plus later is a trust risk. Keep the promise above.

## Art pipeline for a new family
1. Design 4 to 6 hand-drawn 16x16 archetype templates (`tools/archetypes_<family>.py`), facing right, ground on row 15.
2. Define its species and branching in `tools/families/<family>.py` (same format as `tools/species.py`, reachable and with a guaranteed fallback per list; `tools/gen_swift.py` and the balance report check this).
3. Run `python3 tools/gen_swift.py && python3 tools/gen_ts.py`, review the sheet from `tools/sheet.py`, and run `npm run test:balance` to confirm every species is reachable.
4. The Scale2x pass produces the 32x32 high-resolution sprites automatically.

## Milestones
1. v1.0 free: ship with the family field in the data (cheap, no UI). **Done:** `Species.family`, `Pet.family`, family-aware hatching, tolerant decoding, unknown families fall back to dino, covered by tests.
2. v1.1: the "choose your egg" screen with one family, plus Entitlements and the StoreKit configuration, behind a build flag and not shown to users yet.
3. v1.2: first Plus launch with the fox family, trial and restore tested with TestFlight sandbox accounts.
4. Later: more families, a second pet slot and scenes, guided by what people ask for.
