// Family themes: every family gives the mini-games its own items, obstacles and symbols (docs/PLAY.md).
// Glyphs are 7x7 pixel bitmaps. Characters:  '.' empty   '#' main tone   'a' accent tone   'o' dark detail   'w' light detail
// Technicolor paints the tones; Traditional prints '#' and 'a' as ink and leaves 'o' and 'w' as unlit holes, so every glyph is
// drawn to read as a silhouette with a few holes.
// A game only ever reads a theme: it never needs to know which family it is playing.

export type Tone =
  | 'red' | 'rust' | 'orange' | 'yellow' | 'gold' | 'green' | 'pink' | 'blue' | 'ice' | 'cyan'
  | 'brown' | 'dbrown' | 'purple' | 'white' | 'grey' | 'ink';

export interface Glyph {
  name: string;
  main: Tone;
  /** colour of the 'a' pixels (defaults to the main tone) */
  acc?: Tone;
  /** 7 rows of 7 characters */
  rows: string[];
}

export interface FamilyTheme {
  family: string;
  /** names of the games in this family's words (16 characters at most), by game id */
  titles: { hilo: string; catch: string; dash: string; echo: string };
  /** plural nouns for rules and results: what CATCH collects and avoids */
  goodNoun: string;
  badNoun: string;
  /** DASH verb: how this family gets through the course */
  move: 'RUN' | 'HOP' | 'SWIM' | 'FLY' | 'SLIDE' | 'FLOAT' | 'ROLL';
  /** CATCH: common items (+1 each), then one bonus item (+3, rare) */
  good: Glyph[];
  bonus: Glyph;
  /** CATCH: things to dodge */
  bad: Glyph[];
  /** DASH: [low, tall, spiky] obstacles in the family's biome */
  obstacles: Glyph[];
  /** ECHO: five symbols the pet shows and the player repeats */
  symbols: Glyph[];
  /** result lines by rank, 16 characters at most */
  wins: { none: string; bronze: string; silver: string; gold: string };
}

const g = (name: string, main: Tone, rows: string, acc?: Tone): Glyph => ({ name, main, acc, rows: rows.split('|') });

// ---------- shared shapes, re-toned per family ----------
const LOW_ROCK = '.......|.......|.......|..###..|.#####.|#######|#######';
const LOW_LOG = '.......|.......|.......|.......|.#####.|#aaoaa#|.#####.';
const LOW_POT = '.......|.......|#######|.#####.|.#a#a#.|.#####.|..###..';
const LOW_PUFF = '.......|..##...|.#####.|#######|#######|.#####.|.......';
const LOW_CRATE = '.......|#######|#o###o#|#.#o#.#|##o#o##|#o###o#|#######';
const LOW_STUMP = '.......|.......|.#####.|.aaaaa.|..###..|..###..|.#####.';
const TALL_TREE = '..###..|.#####.|#######|.#####.|...a...|...a...|...a...';
const TALL_POST = '.#####.|.#####.|..###..|..###..|..###..|..###..|..###..';
const TALL_PIPE = '.#####.|#aaaaa#|.#####.|..###..|..###..|#aaaaa#|.#####.';
const TALL_REED = '..#....|.##.#..|..#.#..|..###..|..#.#..|.##.##.|..#.#..';
const TALL_CRYSTAL = '...#...|..###..|.#w###.|.#####.|.#####.|..###..|...#...';
const TALL_COLUMN = '.#####.|..###..|..#w#..|..#w#..|..###..|..###..|.#####.';
const SPIKES = '.......|...#...|.#.#.#.|.#####.|#######|#######|#######';
const SPIKY_BUSH = '.#.#.#.|#######|.#####.|#######|.#o#o#.|#######|.#.#.#.';

