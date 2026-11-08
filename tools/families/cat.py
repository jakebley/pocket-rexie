"""The cat family (Plus). Cosy domestic cats: kittens grow into house cats, alley cats, wildcats and legends.

Food slots reuse the engine's three foods but are named for cats: meat = Tuna, veggie = Catnip, pasta = Milk.
Lines (Technicolor body colour): meat -> 'hunter' (wildcat), veggie -> 'alley', pasta -> 'sofa', neglect -> 'stray'.
"""
import archetypes_cat  # registers the cat archetypes and cat_* decorations with spritegen

FAMILY = 'cat'
NAME = 'Cats'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Tuna', 'veggie': 'Catnip', 'pasta': 'Milk'}

W_ = ['cat_whiskers']
# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 kittens
 'cat_mittens': ('Mittens', 1, 'A tiny kitten with four white socks.', dict(arch='cat_kitten', extra=['cat_whiskers'])),
 'cat_pip':     ('Pip', 1, 'Chases its own tail and wins.', dict(arch='cat_kitten', extra=['cat_yarn'])),
 # stage 2 children
 'cat_pounce':  ('Pounce', 2, 'Springs at every shadow and dust bunny.', dict(arch='cat_stand', extra=['cat_whiskers', 'cat_tabby'])),
 'cat_scrap':   ('Scrap', 2, 'Street-smart kitten with a cheeky grin.', dict(arch='cat_stand', extra=['cat_whiskers', 'cat_notch'])),
 'cat_pudding': ('Pudding', 2, 'Round, warm and always sleepy.', dict(arch='cat_loaf', extra=['cat_whiskers'])),
 'cat_smudge':  ('Smudge', 2, 'A scruffy kitten who hides under porches.', dict(arch='cat_stand', back='fur', extra=['cat_notch'])),
 # stage 3 teens
 'cat_stripling': ('Stripling', 3, 'Tabby stripes and boundless energy.', dict(arch='cat_stand', extra=['cat_tabby', 'cat_whiskers'])),
 'cat_tuftkin':   ('Tuftkin', 3, 'Tufted ears, a keen eye and a short tail.', dict(arch='cat_bob', extra=['cat_tufts', 'cat_whiskers'])),
 'cat_thudpaw':   ('Thudpaw', 3, 'Heavy-footed. The floor knows when it lands.', dict(arch='cat_round', fat=1, extra=['cat_tabby'])),
 'cat_rascal':    ('Rascal', 3, 'Knocks things off shelves on purpose.', dict(arch='cat_stand', extra=['cat_notch', 'cat_whiskers'])),
 'cat_bandit':    ('Bandit', 3, 'Masked and quick, steals socks.', dict(arch='cat_sit', extra=['scarf', 'cat_whiskers'])),
 'cat_loaf':      ('Loaf', 3, 'Tucks all four paws away and becomes bread.', dict(arch='cat_loaf', fat=1, extra=['cat_whiskers'])),
 'cat_bellkin':   ('Bellkin', 3, 'Collar bell jingling, never quite sneaks.', dict(arch='cat_sit', extra=['cat_bell', 'cat_whiskers'])),
 'cat_fluffkin':  ('Fluffkin', 3, 'Fur by the armful. Mind the sofa.', dict(arch='cat_round', extra=['cat_whiskers'])),
 'cat_scruff':    ('Scruff', 3, 'Digs, climbs and tumbles through bins.', dict(arch='cat_stand', back='spikes', extra=['cat_notch'])),
 'cat_tatterclaw':('Tatterclaw', 3, 'Patchy coat, torn ear, tough as nails.', dict(arch='cat_stand', back='fur', extra=['cat_notch', 'spots'])),
 # stage 4 adults
 'cat_brindle':   ('Brindle', 4, 'Handsome tabby, fast and graceful.', dict(arch='cat_lean', extra=['cat_tabby', 'cat_whiskers'])),
 'cat_bobtuft':   ('Bobtuft', 4, 'A lynx-eared hunter with a bobbed tail.', dict(arch='cat_bob', extra=['cat_tufts', 'cat_whiskers'])),
 'cat_thunderpaw':('Thunderpaw', 4, 'Broad and strong, wins most scuffles.', dict(arch='cat_stand', fat=1, extra=['cat_tabby', 'cat_tufts'])),
 'cat_spotclaw':  ('Spotclaw', 4, 'Spotted wildcat, lean as a whip.', dict(arch='cat_lean', extra=['spots', 'cat_tufts'])),
 'cat_roofrunner':('Roofrunner', 4, 'King of the rooftops and fences.', dict(arch='cat_lean', extra=['scarf', 'cat_whiskers'])),
 'cat_jinx':      ('Jinx', 4, 'Outwits everyone, glasses and all.', dict(arch='cat_sit', extra=['glasses', 'cat_whiskers'])),
 'cat_gingertom': ('Ginger Tom', 4, 'Scarred champion of the back alley.', dict(arch='cat_stand', fat=1, extra=['cat_notch', 'cat_whiskers'])),
 'cat_marmalade': ('Marmalade', 4, 'Orange, round and very well fed.', dict(arch='cat_round', fat=1, extra=['cat_whiskers'])),
 'cat_dowager':   ('Dowager', 4, 'Wise old puss with pearls and spectacles.', dict(arch='cat_sit', extra=['glasses', 'scarf', 'cat_whiskers'])),
 'cat_lapwarmer': ('Lapwarmer', 4, 'Purrs on request. Moves rarely.', dict(arch='cat_loaf', fat=1, extra=['cat_yarn', 'cat_whiskers'])),
 'cat_velvet':    ('Velvet', 4, 'Elegant and slender, with a collar bell.', dict(arch='cat_sit', extra=['cat_bell', 'cat_whiskers'])),
 'cat_raggle':    ('Raggle', 4, 'Ragged but resourceful.', dict(arch='cat_stand', back='fur', extra=['cat_notch', 'spots'])),
 'cat_moggy':     ('Moggy', 4, 'Dented, scarred and still purring.', dict(arch='cat_lean', back='spikes', extra=['cat_notch'])),
 # stage 5 ultimates
 'cat_mooncat':   ('Mooncat', 5, 'Silver fur and a crescent moon overhead.', dict(arch='cat_sit', extra=['cat_moon', 'cat_whiskers', 'cat_ringtail'])),
 'cat_luckypaw':  ('Luckypaw', 5, 'Waves a lucky paw. Good fortune follows.', dict(arch='cat_round', extra=['cat_luckypaw', 'cat_bell', 'cat_whiskers'])),
 'cat_sovereign': ('Sovereign', 5, 'Lion-maned monarch of the sunny wall.', dict(arch='cat_king', extra=['cat_mane', 'crown'])),
 'cat_umbra':     ('Umbra', 5, 'A shadow panther, quiet as dusk.', dict(arch='cat_lean', back='fur', extra=['cat_tufts', 'cat_spark'])),
 'cat_hoarfrost': ('Hoarfrost', 5, 'A snow lynx wrapped in frosty fluff.', dict(arch='cat_bob', fat=1, extra=['cat_tufts', 'cat_spark', 'cat_whiskers'])),
 'cat_emberstripe': ('Emberstripe', 5, 'Striped and fiery, with a glowing tail.', dict(arch='cat_stand', tail='flame', extra=['cat_tabby', 'cat_tufts'])),
 'cat_hearthpurr':('Hearthpurr', 5, 'The warmest cat. Everyone gathers round.', dict(arch='cat_loaf', extra=['halo', 'cat_whiskers'])),
}

