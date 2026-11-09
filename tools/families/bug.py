"""The bug family (Plus). Cute metamorphosis: egg -> grub/caterpillar -> cocoon -> teen -> adult -> mythic bug.

Food slots reuse the engine's three foods: meat = Honey, veggie = Leaves, pasta = Nectar.
Lines (Technicolor body colour): pasta -> 'wing' (flyers), veggie -> 'shell' (beetles), meat -> 'hive' (bees, ants, mantis),
neglect -> 'stray' (dull moths and roaches, played affectionately).
"""
import archetypes_bug  # registers the bug archetypes and bug_* decorations with spritegen

FAMILY = 'bug'
NAME = 'Bugs'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Honey', 'veggie': 'Leaves', 'pasta': 'Nectar'}

SPECIES = {
 # stage 1 hatchlings
 'bug_speck':   ('Speck', 1, 'A cracked egg with two curious feelers.', dict(arch='bug_h_speck')),
 'bug_nub':     ('Nub', 1, 'All head, very little bug. Loves everything.', dict(arch='bug_h_nub')),
 # stage 2 children
 'bug_nibbler': ('Nibbler', 2, 'A caterpillar who eats the whole leaf, then the next.', dict(arch='bug_h_nibbler')),
 'bug_pebble':  ('Pebble', 2, 'Rolls up into a ball when shy.', dict(arch='bug_h_pebble')),
 'bug_buzzlet': ('Buzzlet', 2, 'A plump grub dreaming of honeycomb.', dict(arch='bug_h_buzzlet')),
 'bug_husk':    ('Husk', 2, 'A lonely cocoon on a bare twig.', dict(arch='bug_h_husk')),
 # stage 3 teens
 'bug_flutterling': ('Flutterling', 3, 'Newly unfolded wings, still wobbly.', dict(arch='bug_h_flutterling')),
 'bug_skimmer':   ('Skimmer', 3, 'Races across the pond, never wet.', dict(arch='bug_h_skimmer')),
 'bug_fuzzmoth':  ('Fuzzmoth', 3, 'Soft as a mitten and drawn to lamps.', dict(arch='bug_h_fuzzmoth')),
 'bug_domeling':  ('Domeling', 3, 'A little red shell with polka dots.', dict(arch='bug_h_domeling')),
 'bug_hornlet':   ('Hornlet', 3, 'Charges headfirst at anything.', dict(arch='bug_h_hornlet')),
 'bug_glowbug':   ('Glowbug', 3, 'Flicks on a tiny lamp at dusk.', dict(arch='bug_h_glowbug')),
 'bug_bumble':    ('Bumble', 3, 'Round, fuzzy and bad at turning corners.', dict(arch='bug_h_bumble')),
 'bug_marcher':   ('Marcher', 3, 'Carries three times its weight, politely.', dict(arch='bug_ant')),
 'bug_mantlet':   ('Mantlet', 3, 'Folds its arms and judges you kindly.', dict(arch='bug_h_mantlet')),
 'bug_scuttle':   ('Scuttle', 3, 'Whiskery night wanderer, secretly sweet.', dict(arch='bug_roach')),
 'bug_dimwing':   ('Dimwing', 3, 'A dusty moth with a nibbled wing.', dict(arch='bug_h_dimwing')),
 # stage 4 adults
 'bug_swallowtail': ('Swallowtail', 4, 'Tall sails, tailed wings and a fine eyespot.', dict(arch='bug_h_swallowtail')),
 'bug_darner':    ('Darner', 4, 'A long blue dragonfly that hovers on a reed.', dict(arch='bug_h_darner')),
 'bug_moonmoth':  ('Moonmoth', 4, 'Pale wings that glow under the moon.', dict(arch='bug_h_moonmoth')),
 'bug_dotty':     ('Dotty', 4, 'A round red shell with lucky spots.', dict(arch='bug_h_dotty')),
 'bug_hornback':  ('Hornback', 4, 'A great horned beetle, gentle as a sofa.', dict(arch='bug_h_hornback')),
 'bug_pincher':   ('Pincher', 4, 'Big mandibles, bigger heart.', dict(arch='bug_h_pincher')),
 'bug_lantern':   ('Lantern', 4, 'Lights the garden path.', dict(arch='bug_h_lantern')),
 'bug_bumbler':   ('Bumbler', 4, 'A honeybee with a very full basket.', dict(arch='bug_h_bumbler')),
 'bug_forager':   ('Forager', 4, 'Leads the long line home.', dict(arch='bug_bigant')),
 'bug_leafblade': ('Leafblade', 4, 'A mantis the colour of the hedge.', dict(arch='bug_h_leafblade')),
 'bug_dunmoth':   ('Dunmoth', 4, 'Dusty, dim and very soft.', dict(arch='bug_h_dunmoth')),
 'bug_scurry':    ('Scurry', 4, 'A big roach with a bigger appetite.', dict(arch='bug_bigroach', extra=['bug_tatter'])),
 # stage 5 ultimates
 'bug_aurora':    ('Aurorawing', 5, 'A dawn-coloured butterfly with long streaming tails.', dict(arch='bug_h_aurora')),
 'bug_empress':   ('Moon Empress', 5, 'Silk-winged moth in a little golden crown.', dict(arch='bug_h_empress')),
 'bug_emperor':   ('Emperor Beetle', 5, 'Armoured, crowned and unfailingly polite.', dict(arch='bug_h_emperor')),
 'bug_lanternglow': ('Starlantern', 5, 'Its glow can be seen across the valley.', dict(arch='bug_h_lanternglow')),
 'bug_queen':     ('Honey Queen', 5, 'Rules the hive with a crown and a hum.', dict(arch='bug_h_queen')),
 'bug_tempest':   ('Tempest Darner', 5, 'A dragonfly that rides the storm front.', dict(arch='bug_h_tempest')),
 'bug_jade':      ('Jade Sage', 5, 'A mantis who meditates among the leaves.', dict(arch='bug_h_jade')),
 'bug_ghostmoth': ('Ghostmoth', 5, 'A pale, quiet moth that glimmers like frost.', dict(arch='bug_h_ghostmoth')),
}

