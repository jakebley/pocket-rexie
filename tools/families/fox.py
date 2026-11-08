"""The fox family (Plus). Same evolution rules as the dino family; different animals, names and look.

Food slots reuse the engine's three foods but are named for foxes: meat = Mice, veggie = Berries, pasta = Fish.
Lines (for Technicolor body colour): meat -> 'hunter', veggie -> 'forager', pasta -> 'riverside', neglect -> 'stray'.
"""
FAMILY = 'fox'
NAME = 'Foxes'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Mice', 'veggie': 'Berries', 'pasta': 'Fish'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 kits
 'dewkit':  ('Dewkit', 1, 'A damp little kit with enormous ears.', dict(arch='fox_sit')),
 'cinder':  ('Cinderkit', 1, 'Born with a warm glow at the tail tip.', dict(arch='fox_sit', tail='flame')),
 # stage 2 children
 'scamp':   ('Scamp', 2, 'Quick, nosy and always pouncing.', dict(arch='fox_stand')),
 'bramble': ('Bramble', 2, 'Collects berries and leaves in its fur.', dict(arch='fox_sit', extra=['leaf'])),
 'ripple':  ('Ripple', 2, 'Loves the riverbank and a good fish.', dict(arch='fox_stand', extra=['stripes'])),
 'ashpaw':  ('Ashpaw', 2, 'Scruffy and wary, sleeps under porches.', dict(arch='fox_stand', back='fur', extra=['spots'])),
 # stage 3 teens
 'tracker': ('Tracker', 3, 'Follows any trail, nose to the ground.', dict(arch='fox_stand', extra=['scarf'])),
 'prowler': ('Prowler', 3, 'Heavy-pawed and patient.', dict(arch='fox_stand', fat=1)),
 'sneak':   ('Sneak', 3, 'Light on its feet, hard to spot.', dict(arch='fox_stand')),
 'thicket': ('Thicket', 3, 'Burrows into hedges and bramble.', dict(arch='fox_sit', extra=['leaf', 'spots'])),
 'whisk':   ('Whisk', 3, 'Clever and quick with a trick.', dict(arch='fox_sit', extra=['scarf'])),
 'bracken': ('Bracken', 3, 'Calm forager in the ferns.', dict(arch='fox_sit', extra=['leaf'])),
 'splash':  ('Splash', 3, 'Round, wet and cheerful.', dict(arch='fox_sit', fat=1, extra=['stripes'])),
 'reed':    ('Reed', 3, 'Thoughtful, watches the water.', dict(arch='fox_stand', extra=['scarf', 'leaf'])),
 'brook':   ('Brook', 3, 'Easygoing river wanderer.', dict(arch='fox_stand', extra=['belly'])),
 'scrabble':('Scrabble', 3, 'Scrappy digger, always muddy.', dict(arch='fox_stand', back='spikes')),
 'tatter':  ('Tatter', 3, 'Patchy coat, tough as nails.', dict(arch='fox_stand', back='fur', extra=['spots'])),
 # stage 4 adults
 'stalker': ('Stalker', 4, 'A silent hunter of the tall grass.', dict(arch='fox_stand', extra=['scarf'])),
 'trickster': ('Trickster', 4, 'Outwits everyone, glasses and all.', dict(arch='fox_sit', extra=['glasses'])),
 'brawler': ('Brawler', 4, 'Broad and strong, wins most scuffles.', dict(arch='fox_stand', fat=1, back='spikes')),
 'swiftail':('Swiftail', 4, 'The fastest fox in the valley.', dict(arch='fox_fennec')),
 'thornback': ('Thornback', 4, 'Bristling spines in the bramble.', dict(arch='fox_stand', back='spikes')),
 'hazelwood': ('Hazelwood', 4, 'Gentle keeper of the woods.', dict(arch='fox_sit', extra=['leaf'])),
 'sagetail':('Sagetail', 4, 'Wise, with a second tail to match.', dict(arch='fox_sit', extra=['tails2', 'glasses'])),
 'plumptail': ('Plumptail', 4, 'Round, fluffy and very well fed.', dict(arch='fox_arctic', fat=1)),
 'angler':  ('Angler', 4, 'Patient river fisher, never misses.', dict(arch='fox_stand', extra=['stripes', 'tails2'])),
 'reedwalker': ('Reedwalker', 4, 'Strides through the shallows.', dict(arch='fox_fennec', extra=['belly'])),
 'raggedy': ('Raggedy', 4, 'Ragged but resourceful.', dict(arch='fox_stand', back='fur', extra=['spots'])),
 'scrapfox':('Scrapfox', 4, 'Dented, scarred and still smiling.', dict(arch='fox_fennec', back='spikes')),
 # stage 5 ultimates
 'moonveil':('Moonveil', 5, 'Three silver tails and a quiet halo.', dict(arch='fox_kitsune', extra=['tails3', 'halo'])),
 'emberlord': ('Emberlord', 5, 'A crowned hunter with a flame-tipped tail.', dict(arch='fox_stand', tail='flame', extra=['crown'])),
 'starbrush': ('Starbrush', 5, 'Five tails sweep the night sky.', dict(arch='fox_kitsune', extra=['tails5', 'crown'])),
 'frostpelt':('Frostpelt', 5, 'Snow-white, serene and plush.', dict(arch='fox_arctic', extra=['tails2', 'crown'])),
 'tidecaller': ('Tidecaller', 5, 'Calls the river with three striped tails.', dict(arch='fox_kitsune', extra=['tails3', 'stripes'])),
 'wildfire':('Wildfire', 5, 'Fast, fierce and trailing sparks.', dict(arch='fox_stand', tail='flame', extra=['tails3'])),
 'gloamfox':('Gloamfox', 5, 'Dusk-dweller with a shadow tail.', dict(arch='fox_fennec', back='fur', extra=['tails2'])),
}

