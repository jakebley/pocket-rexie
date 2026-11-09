"""The alien family (Plus). Cute, original little aliens: grey-green wobblers, antenna blobs, tentacle tots, floating brains,
saucer pilots, moth-folk, crystal beings and cosmic ultimates (star-eater, nebula, cosmic jellyfish, a friendly mothership).

Food slots reuse the engine's three foods but are named for aliens: meat = Moon cheese, veggie = Stardust, pasta = Comet ice.
Lines (Technicolor body colour): meat -> 'hull' (heavy and strong), veggie -> 'scout' (curious and smart),
pasta -> 'void' (cosmic), neglect -> 'stray' (dim, glitchy, lost), plus 'baby'.
"""
import archetypes_alien  # registers the alien archetypes and al_* decorations with spritegen

FAMILY = 'alien'
NAME = 'Aliens'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Moon cheese', 'veggie': 'Stardust', 'pasta': 'Comet ice'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings
 'alien_bloop':  ('Bloop', 1, 'A tiny grey-green wobbler with big dark eyes.', dict(arch='al_babe')),
 'alien_glint':  ('Glint', 1, 'A one-eyed orb that blinks like a faraway star.', dict(arch='al_orb')),
 # stage 2 children
 'alien_nubb':   ('Nubb', 2, 'Chunky, one big eye and zero doubts.', dict(arch='al_cyclops')),
 'alien_zibbit': ('Zibbit', 2, 'Its antennae twitch at every beep in the sky.', dict(arch='al_antenna')),
 'alien_tenti':  ('Tenti', 2, 'A little dome on little tentacles. Mostly wiggles.', dict(arch='al_tentacle')),
 'alien_fizz':   ('Fizz', 2, 'Flickers like a bad signal.', dict(arch='al_wobble', extra=['al_glitch'])),
 # stage 3 teens
 'alien_bulbo':     ('Bulbo', 3, 'Glowing antenna tips and endless questions.', dict(arch='al_antbig')),
 'alien_peeper':    ('Peeper', 3, 'Three eyes. Spots your snacks from three angles.', dict(arch='al_three')),
 'alien_noggin':    ('Noggin', 3, 'A floating brain with a small, friendly face.', dict(arch='al_brain')),
 'alien_flit':      ('Flit', 3, 'Moth-folk who orbit every lamp.', dict(arch='al_moth')),
 'alien_stomp':     ('Stomp', 3, 'Round and heavy. The ground feels every step.', dict(arch='al_blob')),
 'alien_shellback': ('Shellback', 3, 'Armoured insect scout with a sense of rhythm.', dict(arch='al_insect', extra=['al_plates'])),
 'alien_drifter':   ('Drifter', 3, 'A tiny saucer pilot who got lost on purpose.', dict(arch='al_saucer')),
 'alien_shardling': ('Shardling', 3, 'A crystal that hums when the moon is out.', dict(arch='al_crystal')),
 'alien_squidge':   ('Squidge', 3, 'Six tentacles, no elbows.', dict(arch='al_tent6')),
 'alien_flicker':   ('Flicker', 3, 'Half lit and half forgotten.', dict(arch='al_antenna', extra=['al_glitch'])),
 'alien_lostling':  ('Lostling', 3, 'Waits at the window for a ship that never lands.', dict(arch='al_tall', extra=['al_glitch'])),
 # stage 4 adults
 'alien_beacon':   ('Beacon', 4, 'Its antennae light the way home.', dict(arch='al_ant3', extra=['al_spark'])),
 'alien_seer':     ('Seer', 4, 'Three eyes and one very big plan.', dict(arch='al_threefat', extra=['al_stars'])),
 'alien_cortex':   ('Cortex', 4, 'Thinks so hard it floats.', dict(arch='al_brainbig', extra=['al_stars'])),
 'alien_lumina':   ('Lumina', 4, 'Moth-folk whose wings glitter like star dust.', dict(arch='al_mothbig', extra=['al_stars'])),
 'alien_elder':    ('Elder', 4, 'Tall, calm and older than the nearest star.', dict(arch='al_sage')),
 'alien_bulwark':  ('Bulwark', 4, 'A big round hull plated in space rock.', dict(arch='al_blobfat', extra=['al_plates'])),
 'alien_mantid':   ('Mantid', 4, 'Insect scout with very clever claws.', dict(arch='al_insectbig', extra=['al_stars'])),
 'alien_titan':    ('Titan', 4, 'One eye, two horns and a lot of heart.', dict(arch='al_cyclobig')),
 'alien_skipper':  ('Skipper', 4, 'Flies a spotless little saucer.', dict(arch='al_saucerbig')),
 'alien_prism':    ('Prism', 4, 'A crystal that splits the starlight.', dict(arch='al_crystal2')),
 'alien_octoid':   ('Octoid', 4, 'Six arms, six snacks.', dict(arch='al_tent6', extra=['horns2'])),
 'alien_static':   ('Static', 4, 'Fuzzy, dim and tuned between stations.', dict(arch='al_tallbig', extra=['al_glitch'])),
 'alien_dropout':  ('Dropout', 4, 'Fell out of orbit and landed fine.', dict(arch='al_wobblebig', extra=['al_glitch'])),
 # stage 5 ultimates
 'alien_starmaw':    ('Starmaw', 5, 'Eats stars and burps constellations.', dict(arch='al_maw')),
 'alien_nebula':     ('Nebula', 5, 'A swirling cloud with a very kind face.', dict(arch='al_nebula', extra=['al_spark'])),
 'alien_cosmojelly': ('Cosmojelly', 5, 'Drifts between galaxies on the solar wind.', dict(arch='al_jelly', extra=['al_stars'])),
 'alien_mothership': ('Mothership', 5, 'A friendly mothership. Everyone is invited aboard.', dict(arch='al_ship', extra=['al_stars'])),
 'alien_eldermind':  ('Eldermind', 5, 'The wisest brain in the neighbourhood.', dict(arch='al_brainking', extra=['al_spark'])),
 'alien_lunamoth':   ('Lunamoth', 5, 'Moth-folk with a crescent moon for company.', dict(arch='al_luna', extra=['al_moon'])),
 'alien_heartstone': ('Heartstone', 5, 'A crystal giant. Warm to hold.', dict(arch='al_crystal3')),
 'alien_echo':       ('Echo', 5, 'A lost signal that finally found someone.', dict(arch='al_ring', extra=['al_glitch'])),
}

