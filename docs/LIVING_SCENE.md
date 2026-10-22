# Living scene spec

Goal: the pet should feel like it lives in the phone, not sit in a frame. It wanders, reacts, eats food you drop in, makes its own mess, sleeps in a spot, and the room follows real time of day. Everything is derived from the engine state (`Pet`) plus a small behaviour layer, so the widget and watch can reuse it.

The LCD stays a 32x32 pixel grid (text screens use the 64 grid and are unchanged). Species sprites stay 16x16 facing right; the scene mirrors them for left-facing. No new per-species art: every pose is derived from the two existing frames (open, blink).

## Layout (32x32 scene)
- Rows 0-9 sky: sun or moon on an arc by local hour, stars at night, drifting clouds, rain on rainy days.
- Hearts HUD stays top-left but shrinks to one row of 4 hunger hearts at y=0 and one row of 4 happy smiles at y=6 (as now); alert and temperature glyphs stay top-right. HUD draws over the sky.
- Ground: a solid 2-row ground line at y=28..29 with grass tufts and pebbles (3x3 sprites swaying every 600 ms), rows 30-31 dirt dither.
- The pet stands on the ground: sprite bottom row at y=28 (so feet touch the ground). Sprite x range 0..16 (left edge). Small stages (baby, child, teen) are drawn with their own bottom-aligned art already.
- Poops sit on the ground at stable x positions derived from the poop index: x = 3, 11, 24 (5x5 glyph, jiggle 1 px), never under the pet's current x if avoidable.
- Bed: at night the pet walks to x=4 and sleeps on a 10x2 mat sprite drawn under it.

## Behaviour state machine
State: `idle, walk, look, hop, sit, eat, poop, dance, droop, shiver, sweat, sneeze, sleep, stretch, react, greet, train, battle, play`.
- Clock: behaviour ticks every 125 ms (8 fps); animation frames flip every 600 ms; blink every ~4 s for 200 ms.
- Per tick the director holds `{state, x, facing(+1/-1), stateTicksLeft, targetX?, frame}`.
- Choosing the next idle behaviour (every 2-6 s, weighted random from a seeded generator `rng(pet.seed, floor(now/125ms))` so screenshots and tests are reproducible):
  - asleep: go to bed, `sleep` (zzz rises every 1.2 s; light on while asleep: 15% chance per 6 s of a restless shift).
  - sick: `shiver` mostly, `sneeze` every ~8 s (screen flashes 1 frame), slow walk.
  - temp >= 2: `sweat` (drop glyph above head, fans pixels), temp <= -2: `shiver` (flake glyph).
  - hunger <= 1: pace between x=2..14, `look` up at the top where food drops, tummy rumble bubble.
  - happy <= 1: `droop` (sit, sprite 1 px lower, no bob, slow walk).
  - happy == 4 and hunger >= 3: 35% `dance` (hop-hop with a music note), 25% `hop`.
  - otherwise weights: idle 35, walk 30, look 15, sit 10, hop 10 (baby: more walk and wobble, adult: fewer hops, ultimate: slow majestic walk with a pause).
- Walk speed (cells per second): baby 2.2, child 3, teen 3.5, adult 3, ultimate 2.5. Stay inside x 0..16. Facing follows direction. Walk bob: sprite y alternates 0/-1 each 250 ms.
- Derived poses: `hop` y offsets 0,-3,-4,-3,0; `sit`/`droop` y +1 and eyes half (use blink frame); `sleep` blink frame, y +1, mat under it; `eat` alternate head-front pixel row between open frame and blink frame at 250 ms (chomp); `dance` mirror facing flips every 300 ms with hop; `sneeze` sprite shifts back 1 px then forward 2 px.
- Pet sprite uses `frame(blink)` from species frames; for `look` the eye pixel does not change, the pet turns to face the target.

