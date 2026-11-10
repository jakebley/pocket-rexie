"""The bot family (Plus). Retro gadgets with a pulse: boombox, handheld, CRT, floppy, modem, walkie, toaster, drone, mech.

Food slots reuse the engine's three foods but are named for bots: meat = Oil, veggie = Chips, pasta = Batteries.
Lines (Technicolor body colour): meat -> 'gear' (heavy), veggie -> 'circuit' (smart), pasta -> 'spark' (energy), neglect -> 'stray' (rusty junk).
"""
import archetypes_bot  # registers the bot archetypes and bot_* decorations with spritegen

FAMILY = 'bot'
NAME = 'Bots'
IS_FREE = False  # a Plus family
FOOD_LABELS = {'meat': 'Oil', 'veggie': 'Chips', 'pasta': 'Batteries'}

# id: (name, stage, blurb, recipe)
SPECIES = {
 # stage 1 hatchlings (boot-ups)
 'bot_blip': ('Blip', 1, 'A bulb-topped orb that beeps when happy.', dict(arch='bot_blip')),
 'bot_nibble': ('Nibble', 1, 'A little cube with twin antennae and big ideas.', dict(arch='bot_nibble')),
 # stage 2 children
 'bot_cogsy': ('Cogsy', 2, 'Rolls on tiny tracks and loves a good greasing.', dict(arch='bot_cogsy', extra=['bot_cog'])),
 'bot_pixel': ('Pixel', 2, 'A pocket pet with a tiny screen that hums game tunes.', dict(arch='bot_pixel')),
 'bot_zapper': ('Zapper', 2, 'Crackles with static and chatters nonstop.', dict(arch='bot_zapper', extra=['bot_zap'])),
 'bot_scrapling': ('Scrapling', 2, 'Cobbled from spare parts and bin finds.', dict(arch='bot_junk')),
 # stage 3 teens
 'bot_boomlet': ('Boomlet', 3, 'Carries its own bass. Rattles windows.', dict(arch='bot_boomlet')),
 'bot_clank': ('Clank', 3, 'Upright and sturdy, every step rings.', dict(arch='bot_clank')),
 'bot_treadhead': ('Treadhead', 3, 'Squat, strong and slow to stop.', dict(arch='bot_treadhead')),
 'bot_pixelkin': ('Pixelkin', 3, 'Has beaten every level twice.', dict(arch='bot_pixelkin')),
 'bot_cathode': ('Cathode', 3, 'An old tube that glows when it thinks.', dict(arch='bot_cathode')),
 'bot_floppet': ('Floppet', 3, 'Stores everything, forgets nothing.', dict(arch='bot_floppet')),
 'bot_buzz': ('Buzz', 3, 'Squelches and squawks across the airwaves.', dict(arch='bot_buzz', extra=['bot_dish'])),
 'bot_whir': ('Whir', 3, 'Hovers just above your shoulder.', dict(arch='bot_whir')),
 'bot_toastie': ('Toastie', 3, 'Pops up warm and ready at any hour.', dict(arch='bot_toastie')),
 'bot_heapling': ('Heapling', 3, 'A lopsided stack that somehow still walks.', dict(arch='bot_heapling')),
 'bot_rustbucket': ('Rustbucket', 3, 'Creaks on spider legs, tough as nails.', dict(arch='bot_rustbucket', extra=['bot_rust'])),
 # stage 4 adults
 'bot_bassline': ('Bassline', 4, 'A heavy boombox with a thumping heart.', dict(arch='bot_bassline')),
 'bot_ironclad': ('Ironclad', 4, 'A broad mech built like a vault.', dict(arch='bot_ironclad')),
 'bot_bulldozer': ('Bulldozer', 4, 'Pushes through anything in its way.', dict(arch='bot_bulldozer')),
 'bot_joypad': ('Joypad', 4, 'A game controller champion with fast thumbs.', dict(arch='bot_joypad')),
 'bot_phosphor': ('Phosphor', 4, 'A big old monitor, wise and softly lit.', dict(arch='bot_phosphor')),
 'bot_diskette': ('Diskette', 4, 'Remembers every file ever saved.', dict(arch='bot_diskette')),
 'bot_rotor': ('Rotor', 4, 'A quick drone that wins most races.', dict(arch='bot_rotor')),
 'bot_chatter': ('Chatter', 4, 'Always on channel nine.', dict(arch='bot_chatter')),
 'bot_dialtone': ('Dialtone', 4, 'Screeches and whistles, then connects.', dict(arch='bot_dialtone')),
 'bot_crumb': ('Crumb', 4, 'Warm toast, warm heart.', dict(arch='bot_crumb')),
 'bot_junkyard': ('Junkyard', 4, 'A walking heap of stuff nobody wanted.', dict(arch='bot_junkyard', extra=['bot_cable'])),
 'bot_scrapper': ('Scrapper', 4, 'Patched together and proud of it.', dict(arch='bot_scrapper')),
 # stage 5 ultimates
 'bot_titan': ('Titan', 5, 'A colossal mech with a gleaming crown.', dict(arch='bot_titan')),
 'bot_jukebox': ('Jukebox', 5, 'Plays whatever you needed to hear.', dict(arch='bot_jukebox')),
 'bot_mainframe': ('Mainframe', 5, 'A glowing monitor that rules the lab.', dict(arch='bot_mainframe')),
 'bot_oracle': ('Oracle', 5, 'A floppy sage with a halo and glowing archives.', dict(arch='bot_oracle')),
 'bot_tempest': ('Tempest', 5, 'A storm drone crackling with power.', dict(arch='bot_tempest')),
 'bot_beacon': ('Beacon', 5, 'A tall transmitter that never loses signal.', dict(arch='bot_beacon')),
 'bot_gravelord': ('Gravelord', 5, 'King of the scrapheap, crowned in spikes.', dict(arch='bot_gravelord')),
}

