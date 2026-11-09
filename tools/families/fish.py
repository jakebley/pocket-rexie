"""The fish family (Plus). Same evolution rules as the dino and fox families; aquatic pets in a bowl-sized world.

Food slots reuse the engine's three foods: meat = Shrimp, veggie = Algae, pasta = Plankton.
Lines (Technicolor body colour): meat -> 'deep', veggie -> 'reef', pasta -> 'pond', neglect -> 'stray'.
"""
import archetypes_fish  # registers the fish_* archetypes (one hand-built body per species) with spritegen

FAMILY = 'fish'
NAME = 'Fish'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Shrimp', 'veggie': 'Algae', 'pasta': 'Plankton'}

A = lambda **k: k
# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'fish_bubblet': ('Bubblet', 1, 'Hatched inside a bubble and still wearing a bit of it.', A(arch='fish_bubblet')),
 'fish_pearlfry': ('Pearlfry', 1, 'A tiny fry that found one big shiny pearl.', A(arch='fish_pearlfry')),
 # stage 2 children
 'fish_nibble': ('Nibble', 2, 'Grazes on every green thing in the tank.', A(arch='fish_nibble')),
 'fish_darter': ('Darter', 2, 'Zips after shrimp and never sits still.', A(arch='fish_darter')),
 'fish_dabble': ('Dabble', 2, 'A pond baby that loves to splash.', A(arch='fish_dabble')),
 'fish_silt':   ('Silt', 2, 'Tank-bottom dweller, murky and shy.', A(arch='fish_silt')),
 # stage 3 teens
 'fish_pufflet': ('Pufflet', 3, 'Puffs up round whenever it is surprised.', A(arch='fish_pufflet')),
 'fish_curlfin': ('Curlfin', 3, 'A young seahorse, curious and curly-tailed.', A(arch='fish_curlfin')),
 'fish_glimmer': ('Glimmer', 3, 'Scales that flash every colour of the reef.', A(arch='fish_glimmer')),
 'fish_gulper': ('Gulper', 3, 'Mostly mouth and always hungry.', A(arch='fish_gulper')),
 'fish_lanternet': ('Lanternet', 3, 'Carries a little lamp into the dark.', A(arch='fish_lanternet')),
 'fish_slinker': ('Slinker', 3, 'Slips through cracks in the rocks.', A(arch='fish_slinker')),
 'fish_plumpkoi': ('Plumpkoi', 3, 'Round, orange and very well fed.', A(arch='fish_plumpkoi')),
 'fish_driftbell': ('Driftbell', 3, 'A soft little jelly that drifts with the tide.', A(arch='fish_driftbell')),
 'fish_ripplekoi': ('Ripplekoi', 3, 'Whiskered and calm, glides through the pond without a ripple.', A(arch='fish_ripplekoi')),
 'fish_dreg':   ('Dreg', 3, 'Rummages in the gravel for leftovers.', A(arch='fish_dreg')),
 'fish_muddle': ('Muddle', 3, 'Cloudy water suits it just fine.', A(arch='fish_muddle')),
 # stage 4 adults
 'fish_spineball': ('Spineball', 4, 'A great spiky puffer, round as a drum.', A(arch='fish_spineball')),
 'fish_seastallion': ('Seastallion', 4, 'Proud seahorse with a tall crest.', A(arch='fish_seastallion')),
 'fish_parrotfin': ('Parrotfin', 4, 'Bright and bold with a bony beak.', A(arch='fish_parrotfin')),
 'fish_coralback': ('Coralback', 4, 'Wears a living garden of coral.', A(arch='fish_coralback')),
 'fish_gapjaw': ('Gapjaw', 4, 'Grins wide enough to swallow the moon.', A(arch='fish_gapjaw')),
 'fish_beaconfish': ('Beaconfish', 4, 'Its lamp guides lost fish home.', A(arch='fish_beaconfish')),
 'fish_moray': ('Moray', 4, 'Long and sly, peeks out of every hole.', A(arch='fish_moray')),
 'fish_skimray': ('Skimray', 4, 'Glides along the sea floor like a kite.', A(arch='fish_skimray')),
 'fish_goldcarp': ('Goldcarp', 4, 'Slow, golden and wonderfully wise.', A(arch='fish_goldcarp')),
 'fish_moonjelly': ('Moonjelly', 4, 'Glows softly like a paper lantern.', A(arch='fish_moonjelly')),
 'fish_brocade': ('Brocade', 4, 'Patterned like a silk robe.', A(arch='fish_brocade')),
 'fish_rustfin': ('Rustfin', 4, 'Patchy and worn, but still swimming.', A(arch='fish_rustfin')),
 'fish_wreckfish': ('Wreckfish', 4, 'Lives in a sunken boot and calls it home.', A(arch='fish_wreckfish')),
 # stage 5 ultimates
 'fish_prismara': ('Prismara', 5, 'The rainbow spirit of the reef.', A(arch='fish_prismara')),
 'fish_seamonarch': ('Sea Monarch', 5, 'Crowned seahorse who rules the kelp.', A(arch='fish_seamonarch')),
 'fish_lanternking': ('Lantern King', 5, 'The angler king, with a lamp like a star.', A(arch='fish_lanternking')),
 'fish_tidewyrm': ('Tidewyrm', 5, 'A gentle sea serpent with horns and a sail.', A(arch='fish_tidewyrm')),
 'fish_aurorabell': ('Aurorabell', 5, 'A jelly bright as the northern lights.', A(arch='fish_aurorabell')),
 'fish_dragonkoi': ('Koi Dragon', 5, 'A koi that climbed the waterfall and became a dragon.', A(arch='fish_dragonkoi')),
 'fish_tidewhale': ('Tidewhale', 5, 'A great whale singing the tides in and out.', A(arch='fish_tidewhale')),
 'fish_hollowfin': ('Hollowfin', 5, 'A ghostly fish skeleton drifting by moonlight.', A(arch='fish_hollowfin')),
}