LINE = {
 'bug_speck': 'baby', 'bug_nub': 'baby',
 'bug_nibbler': 'wing', 'bug_flutterling': 'wing', 'bug_skimmer': 'wing', 'bug_fuzzmoth': 'wing',
 'bug_swallowtail': 'wing', 'bug_darner': 'wing', 'bug_moonmoth': 'wing',
 'bug_aurora': 'wing', 'bug_empress': 'wing', 'bug_tempest': 'wing',
 'bug_pebble': 'shell', 'bug_domeling': 'shell', 'bug_hornlet': 'shell', 'bug_glowbug': 'shell',
 'bug_dotty': 'shell', 'bug_hornback': 'shell', 'bug_pincher': 'shell', 'bug_lantern': 'shell',
 'bug_emperor': 'shell', 'bug_lanternglow': 'shell',
 'bug_buzzlet': 'hive', 'bug_bumble': 'hive', 'bug_marcher': 'hive', 'bug_mantlet': 'hive',
 'bug_bumbler': 'hive', 'bug_forager': 'hive', 'bug_leafblade': 'hive', 'bug_queen': 'hive', 'bug_jade': 'hive',
 'bug_husk': 'stray', 'bug_scuttle': 'stray', 'bug_dimwing': 'stray', 'bug_dunmoth': 'stray',
 'bug_scurry': 'stray', 'bug_ghostmoth': 'stray',
}
LINE_COLORS = {'wing': '#A9B4CF', 'shell': '#8FA66E', 'hive': '#D9B552', 'stray': '#9A8F82', 'baby': '#E6DFC8'}

EVO = {
 'bug_speck': [('bug_husk', dict(mist_min=1)), ('bug_buzzlet', dict(lead='meat')), ('bug_pebble', dict(lead='veggie')), ('bug_nibbler', dict(lead='pasta'))],
 'bug_nub':   [('bug_husk', dict(mist_min=1)), ('bug_nibbler', dict(lead='pasta')), ('bug_pebble', dict(lead='veggie')), ('bug_buzzlet', dict(lead='meat'))],
 'bug_nibbler': [('bug_dimwing', dict(mist_min=4)), ('bug_skimmer', dict(train=3)), ('bug_fuzzmoth', dict(smarts=12)), ('bug_flutterling', {})],
 'bug_pebble':  [('bug_scuttle', dict(mist_min=4)), ('bug_hornlet', dict(heavy=True)), ('bug_glowbug', dict(smarts=12)), ('bug_domeling', {})],
 'bug_buzzlet': [('bug_scuttle', dict(mist_min=4)), ('bug_bumble', dict(heavy=True)), ('bug_mantlet', dict(train=3)), ('bug_marcher', {})],
 'bug_husk':    [('bug_scuttle', dict(train=3)), ('bug_dimwing', {})],
 'bug_flutterling': [('bug_dunmoth', dict(mist_min=4)), ('bug_moonmoth', dict(smarts=20)), ('bug_swallowtail', {})],
 'bug_skimmer':   [('bug_dunmoth', dict(mist_min=4)), ('bug_darner', dict(wins=3)), ('bug_swallowtail', {})],
 'bug_fuzzmoth':  [('bug_dunmoth', dict(mist_min=4)), ('bug_moonmoth', {})],
 'bug_domeling':  [('bug_scurry', dict(mist_min=4)), ('bug_pincher', dict(wins=3)), ('bug_dotty', {})],
 'bug_hornlet':   [('bug_scurry', dict(mist_min=4)), ('bug_pincher', dict(wins=3)), ('bug_hornback', {})],
 'bug_glowbug':   [('bug_scurry', dict(mist_min=4)), ('bug_lantern', {})],
 'bug_bumble':    [('bug_scurry', dict(mist_min=4)), ('bug_forager', dict(wins=2)), ('bug_bumbler', {})],
 'bug_marcher':   [('bug_scurry', dict(mist_min=4)), ('bug_bumbler', dict(smarts=20)), ('bug_forager', {})],
 'bug_mantlet':   [('bug_scurry', dict(mist_min=4)), ('bug_leafblade', {})],
 'bug_scuttle':   [('bug_dunmoth', dict(smarts=20)), ('bug_scurry', {})],
 'bug_dimwing':   [('bug_dunmoth', {})],
 'bug_swallowtail': [('bug_aurora', {})],
 'bug_darner':    [('bug_tempest', dict(wins=5)), ('bug_aurora', {})],
 'bug_moonmoth':  [('bug_empress', {})],
 'bug_dotty':     [('bug_lanternglow', dict(smarts=40)), ('bug_emperor', {})],
 'bug_hornback':  [('bug_emperor', {})],
 'bug_pincher':   [('bug_emperor', {})],
 'bug_lantern':   [('bug_lanternglow', {})],
 'bug_bumbler':   [('bug_queen', {})],
 'bug_forager':   [('bug_jade', dict(wins=5)), ('bug_queen', {})],
 'bug_leafblade': [('bug_jade', {})],
 'bug_dunmoth':   [('bug_ghostmoth', {})],
 'bug_scurry':    [('bug_ghostmoth', {})],
}
BABIES = ['bug_speck', 'bug_nub']
