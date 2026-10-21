# Evolution

This page explains how a Pocket Rexie pet grows, for players and for anyone adding species. The system is inspired by the branching care model of the Digimon V-Pet line: what you feed, how much you train, how often you battle and how well you look after the pet decide which form it grows into.

All 39 species names, blurbs and pixel sprites are original to this project. They are not Digimon, Tamagotchi or Dinkie Dino material, and no names or art from those products are used.

## Stages and timing

The pet's age is counted from birth in real time. Each stage ends at a fixed age, and the evolution check happens then.

| Stage | Name in code | Species | Ends at pet age |
|---|---|---|---|
| Egg | egg | none | 10 minutes (hatches into a baby) |
| 1 | baby | 2 | 8 hours |
| 2 | child | 4 | 36 hours |
| 3 | teen | 11 | 72 hours |
| 4 | adult | 14 | 7 days |
| 5 | ultimate | 8 | final form; the pet lives until about 21 days |

An ultimate pet that passes about 21 days of age retires after a full, happy life and is added to the memorial list. Vacation mode pauses the simulation, so a paused pet does not progress.

## The morning check

Evolution is not checked the instant a stage time passes. It is checked on the first simulation tick after the pet wakes at 08:00. The pet sleeps from 21:00 to 08:00 and nothing decays while it sleeps, so a pet that reaches its age limit at midnight evolves the next morning. This is inspired by the morning weight check on the Dinkie Dino toy. It gives players a daily moment to look forward to and keeps evolutions from happening while nobody is watching a dark screen.

## What decides the branch

Evolution looks at counters for the stage that is ending. They reset to zero every time the pet evolves.

- **Care mistakes:** ignoring a call (hungry, bored, poop, sick, naughty, too hot, too cold) for 30 minutes, leaving the light on during sleep, and similar slips.
- **Diet:** how many meat, veggie and pasta meals were fed. The food eaten most is the leading diet. Ties go meat, then veggies, then pasta.
- **Training:** workouts done this stage.
- **Battle wins:** sparring victories this stage.

Three stats carry across stages and do not reset:

- **Smarts** (0 to 100): raised by petting, winning the play mini-game and studying.
- **Discipline** (0 to 100): raised by scolding the pet when it makes a false naughty call. The engine already supports a discipline requirement and it feeds into battles, but no branch in the current tree uses it yet.
- **Weight:** feeding adds weight, play, training and battles burn it. A pet is overweight when its weight is 8 or more above the base for its stage (base weights are 5, 12, 20, 30 and 40 for baby through ultimate). Overweight at evolution time can select a heavy form such as Brutus or Raviolo. Being overweight also makes illness more likely.

Each parent lists its branches in order. The first branch whose requirements are all met wins, and the last branch has no requirements, so every pet always evolves into something. Because the order matters, care mistakes are listed first: a neglected pet falls into a rough form (Mudpie, Grimey, Gremlin) before better branches are even considered.

## The evolution tree

Generated from `tools/species.py` with the snippet below. Branches are listed in priority order. Re-run it after editing the species file and paste the result here.

```python
import sys
sys.path.insert(0, "tools")
from species import SPECIES, EVO
for parent, branches in EVO.items():
    print(SPECIES[parent][0], "(stage %d)" % SPECIES[parent][1])
    for child, req in branches:
        print("  ->", SPECIES[child][0], req or "otherwise")
```

Eggs hatch into Pip or Nubb (picked at random from the seed).

```text
Pip (stage 1)
  |- 4+ care mistakes -> Mudpie
  |- meat led the diet -> Rawr
  |- veggie led the diet -> Sprig
  `- pasta led the diet -> Twirl
Nubb (stage 1)
  |- 4+ care mistakes -> Mudpie
  |- veggie led the diet -> Sprig
  |- pasta led the diet -> Twirl
  `- meat led the diet -> Rawr
Rawr (stage 2)
  |- 5+ care mistakes -> Grimey
  |- overweight -> Brutus
  |- 3+ trainings -> Fangler
  `- otherwise -> Dasher
Sprig (stage 2)
  |- 5+ care mistakes -> Grimey
  |- 3+ trainings -> Hornet
  |- smarts 15+ -> Mossback
  `- otherwise -> Bloomer
Twirl (stage 2)
  |- 5+ care mistakes -> Grimey
  |- overweight -> Raviolo
  |- smarts 15+ -> Zesty
  `- otherwise -> Curlie
Mudpie (stage 2)
  |- 3+ trainings -> Scrappy
  `- otherwise -> Grimey
Fangler (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- smarts 20+ -> Razorclaw
  `- otherwise -> Chompasaur
