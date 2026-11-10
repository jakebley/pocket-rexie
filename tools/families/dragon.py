"""The dragon family (Plus). Wyrmlings grow into western, eastern and wyvern dragons, drakes, lindwurms and legends.

Food slots reuse the engine's three foods but are named for dragons: meat = Fire-roast, veggie = Herbs, pasta = Gems.
Lines (Technicolor body colour): meat -> 'ember' (fire), veggie -> 'tide' (river and storm), pasta -> 'hoard' (stone and treasure),
neglect -> 'stray' (scruffy lizard-like).
"""
import archetypes_dragon  # registers the dragon archetypes and dr_* decorations with spritegen

FAMILY = 'dragon'
NAME = 'Dragons'
IS_FREE = False  # a Plus family (docs/PLUS.md)
FOOD_LABELS = {'meat': 'Fire-roast', 'veggie': 'Herbs', 'pasta': 'Gems'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 wyrmlings
 'dr_cinder':  ('Cinder', 1, 'A hatchling that hiccups tiny sparks.', dict(arch='dr_hatch2')),
 'dr_pebble':  ('Pebble', 1, 'Sleeps on a heap of shiny stones.', dict(arch='dr_egg', extra=['dr_gems'])),
 # stage 2 children
 'dr_flick':   ('Flick', 2, 'Flaps before it can fly and sneezes flame.', dict(arch='dr_west', extra=['dr_flame'])),
 'dr_ripple':  ('Ripple', 2, 'A river wyrmling that swims through the air.', dict(arch='dr_eelet', extra=['dr_whisk'])),
 'dr_nugget':  ('Nugget', 2, 'Round and proud of its tiny hoard.', dict(arch='dr_hoard', extra=['dr_gems'])),
 'dr_scrag':   ('Scrag', 2, 'A scruffy lizard that nobody combed.', dict(arch='dr_stray')),
 # stage 3 teens
 'dr_cinderwing': ('Cinderwing', 3, 'Big new wings, not yet steady in the air.', dict(arch='dr_west', extra=['dr_flame'])),
 'dr_spurwing':   ('Spurwing', 3, 'Two-legged and wing-armed, ever hungry.', dict(arch='dr_wyv', extra=['dr_embers'])),
 'dr_ashdrake':   ('Ashdrake', 3, 'Sooty, stocky and slow to anger.', dict(arch='dr_crag', extra=['dr_frill'])),
 'dr_streamer':   ('Streamer', 3, 'A ribbon of a dragon, riding the breeze.', dict(arch='dr_east', extra=['dr_whisk'])),
 'dr_brookwyrm':  ('Brookwyrm', 3, 'Low and long, loves a muddy bank.', dict(arch='dr_lind', extra=['dr_belly'])),
 'dr_stormlet':   ('Stormlet', 3, 'Trails a small grumbling raincloud.', dict(arch='dr_eastlong', extra=['dr_cloud'])),
 'dr_pebblehide': ('Pebblehide', 3, 'Heavy as a boulder and twice as stubborn.', dict(arch='dr_pebbleh', extra=['dr_ridge'])),
 'dr_glint':      ('Glint', 3, 'Quick little drake who collects shiny things.', dict(arch='dr_drake', extra=['dr_gems', 'dr_frill'])),
 'dr_scraggle':   ('Scraggle', 3, 'All ribs and elbows, rummages for scraps.', dict(arch='dr_stray', extra=['dr_scars'])),
 'dr_mudwyrm':    ('Mudwyrm', 3, 'Dragged through every ditch in the valley.', dict(arch='dr_wurmdrag', extra=['dr_scars'])),
 # stage 4 adults
 'dr_emberwing':  ('Emberwing', 4, 'The classic: glowing wings and a long neck.', dict(arch='dr_west', extra=['dr_flame'])),
 'dr_pyrewyvern': ('Pyrewyvern', 4, 'A wyvern that glides above the bonfires.', dict(arch='dr_wyv', extra=['dr_flame'])),
 'dr_cragdrake':  ('Cragdrake', 4, 'Armoured plates, wins by sitting still.', dict(arch='dr_crag', extra=['dr_belly'])),
 'dr_blazewurm':  ('Blazewurm', 4, 'A lindwurm that breathes along the ground.', dict(arch='dr_lindup', extra=['dr_flame'])),
 'dr_skywhisker': ('Skywhisker', 4, 'An eastern dragon in graceful loops.', dict(arch='dr_eastloop', extra=['dr_whisk', 'dr_pearl'])),
 'dr_fenwurm':    ('Fenwurm', 4, 'Slow lindwurm of the reed beds.', dict(arch='dr_lindfat', extra=['dr_belly'])),
 'dr_galewing':   ('Galewing', 4, 'Wide wings that call the wind.', dict(arch='dr_soar', extra=['dr_cloud'])),
 'dr_gemhide':    ('Gemhide', 4, 'Crusted with jewels, glitters when it growls.', dict(arch='dr_gemh', extra=['dr_gems'])),
 'dr_vaultdrake': ('Vaultdrake', 4, 'Guards the vault door and counts coins.', dict(arch='dr_vault', extra=['dr_gems'])),
 'dr_hoardkeeper':('Hoardkeeper', 4, 'Spectacled bookkeeper of the treasury.', dict(arch='dr_keeper', extra=['glasses', 'dr_gems'])),
 'dr_tatterwyrm': ('Tatterwyrm', 4, 'Dented lindwurm with a chewed ear.', dict(arch='dr_lindrag')),
 'dr_ragwing':    ('Ragwing', 4, 'Tattered wings, still gets airborne.', dict(arch='dr_westlow', extra=['dr_scars'])),
 # stage 5 ultimates
 'dr_cindermaw':  ('Cindermaw', 5, 'Wings of embers and a tail on fire.', dict(arch='dr_rear', tail='flame', extra=['dr_flame', 'dr_embers'])),
 'dr_tripyre':    ('Tripyre', 5, 'Three heads, three small bonfires.', dict(arch='dr_hydra', extra=['dr_flame', 'dr_embers'])),
 'dr_cloudsovereign': ('Cloud Sovereign', 5, 'Emperor of the sky, with a pearl and a crown.', dict(arch='dr_eastking', extra=['crown', 'dr_whisk', 'dr_pearl'])),
 'dr_stormcoil':  ('Stormcoil', 5, 'Coiled thunderhead, crackling with sparks.', dict(arch='dr_coil2', extra=['bolt', 'dr_cloud'])),
 'dr_gemwyrm':    ('Gemwyrm', 5, 'Ancient coil wrapped round a mountain of gems.', dict(arch='dr_gemcoil', extra=['crown', 'dr_gems'])),
 'dr_crystalback':('Crystalback', 5, 'A spine of crystal spikes and a floating orb.', dict(arch='dr_crystal', extra=['dr_orb', 'dr_gems'])),
 'dr_duskwyrm':   ('Duskwyrm', 5, 'A hollow-eyed wyvern with a pale halo.', dict(arch='dr_wraith', extra=['halo', 'dr_scars'])),
}

