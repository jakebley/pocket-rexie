// Family glyphs for the Technicolor 96x96 mini-games: the same slots as themes.ts (good, bonus, bad, obstacles low / tall / spiky, five
// symbols) for the same 12 families, redrawn on a 10x10 grid (glyphs96.ts holds the shapes, this file recolours and assigns them).
// The rules never read this file: hit boxes, tuning and scoring stay in the 7x7 logic units of themes.ts. A logic cell is 1.5 cells at 96,
// so a 10x10 glyph fits inside the 7x7 logic box (10.5 cells) it stands in for.
import { SHAPES } from './glyphs96';
import type { Glyph, Tone } from './themes';

export const GLYPH96_SIZE = 10;

export interface Theme96 {
  family: string;
  good: Glyph[];
  bonus: Glyph;
  bad: Glyph[];
  /** [low, tall, spiky] */
  obstacles: Glyph[];
  symbols: Glyph[];
}

const g = (name: string, main: Tone, shape: string, acc?: Tone): Glyph => {
  const rows = SHAPES[shape];
  if (!rows) throw new Error(`themes96: no shape ${shape}`);
  return { name, main, acc, rows };
};

export const THEMES96: Record<string, Theme96> = {
  dino: {
    family: 'dino',
    good: [g('MEAT', 'rust', 'drum', 'white'), g('VEGGIE', 'green', 'leaf', 'brown')],
    bonus: g('GOLD EGG', 'gold', 'egg'),
    bad: [g('BOULDER', 'grey', 'boulder'), g('BURR', 'green', 'burr')],
    obstacles: [g('ROCK', 'grey', 'rockLow'), g('TREE', 'green', 'treeTall', 'brown'), g('THORNS', 'green', 'spikes')],
    symbols: [g('LEAF', 'green', 'leaf', 'brown'), g('BONE', 'white', 'bone'), g('EGG', 'yellow', 'egg'), g('PRINT', 'brown', 'paw'), g('FANG', 'white', 'fang')],
  },
  fox: {
    family: 'fox',
    good: [g('MOUSE', 'grey', 'mouse', 'pink'), g('BERRY', 'red', 'berry', 'green')],
    bonus: g('GOLD ACORN', 'gold', 'acorn', 'dbrown'),
    bad: [g('THORN', 'green', 'thorn'), g('TRAP', 'grey', 'trap')],
    obstacles: [g('LOG', 'brown', 'logLow', 'dbrown'), g('STUMP', 'brown', 'postTall', 'dbrown'), g('BRAMBLE', 'green', 'brambleTall')],
    symbols: [g('PAW', 'dbrown', 'paw'), g('LEAF', 'orange', 'leaf', 'brown'), g('ACORN', 'brown', 'acorn', 'dbrown'), g('SHROOM', 'red', 'spore', 'white'), g('MOON', 'yellow', 'moon')],
  },
  fish: {
    family: 'fish',
    good: [g('BUBBLE', 'cyan', 'bubble'), g('PLANKTON', 'green', 'plankton')],
    bonus: g('PEARL', 'white', 'pearl'),
    bad: [g('JELLYFISH', 'purple', 'jelly'), g('URCHIN', 'ink', 'urchin')],
    obstacles: [g('ROCK', 'grey', 'rockLow'), g('REEDS', 'green', 'reedTall'), g('URCHIN', 'purple', 'spikes')],
    symbols: [g('SHELL', 'pink', 'shell', 'white'), g('STAR', 'orange', 'starfish'), g('BUBBLE', 'cyan', 'bubble'), g('FISH', 'blue', 'fish', 'cyan'), g('WAVE', 'blue', 'wave')],
  },
  bird: {
    family: 'bird',
    good: [g('SEED', 'brown', 'seed'), g('WORM', 'pink', 'worm')],
    bonus: g('SUNSEED', 'gold', 'flower', 'dbrown'),
    bad: [g('CAT PAW', 'orange', 'catpaw'), g('STONE', 'grey', 'stone')],
    obstacles: [g('BRANCH', 'brown', 'stumpLow', 'dbrown'), g('CHIMNEY', 'rust', 'pipeTall', 'grey'), g('ANTENNA', 'grey', 'antennaTall')],
    symbols: [g('FEATHER', 'blue', 'feather', 'white'), g('NEST', 'brown', 'nest', 'dbrown'), g('EGG', 'white', 'egg'), g('NOTE', 'ink', 'note'), g('SUN', 'gold', 'sun')],
  },
  cat: {
    family: 'cat',
    good: [g('TUNA', 'blue', 'fish', 'cyan'), g('MILK', 'white', 'milk', 'blue')],
    bonus: g('YARN', 'pink', 'yarn', 'red'),
    bad: [g('SPLASH', 'blue', 'splash'), g('BROOM', 'brown', 'broom', 'yellow')],
    obstacles: [g('FLOWERPOT', 'orange', 'potLow', 'green'), g('FENCE', 'brown', 'fenceTall', 'dbrown'), g('CACTUS', 'green', 'cactusTall')],
    symbols: [g('PAW', 'dbrown', 'paw'), g('FISHBONE', 'white', 'fishbone'), g('YARN', 'pink', 'yarn', 'red'), g('MOUSE', 'grey', 'mouse', 'pink'), g('BELL', 'gold', 'bell')],
  },
  spirits: {
    family: 'spirits',
    good: [g('STARDUST', 'gold', 'stardust'), g('PUFF', 'white', 'puff')],
    bonus: g('HALO', 'yellow', 'halo'),
    bad: [g('BOLT', 'orange', 'bolt'), g('STORM', 'grey', 'storm')],
    obstacles: [g('PUFF', 'grey', 'puffLow'), g('COLUMN', 'white', 'columnTall'), g('HORN SPIKE', 'red', 'spikes')],
    symbols: [g('HALO', 'yellow', 'halo'), g('HORN', 'red', 'horn'), g('STAR', 'gold', 'star'), g('CLOUD', 'white', 'cloud'), g('FLAME', 'orange', 'flame')],
  },
  bunny: {
    family: 'bunny',
    good: [g('CARROT', 'orange', 'carrot', 'green'), g('CLOVER', 'green', 'clover', 'brown')],
    bonus: g('GOLD CARROT', 'gold', 'carrot', 'green'),
    bad: [g('THISTLE', 'purple', 'thistle', 'green'), g('HAWK', 'ink', 'hawk')],
    obstacles: [g('STUMP', 'brown', 'stumpLow', 'dbrown'), g('POST', 'brown', 'postTall', 'dbrown'), g('THISTLE', 'purple', 'spikes', 'green')],
    symbols: [g('CARROT', 'orange', 'carrot', 'green'), g('CLOVER', 'green', 'clover', 'brown'), g('EARS', 'pink', 'ears'), g('PAW', 'dbrown', 'paw'), g('MOON', 'yellow', 'moon')],
  },
  dragon: {
    family: 'dragon',
    good: [g('GEM', 'purple', 'gem'), g('HERB', 'green', 'sprig', 'brown')],
    bonus: g('GOLD COIN', 'gold', 'coin'),
    bad: [g('ICICLE', 'ice', 'icicle'), g('DROP', 'blue', 'drop')],
    obstacles: [g('ROCK', 'grey', 'rockLow'), g('STALAGMITE', 'grey', 'stalagmite'), g('LAVA SPIKE', 'orange', 'spikes')],
    symbols: [g('FLAME', 'orange', 'flame'), g('GEM', 'purple', 'gem'), g('CLAW', 'white', 'claw'), g('SCALE', 'green', 'scale'), g('EGG', 'red', 'egg')],
  },
  bot: {
    family: 'bot',
    good: [g('BATTERY', 'green', 'battery'), g('CHIP', 'ink', 'chip')],
    bonus: g('GOLD BOLT', 'gold', 'bolt'),
    bad: [g('WATER DROP', 'blue', 'drop'), g('RUST', 'rust', 'rust')],
    obstacles: [g('CRATE', 'brown', 'crateLow'), g('PIPE', 'grey', 'pipeTall', 'ink'), g('SAW', 'grey', 'saw')],
    symbols: [g('GEAR', 'grey', 'gear'), g('BOLT', 'gold', 'bolt'), g('CHIP', 'ink', 'chip'), g('BATTERY', 'green', 'battery'), g('SCREEN', 'cyan', 'screen')],
  },
  slime: {
    family: 'slime',
    good: [g('JAM', 'red', 'jam'), g('MOSS', 'green', 'moss')],
    bonus: g('DEW', 'cyan', 'drop'),
    bad: [g('SALT', 'white', 'salt'), g('SPARK', 'orange', 'spark')],
    obstacles: [g('STUMP', 'brown', 'stumpLow', 'dbrown'), g('CATTAIL', 'green', 'cattail', 'brown'), g('SALT SPIKES', 'white', 'spikes')],
    symbols: [g('DROP', 'green', 'drop'), g('SPORE', 'red', 'spore', 'white'), g('BUBBLE', 'cyan', 'bubble'), g('EYE', 'white', 'eye'), g('CRYSTAL', 'purple', 'crystal')],
  },
  bug: {
    family: 'bug',
    good: [g('HONEY', 'gold', 'honey'), g('LEAF', 'green', 'leaf', 'brown')],
    bonus: g('FLOWER', 'pink', 'flower', 'green'),
    bad: [g('SPIDER', 'ink', 'spider'), g('RAINDROP', 'blue', 'drop')],
    obstacles: [g('PEBBLE', 'grey', 'rockLow'), g('STEM', 'green', 'reedTall'), g('THORN', 'green', 'spikes')],
    symbols: [g('WING', 'cyan', 'wing'), g('LEAF', 'green', 'leaf', 'brown'), g('FLOWER', 'pink', 'flower', 'green'), g('DOTS', 'red', 'dots'), g('HONEY', 'gold', 'honey')],
  },
  alien: {
    family: 'alien',
    good: [g('MOON CHEESE', 'yellow', 'cheese'), g('STARDUST', 'white', 'stardust')],
    bonus: g('COMET ICE', 'ice', 'comet'),
    bad: [g('ASTEROID', 'grey', 'asteroid'), g('ZAP', 'red', 'zap')],
    obstacles: [g('CRATER ROCK', 'grey', 'rockLow'), g('SPIRE', 'purple', 'crystalTall'), g('SHARDS', 'cyan', 'spikes')],
    symbols: [g('STAR', 'white', 'star'), g('PLANET', 'pink', 'planet', 'yellow'), g('UFO', 'grey', 'ufo'), g('EYE', 'white', 'eye'), g('MOON', 'yellow', 'moon')],
  },
};

export const themeFor96 = (family: string): Theme96 => THEMES96[family] ?? THEMES96.dino;
/** Every glyph of a 96 theme (for tests and sheets). */
export const allGlyphs96 = (t: Theme96): Glyph[] => [...t.good, t.bonus, ...t.bad, ...t.obstacles, ...t.symbols];
