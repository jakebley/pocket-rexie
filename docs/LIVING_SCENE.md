# Living scene spec

Goal: the pet should feel like it lives in the phone, not sit in a frame. It wanders, reacts, eats food you drop in, makes its own mess, sleeps in a spot, and the room follows real time of day. Everything is derived from the engine state (`Pet`) plus a small behaviour layer, so the widget and watch can reuse it.

The home scene is a 64x64 pixel grid, the same grid the text screens use (the egg, hatch, evolve flash, dead and sleep-dim screens use it too). Pet sprites are the 32x32 `Species.hiFrames` (Scale2x/EPX of the 16x16 art, so still no new per-species art), drawn 1:1, half of the room's width and height; the scene mirrors them for left-facing. Every pose is derived from the two frames (open, blink). The egg, ghost and grave are the 16x16 art run through the same Scale2x (`Sprite.scale2x`). Each LCD cell is drawn as a lit pixel on an "unlit pixel" grid, ink only, in the light and dark palettes.

## Constants (64x64 scene)
| Thing | Value |
| --- | --- |
| Grid | 64x64 (`SceneRaster.side`) |
| Sprite | 32x32, left edge x in 0..32, `homeX` 16, `bedX` 8 |
| Foot line | feet on row 57 (`footY`), ground line rows 58..59 (`groundY`), dirt rows 60..63 |
| Sky | rows 20..57 (below the HUD) |
| HUD | 7x7 hearts at y=1 and smiles at y=10, x = 1, 9, 17, 25. Alert, skull, drop/flake 7x7 at x=56, y = 1, 10, 19 |
| Poops | 7x7, top row 51, spots x = 56, 48, 40 (right to left), jiggle 1 px |
| Poop limit | `maxX = max(0, min(32, leftmostPoopX - inkWidth(species) - 1))`, ink width from `hiFrames` (max 32) |
| Bed | 20x2 mat at y=56..57, x = centreX - 10 |
| Walk speed (cells/s) | baby 4.4, child 6.0, teen 6.9, adult 6.0, ultimate 5.1 (the 48-grid speeds x4/3) |
| Pose offsets | hop 0,-7,-9,-7,0; dance 0,-4,-6,-4; sit/droop +2; sleep -2; squat +2; walk bob 0/-1; sneeze back 2 then forward 3; react back 2; battle jitter 2; shiver 1 |
| Food | 9x9, falls from y=20 at 3 rows/tick to y=49; lands level with the mouth: 29 cells right of the left edge (pet right of centre), `x+38` away, 18 cells left otherwise |
| Broom | 9x9, sweeps from x=-9 at 7.2 cells/tick (12 ticks), y=49; poops vanish when it passes their centre |
| Ball | 9x9, travels 0..55 in 24 ticks, bounces up to 14 rows |
| Foe | the 16x16 sprite, mirrored, y=42, slides in from x=64 to 46 |
| Bubble | 13x9 with a 7x7 icon at (3,1), 1 px tail; above the head when it fits at or below y=17, else beside it |
| Stars | 12, twinkling (1 px / 3x3 cross), rows 21..48 |
| Rain | 26 two-pixel slanted streaks, rows 20..55 |
| Clouds | two-lobed 17x7, rows 22, 34, 28, drift 1 cell per 10 s |
| Sun / moon | 11x11 round sun with eight rays, 9x9 crescent, on an arc by the hour |
| Grass | 13 slots, 5 apart: tall tufts (3x4), short tufts (3x2), pebbles (4x2), flowers (3x5); tufts sway every 600 ms |