# Lineage for Technicolor body colour: hunter, alley, sofa, stray, baby.
LINE = {
 'cat_mittens': 'baby', 'cat_pip': 'baby',
 'cat_pounce': 'hunter', 'cat_stripling': 'hunter', 'cat_tuftkin': 'hunter', 'cat_thudpaw': 'hunter',
 'cat_brindle': 'hunter', 'cat_bobtuft': 'hunter', 'cat_thunderpaw': 'hunter', 'cat_spotclaw': 'hunter',
 'cat_hoarfrost': 'hunter', 'cat_emberstripe': 'hunter', 'cat_sovereign': 'hunter',
 'cat_scrap': 'alley', 'cat_rascal': 'alley', 'cat_bandit': 'alley',
 'cat_roofrunner': 'alley', 'cat_jinx': 'alley', 'cat_gingertom': 'alley',
 'cat_pudding': 'sofa', 'cat_loaf': 'sofa', 'cat_bellkin': 'sofa', 'cat_fluffkin': 'sofa',
 'cat_marmalade': 'sofa', 'cat_dowager': 'sofa', 'cat_lapwarmer': 'sofa', 'cat_velvet': 'sofa',
 'cat_mooncat': 'sofa', 'cat_luckypaw': 'alley', 'cat_hearthpurr': 'sofa',
 'cat_smudge': 'stray', 'cat_scruff': 'stray', 'cat_tatterclaw': 'stray',
 'cat_raggle': 'stray', 'cat_moggy': 'stray', 'cat_umbra': 'stray',
}
LINE_COLORS = {'hunter': '#A8885C', 'alley': '#D08A4A', 'sofa': '#D9CBB0', 'stray': '#8E8A84', 'baby': '#EADFC8'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'cat_mittens': [('cat_smudge', dict(mist_min=1)), ('cat_pounce', dict(lead='meat')), ('cat_scrap', dict(lead='veggie')), ('cat_pudding', dict(lead='pasta'))],
 'cat_pip':     [('cat_smudge', dict(mist_min=1)), ('cat_pudding', dict(lead='pasta')), ('cat_scrap', dict(lead='veggie')), ('cat_pounce', dict(lead='meat'))],
 'cat_pounce':  [('cat_tatterclaw', dict(mist_min=4)), ('cat_thudpaw', dict(heavy=True)), ('cat_stripling', dict(train=3)), ('cat_tuftkin', {})],
 'cat_scrap':   [('cat_tatterclaw', dict(mist_min=4)), ('cat_rascal', dict(train=3)), ('cat_bandit', {})],
 'cat_pudding': [('cat_tatterclaw', dict(mist_min=4)), ('cat_loaf', dict(heavy=True)), ('cat_bellkin', dict(smarts=12)), ('cat_fluffkin', {})],
 'cat_smudge':  [('cat_scruff', dict(train=3)), ('cat_tatterclaw', {})],
 'cat_stripling': [('cat_raggle', dict(mist_min=4)), ('cat_spotclaw', dict(wins=3)), ('cat_brindle', {})],
 'cat_tuftkin':   [('cat_raggle', dict(mist_min=4)), ('cat_bobtuft', dict(smarts=20)), ('cat_spotclaw', {})],
 'cat_thudpaw':   [('cat_raggle', dict(mist_min=4)), ('cat_brindle', dict(wins=3)), ('cat_thunderpaw', {})],
 'cat_rascal':    [('cat_raggle', dict(mist_min=4)), ('cat_gingertom', dict(wins=2)), ('cat_roofrunner', {})],
 'cat_bandit':    [('cat_raggle', dict(mist_min=4)), ('cat_jinx', dict(smarts=20)), ('cat_roofrunner', {})],
 'cat_loaf':      [('cat_raggle', dict(mist_min=4)), ('cat_lapwarmer', {})],
 'cat_bellkin':   [('cat_raggle', dict(mist_min=4)), ('cat_dowager', dict(smarts=20)), ('cat_velvet', {})],
 'cat_fluffkin':  [('cat_raggle', dict(mist_min=4)), ('cat_marmalade', {})],
 'cat_tatterclaw':[('cat_moggy', dict(train=3)), ('cat_raggle', {})],
 'cat_scruff':    [('cat_moggy', {})],
 'cat_brindle':   [('cat_hoarfrost', dict(smarts=40)), ('cat_emberstripe', {})],
 'cat_bobtuft':   [('cat_mooncat', dict(smarts=40)), ('cat_hoarfrost', {})],
 'cat_thunderpaw':[('cat_sovereign', dict(wins=5)), ('cat_emberstripe', {})],
 'cat_spotclaw':  [('cat_emberstripe', {})],
 'cat_roofrunner':[('cat_luckypaw', dict(smarts=40)), ('cat_umbra', {})],
 'cat_jinx':      [('cat_mooncat', dict(smarts=40)), ('cat_luckypaw', {})],
 'cat_gingertom': [('cat_sovereign', dict(wins=5)), ('cat_umbra', {})],
 'cat_marmalade': [('cat_hearthpurr', {})],
 'cat_dowager':   [('cat_mooncat', dict(smarts=40)), ('cat_hearthpurr', {})],
 'cat_lapwarmer': [('cat_hearthpurr', {})],
 'cat_velvet':    [('cat_luckypaw', dict(smarts=40)), ('cat_mooncat', {})],
 'cat_raggle':    [('cat_umbra', {})],
 'cat_moggy':     [('cat_umbra', {})],
}
BABIES = ['cat_mittens', 'cat_pip']
