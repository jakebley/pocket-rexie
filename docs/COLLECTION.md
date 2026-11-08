# Collection profile (queued behind family wiring)

Idea: a profile that shows every species the player has collected, so collecting them all is the game.

## Scope
1. Shared Dex store: move the Dex out of single-pet data into the shared app group (same place as the colour mode) so iPhone, Watch and widgets agree. Migrate existing `Pet.dex` on first launch.
2. Profile screen: progress per family (n / family size), collected species as sprites, uncollected as silhouettes with the name hidden, locked Plus families as silhouettes with a lock.
3. Badges: finish a family, finish a stage within a family, first ultimate, first neglect-line species.
4. Share card: a rendered image such as "31 of 39 dinos found". No accounts, no server, no public profile.

## Rules
- Completion is per family, not 0 of ~360 overall.
- Plus families never count against a free player's completion.
- Deaths (Classic mode) never reduce the collection.
- Every species must be reachable by normal play: `tools/check_family.py` per family, plus a balance run.
- Spirits family needs both a scold path and a never-scold path to be reachable.

## Order
After the Swift and Expo family wiring merge. Own branch, Swift and Expo parity, unit tests for the store and migration, renders for the profile.