## Layout (64x64 scene)
- Sky rows 20..57: sun or moon on an arc by local hour, stars at night, drifting clouds (1 clear, 2 cloudy, 3 rainy), rain on rainy days, the butterfly (5x3).
- HUD uses 7x7 glyphs: 4 hunger hearts and 4 happy smiles at the top left, status glyphs top right (see the table). The HUD draws over the sky.
- Ground: a solid 2-row ground line at y=58..59 with denser two-height grass, pebbles and tiny flowers above it, rows 60..63 dirt dither.
- The pet stands on the ground: sprite bottom ink row at y=57, just above the ground line. Sprite x range 0..32 (left edge) before poops.
- Poops are 7x7 glyphs standing on the ground (y=51..57, jiggle 1 px), placed right to left from the right edge: x = 56, 48, 40 for the first, second and third poop, so mess accumulates from the right.
- Poops shrink the wander range so the pet's ink never touches a poop: `maxX = max(0, min(32, leftmostPoopX - inkWidth(species) - 1))`. `inkWidth` is how far the species' ink reaches from the sprite's left edge over all its `hiFrames` and for either facing (`max(lastInkCol + 1, 32 - firstInkCol)`), computed once per species (`SceneState.inkWidths` in LivingScene.swift). This is the occupied column width plus the sprite's left margin, so a mirrored sprite cannot reach into a poop. With no poops maxX is 32. Every walk target, the greet entry, ground taps and feeding positions are clamped to the current maxX.
- If the pet is beyond maxX when the poop count rises (or it has no other reason to move), it walks left to the new limit before doing anything else. Pose wiggles (squat, shiver, sneeze offsets) never push the drawn ink past the limit. Reduced motion does not move the pet (the Swift director snaps to the limit).
- Bed: at night the pet walks to x=8 and sleeps on a 20x2 mat drawn under it (rows 56..57). The bed, the dropped food and the broom ignore the poop limit.

## Behaviour state machine
State: `idle, walk, look, hop, sit, eat, poop, dance, droop, shiver, sweat, sneeze, sleep, stretch, react, greet, train, battle, play`.
- Clock: behaviour ticks every 125 ms (8 fps); animation frames flip every 600 ms; blink every ~4 s for 200 ms.
- Per tick the director holds `{state, x, facing(+1/-1), stateTicksLeft, targetX?, frame}`.
- Choosing the next idle behaviour (every 2-6 s, weighted random from a seeded generator `rng(pet.seed, floor(now/125ms))` so screenshots and tests are reproducible):
  - asleep: go to bed, `sleep` (zzz rises every 1.2 s; light on while asleep: 15% chance per 6 s of a restless shift).
  - sick: `shiver` mostly, `sneeze` every ~8 s (screen flashes 1 frame), slow walk.
  - temp >= 2: `sweat` (drop glyph above head, fans pixels), temp <= -2: `shiver` (flake glyph).
  - hunger <= 1: pace between x=4 and the wander limit minus 4, `look` up at the top where food drops, tummy rumble bubble.
  - happy <= 1: `droop` (sit, sprite 1 px lower, no bob, slow walk).
  - happy == 4 and hunger >= 3: 35% `dance` (hop-hop with a music note), 25% `hop`.
  - otherwise weights: idle 35, walk 30, look 15, sit 10, hop 10 (baby: more walk and wobble, adult: fewer hops, ultimate: slow majestic walk with a pause).
- Walk speed (cells per second): baby 4.4, child 6.0, teen 6.9, adult 6.0, ultimate 5.1 (the 48-grid speeds x4/3). Stay inside x 0..maxX (at most 32). Facing follows direction. Walk bob: sprite y alternates 0/-1 each 250 ms.
- Derived poses: `hop` y offsets 0,-7,-9,-7,0; `sit`/`droop` y +2 and eyes half (use blink frame); `sleep` blink frame, y -2, mat under it; `eat` alternate head-front pixel row between open frame and blink frame at 250 ms (chomp); `dance` mirror facing flips every 300 ms with hop; `sneeze` sprite shifts back 2 px then forward 3 px.
- Pet sprite uses `frame(blink)` from species frames; for `look` the eye pixel does not change, the pet turns to face the target.

## Reactions and scene events
The model emits transient `SceneEvent`s that the director animates (1-3 s) and then returns to the autonomous loop:
- `fed(food)`: a 9x9 food glyph (meat drumstick, leaf, noodle swirl, candy) falls from y=20 to the ground beside the pet's mouth (right or left, see the table), pet walks to it (`walk`), `eat` 3 chomps, crumbs, heart pop.
- `snack`: candy glyph, same, plus smile pop.
- `cleaned`: a 9x9 broom sweeps left to right across all 64 columns in 1.2 s, poops vanish as it passes, sparkle pixels trail; pet hops after.
- `medicine`: a syringe or pill glyph arcs in, pet flinches (shift), sparkle, then a heart.
- `trained`: dumbbell glyph above the head, pet does 3 hops with a tiny 'huh' (pixels at the sides).
- `battle(win)`: screen flash, a wild silhouette (mirror of a random species sprite scaled as ink only) slides in from the right, 3 exchange frames (spark glyphs), result: win = pet dances, loss = droop 2 s.
- `played(wins)`: a ball bounces across, pet chases; win = dance.
- `climate`: air puff (cool) or sun glints (warm) animation across the top, `sweat`/`shiver` stops.
- `light`: toggling light off darkens the scene (50% ink dither mask) even in daytime and the pet yawns into `sit`.
- `petted` (tap on pet): hop, heart pop above head, tiny chirp, haptic.
- `evolved`: existing inverted-frames flash, then the pet `greet`s (hop, wave pixels).
- `hatched`: egg cracks (existing), shell halves fall, baby hops out.