Brutus (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- 3+ battle wins -> Chompasaur
  `- otherwise -> Bruiser
Dasher (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- smarts 20+ -> Razorclaw
  `- otherwise -> Sprintosaur
Mossback (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- smarts 25+ -> Petal Rex
  `- otherwise -> Shellback
Hornet (stage 3)
  |- 5+ care mistakes -> Gremlin
  `- otherwise -> Platesaur
Bloomer (stage 3)
  |- 5+ care mistakes -> Gremlin
  `- otherwise -> Longneck
Curlie (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- 2+ battle wins -> Tricerapop
  `- otherwise -> Noodlord
Raviolo (stage 3)
  |- 5+ care mistakes -> Gremlin
  `- otherwise -> Plumpkin
Zesty (stage 3)
  |- 5+ care mistakes -> Gremlin
  |- 2+ battle wins -> Tricerapop
  `- otherwise -> Professor
Grimey (stage 3)
  |- 3+ trainings -> Scrapper
  `- otherwise -> Gremlin
Scrappy (stage 3)
  `- otherwise -> Scrapper
Chompasaur (stage 4)
  |- smarts 30+ -> Skywing
  `- otherwise -> Tyrannox
Razorclaw (stage 4)
  |- smarts 30+ -> Sage
  `- otherwise -> Skywing
Bruiser (stage 4)
  |- 5+ battle wins -> Tyrannox
  `- otherwise -> Wreckage
Sprintosaur (stage 4)
  `- otherwise -> Skywing
Longneck (stage 4)
  |- smarts 30+ -> Sage
  `- otherwise -> Bulwark
Shellback (stage 4)
  `- otherwise -> Bulwark
Petal Rex (stage 4)
  |- smarts 30+ -> Sage
  `- otherwise -> Triceron
Platesaur (stage 4)
  |- 3+ battle wins -> Bulwark
  `- otherwise -> Triceron
Tricerapop (stage 4)
  `- otherwise -> Triceron
Noodlord (stage 4)
  `- otherwise -> Noodlemancer
Plumpkin (stage 4)
  `- otherwise -> Plumpking
Professor (stage 4)
  `- otherwise -> Sage
Gremlin (stage 4)
  `- otherwise -> Wreckage
Scrapper (stage 4)
  `- otherwise -> Wreckage
```

## The Dex

Every species the pet has ever become is added to the Dex. The Dex is kept when a pet passes on and a new egg begins, so it fills up over generations. Collecting all 39 species takes many pets and different styles of care.

## Training

Training is a workout available from the child stage on (babies are too little). It needs the pet to be awake, well, and not at zero hunger. There is a 15 minute cooldown between workouts. Each workout adds to the training counter, burns a little weight and makes later battles easier, up to 25 workouts counted in the battle odds.

## Battles

A battle is a spar with a wild dino, also from the child stage on, with a 30 minute cooldown. The pet must be awake, well and not at zero hunger. The odds work like this:

- The pet's score is stage level times 10 (child 1, teen 2, adult 3, ultimate 4), plus 2 per lifetime training (capped at 25), plus smarts divided by 10, plus discipline divided by 10.
- The foe's score is the same stage level times 10 plus a random 0 to 29.
- The pet also gets a random edge of 0 to 14. It wins if its score plus the edge is at least the foe's score.

A win raises happiness by a heart and counts toward branches that need wins. A loss costs a heart. Training, smarts and discipline all help, and a higher stage does not change the matchup because the foe scales with it.

## Adding a species

1. Open `tools/species.py`.
2. Add an entry to `SPECIES` with an id, name, stage (1 to 5), a one-line blurb and a sprite recipe (head, tail, back, legs, fat and extras such as fangs, leaf, crown).
3. Add or edit the parent's list in `EVO` so a branch leads to the new id. Remember the order rule and keep a final entry with no requirements so the parent always has a way forward.
4. Run `python3 tools/gen_swift.py`. This regenerates `Shared/SpeciesData.swift`, including the sprites. Do not edit that file by hand.
5. Build and check the species appears in the Dex.

Requirement keys: `mist_min`, `mist_max` (care mistakes), `train`, `wins`, `smarts`, `disc`, `heavy` (overweight) and `lead` (meat, veggie or pasta).

## Originality

Species names, blurbs, sprite recipes and the tree layout are original to Pocket Rexie. The branching idea is inspired by a style of game that was common in 1990s virtual pets. Game mechanics are not copied art or text, and none of the creatures here are taken from Digimon, Tamagotchi or Dinkie Dino.
