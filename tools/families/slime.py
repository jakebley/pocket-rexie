"""The slime family (Plus). Jellies, gel blobs, mushrooms, puddles, goo ghosts, mimics and gelatin desserts.

Food slots reuse the engine's three foods but are named for slimes: meat = Jam, veggie = Moss, pasta = Dew.
Lines (Technicolor body colour): meat -> 'gel', veggie -> 'spore', pasta -> 'tide', neglect -> 'stray' (grey sludge).
"""
import archetypes_slime  # registers the slime archetypes and slime_* decorations with spritegen

FAMILY = 'slime'
NAME = 'Slimes'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Jam', 'veggie': 'Moss', 'pasta': 'Dew'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 babies
 'slime_bead': ('Bead', 1, 'A tiny round drop that jiggles when happy.', dict(arch='slime_bead', extra=['slime_blink', 'slime_shine'])),
 'slime_dollop': ('Dollop', 1, 'A little swirl with a curl on top.', dict(arch='slime_dollop', extra=['slime_blink'])),
 # stage 2 children
 'slime_gloop': ('Gloop', 2, 'Sticky, shiny and ready to bounce.', dict(arch='slime_drop', extra=['slime_blink', 'slime_shine'])),
 'slime_sporelet': ('Sporelet', 2, 'Grew a tiny cap overnight.', dict(arch='slime_hat', extra=['slime_blink', 'slime_dots'])),
 'slime_splash': ('Splash', 2, 'A puddle that giggles when stepped round.', dict(arch='slime_puddle', extra=['slime_blink', 'slime_bubbles'])),
 'slime_gunk': ('Gunk', 2, 'Grey, lumpy and a little bit grumpy.', dict(arch='slime_lump', extra=['slime_blink'])),
 # stage 3 teens
 'slime_wobble': ('Wobble', 3, 'Split down the middle and cannot decide which half is in charge.', dict(arch='slime_heart', extra=['slime_blink', 'slime_shine'])),
 'slime_plumpkin': ('Plumpkin', 3, 'Round, heavy, with a glowing seed inside.', dict(arch='slime_pumpkin', extra=['slime_blink', 'slime_core'])),
 'slime_jiggle': ('Jiggle', 3, 'A wobbly pudding that shakes at loud noises.', dict(arch='slime_jelmould', extra=['slime_blink', 'slime_layer'])),
 'slime_capkin': ('Capkin', 3, 'Spotted cap, soft stem, sleepy eyes.', dict(arch='slime_toad', extra=['slime_blink', 'slime_dots'])),
 'slime_stalkling': ('Stalkling', 3, 'Two eyestalks that look in different directions.', dict(arch='slime_stalk', extra=['slime_blink'])),
 'slime_whelk': ('Whelk', 3, 'Carries a swirled shell and moves very slowly.', dict(arch='slime_shell', extra=['slime_blink'])),
 'slime_dribble': ('Dribble', 3, 'A small bell of jelly trailing little strands.', dict(arch='slime_jelly', extra=['slime_blink'])),
 'slime_wisp': ('Wisp', 3, 'A ghost made of goo. Drifts through keyholes.', dict(arch='slime_ghost', extra=['slime_blink'])),
 'slime_smear': ('Smear', 3, 'Leaves a trail wherever it goes.', dict(arch='slime_slug', extra=['slime_blink'])),
 'slime_dreg': ('Dreg', 3, 'Melting from the top, still smiling.', dict(arch='slime_candle', extra=['slime_blink'])),
 # stage 4 adults
 'slime_gelkeep': ('Gelkeep', 4, 'A tall glass of clear gel with layers like a trifle.', dict(arch='slime_tower', extra=['slime_blink', 'slime_layer'])),
 'slime_twinjelly': ('Twinjelly', 4, 'Two halves joined at the hip, endlessly bickering.', dict(arch='slime_twin2', extra=['slime_blink'])),
 'slime_lidjaw': ('Lidjaw', 4, 'A chest that is not a chest. It has teeth.', dict(arch='slime_mimic', extra=['slime_blink'])),
 'slime_custardine': ('Custardine', 4, 'A caramel pudding with a cherry on top.', dict(arch='slime_gel', extra=['slime_blink', 'slime_cherry'])),
 'slime_morel': ('Morel', 4, 'Tall, pitted cap. Knows every damp corner.', dict(arch='slime_morel', extra=['slime_blink'])),
 'slime_puffcap': ('Puffcap', 4, 'A great round puffball that bursts into spores.', dict(arch='slime_puff', extra=['slime_blink'])),
 'slime_gazer': ('Gazer', 4, 'Two long eyestalks and a bud that is still learning to see.', dict(arch='slime_stalk3', extra=['slime_blink'])),
 'slime_shellwhirl': ('Shellwhirl', 4, 'A big spiral shell humming with the sea.', dict(arch='slime_shell2', extra=['slime_blink'])),
 'slime_bellglass': ('Bellglass', 4, 'A drifting bell of glass-clear jelly.', dict(arch='slime_bell', extra=['slime_blink', 'slime_core'])),
 'slime_mistmaw': ('Mistmaw', 4, 'A hungry fog ghost with a toothy grin.', dict(arch='slime_ghost2', extra=['slime_blink'])),
 'slime_ooze': ('Ooze', 4, 'Slumps, drips and carries on regardless.', dict(arch='slime_slump', extra=['slime_blink'])),
 'slime_tarpit': ('Tarpit', 4, 'A wide black puddle that mutters to itself.', dict(arch='slime_tarpit', extra=['slime_blink'])),
 # stage 5 ultimates
 'slime_crystalis': ('Crystalis', 5, 'A faceted tower of gel with a star-bright core.', dict(arch='slime_crystal', extra=['slime_blink', 'slime_core', 'slime_spark'])),
 'slime_aspic': ('Aspic Regent', 5, 'Crowned lord of the dessert table.', dict(arch='slime_cake', extra=['slime_blink', 'crown', 'slime_spark'])),
 'slime_hoardmaw': ('Hoardmaw', 5, 'Guards a treasure that is also its stomach.', dict(arch='slime_mimic2', extra=['slime_blink', 'slime_spark'])),
 'slime_mycelord': ('Mycelord', 5, 'Mossy monarch of the forest floor.', dict(arch='slime_grove', extra=['slime_blink', 'crown'])),
 'slime_gazeroot': ('Gazeroot', 5, 'An ancient watcher: a mossy trunk with antlers and a halo.', dict(arch='slime_root', extra=['slime_blink', 'halo'])),
 'slime_tideheart': ('Tideheart', 5, 'The sea inside a jelly, glowing softly.', dict(arch='slime_ribbon', extra=['slime_blink', 'halo', 'slime_core'])),
 'slime_moonmist': ('Moonmist', 5, 'A moonlit ghost of goo, calm and silver.', dict(arch='slime_ghost3', extra=['slime_blink', 'slime_moon'])),
 'slime_mirewraith': ('Mirewraith', 5, 'The bog itself, risen and looking for company.', dict(arch='slime_wraith', extra=['slime_blink'])),
}

