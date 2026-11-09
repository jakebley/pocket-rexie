"""The bird family (Plus). Same evolution rules as the dino and fox families; feathered pets from fluffy chicks to mythic birds.

Food slots reuse the engine's three foods but are named for birds: meat = Worms, veggie = Seeds, pasta = Minnows.
Lines (for Technicolor body colour): meat -> 'raptor', veggie -> 'songbird', pasta -> 'waterfowl', neglect -> 'stray' (pigeons).
"""
import archetypes_bird  # noqa: F401  (registers the bird archetypes and bird_* decorations)

FAMILY = 'bird'
NAME = 'Birds'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Worms', 'veggie': 'Seeds', 'pasta': 'Minnows'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'bird_downy':   ('Downy', 1, 'All fluff and no feathers yet.', dict(arch='bird_downy')),
 'bird_pipkin':  ('Pipkin', 1, 'Peeps at everything, tuft askew.', dict(arch='bird_pipkin')),
 # stage 2 chicks
 'bird_chirp':   ('Chirp', 2, 'Sings before it can fly.', dict(arch='bird_chirp')),
 'bird_owlet':   ('Owlet', 2, 'Wide-eyed and wobbly at night.', dict(arch='bird_owlet')),
 'bird_ducklet': ('Ducklet', 2, 'Waddles to every puddle.', dict(arch='bird_ducklet')),
 'bird_scruff':  ('Scruff', 2, 'Grubby and wary, sleeps on ledges.', dict(arch='bird_scruff')),
 # stage 3 teens
 'bird_sparrow': ('Sparrow', 3, 'Small, brave and always hopping.', dict(arch='bird_sparrow')),
 'bird_robin':   ('Robin', 3, 'Round red breast, sharp wits.', dict(arch='bird_robin')),
 'bird_finch':   ('Finch', 3, 'A bright little crest and a cheerful trill.', dict(arch='bird_finch')),
 'bird_owl':     ('Owl', 3, 'Round, soft and very patient.', dict(arch='bird_owl')),
 'bird_hawk':    ('Hawk', 3, 'Sharp-eyed and strong-winged.', dict(arch='bird_hawk')),
 'bird_falcon':  ('Falcon', 3, 'Streaks across the sky.', dict(arch='bird_falcon')),
 'bird_mallard': ('Mallard', 3, 'Plump, glossy and sure of itself.', dict(arch='bird_mallard')),
 'bird_heron':   ('Heron', 3, 'Stands still in the shallows, thinking.', dict(arch='bird_heron')),
 'bird_teal':    ('Teal', 3, 'Quick little swimmer.', dict(arch='bird_teal')),
 'bird_dustling':('Dustling', 3, 'Scrappy pigeon, always dusty.', dict(arch='bird_dustling')),
 'bird_sootwing':('Sootwing', 3, 'Patchy feathers, tough as nails.', dict(arch='bird_sootwing')),
 # stage 4 adults
 'bird_lark':    ('Lark', 4, 'Sings the sun up from a fencepost.', dict(arch='bird_lark')),
 'bird_nightingale': ('Nightingale', 4, 'A voice that stops the whole garden.', dict(arch='bird_nightingale')),
 'bird_jay':     ('Jay', 4, 'Bold, loud and rather clever.', dict(arch='bird_jay')),
 'bird_hornowl': ('Hornowl', 4, 'Tufted, wise and a little grumpy.', dict(arch='bird_hornowl')),
 'bird_peregrine':('Peregrine', 4, 'The fastest bird in the valley.', dict(arch='bird_peregrine')),
 'bird_harrier': ('Harrier', 4, 'Glides low over the meadow.', dict(arch='bird_harrier')),
 'bird_swan':    ('Swan', 4, 'Serene on the water, fierce on land.', dict(arch='bird_swan')),
 'bird_egret':   ('Egret', 4, 'Snow-white, with a lacy plume.', dict(arch='bird_egret')),
 'bird_goose':   ('Goose', 4, 'Honks first and asks questions later.', dict(arch='bird_goose')),
 'bird_kingfisher': ('Kingfisher', 4, 'A blue flash over the stream.', dict(arch='bird_kingfisher')),
 'bird_ledgewing': ('Ledgewing', 4, 'Ragged but resourceful city bird.', dict(arch='bird_ledgewing')),
 'bird_tatterdove': ('Tatterdove', 4, 'Dented, scruffy and still cooing.', dict(arch='bird_tatterdove')),
 # stage 5 ultimates
 'bird_emberwing': ('Emberwing', 5, 'A fire bird that rises from its own embers.', dict(arch='bird_emberwing')),
 'bird_stormtalon': ('Stormtalon', 5, 'Thunder eagle, wings wide and crackling.', dict(arch='bird_stormtalon')),
 'bird_moonfeather': ('Moonfeather', 5, 'A moon owl with a silver halo.', dict(arch='bird_moonfeather')),
 'bird_prismlark': ('Prismlark', 5, 'A rainbow songbird with a seven-feather tail.', dict(arch='bird_prismlark')),
 'bird_snowcrest': ('Snowcrest', 5, 'A crowned swan, white as fresh snow.', dict(arch='bird_snowcrest')),
 'bird_tidecrane': ('Tidecrane', 5, 'Calls the tide with long, trailing plumes.', dict(arch='bird_tidecrane')),
 'bird_duskdove': ('Duskdove', 5, 'Evening-grey dove with a shadow tail.', dict(arch='bird_duskdove')),
}