# Lineage for Technicolor body colour: reef, deep, pond, stray, baby.
LINE = {}
for _line, _ids in {
 'baby': 'bubblet pearlfry',
 'reef': 'nibble pufflet curlfin glimmer spineball seastallion parrotfin coralback prismara seamonarch',
 'deep': 'darter gulper lanternet slinker gapjaw beaconfish moray skimray lanternking tidewyrm aurorabell',
 'pond': 'dabble plumpkoi driftbell ripplekoi goldcarp moonjelly brocade dragonkoi tidewhale',
 'stray': 'silt dreg muddle rustfin wreckfish hollowfin',
}.items():
    for _s in _ids.split(): LINE['fish_' + _s] = _line

LINE_COLORS = {'reef': '#E08A5C', 'deep': '#3F5F8A', 'pond': '#E3A04B', 'stray': '#8E8F78', 'baby': '#BFD7DC'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
_E = {
 'bubblet':   [('silt', dict(mist_min=1)), ('darter', dict(lead='meat')), ('nibble', dict(lead='veggie')), ('dabble', dict(lead='pasta'))],
 'pearlfry':  [('silt', dict(mist_min=1)), ('dabble', dict(lead='pasta')), ('nibble', dict(lead='veggie')), ('darter', dict(lead='meat'))],
 'nibble':    [('muddle', dict(mist_min=4)), ('pufflet', dict(heavy=True)), ('curlfin', dict(smarts=12)), ('glimmer', {})],
 'darter':    [('muddle', dict(mist_min=4)), ('gulper', dict(heavy=True)), ('lanternet', dict(smarts=12)), ('slinker', {})],
 'dabble':    [('muddle', dict(mist_min=4)), ('plumpkoi', dict(heavy=True)), ('driftbell', dict(smarts=12)), ('ripplekoi', {})],
 'silt':      [('dreg', dict(train=3)), ('muddle', {})],
 'pufflet':   [('rustfin', dict(mist_min=4)), ('spineball', {})],
 'curlfin':   [('rustfin', dict(mist_min=4)), ('seastallion', {})],
 'glimmer':   [('rustfin', dict(mist_min=4)), ('parrotfin', dict(train=3)), ('coralback', {})],
 'gulper':    [('rustfin', dict(mist_min=4)), ('gapjaw', {})],
 'lanternet': [('rustfin', dict(mist_min=4)), ('beaconfish', {})],
 'slinker':   [('rustfin', dict(mist_min=4)), ('skimray', dict(train=3)), ('moray', {})],
 'plumpkoi':  [('rustfin', dict(mist_min=4)), ('goldcarp', {})],
 'driftbell': [('rustfin', dict(mist_min=4)), ('moonjelly', {})],
 'ripplekoi': [('rustfin', dict(mist_min=4)), ('brocade', dict(train=3)), ('goldcarp', {})],
 'dreg':      [('wreckfish', {})],
 'muddle':    [('wreckfish', dict(train=3)), ('rustfin', {})],
 'spineball': [('prismara', dict(wins=5)), ('tidewhale', {})],
 'seastallion': [('seamonarch', dict(smarts=40)), ('prismara', {})],
 'parrotfin': [('prismara', {})],
 'coralback': [('seamonarch', dict(smarts=40)), ('prismara', {})],
 'gapjaw':    [('tidewyrm', dict(wins=5)), ('lanternking', {})],
 'beaconfish': [('lanternking', {})],
 'moray':     [('tidewyrm', {})],
 'skimray':   [('aurorabell', dict(smarts=40)), ('tidewyrm', {})],
 'goldcarp':  [('dragonkoi', dict(smarts=40)), ('tidewhale', {})],
 'moonjelly': [('aurorabell', {})],
 'brocade':   [('dragonkoi', {})],
 'rustfin':   [('hollowfin', {})],
 'wreckfish': [('hollowfin', {})],
}
EVO = {'fish_' + p: [('fish_' + c, r) for c, r in lst] for p, lst in _E.items()}
BABIES = ['fish_bubblet', 'fish_pearlfry']