# Lineage for Technicolor body colour: gel (Jam), spore (Moss), tide (Dew), stray (neglect), baby.
LINE = {
 'slime_bead': 'baby', 'slime_dollop': 'baby',
 'slime_gloop': 'gel', 'slime_wobble': 'gel', 'slime_plumpkin': 'gel', 'slime_jiggle': 'gel',
 'slime_gelkeep': 'gel', 'slime_twinjelly': 'gel', 'slime_lidjaw': 'gel', 'slime_custardine': 'gel',
 'slime_crystalis': 'gel', 'slime_aspic': 'gel', 'slime_hoardmaw': 'gel',
 'slime_sporelet': 'spore', 'slime_capkin': 'spore', 'slime_stalkling': 'spore',
 'slime_morel': 'spore', 'slime_puffcap': 'spore', 'slime_gazer': 'spore',
 'slime_mycelord': 'spore', 'slime_gazeroot': 'spore',
 'slime_splash': 'tide', 'slime_whelk': 'tide', 'slime_dribble': 'tide', 'slime_wisp': 'tide',
 'slime_shellwhirl': 'tide', 'slime_bellglass': 'tide', 'slime_mistmaw': 'tide',
 'slime_tideheart': 'tide', 'slime_moonmist': 'tide',
 'slime_gunk': 'stray', 'slime_smear': 'stray', 'slime_dreg': 'stray',
 'slime_ooze': 'stray', 'slime_tarpit': 'stray', 'slime_mirewraith': 'stray',
}
LINE_COLORS = {'gel': '#C8546E', 'spore': '#8FA25A', 'tide': '#5FA0B0', 'stray': '#8A8878', 'baby': '#E3D9A8'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'slime_bead':   [('slime_gunk', dict(mist_min=1)), ('slime_gloop', dict(lead='meat')), ('slime_sporelet', dict(lead='veggie')), ('slime_splash', dict(lead='pasta'))],
 'slime_dollop': [('slime_gunk', dict(mist_min=1)), ('slime_splash', dict(lead='pasta')), ('slime_sporelet', dict(lead='veggie')), ('slime_gloop', dict(lead='meat'))],
 'slime_gloop':    [('slime_smear', dict(mist_min=4)), ('slime_plumpkin', dict(heavy=True)), ('slime_wobble', dict(train=3)), ('slime_jiggle', {})],
 'slime_sporelet': [('slime_smear', dict(mist_min=4)), ('slime_stalkling', dict(smarts=12)), ('slime_capkin', {})],
 'slime_splash':   [('slime_smear', dict(mist_min=4)), ('slime_whelk', dict(heavy=True)), ('slime_wisp', dict(smarts=12)), ('slime_dribble', {})],
 'slime_gunk':     [('slime_smear', dict(train=3)), ('slime_dreg', {})],
 'slime_wobble':   [('slime_ooze', dict(mist_min=4)), ('slime_twinjelly', dict(wins=3)), ('slime_gelkeep', {})],
 'slime_plumpkin': [('slime_ooze', dict(mist_min=4)), ('slime_lidjaw', dict(wins=3)), ('slime_gelkeep', {})],
 'slime_jiggle':   [('slime_ooze', dict(mist_min=4)), ('slime_custardine', {})],
 'slime_capkin':   [('slime_ooze', dict(mist_min=4)), ('slime_morel', dict(smarts=20)), ('slime_puffcap', {})],
 'slime_stalkling':[('slime_ooze', dict(mist_min=4)), ('slime_gazer', dict(smarts=20)), ('slime_morel', {})],
 'slime_whelk':    [('slime_ooze', dict(mist_min=4)), ('slime_shellwhirl', {})],
 'slime_dribble':  [('slime_ooze', dict(mist_min=4)), ('slime_bellglass', {})],
 'slime_wisp':     [('slime_ooze', dict(mist_min=4)), ('slime_mistmaw', {})],
 'slime_smear':    [('slime_tarpit', dict(train=3)), ('slime_ooze', {})],
 'slime_dreg':     [('slime_tarpit', {})],
 'slime_gelkeep':    [('slime_aspic', dict(wins=5)), ('slime_crystalis', {})],
 'slime_twinjelly':  [('slime_aspic', dict(wins=5)), ('slime_hoardmaw', {})],
 'slime_lidjaw':     [('slime_hoardmaw', {})],
 'slime_custardine': [('slime_crystalis', dict(smarts=40)), ('slime_aspic', {})],
 'slime_morel':      [('slime_gazeroot', dict(smarts=40)), ('slime_mycelord', {})],
 'slime_puffcap':    [('slime_mycelord', {})],
 'slime_gazer':      [('slime_gazeroot', {})],
 'slime_shellwhirl': [('slime_tideheart', {})],
 'slime_bellglass':  [('slime_moonmist', dict(smarts=40)), ('slime_tideheart', {})],
 'slime_mistmaw':    [('slime_moonmist', {})],
 'slime_ooze':       [('slime_mirewraith', {})],
 'slime_tarpit':     [('slime_mirewraith', {})],
}
BABIES = ['slime_bead', 'slime_dollop']
