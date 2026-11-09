"""The Halos and Horns family (Plus): angel, devil and mischievous in-between spirits. Alignment is the whole point.

Food slots reuse the engine's three foods but are named for spirits: meat = Embers, veggie = Clouds, pasta = Stardust.
Alignment comes from how the pet is treated, using existing signals only:
  discipline (`disc`, +25 per scold when it is naughty), care mistakes (`mist_min`/`mist_max`), `heavy`, `smarts`,
  `train`, `wins` and the diet `lead`.
Lines (Technicolor body colour): veggie/scolded -> 'halo', meat/spoiled -> 'horn', mixed -> 'imp', neglect -> 'soot'.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import archetypes_spirits  # registers archetypes and decorations

FAMILY = 'spirits'
NAME = 'Halos and Horns'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Embers', 'veggie': 'Clouds', 'pasta': 'Stardust'}

def X(*a): return ['spirits_' + n for n in a]

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'spirits_puffet':  ('Puffet', 1, 'A fluffy hatchling with a tiny floating halo.', dict(arch='spr_feet', extra=X('halo_small'))),
 'spirits_nubbin':  ('Nubbin', 1, 'A warm hatchling with two little horn buds.', dict(arch='spr_emberb', extra=X('nubs'))),
 # stage 2 children
 'spirits_cloudlet':('Cloudlet', 2, 'Naps on its own little cloud.', dict(arch='spr_cloud', extra=X('halo_small'))),
 'spirits_emberling':('Emberling', 2, 'Toasty, giggly and a bit of a rascal.', dict(arch='spr_ember', extra=X('nubs'))),
 'spirits_glimmer': ('Glimmer', 2, 'Halo on one side, horn on the other.', dict(arch='spr_imp', extra=X('halo_side', 'horn1'))),
 'spirits_smudge':  ('Smudge', 2, 'Sooty and sleepy, with a wonky halo.', dict(arch='spr_imp', extra=X('halo_crook', 'torn'))),
 # stage 3 teens
 'spirits_puffwing':('Puffwing', 3, 'Soft little wings, a cloud for a pillow.', dict(arch='spr_cloud', extra=X('halo', 'wingfold'))),
 'spirits_haloling':('Haloling', 3, 'Polite, shiny and a tiny bit proud.', dict(arch='spr_feet', extra=X('halo', 'wings'))),
 'spirits_fluffimp':('Fluffimp', 3, 'Cherub wings, imp horns, double the mischief.', dict(arch='spr_imp', extra=X('halo_side', 'horn1', 'wingfold'))),
 'spirits_plumpuff':('Plumpuff', 3, 'Very well fed and very well loved.', dict(arch='spr_chub', extra=X('halo_small', 'nubs'))),
 'spirits_stardrift':('Stardrift', 3, 'Collects stardust and secrets.', dict(arch='spr_tall', extra=X('halo', 'sparkles'))),
 'spirits_hornlet': ('Hornlet', 3, 'Little horns, big plans.', dict(arch='spr_ember', extra=X('horns'))),
 'spirits_pronglet':('Pronglet', 3, 'Practises with a tiny trident toy.', dict(arch='spr_imp', extra=X('horns', 'trident'))),
 'spirits_embergut':('Embergut', 3, 'Round, warm and always snacking.', dict(arch='spr_imp2', extra=X('horns'))),
 'spirits_sootwing':('Sootwing', 3, 'Smudgy wings and a crooked halo.', dict(arch='spr_imp', extra=X('halo_crook', 'tornwings'))),
 'spirits_cindersnip':('Cindersnip', 3, 'A scruffy little ember that sneaks about.', dict(arch='spr_imp', extra=X('horns'), back='fur')),
 # stage 4 adults
 'spirits_brightwing':('Brightwing', 4, 'A graceful flyer with a steady glow.', dict(arch='spr_bigfeet', extra=X('halo', 'wings'))),
 'spirits_cumulus': ('Cumulus', 4, 'A big soft cloud with a halo on top.', dict(arch='spr_bigcloud', extra=X('halo'))),
 'spirits_chimewing':('Chimewing', 4, 'Rings like a bell and knows every song.', dict(arch='spr_robe', extra=X('halo', 'wingfold', 'sparkles'))),
 'spirits_skyguard':('Skyguard', 4, 'Cheerful champion of the high clouds.', dict(arch='spr_champ', extra=X('halo', 'wings', 'trident'))),
 'spirits_cherubimp':('Cherubimp', 4, 'Halo, horns and a grin; nobody is sure which wins.', dict(arch='spr_big', extra=X('halo_side', 'horn1', 'wings'))),
 'spirits_prankwing':('Prankwing', 4, 'Pointed tail, bat wings, harmless pranks.', dict(arch='spr_big', extra=X('horns', 'batwings'))),
 'spirits_jester':  ('Jester', 4, 'Clever and cheeky, in a bell cap and glasses.', dict(arch='spr_big', extra=X('cap') + ['glasses'])),
 'spirits_emberhorn':('Emberhorn', 4, 'Grand curled horns and a warm heart.', dict(arch='spr_tallimp', extra=X('bighorns'))),
 'spirits_prongmaster':('Prongmaster', 4, 'Spins its tiny trident like a pro.', dict(arch='spr_big', extra=X('horns', 'trident'))),
 'spirits_cinderbelly':('Cinderbelly', 4, 'Big, jolly and happily spoiled.', dict(arch='spr_chub', extra=X('bighorns'))),
 'spirits_hornbrawler':('Hornbrawler', 4, 'Headbutts for fun, never for keeps.', dict(arch='spr_brute', back='spikes', extra=X('ramhorns'))),
 'spirits_gloomwing':('Gloomwing', 4, 'Tattered bat wings and a shy smile.', dict(arch='spr_tallimp', extra=X('halo_crook', 'tornbat'))),
 'spirits_tatterimp':('Tatterimp', 4, 'Patched-up imp who never gives up.', dict(arch='spr_big', back='fur', extra=X('horns', 'torn'))),
 # stage 5 ultimates
 'spirits_luminar': ('Luminar', 5, 'The shining one: a big halo and wide white wings.', dict(arch='spr_bigcloud', extra=X('halo', 'bigwings', 'sparkles'))),
 'spirits_starwing':('Starwing', 5, 'Trails stardust across the night sky.', dict(arch='spr_tall', extra=X('halo', 'bigwings', 'sparkles'))),
 'spirits_duskhalo':('Duskhalo', 5, 'Half angel, half imp, wholly lovable.', dict(arch='spr_imp2', extra=X('halo_side', 'horn1', 'bigwings'))),
 'spirits_trickstar':('Trickstar', 5, 'Master of harmless tricks, in a bell cap, with a tiny trident.', dict(arch='spr_tall', extra=X('cap', 'batwings', 'trident'))),
 'spirits_cinderlord':('Cinderlord', 5, 'A crowned imp king in a skirt of flames, with bat wings.', dict(arch='spr_bigember', extra=X('bighorns', 'crown', 'batwings'))),
 'spirits_brimstorm':('Brimstorm', 5, 'Bat wings, big horns and a bigger laugh.', dict(arch='spr_brute', extra=X('bighorns', 'batwings'))),
 'spirits_hushwing':('Hushwing', 5, 'Quiet, soft and sooty, with a faint warm halo.', dict(arch='spr_robe', extra=X('halo_crook', 'tornwings'))),
}

LINE = {
 'spirits_puffet': 'baby', 'spirits_nubbin': 'baby',
 'spirits_cloudlet': 'halo', 'spirits_puffwing': 'halo', 'spirits_haloling': 'halo', 'spirits_stardrift': 'halo',
 'spirits_brightwing': 'halo', 'spirits_cumulus': 'halo', 'spirits_chimewing': 'halo', 'spirits_skyguard': 'halo',
 'spirits_luminar': 'halo', 'spirits_starwing': 'halo',
 'spirits_glimmer': 'imp', 'spirits_fluffimp': 'imp', 'spirits_plumpuff': 'imp',
 'spirits_cherubimp': 'imp', 'spirits_prankwing': 'imp', 'spirits_jester': 'imp',
 'spirits_duskhalo': 'imp', 'spirits_trickstar': 'imp',
 'spirits_emberling': 'horn', 'spirits_hornlet': 'horn', 'spirits_pronglet': 'horn', 'spirits_embergut': 'horn',
 'spirits_emberhorn': 'horn', 'spirits_prongmaster': 'horn', 'spirits_cinderbelly': 'horn', 'spirits_hornbrawler': 'horn',
 'spirits_cinderlord': 'horn', 'spirits_brimstorm': 'horn',
 'spirits_smudge': 'soot', 'spirits_sootwing': 'soot', 'spirits_cindersnip': 'soot',
 'spirits_gloomwing': 'soot', 'spirits_tatterimp': 'soot', 'spirits_hushwing': 'soot',
}
LINE_COLORS = {'halo': '#E8D9A0', 'imp': '#A98FB8', 'horn': '#C0583E', 'soot': '#78727C', 'baby': '#F0E6D2'}

P = 'spirits_'
def e(_unused, *items):
    """Prefix child ids; the first argument is a placeholder so rows stay aligned with the parent key."""
    return [(P + c, r) for c, r in items]
EVO = {
 # Babies: a first mistake or two sends the hatchling to the sooty line, else it follows its diet.
 P+'puffet': e(0, ('smudge', dict(mist_min=2)), ('cloudlet', dict(lead='veggie')), ('emberling', dict(lead='meat')), ('glimmer', dict(lead='pasta'))),
 P+'nubbin': e(0, ('smudge', dict(mist_min=2)), ('emberling', dict(lead='meat')), ('glimmer', dict(lead='pasta')), ('cloudlet', dict(lead='veggie'))),
 # Children: neglect, then discipline (the angel/devil lever), then heavy, train/smarts, then the default of the diet.
 P+'cloudlet':  e(0, ('sootwing', dict(mist_min=4)), ('haloling', dict(disc=25, mist_max=1)), ('plumpuff', dict(heavy=True)),
                  ('stardrift', dict(smarts=12)), ('puffwing', {})),
 P+'emberling': e(0, ('sootwing', dict(mist_min=4)), ('fluffimp', dict(disc=25, mist_max=1)), ('embergut', dict(heavy=True)),
                  ('pronglet', dict(train=3)), ('hornlet', {})),
 P+'glimmer':   e(0, ('sootwing', dict(mist_min=4)), ('haloling', dict(disc=50, mist_max=1)), ('plumpuff', dict(heavy=True)),
                  ('stardrift', dict(smarts=12)), ('fluffimp', {})),
 P+'smudge':    e(0, ('fluffimp', dict(disc=50, mist_max=3)), ('cindersnip', dict(train=3)), ('sootwing', {})),
 # Teens
 P+'puffwing':  e(0, ('gloomwing', dict(mist_min=4)), ('chimewing', dict(smarts=20)), ('skyguard', dict(wins=3)), ('cumulus', {})),
 P+'haloling':  e(0, ('gloomwing', dict(mist_min=4)), ('skyguard', dict(wins=3)), ('chimewing', dict(smarts=20)), ('brightwing', {})),
 P+'fluffimp':  e(0, ('tatterimp', dict(mist_min=4)), ('brightwing', dict(disc=50, mist_max=1)), ('jester', dict(smarts=20)), ('cherubimp', {})),
 P+'plumpuff':  e(0, ('tatterimp', dict(mist_min=4)), ('cumulus', dict(disc=25, mist_max=1)), ('cinderbelly', {})),
 P+'stardrift': e(0, ('tatterimp', dict(mist_min=4)), ('chimewing', dict(disc=25, mist_max=1)), ('jester', {})),
 P+'hornlet':   e(0, ('tatterimp', dict(mist_min=4)), ('cherubimp', dict(disc=25, mist_max=1)), ('hornbrawler', dict(wins=3)), ('emberhorn', {})),
 P+'pronglet':  e(0, ('tatterimp', dict(mist_min=4)), ('cherubimp', dict(disc=25, mist_max=1)), ('hornbrawler', dict(wins=3)), ('prongmaster', {})),
 P+'embergut':  e(0, ('tatterimp', dict(mist_min=4)), ('prankwing', dict(disc=25, mist_max=1)), ('cinderbelly', {})),
 P+'sootwing':  e(0, ('prankwing', dict(disc=50, mist_max=3)), ('gloomwing', dict(train=3)), ('tatterimp', {})),
 P+'cindersnip':e(0, ('prankwing', dict(disc=50, mist_max=3)), ('tatterimp', dict(train=3)), ('gloomwing', {})),
 # Adults
 P+'brightwing':e(0, ('starwing', dict(smarts=40)), ('luminar', {})),
 P+'cumulus':   e(0, ('luminar', dict(disc=75)), ('duskhalo', {})),
 P+'chimewing': e(0, ('starwing', {})),
 P+'skyguard':  e(0, ('luminar', dict(disc=75)), ('starwing', dict(smarts=40)), ('duskhalo', {})),
 P+'cherubimp': e(0, ('luminar', dict(disc=75)), ('duskhalo', {})),
 P+'prankwing': e(0, ('duskhalo', dict(disc=50)), ('trickstar', {})),
 P+'jester':    e(0, ('trickstar', {})),
 P+'emberhorn': e(0, ('duskhalo', dict(disc=25)), ('cinderlord', {})),
 P+'prongmaster':e(0, ('brimstorm', dict(wins=5)), ('cinderlord', {})),
 P+'cinderbelly':e(0, ('trickstar', dict(disc=50)), ('cinderlord', {})),
 P+'hornbrawler':e(0, ('brimstorm', {})),
 P+'gloomwing': e(0, ('duskhalo', dict(disc=75)), ('hushwing', {})),
 P+'tatterimp': e(0, ('duskhalo', dict(disc=75)), ('brimstorm', dict(wins=5)), ('hushwing', {})),
}
BABIES = ['spirits_puffet', 'spirits_nubbin']
