"""The bunny family (Plus). Rabbits, hares, lops, hamsters, guinea pigs, chinchillas, dormice, pikas and a moon rabbit.

Food slots reuse the engine's three foods: meat = Carrots, veggie = Clover, pasta = Seeds.
Lines (Technicolor body colour): meat -> 'meadow' (rabbits, hares, lops), pasta -> 'burrow' (hamster, guinea pig, chinchilla),
veggie -> 'moon' (dormouse, pika, moon rabbit), neglect -> 'stray' (scruffy dust bunnies).
"""
import archetypes_bunny  # registers the bun_* archetypes and decorations with spritegen

FAMILY = 'bunny'
NAME = 'Bunnies'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Carrots', 'veggie': 'Clover', 'pasta': 'Seeds'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'bunny_pellet': ('Pellet', 1, 'A tiny bundle with enormous eyes.', dict(arch='bun_baby')),
 'bunny_button': ('Button', 1, 'Wiggles its nose at everything.', dict(arch='bun_baby', extra=['bun_whisk'])),
 # stage 2 children
 'bunny_hopkin':  ('Hopkin', 2, 'Practising hops, mostly sideways.', dict(arch='bun_sit', extra=['bun_whisk'])),
 'bunny_squeakle':('Squeakle', 2, 'A tiny pika who shouts at clouds.', dict(arch='bun_pika')),
 'bunny_stuffin': ('Stuffin', 2, 'Cheeks full. Always full.', dict(arch='bun_ham')),
 'bunny_dustkin': ('Dustkin', 2, 'A scruffy dust bunny under the sofa.', dict(arch='bun_sit', back='fur', extra=['bun_dust'])),
 # stage 3 teens
 'bunny_springer':  ('Springer', 3, 'All legs and ears. Bounces off walls.', dict(arch='bun_hare', extra=['bun_whisk'])),
 'bunny_lopkin':    ('Lopkin', 3, 'Ears hang down; hears everything anyway.', dict(arch='bun_lop', extra=['bun_whisk'])),
 'bunny_plumpkin':  ('Plumpkin', 3, 'Round, soft and very good at lounging.', dict(arch='bun_plump', fat=1)),
 'bunny_cavvy':     ('Cavvy', 3, 'A guinea pig who squeaks for breakfast.', dict(arch='bun_pig')),
 'bunny_cheeker':   ('Cheeker', 3, 'Hoards seeds in its enormous cheeks.', dict(arch='bun_hamfat', fat=1, extra=['bun_seed'])),
 'bunny_dustbather':('Dustbather', 3, 'Rolls in dust and comes out silky.', dict(arch='bun_chin')),
 'bunny_dozemouse': ('Dozemouse', 3, 'Sleeps through most of the year.', dict(arch='bun_dor')),
 'bunny_haystack':  ('Haystack', 3, 'A pika who stacks hay for winter.', dict(arch='bun_pika', extra=['bun_hay'])),
 'bunny_scruffkin': ('Scruffkin', 3, 'Patchy coat and a bit of a grudge.', dict(arch='bun_sit', back='fur', extra=['bun_notch', 'bun_dust'])),
 'bunny_burrbit':   ('Burrbit', 3, 'Burrs in the fur, digs everywhere.', dict(arch='bun_hare', back='spikes', extra=['bun_notch'])),
 # stage 4 adults
 'bunny_longleap':  ('Longleap', 4, 'A hare who clears fences for fun.', dict(arch='bun_hare2', extra=['bun_whisk'])),
 'bunny_gallop':    ('Gallop', 4, 'Spotted racer. Nobody has caught it.', dict(arch='bun_hare', extra=['spots', 'bun_whisk'])),
 'bunny_floppet':   ('Floppet', 4, 'A big gentle lop with a daisy.', dict(arch='bun_lop', extra=['bun_flower'])),
 'bunny_scholop':   ('Scholop', 4, 'Spectacled lop who reads in the garden.', dict(arch='bun_lop', extra=['glasses', 'bun_bow'])),
 'bunny_clovermuff':('Clovermuff', 4, 'Round and content, smells of clover.', dict(arch='bun_plump', fat=1, extra=['bun_clover'])),
 'bunny_stashcheek':('Stashcheek', 4, 'Cheeks like sacks, pantry like a vault.', dict(arch='bun_hamfat', fat=1, extra=['bun_seed'])),
 'bunny_wheeker':   ('Wheeker', 4, 'Wheeks loudly. Wears a tiny scarf.', dict(arch='bun_pigfl', extra=['scarf'])),
 'bunny_velvetpuff':('Velvetpuff', 4, 'The softest coat in the warren.', dict(arch='bun_chinfl')),
 'bunny_hazelnap':  ('Hazelnap', 4, 'Curls up in a hazel bush and dreams.', dict(arch='bun_dorfl', fat=1)),
 'bunny_cragpika':  ('Cragpika', 4, 'Hay-pile king of the rocky slope.', dict(arch='bun_pika', fat=1, extra=['bun_hay'])),
 'bunny_ragtail':   ('Ragtail', 4, 'Ragged hare, tough as boot leather.', dict(arch='bun_hare', back='fur', extra=['bun_notch', 'spots'])),
 'bunny_dustmop':   ('Dustmop', 4, 'A walking dust bunny. Sneezes a lot.', dict(arch='bun_plump', back='fur', extra=['bun_dust', 'bun_notch'])),
 # stage 5 ultimates
 'bunny_moonbun':    ('Moonbun', 5, 'The moon rabbit, pounding rice under a crescent.', dict(arch='bun_sit', extra=['bun_moon', 'halo'])),
 'bunny_fortunehare':('Fortunehare', 5, 'A lucky hare. Four-leaf clovers follow it.', dict(arch='bun_hare2', extra=['bun_clover', 'bun_coin'])),
 'bunny_gildcheek':  ('Gildcheek', 5, 'Golden hamster king with a crown of seeds.', dict(arch='bun_hamfat', fat=1, extra=['crown', 'bun_coin'])),
 'bunny_galewhisker':('Galewhisker', 5, 'A hare so fast it grows wings.', dict(arch='bun_hare2', extra=['wings', 'scarf'])),
 'bunny_warrenelder':('Warrenelder', 5, 'Ancient lop, keeper of the warren.', dict(arch='bun_lop', fat=1, extra=['halo', 'glasses'])),
 'bunny_starwhisker':('Starwhisker', 5, 'Dormouse of the night sky; tail full of stars.', dict(arch='bun_dorfl', extra=['bun_spark', 'bun_moon'])),
 'bunny_hollowhare': ('Hollowhare', 5, 'A ghost-grey hare who lives in the hedge.', dict(arch='bun_hare2', back='fur', extra=['bun_spark', 'bun_notch'])),
}