export const THEMES: Record<string, FamilyTheme> = {
  // ---- dinos: the meadow ----
  dino: {
    family: 'dino',
    titles: { hilo: 'MEAT COUNT', catch: 'CHOMP CATCH', dash: 'RAWR DASH', echo: 'FOOTPRINTS' },
    goodNoun: 'MEAT', badNoun: 'BOULDERS', move: 'RUN',
    good: [
      g('MEAT', 'rust', '..###..|.#####.|.#####.|..###..|...a...|..a.a..|..a.a..', 'white'),
      g('VEGGIE', 'green', '.....##|...####|..#####|.#####.|#####..|a###...|a......', 'brown'),
    ],
    bonus: g('GOLD EGG', 'gold', '..###..|.#####.|.#w###.|#######|#######|.#####.|..###..'),
    bad: [
      g('BOULDER', 'grey', '..###..|.#####.|##o####|#######|####o##|.#####.|..###..'),
      g('BURR', 'green', '#.#.#.#|.#####.|#######|.#o#o#.|#######|.#####.|#.#.#.#'),
    ],
    obstacles: [g('ROCK', 'grey', LOW_ROCK), g('TREE', 'green', TALL_TREE, 'brown'), g('THORNS', 'green', SPIKES)],
    symbols: [
      g('LEAF', 'green', '....###|..#####|.######|#####..|####...|a##....|a......', 'brown'),
      g('BONE', 'white', '##...##|#######|.#####.|..###..|.#####.|#######|##...##'),
      g('EGG', 'yellow', '..###..|.#####.|.#w###.|#######|#######|.#####.|..###..'),
      g('PRINT', 'brown', '.#.#.#.|.#.#.#.|..###..|.#####.|.#####.|..###..|.......'),
      g('FANG', 'white', '#######|.#####.|.#####.|..###..|..###..|...#...|...#...'),
    ],
    wins: { none: 'RAWR! TOO SLOW', bronze: 'NICE CHOMPING', silver: 'ROARING GOOD', gold: 'KING OF DINOS' },
  },
  // ---- foxes: the woods ----
  fox: {
    family: 'fox',
    titles: { hilo: 'BERRY COUNT', catch: 'MOUSE POUNCE', dash: 'FOREST DASH', echo: 'TRAIL SIGNS' },
    goodNoun: 'MICE', badNoun: 'THORNS', move: 'RUN',
    good: [
      g('MOUSE', 'grey', '##...##|##.#.##|.#####.|.#o#o#.|.##a##.|..###..|...a...', 'pink'),
      g('BERRY', 'red', '..a.a..|...a...|.#####.|##w####|#######|.#####.|..###..', 'green'),
    ],
    bonus: g('GOLD ACORN', 'gold', '.aaaaa.|aaaaaaa|.#####.|.#w###.|.#####.|..###..|...#...', 'dbrown'),
    bad: [
      g('THORN', 'green', '#######|.#####.|.#####.|..#o#..|..###..|...#...|...#...'),
      g('TRAP', 'grey', '.......|#.#.#.#|#######|#o#o#o#|#######|.#...#.|.......'),
    ],
    obstacles: [g('LOG', 'brown', LOW_LOG, 'dbrown'), g('STUMP', 'brown', TALL_POST, 'dbrown'), g('BRAMBLE', 'green', SPIKY_BUSH)],
    symbols: [
      g('PAW', 'dbrown', '.#.#.#.|.#.#.#.|..###..|.#####.|.#####.|..###..|.......'),
      g('LEAF', 'orange', '....###|..#####|.######|#####..|####...|a##....|a......', 'brown'),
      g('ACORN', 'brown', '.aaaaa.|aaaaaaa|.#####.|.#####.|.#####.|..###..|...#...', 'dbrown'),
      g('SHROOM', 'red', '..###..|.#w###.|#######|.......|..aaa..|..aaa..|..aaa..', 'white'),
      g('MOON', 'yellow', '..###..|.##....|##.....|##.....|##.....|.##....|..###..'),
    ],
    wins: { none: 'MICE GOT AWAY', bronze: 'A FINE HUNT', silver: 'SHARP PAWS', gold: 'FOX OF THE WOODS' },
  },
  // ---- fish: underwater ----
  fish: {
    family: 'fish',
    titles: { hilo: 'BUBBLE COUNT', catch: 'BUBBLE CATCH', dash: 'REEF SWIM', echo: 'SHELL SONG' },
    goodNoun: 'BUBBLES', badNoun: 'JELLIES', move: 'SWIM',
    good: [
      g('BUBBLE', 'cyan', '..###..|.#...#.|#..w..#|#.....#|#.....#|.#...#.|..###..'),
      g('PLANKTON', 'green', '..#....|#.#..#.|.###.#.|..#.#..|.#.###.|#...#..|..#....'),
    ],
    bonus: g('PEARL', 'white', '..###..|.#w###.|#w#####|#######|#######|.#####.|..###..'),
    bad: [
      g('JELLYFISH', 'purple', '..###..|.#####.|#######|#o###o#|.#.#.#.|#.#.#.#|.#.#.#.'),
      g('URCHIN', 'ink', '#..#..#|.#.#.#.|..###..|#######|..###..|.#.#.#.|#..#..#'),
    ],
    obstacles: [g('ROCK', 'grey', LOW_ROCK), g('REEDS', 'green', TALL_REED), g('URCHIN', 'purple', SPIKES)],
    symbols: [
      g('SHELL', 'pink', '..###..|.#.#.#.|#.#.#.#|#######|.#####.|..###..|...a...', 'white'),
      g('STAR', 'orange', '...#...|...#...|#######|.#####.|..###..|.##.##.|.#...#.'),
      g('BUBBLE', 'cyan', '..###..|.#...#.|#..w..#|#.....#|#.....#|.#...#.|..###..'),
      g('FISH', 'blue', '.......|..##..#|.#####.|##o####|.#####.|..##..#|.......'),
      g('WAVE', 'blue', '.......|.#...#.|#.#.#.#|.......|.#...#.|#.#.#.#|.......'),
    ],
    wins: { none: 'POP, POP, POP...', bronze: 'SPLASH', silver: 'SMOOTH SWIMMER', gold: 'LORD OF THE REEF' },
  },
  // ---- birds: the sky ----
  bird: {
    family: 'bird',
    titles: { hilo: 'SEED COUNT', catch: 'SEED SNATCH', dash: 'SKY FLAP', echo: 'BIRD SONG' },
    goodNoun: 'SEEDS', badNoun: 'CAT PAWS', move: 'FLY',
    good: [
      g('SEED', 'brown', '...#...|..###..|.##w##.|.#####.|..###..|..###..|...#...'),
      g('WORM', 'pink', '.......|.##....|#..#.##|...##.#|.......|.......|.......'),
    ],
    bonus: g('SUNSEED', 'gold', '#.#.#.#|.#####.|###w###|#######|###a###|.#####.|#.#.#.#', 'dbrown'),
    bad: [
      g('CAT PAW', 'orange', '.#.#.#.|.#.#.#.|..###..|.#####.|.#####.|..###..|.......'),
      g('STONE', 'grey', '.......|..###..|.#####.|#######|#o#####|.#####.|..###..'),
    ],
    obstacles: [g('BRANCH', 'brown', LOW_STUMP, 'dbrown'), g('CHIMNEY', 'rust', TALL_PIPE, 'grey'), g('ANTENNA', 'grey', '...#...|..#.#..|.#...#.|...#...|.#####.|...#...|...#...')],
    symbols: [
      g('FEATHER', 'blue', '.....##|....###|...###.|..###..|.###...|a##....|a......', 'white'),
      g('NEST', 'brown', '.......|.......|#.###.#|#######|.#####.|..###..|.......'),
      g('EGG', 'white', '..###..|.#####.|.#w###.|#######|#######|.#####.|..###..'),
      g('NOTE', 'ink', '..####.|..#..#.|..#....|..#....|.##....|###....|.#.....'),
      g('SUN', 'gold', '#..#..#|.#.#.#.|..###..|#######|..###..|.#.#.#.|#..#..#'),
    ],
    wins: { none: 'NO SEEDS TODAY', bronze: 'GOOD FLAPPING', silver: 'SOARING', gold: 'KING OF THE SKY' },
  },
  // ---- cats: the yard ----
  cat: {
    family: 'cat',
    titles: { hilo: 'TUNA COUNT', catch: 'TUNA TOSS', dash: 'FENCE DASH', echo: 'NINE LIVES' },
    goodNoun: 'TUNA', badNoun: 'SPLASHES', move: 'RUN',
    good: [
      g('TUNA', 'blue', '.......|..##..#|.#####.|##o####|.#####.|..##..#|.......'),
      g('MILK', 'white', '.#####.|.#####.|.#www#.|.#####.|.#####.|.#####.|..###..'),
    ],
    bonus: g('YARN', 'pink', '..###..|.#####.|#.#.###|##.#.##|###.#.#|.#####.|..###..'),
    bad: [
      g('SPLASH', 'blue', '...#...|...#...|..###..|.#####.|#######|#######|.#####.'),
      g('BROOM', 'brown', '...#...|...#...|...#...|..###..|.#####.|#######|#.#.#.#', 'yellow'),
    ],
    obstacles: [g('FLOWERPOT', 'orange', LOW_POT, 'green'), g('FENCE', 'brown', TALL_POST, 'dbrown'), g('CACTUS', 'green', '...#...|.#.#...|.#.#.#.|.#.#.#.|.#####.|...#...|...#...')],
    symbols: [
      g('PAW', 'dbrown', '.#.#.#.|.#.#.#.|..###..|.#####.|.#####.|..###..|.......'),
      g('FISHBONE', 'white', '#.#.#..|.#.#.#.|#######|.#.#.#.|#.#.#..|.......|.......'),
      g('YARN', 'pink', '..###..|.#####.|#.#.###|##.#.##|###.#.#|.#####.|..###..'),
      g('MOUSE', 'grey', '##...##|##.#.##|.#####.|.#o#o#.|.##a##.|..###..|...a...', 'pink'),
      g('BELL', 'gold', '..###..|.#####.|.#####.|#######|#######|..#o#..|...#...'),
    ],
    wins: { none: 'NAP TIME INSTEAD', bronze: 'NOT BAD, PUSS', silver: 'PURRFECT', gold: 'YARD QUEEN' },
  },
  // ---- spirits: clouds ----
  spirits: {
    family: 'spirits',
    titles: { hilo: 'STAR COUNT', catch: 'STARDUST', dash: 'CLOUD HOP', echo: 'HALO ECHO' },
    goodNoun: 'STARDUST', badNoun: 'BOLTS', move: 'FLOAT',
    good: [
      g('STARDUST', 'gold', '...#...|...#...|..###..|#######|..###..|.#...#.|#.....#'),
      g('PUFF', 'white', '..##...|.#####.|#######|#######|.#####.|.......|.......'),
    ],
    bonus: g('HALO', 'yellow', '.#####.|#.....#|#.....#|.#####.|.......|.......|.......'),
    bad: [
      g('BOLT', 'orange', '..####.|.###...|.####..|..###..|...##..|..##...|.#.....'),
      g('STORM', 'grey', '..###..|.#####.|#######|#######|.#####.|.#.#.#.|#.#.#.#'),
    ],
    obstacles: [g('PUFF', 'grey', LOW_PUFF), g('COLUMN', 'white', TALL_COLUMN), g('HORN SPIKE', 'red', SPIKES)],
    symbols: [
      g('HALO', 'yellow', '.#####.|#.....#|#.....#|.#####.|.......|.......|.......'),
      g('HORN', 'red', '....##.|...###.|..###..|.###...|####...|###....|#......'),
      g('STAR', 'gold', '...#...|...#...|#######|.#####.|..###..|.##.##.|.#...#.'),
      g('CLOUD', 'white', '..##...|.#####.|#######|#######|.#####.|.......|.......'),
      g('FLAME', 'orange', '...#...|..##...|..###..|.#####.|#######|#######|.#####.'),
    ],
    wins: { none: 'A QUIET NIGHT', bronze: 'TWINKLE', silver: 'HEAVENLY', gold: 'SHINING BRIGHT' },
  },
  // ---- bunnies: the warren ----
  bunny: {
    family: 'bunny',
    titles: { hilo: 'CARROT COUNT', catch: 'CARROT CATCH', dash: 'BURROW HOP', echo: 'CLOVER ECHO' },
    goodNoun: 'CARROTS', badNoun: 'THISTLES', move: 'HOP',
    good: [
      g('CARROT', 'orange', '..a.a..|...a...|.#####.|.#####.|..###..|..###..|...#...', 'green'),
      g('CLOVER', 'green', '.##.##.|#######|.#####.|#######|.##.##.|...a...|...a...', 'brown'),
    ],
    bonus: g('GOLD CARROT', 'gold', '..a.a..|...a...|.#w###.|.#####.|..###..|..###..|...#...', 'green'),
    bad: [
      g('THISTLE', 'purple', '#.#.#.#|.#####.|#######|.#####.|..#o#..|...a...|...a...', 'green'),
      g('HAWK', 'ink', '#.....#|##...##|.##.##.|..###..|..#o#..|...#...|.......'),
    ],
    obstacles: [g('STUMP', 'brown', LOW_STUMP, 'dbrown'), g('POST', 'brown', TALL_POST, 'dbrown'), g('THISTLE', 'purple', SPIKES, 'green')],
    symbols: [
      g('CARROT', 'orange', '..a.a..|...a...|.#####.|.#####.|..###..|..###..|...#...', 'green'),
      g('CLOVER', 'green', '.##.##.|#######|.#####.|#######|.##.##.|...a...|...a...', 'brown'),
      g('EARS', 'pink', '.#...#.|##...##|##...##|##...##|.#####.|.#o#o#.|..###..'),
      g('PAW', 'dbrown', '.#.#.#.|.#.#.#.|..###..|.#####.|.#####.|..###..|.......'),
      g('MOON', 'yellow', '..###..|.##....|##.....|##.....|##.....|.##....|..###..'),
    ],
    wins: { none: 'NO CARROTS...', bronze: 'HOP HOP', silver: 'QUICK BUNNY', gold: 'WARREN CHAMPION' },
  },
  // ---- dragons: the crags ----
  dragon: {
    family: 'dragon',
    titles: { hilo: 'GEM COUNT', catch: 'GEM GRAB', dash: 'CRAG FLIGHT', echo: 'RUNE FIRE' },
    goodNoun: 'GEMS', badNoun: 'ICICLES', move: 'FLY',
    good: [
      g('GEM', 'purple', '..###..|.#w###.|#######|.#####.|..###..|...#...|.......'),
      g('HERB', 'green', '.#...#.|.##.##.|..###..|.#.#...|...#...|...a...|...a...', 'brown'),
    ],
    bonus: g('GOLD COIN', 'gold', '.#####.|##w####|#######|###o###|#######|#######|.#####.'),
    bad: [
      g('ICICLE', 'ice', '#######|.#####.|.#####.|..###..|..###..|...#...|...#...'),
      g('DROP', 'blue', '...#...|...#...|..###..|.#####.|#######|#######|.#####.'),
    ],
    obstacles: [g('ROCK', 'grey', LOW_ROCK), g('STALAGMITE', 'grey', '...#...|...#...|..###..|..###..|.#####.|.#####.|#######'), g('LAVA SPIKE', 'orange', SPIKES)],
    symbols: [
      g('FLAME', 'orange', '...#...|..##...|..###..|.#####.|#######|#######|.#####.'),
      g('GEM', 'purple', '..###..|.#w###.|#######|.#####.|..###..|...#...|.......'),
      g('CLAW', 'white', '#.....#|##...##|.##.##.|..###..|..###..|...#...|.......'),
      g('SCALE', 'green', '.#####.|##.#.##|#.###.#|.#####.|..###..|...#...|.......'),
      g('EGG', 'red', '..###..|.#####.|.#w###.|#######|#######|.#####.|..###..'),
    ],
    wins: { none: 'EMPTY HOARD', bronze: 'EMBERS', silver: 'FIERY', gold: 'DRAGON LORD' },
  },
  // ---- bots: the workshop ----
  bot: {
    family: 'bot',
    titles: { hilo: 'CHIP COUNT', catch: 'POWER UP', dash: 'CONVEYOR', echo: 'SIGNAL' },
    goodNoun: 'BATTERIES', badNoun: 'DROPS', move: 'ROLL',
    good: [
      g('BATTERY', 'green', '..###..|.#####.|.#o#o#.|.#####.|.#o#o#.|.#####.|.#####.'),
      g('CHIP', 'ink', '.#.#.#.|#######|##o#o##|#######|##o#o##|#######|.#.#.#.'),
    ],
    bonus: g('GOLD BOLT', 'gold', '..####.|.###...|.####..|..###..|...##..|..##...|.#.....'),
    bad: [
      g('WATER DROP', 'blue', '...#...|...#...|..###..|.#####.|#######|#######|.#####.'),
      g('RUST', 'rust', '#.#.#.#|.#####.|##o#o##|.#####.|##o#o##|.#####.|#.#.#.#'),
    ],
    obstacles: [g('CRATE', 'brown', LOW_CRATE), g('PIPE', 'grey', TALL_PIPE, 'ink'), g('SAW', 'grey', SPIKES)],
    symbols: [
      g('GEAR', 'grey', '#.###.#|.#####.|###.###|##...##|###.###|.#####.|#.###.#'),
      g('BOLT', 'gold', '..####.|.###...|.####..|..###..|...##..|..##...|.#.....'),
      g('CHIP', 'ink', '.#.#.#.|#######|##o#o##|#######|##o#o##|#######|.#.#.#.'),
      g('BATTERY', 'green', '..###..|.#####.|.#o#o#.|.#####.|.#o#o#.|.#####.|.#####.'),
      g('SCREEN', 'cyan', '#######|#o###o#|#.o.o.#|#..o..#|#o###o#|#######|..###..'),
    ],
    wins: { none: 'LOW BATTERY', bronze: 'POWERED UP', silver: 'FULL CHARGE', gold: 'SUPER CIRCUIT' },
  },
  // ---- slimes: the swamp ----
  slime: {
    family: 'slime',
    titles: { hilo: 'JAM COUNT', catch: 'GLOOP CATCH', dash: 'BOG HOP', echo: 'SPORE ECHO' },
    goodNoun: 'JAM', badNoun: 'SALT', move: 'SLIDE',
    good: [
      g('JAM', 'red', '..###..|.#####.|##w####|#######|#######|.#####.|..###..'),
      g('MOSS', 'green', '.#.#.#.|#######|#######|.#####.|..###..|...#...|.......'),
    ],
    bonus: g('DEW', 'cyan', '...#...|..###..|.#w###.|#######|#######|.#####.|..###..'),
    bad: [
      g('SALT', 'white', '#.#.#.#|.#####.|##o#o##|#######|.#####.|#.#.#.#|.......'),
      g('SPARK', 'orange', '...#...|...#...|#..#..#|.#####.|#..#..#|...#...|...#...'),
    ],
    obstacles: [g('STUMP', 'brown', LOW_STUMP, 'dbrown'), g('CATTAIL', 'green', TALL_REED, 'brown'), g('SALT SPIKES', 'white', SPIKES)],
    symbols: [
      g('DROP', 'green', '...#...|...#...|..###..|.#####.|#######|#######|.#####.'),
      g('SPORE', 'red', '..###..|.#w###.|#######|.......|..aaa..|..aaa..|..aaa..', 'white'),
      g('BUBBLE', 'cyan', '..###..|.#...#.|#..w..#|#.....#|#.....#|.#...#.|..###..'),
      g('EYE', 'white', '.......|..###..|.#####.|##o#o##|.#####.|..###..|.......'),
      g('CRYSTAL', 'purple', '...#...|..###..|.#w###.|.#####.|.#####.|..###..|...#...'),
    ],
    wins: { none: 'SPLAT', bronze: 'WOBBLY', silver: 'SQUISHY GOOD', gold: 'GLOOP ROYALTY' },
  },
  // ---- bugs: the garden ----
  bug: {
    family: 'bug',
    titles: { hilo: 'NECTAR COUNT', catch: 'NECTAR RUN', dash: 'GARDEN BUZZ', echo: 'WING ECHO' },
    goodNoun: 'HONEY', badNoun: 'SPIDERS', move: 'FLY',
    good: [
      g('HONEY', 'gold', '...#...|..###..|.#w###.|#######|#######|.#####.|..###..'),
      g('LEAF', 'green', '....###|..#####|.######|#####..|####...|a##....|a......', 'brown'),
    ],
    bonus: g('FLOWER', 'pink', '.#.#.#.|#######|###o###|#######|.#.#.#.|...a...|...a...', 'green'),
    bad: [
      g('SPIDER', 'ink', '#..#..#|.#.#.#.|..###..|#######|..###..|.#.#.#.|#..#..#'),
      g('RAINDROP', 'blue', '...#...|...#...|..###..|.#####.|#######|#######|.#####.'),
    ],
    obstacles: [g('PEBBLE', 'grey', LOW_ROCK), g('STEM', 'green', TALL_REED), g('THORN', 'green', SPIKES)],
    symbols: [
      g('WING', 'cyan', '.....##|...####|..#####|.#####.|#####..|####...|##.....'),
      g('LEAF', 'green', '....###|..#####|.######|#####..|####...|a##....|a......', 'brown'),
      g('FLOWER', 'pink', '.#.#.#.|#######|###o###|#######|.#.#.#.|...a...|...a...', 'green'),
      g('DOTS', 'red', '..###..|.#o#o#.|#######|###o###|#o###o#|.#####.|..###..'),
      g('HONEY', 'gold', '...#...|..###..|.#w###.|#######|#######|.#####.|..###..'),
    ],
    wins: { none: 'NO NECTAR...', bronze: 'BUZZ BUZZ', silver: 'BUSY BEE', gold: 'HIVE QUEEN' },
  },
  // ---- aliens: deep space ----
  alien: {
    family: 'alien',
    titles: { hilo: 'STAR COUNT', catch: 'COMET CATCH', dash: 'ORBIT DASH', echo: 'SIGNAL ECHO' },
    goodNoun: 'CHEESE', badNoun: 'ROCKS', move: 'FLOAT',
    good: [
      g('MOON CHEESE', 'yellow', '.......|..####.|.#o##o#|#######|#o####o|#######|.......'),
      g('STARDUST', 'white', '...#...|...#...|..###..|#######|..###..|.#...#.|#.....#'),
    ],
    bonus: g('COMET ICE', 'ice', '#.#....|.#.#...|..#.##.|...####|..#####|...###.|....#..'),
    bad: [
      g('ASTEROID', 'grey', '..###..|.#####.|##o####|#######|####o##|.#####.|..###..'),
      g('ZAP', 'red', '..####.|.###...|.####..|..###..|...##..|..##...|.#.....'),
    ],
    obstacles: [g('CRATER ROCK', 'grey', LOW_ROCK), g('SPIRE', 'purple', TALL_CRYSTAL), g('SHARDS', 'cyan', SPIKES)],
    symbols: [
      g('STAR', 'white', '...#...|...#...|#######|.#####.|..###..|.##.##.|.#...#.'),
      g('PLANET', 'pink', '..###..|.#####.|#######|aaaaaaa|#######|.#####.|..###..', 'yellow'),
      g('UFO', 'grey', '..###..|.#w###.|#######|#######|.o.o.o.|.......|.......'),
      g('EYE', 'white', '.......|..###..|.#####.|##o#o##|.#####.|..###..|.......'),
      g('MOON', 'yellow', '..###..|.##....|##.....|##.....|##.....|.##....|..###..'),
    ],
    wins: { none: 'LOST IN SPACE', bronze: 'LIFT OFF', silver: 'STELLAR', gold: 'GALAXY CHAMPION' },
  },
};

export const THEME_FAMILIES = Object.keys(THEMES);
export const themeFor = (family: string): FamilyTheme => THEMES[family] ?? THEMES.dino;
export const GLYPH_SIZE = 7;
/** Every glyph of a theme (for tests and sheets). */
export const allGlyphs = (t: FamilyTheme): Glyph[] => [...t.good, t.bonus, ...t.bad, ...t.obstacles, ...t.symbols];
