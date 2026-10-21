"""Single source of truth for the evolution tree. Run gen_swift.py to emit Shared/SpeciesData.swift."""
# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1
 'pip':   ('Pip', 1, 'A round little hatchling.', dict(head='round', tail='short')),
 'nubb':  ('Nubb', 1, 'Curious, with a tiny leaf on its head.', dict(head='round', tail='short', extra=['leaf'])),
 # stage 2
 'rawr':  ('Rawr', 2, 'Loves meat and shows off its fangs.', dict(head='snout', tail='short', extra=['fangs'])),
 'sprig': ('Sprig', 2, 'A leafy nibbler.', dict(head='round', tail='short', extra=['leaf'])),
 'twirl': ('Twirl', 2, 'Noodle-obsessed, with curly hair.', dict(head='round', tail='curl', extra=['noodle'])),
 'mud':   ('Mudpie', 2, 'Scruffy and in need of a bath.', dict(head='round', tail='droop', back='fur', extra=['spots'])),
 # stage 3 teens
 'fang':  ('Fangler', 3, 'Strong jaws, spiky back.', dict(head='snout', tail='long', back='spikes', extra=['fangs'])),
 'brute': ('Brutus', 3, 'Heavy and proud of it.', dict(head='snout', tail='club', legs=4, fat=1)),
 'dash':  ('Dasher', 3, 'Light, quick, crested.', dict(head='crest', tail='long')),
 'moss':  ('Mossback', 3, 'Thoughtful, with a mossy shell.', dict(head='round', tail='short', legs=4, back='shell')),
 'horn':  ('Hornet', 3, 'Charges first, asks later.', dict(head='horn', tail='short', legs=4, back='plates')),
 'bloom': ('Bloomer', 3, 'Friendly with a frilly collar.', dict(head='frill', tail='short', extra=['leaf'])),
 'curlie':('Curlie', 3, 'Spaghetti curls everywhere.', dict(head='round', tail='curl', extra=['noodle'])),
 'ravi':  ('Raviolo', 3, 'Plump, stuffed and cheerful.', dict(head='round', tail='short', fat=1, extra=['stripes'])),
 'zest':  ('Zesty', 3, 'Sharp mind, antenna up.', dict(head='round', tail='long', extra=['antenna', 'glasses'])),
 'grime': ('Grimey', 3, 'Neglected but tough.', dict(head='round', tail='droop', back='fur', extra=['spots'])),
 'scrap': ('Scrappy', 3, 'Rough, horned, always fighting.', dict(head='horns2', tail='spike', back='spikes')),
 # stage 4 adults
 'chomper':   ('Chompasaur', 4, 'A proud T-Rex-style hunter.', dict(head='snout', tail='long', extra=['fangs', 'arms'], back='spikes')),
 'razor':     ('Razorclaw', 4, 'A clever crested raptor.', dict(head='crest', tail='long', extra=['arms', 'glasses'])),
 'bruiser':   ('Bruiser', 4, 'A walking boulder with a club tail.', dict(head='horns2', tail='club', legs=4, fat=1)),
 'sprinter':  ('Sprintosaur', 4, 'Built for speed.', dict(head='bill', tail='fin', extra=['arms'])),
 'longneck':  ('Longneck', 4, 'A gentle brontosaurus type.', dict(head='longneck', tail='long', legs=4)),
 'shellback': ('Shellback', 4, 'Patient, domed and armoured.', dict(head='round', tail='short', legs=4, back='shell')),
 'petalrex':  ('Petal Rex', 4, 'Flower-collared and calm.', dict(head='frill', tail='long', extra=['leaf'], back='plates')),
 'plated':    ('Platesaur', 4, 'A plated stegosaurus type.', dict(head='round', tail='spike', legs=4, back='plates')),
 'tricera':   ('Tricerapop', 4, 'A noodle-fed triceratops type.', dict(head='frill', tail='short', legs=4, extra=['stripes'])),
 'noodlord':  ('Noodlord', 4, 'Rules the spaghetti realm.', dict(head='round', tail='curl', extra=['noodle', 'crown'])),
 'plumpkin':  ('Plumpkin', 4, 'Round, jolly, and proud of dinner.', dict(head='round', tail='short', fat=2, extra=['stripes', 'belly'])),
 'professor': ('Professor', 4, 'Glasses, antenna, big ideas.', dict(head='round', tail='long', extra=['glasses', 'antenna'])),
 'gremlin':   ('Gremlin', 4, 'Mischievous and ragged.', dict(head='horns2', tail='droop', back='fur', extra=['spots'])),
 'scrapper':  ('Scrapper', 4, 'Dented armour, spiked tail.', dict(head='horns2', tail='spike', back='spikes', legs=4)),
 # stage 5 ultimates
 'tyrannox':  ('Tyrannox', 5, 'King of the old forest.', dict(head='snout', tail='long', extra=['fangs', 'arms', 'crown'], back='spikes')),
 'skywing':   ('Skywing', 5, 'Took to the sky at last.', dict(head='bill', tail='fin', extra=['wings', 'arms'])),
 'bulwark':   ('Bulwark', 5, 'An unmovable fortress.', dict(head='horn', tail='club', legs=4, back='shell')),
 'triceron':  ('Triceron', 5, 'Horned, frilled and fearless.', dict(head='frill', tail='spike', legs=4, extra=['arms'], back='plates')),
 'sage':      ('Sage', 5, 'Wise, haloed and calm.', dict(head='round', tail='long', extra=['halo', 'glasses', 'antenna'])),
 'noodlemancer': ('Noodlemancer', 5, 'Casts spells in spaghetti.', dict(head='round', tail='curl', extra=['noodle', 'crown', 'bolt'])),
 'plumpking': ('Plumpking', 5, 'Crowned, round and unstoppable.', dict(head='round', tail='short', fat=2, extra=['crown', 'stripes'])),
 'wreckage':  ('Wreckage', 5, 'Leaves a trail of chaos.', dict(head='horns2', tail='flame', legs=4, back='spikes', extra=['wings'])),
}

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
 'pip':  [('mud', dict(mist_min=4)), ('rawr', dict(lead='meat')), ('sprig', dict(lead='veggie')), ('twirl', dict(lead='pasta'))],
 'nubb': [('mud', dict(mist_min=4)), ('sprig', dict(lead='veggie')), ('twirl', dict(lead='pasta')), ('rawr', dict(lead='meat'))],
 'rawr': [('grime', dict(mist_min=5)), ('brute', dict(heavy=True)), ('fang', dict(train=3)), ('dash', {})],
 'sprig':[('grime', dict(mist_min=5)), ('horn', dict(train=3)), ('moss', dict(smarts=15)), ('bloom', {})],
 'twirl':[('grime', dict(mist_min=5)), ('ravi', dict(heavy=True)), ('zest', dict(smarts=15)), ('curlie', {})],
 'mud':  [('scrap', dict(train=3)), ('grime', {})],
 'fang': [('gremlin', dict(mist_min=5)), ('razor', dict(smarts=20)), ('chomper', {})],
 'brute':[('gremlin', dict(mist_min=5)), ('chomper', dict(wins=3)), ('bruiser', {})],
 'dash': [('gremlin', dict(mist_min=5)), ('razor', dict(smarts=20)), ('sprinter', {})],
 'moss': [('gremlin', dict(mist_min=5)), ('petalrex', dict(smarts=25)), ('shellback', {})],
 'horn': [('gremlin', dict(mist_min=5)), ('plated', {})],
 'bloom':[('gremlin', dict(mist_min=5)), ('longneck', {})],
 'curlie':[('gremlin', dict(mist_min=5)), ('tricera', dict(wins=2)), ('noodlord', {})],
 'ravi': [('gremlin', dict(mist_min=5)), ('plumpkin', {})],
 'zest': [('gremlin', dict(mist_min=5)), ('tricera', dict(wins=2)), ('professor', {})],
 'grime':[('scrapper', dict(train=3)), ('gremlin', {})],
 'scrap':[('scrapper', {})],
 'chomper':  [('skywing', dict(smarts=30)), ('tyrannox', {})],
 'razor':    [('sage', dict(smarts=30)), ('skywing', {})],
 'bruiser':  [('tyrannox', dict(wins=5)), ('wreckage', {})],
 'sprinter': [('skywing', {})],
 'longneck': [('sage', dict(smarts=30)), ('bulwark', {})],
 'shellback':[('bulwark', {})],
 'petalrex': [('sage', dict(smarts=30)), ('triceron', {})],
 'plated':   [('bulwark', dict(wins=3)), ('triceron', {})],
 'tricera':  [('triceron', {})],
 'noodlord': [('noodlemancer', {})],
 'plumpkin': [('plumpking', {})],
 'professor':[('sage', {})],
 'gremlin':  [('wreckage', {})],
 'scrapper': [('wreckage', {})],
}
BABIES = ['pip', 'nubb']