# Lineage for Technicolor body colour: meadow, burrow, moon, stray, baby.
LINE = {
 'bunny_pellet': 'baby', 'bunny_button': 'baby',
 'bunny_hopkin': 'meadow', 'bunny_springer': 'meadow', 'bunny_lopkin': 'meadow', 'bunny_plumpkin': 'meadow',
 'bunny_longleap': 'meadow', 'bunny_gallop': 'meadow', 'bunny_floppet': 'meadow', 'bunny_scholop': 'meadow',
 'bunny_clovermuff': 'meadow', 'bunny_fortunehare': 'meadow', 'bunny_galewhisker': 'meadow', 'bunny_warrenelder': 'meadow',
 'bunny_stuffin': 'burrow', 'bunny_cavvy': 'burrow', 'bunny_cheeker': 'burrow', 'bunny_dustbather': 'burrow',
 'bunny_stashcheek': 'burrow', 'bunny_wheeker': 'burrow', 'bunny_velvetpuff': 'burrow', 'bunny_gildcheek': 'burrow',
 'bunny_squeakle': 'moon', 'bunny_dozemouse': 'moon', 'bunny_haystack': 'moon',
 'bunny_hazelnap': 'moon', 'bunny_cragpika': 'moon', 'bunny_moonbun': 'moon', 'bunny_starwhisker': 'moon',
 'bunny_dustkin': 'stray', 'bunny_scruffkin': 'stray', 'bunny_burrbit': 'stray',
 'bunny_ragtail': 'stray', 'bunny_dustmop': 'stray', 'bunny_hollowhare': 'stray',
}
LINE_COLORS = {'meadow': '#B49A72', 'burrow': '#D2A55E', 'moon': '#C9CFD8', 'stray': '#8D8780', 'baby': '#EFE4D0'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'bunny_pellet': [('bunny_dustkin', dict(mist_min=1)), ('bunny_hopkin', dict(lead='meat')), ('bunny_squeakle', dict(lead='veggie')), ('bunny_stuffin', dict(lead='pasta'))],
 'bunny_button': [('bunny_dustkin', dict(mist_min=1)), ('bunny_stuffin', dict(lead='pasta')), ('bunny_squeakle', dict(lead='veggie')), ('bunny_hopkin', dict(lead='meat'))],
 'bunny_hopkin':   [('bunny_scruffkin', dict(mist_min=4)), ('bunny_plumpkin', dict(heavy=True)), ('bunny_springer', dict(train=3)), ('bunny_lopkin', {})],
 'bunny_squeakle': [('bunny_scruffkin', dict(mist_min=4)), ('bunny_haystack', dict(smarts=12)), ('bunny_dozemouse', {})],
 'bunny_stuffin':  [('bunny_scruffkin', dict(mist_min=4)), ('bunny_cheeker', dict(heavy=True)), ('bunny_dustbather', dict(smarts=12)), ('bunny_cavvy', {})],
 'bunny_dustkin':  [('bunny_burrbit', dict(train=3)), ('bunny_scruffkin', {})],
 'bunny_springer':   [('bunny_ragtail', dict(mist_min=4)), ('bunny_gallop', dict(wins=3)), ('bunny_longleap', {})],
 'bunny_lopkin':     [('bunny_ragtail', dict(mist_min=4)), ('bunny_scholop', dict(smarts=20)), ('bunny_floppet', {})],
 'bunny_plumpkin':   [('bunny_dustmop', dict(mist_min=4)), ('bunny_clovermuff', {})],
 'bunny_cavvy':      [('bunny_dustmop', dict(mist_min=4)), ('bunny_wheeker', {})],
 'bunny_cheeker':    [('bunny_dustmop', dict(mist_min=4)), ('bunny_stashcheek', {})],
 'bunny_dustbather': [('bunny_dustmop', dict(mist_min=4)), ('bunny_velvetpuff', {})],
 'bunny_dozemouse':  [('bunny_dustmop', dict(mist_min=4)), ('bunny_hazelnap', {})],
 'bunny_haystack':   [('bunny_ragtail', dict(mist_min=4)), ('bunny_cragpika', {})],
 'bunny_scruffkin':  [('bunny_dustmop', {})],
 'bunny_burrbit':    [('bunny_ragtail', {})],
 'bunny_longleap':   [('bunny_fortunehare', dict(smarts=40)), ('bunny_galewhisker', {})],
 'bunny_gallop':     [('bunny_galewhisker', {})],
 'bunny_floppet':    [('bunny_warrenelder', dict(smarts=40)), ('bunny_fortunehare', {})],
 'bunny_scholop':    [('bunny_moonbun', dict(smarts=40)), ('bunny_warrenelder', {})],
 'bunny_clovermuff': [('bunny_warrenelder', {})],
 'bunny_stashcheek': [('bunny_gildcheek', dict(wins=5)), ('bunny_warrenelder', {})],
 'bunny_wheeker':    [('bunny_starwhisker', dict(smarts=40)), ('bunny_gildcheek', {})],
 'bunny_velvetpuff': [('bunny_moonbun', dict(smarts=40)), ('bunny_starwhisker', {})],
 'bunny_hazelnap':   [('bunny_starwhisker', {})],
 'bunny_cragpika':   [('bunny_moonbun', dict(smarts=40)), ('bunny_starwhisker', {})],
 'bunny_ragtail':    [('bunny_hollowhare', {})],
 'bunny_dustmop':    [('bunny_hollowhare', {})],
}
BABIES = ['bunny_pellet', 'bunny_button']