# Lineage for Technicolor body colour: hunter, forager, riverside, stray, baby.
LINE = {
 'dewkit': 'baby', 'cinder': 'baby',
 'scamp': 'hunter', 'tracker': 'hunter', 'prowler': 'hunter', 'sneak': 'hunter',
 'stalker': 'hunter', 'trickster': 'hunter', 'brawler': 'hunter', 'swiftail': 'hunter',
 'emberlord': 'hunter', 'wildfire': 'hunter',
 'bramble': 'forager', 'thicket': 'forager', 'whisk': 'forager', 'bracken': 'forager',
 'thornback': 'forager', 'hazelwood': 'forager', 'sagetail': 'forager', 'starbrush': 'forager', 'moonveil': 'forager',
 'ripple': 'riverside', 'splash': 'riverside', 'reed': 'riverside', 'brook': 'riverside',
 'plumptail': 'riverside', 'angler': 'riverside', 'reedwalker': 'riverside', 'tidecaller': 'riverside', 'frostpelt': 'riverside',
 'ashpaw': 'stray', 'scrabble': 'stray', 'tatter': 'stray', 'raggedy': 'stray', 'scrapfox': 'stray', 'gloamfox': 'stray',
}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'dewkit': [('ashpaw', dict(mist_min=1)), ('scamp', dict(lead='meat')), ('bramble', dict(lead='veggie')), ('ripple', dict(lead='pasta'))],
 'cinder': [('ashpaw', dict(mist_min=1)), ('bramble', dict(lead='veggie')), ('ripple', dict(lead='pasta')), ('scamp', dict(lead='meat'))],
 'scamp':   [('tatter', dict(mist_min=4)), ('prowler', dict(heavy=True)), ('tracker', dict(train=3)), ('sneak', {})],
 'bramble': [('tatter', dict(mist_min=4)), ('thicket', dict(train=3)), ('whisk', dict(smarts=12)), ('bracken', {})],
 'ripple':  [('tatter', dict(mist_min=4)), ('splash', dict(heavy=True)), ('reed', dict(smarts=12)), ('brook', {})],
 'ashpaw':  [('scrabble', dict(train=3)), ('tatter', {})],
 'tracker': [('raggedy', dict(mist_min=4)), ('trickster', dict(smarts=20)), ('stalker', {})],
 'prowler': [('raggedy', dict(mist_min=4)), ('stalker', dict(wins=3)), ('brawler', {})],
 'sneak':   [('raggedy', dict(mist_min=4)), ('trickster', dict(smarts=20)), ('swiftail', {})],
 'thicket': [('raggedy', dict(mist_min=4)), ('thornback', {})],
 'whisk':   [('raggedy', dict(mist_min=4)), ('sagetail', dict(smarts=20)), ('hazelwood', {})],
 'bracken': [('raggedy', dict(mist_min=4)), ('hazelwood', {})],
 'splash':  [('raggedy', dict(mist_min=4)), ('plumptail', {})],
 'reed':    [('raggedy', dict(mist_min=4)), ('angler', dict(wins=2)), ('reedwalker', {})],
 'brook':   [('raggedy', dict(mist_min=4)), ('angler', dict(wins=2)), ('reedwalker', {})],
 'tatter':  [('scrapfox', dict(train=3)), ('raggedy', {})],
 'scrabble':[('scrapfox', {})],
 'stalker':   [('moonveil', dict(smarts=40)), ('emberlord', {})],
 'trickster': [('starbrush', dict(smarts=40)), ('moonveil', {})],
 'brawler':   [('emberlord', dict(wins=5)), ('frostpelt', {})],
 'swiftail':  [('wildfire', {})],
 'thornback': [('starbrush', dict(smarts=40)), ('wildfire', {})],
 'hazelwood': [('starbrush', dict(smarts=40)), ('wildfire', {})],
 'sagetail':  [('starbrush', {})],
 'plumptail': [('frostpelt', {})],
 'angler':    [('tidecaller', {})],
 'reedwalker':[('tidecaller', dict(smarts=40)), ('moonveil', {})],
 'raggedy':   [('gloamfox', {})],
 'scrapfox':  [('gloamfox', {})],
}
BABIES = ['dewkit', 'cinder']