## Reactions and scene events
The model emits transient `SceneEvent`s that the director animates (1-3 s) and then returns to the autonomous loop:
- `fed(food)`: a 5x5 food glyph (meat drumstick, leaf, noodle swirl, candy) falls from y=0 to the ground at the pet's x+6 (or the pet's chosen side), pet walks to it (`walk`), `eat` 3 chomps, crumbs, heart pop.
- `snack`: candy glyph, same, plus smile pop.
- `cleaned`: a broom sweeps left to right across the ground in 1.2 s, poops vanish as it passes, sparkle pixels trail; pet hops after.
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
- Poop: when `pet.poops` increases (compare to last seen) the director walks the pet to a ground spot, `poop` state squat 1 s, drops the glyph.
- Peek and greet: on app foreground after >= 15 min away, the pet runs in from the left or right edge (`greet`) waving; show the while-you-were-away line (below).
- Thought bubble: when `pet.call` is set and the pet is awake, a 9x7 bubble with a 5x5 icon (food, ball, poop, drop, flake, syringe, exclamation) shows above the head, blinking at 600 ms. Light-call shows a bulb.
- Tap on ground at x: the pet walks to x, faces it, and looks. Tap on sky: the pet looks up. Tap on the pet: `petted`.
- Ambient: a butterfly or beetle (3x3) crosses every ~90 s on average; clouds drift 1 cell every ~10 s; grass tufts sway.
- Time of day by the device's local hour: 05-07 dawn (sun low, dither sky), 08-17 day (sun arc), 18-20 dusk (sun low right, a cloud), 21-04 night (moon + 6 twinkling stars, darker scene via dither mask while the pet is asleep and light off).
- Weather by day: `hash(date, pet.seed) % 10`: 0-1 rain (rain streaks 1 px falling, pet sometimes sits and looks up), 2-4 cloudy (2 clouds), else clear (1 small cloud).

## While you were away
On foreground, if `now - lastSeen >= 15 min`, summarise `pet.events` with `at > lastSeen` into one line (max 2 lines of text): counts of `poop` ("made 2 messes"), `sick`, `evolved` (species name), `hatched`, `sleep`/`wake` ("slept through the night"), `call`s ("wanted attention 3 times"), `died`. Examples: "WHILE YOU WERE AWAY: SLEPT, MADE 2 MESSES". Show it in the message line for 8 s and tap-dismiss. Store `lastSeen` locally per device (not in the synced pet). If nothing happened: "REXIE MISSED YOU".

## Reduced motion
Wandering and ambient motion stop; the pet holds an idle pose; events still show (state changes) without movement; clouds and grass static.

## Testing
The behaviour director is pure: `step(state, pet, inputs, now) -> state`. Unit tests: determinism for a seed, x bounds 0..16, sleeping pet ends on the bed, hungry pet paces, poop count increase produces a `poop` state, feeding event ends in `eat` then back to autonomy, reduced motion yields no x changes, every state has a draw routine (no exceptions) for every species and stage.

## Implementation notes (Expo prototype)
- Code: `src/ui/scene.ts` (director, pure), `src/ui/sceneDraw.ts` (painter + art), `src/ui/away.ts` (while-you-were-away text); tests in `test/scene.ts` (`npm test`).
- HUD uses 3x3 mini glyphs so the sky stays visible: hunger hearts at y=0, happy smiles at y=4 (x 0..14), skull / temperature glyph at x=16. The stats screen keeps the 5x5 glyphs.
- The thought bubble sits at x 19..22 (follows the pet, never over the HUD) with its tail toward the pet; when it blinks off the alert glyph shows in its place.
- Poops are drawn in front of the pet without a halo (they stay visible); the pet scanline-clears the sky behind its silhouette.
- Ambient (clouds, butterfly, rain, stars) is a pure function of the clock, so it needs no state. Reduced motion freezes all of it.
- Dev panel: scene event triggers, Make poop, Rain auto/on/off, Force hour, Away 1h/8h.
