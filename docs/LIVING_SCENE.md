# Living scene spec

Goal: the pet should feel like it lives in the phone, not sit in a frame. It wanders, reacts, eats food you drop in, makes its own mess, sleeps in a spot, and the room follows real time of day. Everything is derived from the engine state (`Pet`) plus a small behaviour layer, so the widget and watch can reuse it.

The home scene is a 48x48 pixel grid (text screens use the 64 grid and are unchanged; the egg, hatch, evolve flash, dead and sleep-dim screens use the 48 grid). Species sprites stay 16x16 facing right and are drawn 1:1 (a third of the room); the scene mirrors them for left-facing. No new per-species art: every pose is derived from the two existing frames (open, blink).

## Layout (48x48 scene)
- Sky rows 13..40: sun or moon on an arc by local hour, stars at night, drifting clouds (2-3 rows tall; 1 clear, 2 cloudy, 3 rainy), rain on rainy days, the butterfly.
- HUD uses the full 5x5 glyphs: 4 hunger hearts at y=1 and 4 happy smiles at y=7 (x = 1, 7, 13, 19). Alert, skull and drop/flake glyphs stack at x=41..45 top right (y = 1, 7, 13). The HUD draws over the sky.
- Ground: a solid 2-row ground line at y=44..45 with grass tufts above it (3x3 sprites swaying every 600 ms), rows 46..47 dirt dither.
- The pet stands on the ground: sprite bottom row at y=43, just above the ground line. Sprite x range 0..32 (left edge) before poops.
- Poops are 5x5 glyphs standing on the ground (y=39..43, jiggle 1 px), placed right to left from the right edge: x = 41, 35, 29 for the first, second and third poop, so mess accumulates from the right.
- Poops shrink the wander range so the pet's ink never touches a poop: `maxX = max(0, min(32, leftmostPoopX - inkWidth(species) - 1))`. `inkWidth` is how far the species' ink reaches from the sprite's left edge over all its frames and for either facing (`max(lastInkCol + 1, 16 - firstInkCol)`), computed once per species (`inkWidth` in scene.ts, `SceneState.inkWidths` in LivingScene.swift). This is the occupied column width plus the sprite's left margin, so a mirrored sprite cannot reach into a poop. With no poops maxX is 32. Every walk target, the greet entry, ground taps and feeding positions are clamped to the current maxX.
- If the pet is beyond maxX when the poop count rises (or it has no other reason to move), it walks left to the new limit before doing anything else. Pose wiggles (squat, shiver, sneeze offsets) never push the drawn ink past the limit. Reduced motion does not move the pet (the Expo painter still clamps the drawn position; the Swift director snaps to the limit).
- Bed: at night the pet walks to x=8 and sleeps on a 10x2 mat at x=10 drawn under it. The bed, the dropped food and the broom ignore the poop limit.

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
- Walk speed (cells per second): baby 3.3, child 4.5, teen 5.2, adult 4.5, ultimate 3.8 (the 32-grid speeds x1.5). Stay inside x 0..maxX (at most 32). Facing follows direction. Walk bob: sprite y alternates 0/-1 each 250 ms.
- Derived poses: `hop` y offsets 0,-3,-4,-3,0; `sit`/`droop` y +1 and eyes half (use blink frame); `sleep` blink frame, y +1, mat under it; `eat` alternate head-front pixel row between open frame and blink frame at 250 ms (chomp); `dance` mirror facing flips every 300 ms with hop; `sneeze` sprite shifts back 1 px then forward 2 px.
- Pet sprite uses `frame(blink)` from species frames; for `look` the eye pixel does not change, the pet turns to face the target.

## Reactions and scene events
The model emits transient `SceneEvent`s that the director animates (1-3 s) and then returns to the autonomous loop:
- `fed(food)`: a 5x5 food glyph (meat drumstick, leaf, noodle swirl, candy) falls from y=14 to the ground at the pet's x+6 (or the pet's chosen side), pet walks to it (`walk`), `eat` 3 chomps, crumbs, heart pop.
- `snack`: candy glyph, same, plus smile pop.
- `cleaned`: a broom sweeps left to right across all 48 columns in 1.2 s, poops vanish as it passes, sparkle pixels trail; pet hops after.
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
- Poop: when `pet.poops` increases (compare to last seen) the director walks the pet to just left of the next free spot (x = spot - inkWidth - 1, which is also its new limit, not onto the spot), `poop` state squat 1 s facing away from the spot, then drops the glyph at x = 41, 35 or 29. The glyph is not on the ground (and does not count toward the limit) until it is dropped.
- Peek and greet: on app foreground after >= 15 min away, the pet runs in from the left or right edge (`greet`) waving; show the while-you-were-away line (below).
- Thought bubble: when `pet.call` is set and the pet is awake, a 9x7 bubble with a 5x5 icon (food, ball, poop, drop, flake, syringe, exclamation) shows above the head (over it when it fits in the sky below y=13, else beside it), blinking at 600 ms. Light-call shows a bulb.
- Tap on ground (y >= 40 of 48) at x: the pet walks to x, faces it, and looks. Tap on sky: the pet looks up. Tap on the pet: `petted`.
- Ambient: a butterfly or beetle (3x3) crosses every ~90 s on average; clouds drift 1 cell every ~10 s; grass tufts sway.
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
- The HUD uses the full 5x5 glyphs (the 48 grid leaves room), see Layout. The thought bubble follows the pet at `bubblePos` (above the head, tail toward it); when it blinks off the alert glyph shows in its place.
- Poops are drawn in front of the pet without a halo (they stay visible); the pet scanline-clears the sky behind its silhouette.
- Ambient (clouds, butterfly, rain, stars) is a pure function of the clock, so it needs no state. Reduced motion freezes all of it.
- Dev panel: scene event triggers, Make poop, Rain auto/on/off, Force hour, Away 1h/8h.