## Autonomy that shows life
- Poop: when `pet.poops` increases (compare to last seen) the director walks the pet to just left of the next free spot (x = spot - inkWidth - 1, which is also its new limit, not onto the spot), `poop` state squat 1 s facing away from the spot, then drops the glyph at x = 56, 48 or 40. The glyph is not on the ground (and does not count toward the limit) until it is dropped.
- Peek and greet: on app foreground after >= 15 min away, the pet runs in from the left or right edge (`greet`) waving; show the while-you-were-away line (below).
- Thought bubble: when `pet.call` is set and the pet is awake, a 13x9 bubble with a 7x7 icon (food, ball, poop, drop, flake, syringe, exclamation) shows above the head (over it when it fits in the sky at or below y=17, else beside it), blinking at 600 ms. Light-call shows a bulb.
- Tap on ground (y >= 53 of 64) at x: the pet walks to x, faces it, and looks. Tap on sky: the pet looks up. Tap on the pet: `petted`.
- Ambient: a butterfly (5x3) crosses every ~90 s on average; clouds drift 1 cell every ~10 s; grass tufts sway.
- Time of day by the device's local hour: 05-07 dawn (sun low, dither sky), 08-17 day (sun arc), 18-20 dusk (sun low right, a cloud), 21-04 night (moon + 6 twinkling stars, darker scene via dither mask while the pet is asleep and light off).
- Weather by day: `hash(date, pet.seed) % 10`: 0-1 rain (rain streaks 1 px falling, pet sometimes sits and looks up), 2-4 cloudy (2 clouds), else clear (1 small cloud).

## While you were away
On foreground, if `now - lastSeen >= 15 min`, summarise `pet.events` with `at > lastSeen` into one line (max 2 lines of text): counts of `poop` ("made 2 messes"), `sick`, `evolved` (species name), `hatched`, `sleep`/`wake` ("slept through the night"), `call`s ("wanted attention 3 times"), `died`. Examples: "WHILE YOU WERE AWAY: SLEPT, MADE 2 MESSES". Show it in the message line for 8 s and tap-dismiss. Store `lastSeen` locally per device (not in the synced pet). If nothing happened: "REXIE MISSED YOU".

## Reduced motion
Wandering and ambient motion stop; the pet holds an idle pose; events still show (state changes) without movement; clouds and grass static.

## Testing
The behaviour director is pure: `step(state, pet, inputs, now) -> state`. Unit tests: determinism for a seed, x bounds 0..32, the poop limit shrinks as poops grow, the pet's drawn ink never overlaps a poop column for any species with 1-3 poops over 3000 ticks of wandering, a pet beyond the new limit walks left first, sleeping pet ends on the bed, hungry pet paces, poop count increase produces a `poop` state, feeding event ends in `eat` then back to autonomy, reduced motion yields no x changes, every state has a draw routine (no exceptions) for every species and stage.

## Implementation notes (Expo prototype)
- Code: `src/ui/scene.ts` (director, pure), `src/ui/sceneDraw.ts` (painter + art), `src/ui/away.ts` (while-you-were-away text); tests in `test/scene.ts` (`npm test`).
- The Expo port mirrors this 64 grid; the numbers above are the Swift values. The thought bubble follows the pet at `bubblePos` (above the head, tail toward it); when it blinks off the alert glyph shows in its place.
- Poops are drawn in front of the pet without a halo (they stay visible); the pet scanline-clears the sky behind its silhouette.
- Ambient (clouds, butterfly, rain, stars) is a pure function of the clock, so it needs no state. Reduced motion freezes all of it.
- Dev panel: scene event triggers, Make poop, Rain auto/on/off, Force hour, Away 1h/8h.