# Lineage for Technicolor body colour: ember, tide, hoard, stray, baby.
LINE = {
 'dr_cinder': 'baby', 'dr_pebble': 'baby',
 'dr_flick': 'ember', 'dr_cinderwing': 'ember', 'dr_spurwing': 'ember', 'dr_ashdrake': 'ember',
 'dr_emberwing': 'ember', 'dr_pyrewyvern': 'ember', 'dr_cragdrake': 'ember', 'dr_blazewurm': 'ember',
 'dr_cindermaw': 'ember', 'dr_tripyre': 'ember',
 'dr_ripple': 'tide', 'dr_streamer': 'tide', 'dr_brookwyrm': 'tide', 'dr_stormlet': 'tide',
 'dr_skywhisker': 'tide', 'dr_fenwurm': 'tide', 'dr_galewing': 'tide',
 'dr_cloudsovereign': 'tide', 'dr_stormcoil': 'tide',
 'dr_nugget': 'hoard', 'dr_pebblehide': 'hoard', 'dr_glint': 'hoard',
 'dr_gemhide': 'hoard', 'dr_vaultdrake': 'hoard', 'dr_hoardkeeper': 'hoard',
 'dr_gemwyrm': 'hoard', 'dr_crystalback': 'hoard',
 'dr_scrag': 'stray', 'dr_scraggle': 'stray', 'dr_mudwyrm': 'stray',
 'dr_tatterwyrm': 'stray', 'dr_ragwing': 'stray', 'dr_duskwyrm': 'stray',
}
LINE_COLORS = {'ember': '#C0663E', 'tide': '#5E9A98', 'hoard': '#B09A58', 'stray': '#8C8A6E', 'baby': '#E3D2A8'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'dr_cinder':  [('dr_scrag', dict(mist_min=1)), ('dr_flick', dict(lead='meat')), ('dr_ripple', dict(lead='veggie')), ('dr_nugget', dict(lead='pasta'))],
 'dr_pebble':  [('dr_scrag', dict(mist_min=1)), ('dr_nugget', dict(lead='pasta')), ('dr_ripple', dict(lead='veggie')), ('dr_flick', dict(lead='meat'))],
 'dr_flick':   [('dr_scraggle', dict(mist_min=4)), ('dr_ashdrake', dict(heavy=True)), ('dr_cinderwing', dict(train=3)), ('dr_spurwing', {})],
 'dr_ripple':  [('dr_scraggle', dict(mist_min=4)), ('dr_brookwyrm', dict(heavy=True)), ('dr_stormlet', dict(smarts=12)), ('dr_streamer', {})],
 'dr_nugget':  [('dr_scraggle', dict(mist_min=4)), ('dr_pebblehide', dict(heavy=True)), ('dr_glint', {})],
 'dr_scrag':   [('dr_mudwyrm', dict(train=3)), ('dr_scraggle', {})],
 'dr_cinderwing': [('dr_ragwing', dict(mist_min=4)), ('dr_emberwing', {})],
 'dr_spurwing':   [('dr_ragwing', dict(mist_min=4)), ('dr_pyrewyvern', {})],
 'dr_ashdrake':   [('dr_ragwing', dict(mist_min=4)), ('dr_cragdrake', dict(wins=2)), ('dr_blazewurm', {})],
 'dr_streamer':   [('dr_tatterwyrm', dict(mist_min=4)), ('dr_skywhisker', {})],
 'dr_brookwyrm':  [('dr_tatterwyrm', dict(mist_min=4)), ('dr_fenwurm', {})],
 'dr_stormlet':   [('dr_tatterwyrm', dict(mist_min=4)), ('dr_galewing', dict(smarts=20)), ('dr_skywhisker', {})],
 'dr_pebblehide': [('dr_ragwing', dict(mist_min=4)), ('dr_gemhide', {})],
 'dr_glint':      [('dr_tatterwyrm', dict(mist_min=4)), ('dr_hoardkeeper', dict(smarts=20)), ('dr_vaultdrake', {})],
 'dr_scraggle':   [('dr_tatterwyrm', dict(train=3)), ('dr_ragwing', {})],
 'dr_mudwyrm':    [('dr_tatterwyrm', {})],
 'dr_emberwing':  [('dr_tripyre', dict(wins=5)), ('dr_cindermaw', {})],
 'dr_pyrewyvern': [('dr_cindermaw', dict(wins=5)), ('dr_tripyre', {})],
 'dr_cragdrake':  [('dr_tripyre', dict(wins=5)), ('dr_crystalback', {})],
 'dr_blazewurm':  [('dr_tripyre', {})],
 'dr_skywhisker': [('dr_cloudsovereign', dict(smarts=40)), ('dr_stormcoil', {})],
 'dr_fenwurm':    [('dr_stormcoil', {})],
 'dr_galewing':   [('dr_cloudsovereign', dict(smarts=40)), ('dr_stormcoil', {})],
 'dr_gemhide':    [('dr_crystalback', {})],
 'dr_vaultdrake': [('dr_gemwyrm', dict(smarts=40)), ('dr_crystalback', {})],
 'dr_hoardkeeper':[('dr_gemwyrm', {})],
 'dr_tatterwyrm': [('dr_duskwyrm', {})],
 'dr_ragwing':    [('dr_duskwyrm', {})],
}
BABIES = ['dr_cinder', 'dr_pebble']
