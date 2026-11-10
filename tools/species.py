"""Single source of truth for the evolution tree. Run gen_swift.py to emit Shared/SpeciesData.swift."""
# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'pip':   ('Pip', 1, 'A round little hatchling.', dict(arch='pip')),
 'nubb':  ('Nubb', 1, 'Curious, with a tiny leaf on its head.', dict(arch='nubb')),
 # stage 2 children
 'rawr':  ('Rawr', 2, 'Loves meat and shows off its fangs.', dict(arch='trex', extra=['fangs'])),
 'sprig': ('Sprig', 2, 'A leafy nibbler.', dict(arch='bronto', extra=['leaf'])),
 'twirl': ('Twirl', 2, 'Noodle-obsessed, with curly hair.', dict(arch='trike', extra=['noodle'])),
 'mud':   ('Mudpie', 2, 'Scruffy and in need of a bath.', dict(arch='raptor', back='fur', extra=['spots'])),
 # stage 3 teens
 'fang':  ('Fangler', 3, 'Strong jaws, spiky back.', dict(arch='trex', back='spikes', extra=['fangs'])),
 'brute': ('Brutus', 3, 'Heavy and proud of it.', dict(arch='ankylo', tail='club', fat=1)),
 'dash':  ('Dasher', 3, 'Light, quick, crested.', dict(arch='raptor', extra=['crest'])),
 'moss':  ('Mossback', 3, 'Thoughtful, with a mossy shell.', dict(arch='ankylo', back='shell')),
 'horn':  ('Hornet', 3, 'Charges first, asks later.', dict(arch='trike', extra=['horn'])),
 'bloom': ('Bloomer', 3, 'Friendly, with a leaf on its head.', dict(arch='bronto', extra=['leaf'])),
 'curlie':('Curlie', 3, 'Spaghetti curls everywhere.', dict(arch='raptor', tail='curl', extra=['noodle'])),
 'ravi':  ('Raviolo', 3, 'Plump, stuffed and cheerful.', dict(arch='trike', fat=1, extra=['stripes'])),
 'zest':  ('Zesty', 3, 'Sharp mind, antenna up.', dict(arch='raptor', extra=['antenna', 'glasses'])),
 'grime': ('Grimey', 3, 'Neglected but tough.', dict(arch='trex', back='fur', extra=['spots'])),
 'scrap': ('Scrappy', 3, 'Rough, horned, always fighting.', dict(arch='stego', tail='spike')),
 # stage 4 adults
 'chomper':   ('Chompasaur', 4, 'A proud T-Rex-style hunter.', dict(arch='trex', extra=['fangs'])),
 'razor':     ('Razorclaw', 4, 'A clever crested raptor.', dict(arch='raptor', extra=['crest', 'glasses'])),
 'bruiser':   ('Bruiser', 4, 'A walking boulder with a club tail.', dict(arch='ankylo', tail='club', fat=1)),
 'sprinter':  ('Sprintosaur', 4, 'Built for speed.', dict(arch='raptor_s', back='sail')),
 'longneck':  ('Longneck', 4, 'A gentle brontosaurus type.', dict(arch='bronto_l')),
 'shellback': ('Shellback', 4, 'Patient, domed and armoured.', dict(arch='ankylo_s', back='shell')),
 'petalrex':  ('Petal Rex', 4, 'Flower-collared and calm.', dict(arch='frilled')),
 'plated':    ('Platesaur', 4, 'A plated stegosaurus type.', dict(arch='stego_p', tail='spike')),
 'tricera':   ('Tricerapop', 4, 'A noodle-fed triceratops type.', dict(arch='trike', extra=['horn'])),
 'noodlord':  ('Noodlord', 4, 'Rules the spaghetti realm.', dict(arch='therizino', extra=['crown'])),
 'plumpkin':  ('Plumpkin', 4, 'Round, jolly, and proud of dinner.', dict(arch='trike', fat=1, extra=['stripes', 'belly'])),
 'professor': ('Professor', 4, 'Glasses, antenna, big ideas.', dict(arch='hadro', extra=['glasses'])),
 'gremlin':   ('Gremlin', 4, 'Mischievous and ragged.', dict(arch='gobbo', back='fur')),
 'scrapper':  ('Scrapper', 4, 'Dented armour, spiked tail.', dict(arch='brawler', back='spikes', tail='spike')),
 # stage 5 ultimates
 'tyrannox':  ('Tyrannox', 5, 'King of the old forest.', dict(arch='trex', back='spikes', extra=['fangs', 'crown'])),
 'skywing':   ('Skywing', 5, 'Took to the sky at last.', dict(arch='flyer')),
 'bulwark':   ('Bulwark', 5, 'An unmovable fortress.', dict(arch='fortress')),
 'triceron':  ('Triceron', 5, 'Horned, frilled and fearless.', dict(arch='trike', extra=['horn', 'stripes'], back='plates')),
 'sage':      ('Sage', 5, 'Wise, haloed and calm.', dict(arch='sitter', extra=['halo', 'glasses'])),
 'noodlemancer': ('Noodlemancer', 5, 'Casts spells in spaghetti.', dict(arch='wizard')),
 'plumpking': ('Plumpking', 5, 'Crowned, round and unstoppable.', dict(arch='trike', fat=1, extra=['crown', 'stripes'])),
 'wreckage':  ('Wreckage', 5, 'Leaves a trail of chaos.', dict(arch='trex', tail='flame', back='spikes', extra=['horns2', 'wings'])),
}