# Lineage for Technicolor body colour: raptor, songbird, waterfowl, stray, baby.
LINE = {
 'bird_downy': 'baby', 'bird_pipkin': 'baby',
 'bird_owlet': 'raptor', 'bird_owl': 'raptor', 'bird_hawk': 'raptor', 'bird_falcon': 'raptor',
 'bird_hornowl': 'raptor', 'bird_peregrine': 'raptor', 'bird_harrier': 'raptor',
 'bird_emberwing': 'raptor', 'bird_stormtalon': 'raptor', 'bird_moonfeather': 'raptor',
 'bird_chirp': 'songbird', 'bird_sparrow': 'songbird', 'bird_robin': 'songbird', 'bird_finch': 'songbird',
 'bird_lark': 'songbird', 'bird_nightingale': 'songbird', 'bird_jay': 'songbird', 'bird_prismlark': 'songbird',
 'bird_ducklet': 'waterfowl', 'bird_mallard': 'waterfowl', 'bird_heron': 'waterfowl', 'bird_teal': 'waterfowl',
 'bird_swan': 'waterfowl', 'bird_egret': 'waterfowl', 'bird_goose': 'waterfowl', 'bird_kingfisher': 'waterfowl',
 'bird_snowcrest': 'waterfowl', 'bird_tidecrane': 'waterfowl',
 'bird_scruff': 'stray', 'bird_dustling': 'stray', 'bird_sootwing': 'stray',
 'bird_ledgewing': 'stray', 'bird_tatterdove': 'stray', 'bird_duskdove': 'stray',
}
LINE_COLORS = {
 'raptor': '#A67C52', 'songbird': '#C98A4B', 'waterfowl': '#7FA0B0', 'stray': '#9A9A98', 'baby': '#EBDCA0',
}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'bird_downy':  [('bird_scruff', dict(mist_min=1)), ('bird_owlet', dict(lead='meat')), ('bird_chirp', dict(lead='veggie')), ('bird_ducklet', dict(lead='pasta'))],
 'bird_pipkin': [('bird_scruff', dict(mist_min=1)), ('bird_chirp', dict(lead='veggie')), ('bird_ducklet', dict(lead='pasta')), ('bird_owlet', dict(lead='meat'))],
 'bird_chirp':  [('bird_sootwing', dict(mist_min=4)), ('bird_sparrow', dict(train=3)), ('bird_robin', dict(smarts=12)), ('bird_finch', {})],
 'bird_owlet':  [('bird_sootwing', dict(mist_min=4)), ('bird_owl', dict(heavy=True)), ('bird_hawk', dict(train=3)), ('bird_falcon', {})],
 'bird_ducklet':[('bird_sootwing', dict(mist_min=4)), ('bird_mallard', dict(heavy=True)), ('bird_heron', dict(smarts=12)), ('bird_teal', {})],
 'bird_scruff': [('bird_dustling', dict(train=3)), ('bird_sootwing', {})],
 'bird_sparrow':[('bird_ledgewing', dict(mist_min=4)), ('bird_nightingale', dict(smarts=20)), ('bird_lark', {})],
 'bird_robin':  [('bird_ledgewing', dict(mist_min=4)), ('bird_nightingale', dict(smarts=20)), ('bird_jay', {})],
 'bird_finch':  [('bird_ledgewing', dict(mist_min=4)), ('bird_jay', dict(wins=2)), ('bird_lark', {})],
 'bird_owl':    [('bird_ledgewing', dict(mist_min=4)), ('bird_hornowl', {})],
 'bird_hawk':   [('bird_ledgewing', dict(mist_min=4)), ('bird_peregrine', dict(wins=3)), ('bird_harrier', {})],
 'bird_falcon': [('bird_ledgewing', dict(mist_min=4)), ('bird_harrier', dict(wins=3)), ('bird_peregrine', {})],
 'bird_mallard':[('bird_ledgewing', dict(mist_min=4)), ('bird_goose', {})],
 'bird_heron':  [('bird_ledgewing', dict(mist_min=4)), ('bird_swan', dict(smarts=20)), ('bird_egret', {})],
 'bird_teal':   [('bird_ledgewing', dict(mist_min=4)), ('bird_kingfisher', dict(wins=2)), ('bird_goose', {})],
 'bird_sootwing':[('bird_tatterdove', dict(train=3)), ('bird_ledgewing', {})],
 'bird_dustling':[('bird_tatterdove', {})],
 'bird_lark':       [('bird_prismlark', {})],
 'bird_nightingale':[('bird_moonfeather', dict(smarts=40)), ('bird_prismlark', {})],
 'bird_jay':        [('bird_stormtalon', dict(wins=5)), ('bird_prismlark', {})],
 'bird_hornowl':    [('bird_moonfeather', {})],
 'bird_peregrine':  [('bird_stormtalon', dict(wins=5)), ('bird_emberwing', {})],
 'bird_harrier':    [('bird_stormtalon', {})],
 'bird_swan':       [('bird_snowcrest', {})],
 'bird_egret':      [('bird_tidecrane', dict(smarts=40)), ('bird_snowcrest', {})],
 'bird_goose':      [('bird_snowcrest', {})],
 'bird_kingfisher': [('bird_tidecrane', {})],
 'bird_ledgewing':  [('bird_duskdove', {})],
 'bird_tatterdove': [('bird_duskdove', {})],
}
BABIES = ['bird_downy', 'bird_pipkin']