# Lineage for Technicolor body colour: hull, scout, void, stray, baby.
LINE = {
 'alien_bloop': 'baby', 'alien_glint': 'baby',
 'alien_nubb': 'hull', 'alien_stomp': 'hull', 'alien_shellback': 'hull', 'alien_bulwark': 'hull', 'alien_mantid': 'hull',
 'alien_titan': 'hull', 'alien_starmaw': 'hull',
 'alien_zibbit': 'scout', 'alien_bulbo': 'scout', 'alien_peeper': 'scout', 'alien_noggin': 'scout', 'alien_flit': 'scout',
 'alien_beacon': 'scout', 'alien_seer': 'scout', 'alien_cortex': 'scout', 'alien_lumina': 'scout', 'alien_elder': 'scout',
 'alien_eldermind': 'scout', 'alien_lunamoth': 'scout', 'alien_mothership': 'scout',
 'alien_tenti': 'void', 'alien_drifter': 'void', 'alien_shardling': 'void', 'alien_squidge': 'void',
 'alien_skipper': 'void', 'alien_prism': 'void', 'alien_octoid': 'void', 'alien_nebula': 'void', 'alien_cosmojelly': 'void', 'alien_heartstone': 'void',
 'alien_fizz': 'stray', 'alien_flicker': 'stray', 'alien_lostling': 'stray', 'alien_static': 'stray', 'alien_dropout': 'stray', 'alien_echo': 'stray',
}
LINE_COLORS = {'hull': '#7D93A8', 'scout': '#8FB57C', 'void': '#9A86C4', 'stray': '#8C908C', 'baby': '#BFDCB6'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'alien_bloop': [('alien_fizz', dict(mist_min=1)), ('alien_nubb', dict(lead='meat')), ('alien_zibbit', dict(lead='veggie')), ('alien_tenti', dict(lead='pasta'))],
 'alien_glint': [('alien_fizz', dict(mist_min=1)), ('alien_tenti', dict(lead='pasta')), ('alien_zibbit', dict(lead='veggie')), ('alien_nubb', dict(lead='meat'))],
 'alien_nubb':   [('alien_flicker', dict(mist_min=4)), ('alien_stomp', dict(heavy=True)), ('alien_shellback', {})],
 'alien_zibbit': [('alien_flicker', dict(mist_min=4)), ('alien_bulbo', dict(train=3)), ('alien_noggin', dict(smarts=12)), ('alien_flit', {})],
 'alien_tenti':  [('alien_flicker', dict(mist_min=4)), ('alien_squidge', dict(heavy=True)), ('alien_peeper', dict(smarts=12)), ('alien_drifter', dict(train=3)), ('alien_shardling', {})],
 'alien_fizz':   [('alien_lostling', dict(train=3)), ('alien_flicker', {})],
 'alien_bulbo':  [('alien_static', dict(mist_min=4)), ('alien_beacon', dict(train=3)), ('alien_lumina', {})],
 'alien_peeper': [('alien_static', dict(mist_min=4)), ('alien_elder', dict(smarts=20)), ('alien_seer', {})],
 'alien_noggin': [('alien_static', dict(mist_min=4)), ('alien_elder', dict(smarts=20)), ('alien_cortex', {})],
 'alien_flit':   [('alien_static', dict(mist_min=4)), ('alien_beacon', dict(smarts=20)), ('alien_lumina', {})],
 'alien_stomp':  [('alien_dropout', dict(mist_min=4)), ('alien_titan', dict(wins=3)), ('alien_bulwark', {})],
 'alien_shellback': [('alien_dropout', dict(mist_min=4)), ('alien_titan', dict(wins=2)), ('alien_mantid', {})],
 'alien_drifter':   [('alien_dropout', dict(mist_min=4)), ('alien_skipper', dict(smarts=20)), ('alien_prism', {})],
 'alien_shardling': [('alien_dropout', dict(mist_min=4)), ('alien_prism', {})],
 'alien_squidge':   [('alien_dropout', dict(mist_min=4)), ('alien_octoid', {})],
 'alien_flicker':   [('alien_static', dict(train=3)), ('alien_dropout', {})],
 'alien_lostling':  [('alien_dropout', dict(train=3)), ('alien_static', {})],
 'alien_beacon':  [('alien_lunamoth', dict(smarts=40)), ('alien_mothership', {})],
 'alien_seer':    [('alien_eldermind', dict(smarts=40)), ('alien_mothership', {})],
 'alien_cortex':  [('alien_eldermind', {})],
 'alien_lumina':  [('alien_lunamoth', {})],
 'alien_elder':   [('alien_eldermind', dict(smarts=40)), ('alien_lunamoth', {})],
 'alien_bulwark': [('alien_starmaw', {})],
 'alien_mantid':  [('alien_starmaw', dict(wins=5)), ('alien_cosmojelly', {})],
 'alien_titan':   [('alien_starmaw', dict(wins=5)), ('alien_mothership', {})],
 'alien_skipper': [('alien_mothership', dict(smarts=40)), ('alien_cosmojelly', {})],
 'alien_prism':   [('alien_heartstone', dict(smarts=40)), ('alien_nebula', {})],
 'alien_octoid':  [('alien_cosmojelly', {})],
 'alien_static':  [('alien_echo', {})],
 'alien_dropout': [('alien_echo', {})],
}
BABIES = ['alien_bloop', 'alien_glint']