# Lineage color family per species (drives the Technicolor body color). Ultimates and adults shared by
# several lines take the line they are most commonly reached from.
LINE = {}
for _ids, _line in [
    ('pip nubb', 'baby'),
    ('rawr fang brute dash chomper razor bruiser sprinter tyrannox skywing', 'meat'),
    ('sprig moss horn bloom shellback petalrex plated longneck bulwark sage', 'veggie'),
    ('twirl curlie ravi zest tricera noodlord plumpkin professor triceron noodlemancer plumpking', 'pasta'),
    ('mud grime scrap gremlin scrapper wreckage', 'neglect'),
]:
    for _i in _ids.split():
        LINE[_i] = _line
assert set(LINE) == set(SPECIES), set(SPECIES) ^ set(LINE)

# parent -> ordered list of (child, requirements). First match wins; the last entry has no requirements.
# Requirement keys (counters are for the stage just ended):
#   mist_min, mist_max   care mistakes
#   train                trainings done
#   wins                 battles won
#   smarts               smarts stat (petting, play, study)
#   disc                 discipline stat
#   heavy                overweight at evolution time
#   lead                 leading diet: meat | veggie | pasta
M5 = ('mist_min', 5)
EVO = {
 'pip':  [('mud', dict(mist_min=1)), ('rawr', dict(lead='meat')), ('sprig', dict(lead='veggie')), ('twirl', dict(lead='pasta'))],
 'nubb': [('mud', dict(mist_min=1)), ('sprig', dict(lead='veggie')), ('twirl', dict(lead='pasta')), ('rawr', dict(lead='meat'))],
 'rawr': [('grime', dict(mist_min=4)), ('brute', dict(heavy=True)), ('fang', dict(train=3)), ('dash', {})],
 'sprig':[('grime', dict(mist_min=4)), ('horn', dict(train=3)), ('moss', dict(smarts=12)), ('bloom', {})],
 'twirl':[('grime', dict(mist_min=4)), ('ravi', dict(heavy=True)), ('zest', dict(smarts=12)), ('curlie', {})],
 'mud':  [('scrap', dict(train=3)), ('grime', {})],
 'fang': [('gremlin', dict(mist_min=4)), ('razor', dict(smarts=20)), ('chomper', {})],
 'brute':[('gremlin', dict(mist_min=4)), ('chomper', dict(wins=3)), ('bruiser', {})],
 'dash': [('gremlin', dict(mist_min=4)), ('razor', dict(smarts=20)), ('sprinter', {})],
 'moss': [('gremlin', dict(mist_min=4)), ('petalrex', dict(smarts=20)), ('shellback', {})],
 'horn': [('gremlin', dict(mist_min=4)), ('plated', {})],
 'bloom':[('gremlin', dict(mist_min=4)), ('longneck', {})],
 'curlie':[('gremlin', dict(mist_min=4)), ('tricera', dict(wins=2)), ('noodlord', {})],
 'ravi': [('gremlin', dict(mist_min=4)), ('plumpkin', {})],
 'zest': [('gremlin', dict(mist_min=4)), ('tricera', dict(wins=2)), ('professor', {})],
 'grime':[('scrapper', dict(train=3)), ('gremlin', {})],
 'scrap':[('scrapper', {})],
 'chomper':  [('skywing', dict(smarts=40)), ('tyrannox', {})],
 'razor':    [('sage', dict(smarts=40)), ('skywing', {})],
 'bruiser':  [('tyrannox', dict(wins=5)), ('bulwark', {})],
 'sprinter': [('skywing', {})],
 'longneck': [('sage', dict(smarts=40)), ('bulwark', {})],
 'shellback':[('bulwark', {})],
 'petalrex': [('sage', dict(smarts=40)), ('triceron', {})],
 'plated':   [('bulwark', dict(wins=3)), ('triceron', {})],
 'tricera':  [('triceron', {})],
 'noodlord': [('noodlemancer', {})],
 'plumpkin': [('plumpking', {})],
 'professor':[('sage', {})],
 'gremlin':  [('wreckage', {})],
 'scrapper': [('wreckage', {})],
}
BABIES = ['pip', 'nubb']

# Every species belongs to a family (an animal line). The free app ships only 'dino'; docs/PLUS.md plans paid families.
FAMILY = 'dino'
