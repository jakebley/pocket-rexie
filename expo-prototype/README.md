# Pocket Rexie (Expo prototype)

A playable prototype of **Pocket Rexie**, a free, nostalgic 1996-style pixel dino pet. Expo SDK 58, React Native 0.88, TypeScript.
The game engine is pure TypeScript (`src/core/pet.ts`, `src/core/speciesData.ts`); the toy UI lives in `src/ui/` and `App.tsx`.

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go (phone and computer on the same network)
npx expo start --tunnel # use this if the phone cannot reach the computer directly
npm run web             # open in the browser (any width, the toy is centred, max 440 wide)
npx tsx test/sim.ts     # engine simulation / balance test (same as `npm run test:sim`)
npx tsc --noEmit        # typecheck
```

Static web build: `npx expo export --platform web` (output in `dist/`).

## How to play

- Three buttons under the screen: **A** next icon / next item, **B** confirm, **C** cancel / back.
- You can also tap any of the 10 icons directly (feed, light, play, train, medicine, clean, climate, scold, battle, stats). Tap the screen to pet your dino.
- Stats: B pages through hearts and discipline, weight and age, details, then the dex (species discovered X/39).
- Sound (square-wave beeps) works on web only; native is silent for now.
- Progress is saved automatically (AsyncStorage on native, localStorage on web).

## Dev panel

Tap the small gear in the top-right corner. It shows the current species, stage, age, stage counters and the next evolution candidates with their requirements, and lets you:

- skip time (+1 hour, +8 hours, +1 day, +3 days, or jump to 9:00 / 22:00). This moves a persisted clock offset, so the pet really ages and sleeps on schedule,
- make the pet hungry, dirty or sick, heal everything, or reset to a new egg,
- toggle Classic mode (gentle off, pets can die), Vacation mode and sound,
- force-evolve to any of the 39 species.

Screenshots of the prototype are in `docs/screens/`.