# Lineage for Technicolor body colour: gear, circuit, spark, stray, baby.
LINE = {
 'bot_blip': 'baby', 'bot_nibble': 'baby',
 'bot_cogsy': 'gear', 'bot_boomlet': 'gear', 'bot_clank': 'gear', 'bot_treadhead': 'gear',
 'bot_bassline': 'gear', 'bot_ironclad': 'gear', 'bot_bulldozer': 'gear', 'bot_titan': 'gear', 'bot_jukebox': 'gear',
 'bot_pixel': 'circuit', 'bot_pixelkin': 'circuit', 'bot_cathode': 'circuit', 'bot_floppet': 'circuit',
 'bot_joypad': 'circuit', 'bot_phosphor': 'circuit', 'bot_diskette': 'circuit', 'bot_mainframe': 'circuit', 'bot_oracle': 'circuit',
 'bot_zapper': 'spark', 'bot_buzz': 'spark', 'bot_whir': 'spark', 'bot_toastie': 'spark',
 'bot_rotor': 'spark', 'bot_chatter': 'spark', 'bot_dialtone': 'spark', 'bot_crumb': 'spark', 'bot_tempest': 'spark', 'bot_beacon': 'spark',
 'bot_scrapling': 'stray', 'bot_heapling': 'stray', 'bot_rustbucket': 'stray',
 'bot_junkyard': 'stray', 'bot_scrapper': 'stray', 'bot_gravelord': 'stray',
}
LINE_COLORS = {'gear': '#8C7B64', 'circuit': '#6F9A84', 'spark': '#D4B04C', 'stray': '#9A6A4E', 'baby': '#C9D2D0'}

# parent -> ordered (child, requirements); first match wins; the last entry has no requirements.
EVO = {
 'bot_blip':   [('bot_scrapling', dict(mist_min=1)), ('bot_cogsy', dict(lead='meat')), ('bot_pixel', dict(lead='veggie')), ('bot_zapper', dict(lead='pasta'))],
 'bot_nibble': [('bot_scrapling', dict(mist_min=1)), ('bot_zapper', dict(lead='pasta')), ('bot_pixel', dict(lead='veggie')), ('bot_cogsy', dict(lead='meat'))],
 'bot_cogsy':  [('bot_heapling', dict(mist_min=4)), ('bot_treadhead', dict(heavy=True)), ('bot_clank', dict(train=3)), ('bot_boomlet', {})],
 'bot_pixel':  [('bot_heapling', dict(mist_min=4)), ('bot_cathode', dict(smarts=12)), ('bot_pixelkin', dict(train=3)), ('bot_floppet', {})],
 'bot_zapper': [('bot_heapling', dict(mist_min=4)), ('bot_whir', dict(train=3)), ('bot_toastie', dict(heavy=True)), ('bot_buzz', {})],
 'bot_scrapling': [('bot_rustbucket', dict(train=3)), ('bot_heapling', {})],
 'bot_boomlet':   [('bot_scrapper', dict(mist_min=4)), ('bot_bassline', {})],
 'bot_clank':     [('bot_scrapper', dict(mist_min=4)), ('bot_ironclad', dict(wins=2)), ('bot_bassline', {})],
 'bot_treadhead': [('bot_scrapper', dict(mist_min=4)), ('bot_bulldozer', dict(wins=3)), ('bot_ironclad', {})],
 'bot_pixelkin':  [('bot_scrapper', dict(mist_min=4)), ('bot_joypad', {})],
 'bot_cathode':   [('bot_scrapper', dict(mist_min=4)), ('bot_phosphor', dict(smarts=20)), ('bot_joypad', {})],
 'bot_floppet':   [('bot_scrapper', dict(mist_min=4)), ('bot_diskette', dict(smarts=20)), ('bot_phosphor', {})],
 'bot_buzz':      [('bot_scrapper', dict(mist_min=4)), ('bot_chatter', dict(smarts=20)), ('bot_dialtone', {})],
 'bot_whir':      [('bot_scrapper', dict(mist_min=4)), ('bot_rotor', dict(wins=2)), ('bot_chatter', {})],
 'bot_toastie':   [('bot_scrapper', dict(mist_min=4)), ('bot_crumb', {})],
 'bot_heapling':  [('bot_junkyard', {})],
 'bot_rustbucket':[('bot_junkyard', dict(train=3)), ('bot_scrapper', {})],
 'bot_bassline':  [('bot_titan', dict(wins=5)), ('bot_jukebox', {})],
 'bot_ironclad':  [('bot_titan', {})],
 'bot_bulldozer': [('bot_titan', {})],
 'bot_joypad':    [('bot_oracle', dict(smarts=40)), ('bot_mainframe', {})],
 'bot_phosphor':  [('bot_mainframe', dict(smarts=40)), ('bot_oracle', {})],
 'bot_diskette':  [('bot_oracle', dict(disc=25)), ('bot_mainframe', {})],
 'bot_rotor':     [('bot_tempest', {})],
 'bot_chatter':   [('bot_beacon', dict(smarts=40)), ('bot_tempest', {})],
 'bot_dialtone':  [('bot_beacon', {})],
 'bot_crumb':     [('bot_beacon', dict(disc=25)), ('bot_tempest', {})],
 'bot_junkyard':  [('bot_gravelord', {})],
 'bot_scrapper':  [('bot_gravelord', {})],
}
BABIES = ['bot_blip', 'bot_nibble']
