// High scores: best score per game per species, and per game overall. They belong to the player, not to a pet,
// so they survive a pet's death and a restart. The storage is injected (AsyncStorage by default; a Map in tests).
import type { Rank } from './types';

export interface KV { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }
export const SCORES_KEY = 'pocket-rexie-scores-v1';

export interface ScoreEntry {
  score: number;
  rank: Rank;
  /** the pet that set it */
  name: string;
  species: string;
  speciesName: string;
  /** epoch ms of game time */
  date: number;
}
export interface GameScores { overall: ScoreEntry | null; species: Record<string, ScoreEntry> }
export type ScoreData = Record<string, GameScores>;

export interface SubmitResult {
  /** a new best for this species */
  recordSpecies: boolean;
  /** a new best for the game overall */
  recordOverall: boolean;
  /** the previous best for this species (null = first time) */
  previous: number | null;
}

/** AsyncStorage, loaded lazily so the pure engine and the tests never import react-native storage. */
export function defaultStorage(): KV {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default as KV;
}

export class ScoreStore {
  private data: ScoreData = {};
  private loaded = false;
  private loading: Promise<void> | null = null;
  constructor(private readonly storage: KV | (() => KV) = defaultStorage) {}
  private kv(): KV { return typeof this.storage === 'function' ? this.storage() : this.storage; }

  /** Read the saved scores (once). Safe to call often. A broken save starts empty rather than throwing. */
  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    this.loading ??= (async () => {
      try {
        const raw = await this.kv().getItem(SCORES_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d === 'object') this.merge(d as ScoreData);
        }
      } catch { /* start empty */ }
      this.loaded = true;
    })();
    return this.loading;
  }
  get ready() { return this.loaded; }
  /** Fold saved scores in, keeping the better entry of each slot (so a game submitted before the load finished is not lost). */
  private merge(d: ScoreData) {
    for (const [id, gs] of Object.entries(d)) {
      const g = this.game(id);
      if (gs?.overall && (!g.overall || gs.overall.score > g.overall.score)) g.overall = gs.overall;
      for (const [sp, e] of Object.entries(gs?.species ?? {})) if (!g.species[sp] || e.score > g.species[sp].score) g.species[sp] = e;
    }
  }

  private game(id: string): GameScores { return (this.data[id] ??= { overall: null, species: {} }); }
  best(gameId: string, species?: string): ScoreEntry | null {
    const g = this.data[gameId];
    if (!g) return null;
    return species ? g.species[species] ?? null : g.overall;
  }
  snapshot(): ScoreData { return JSON.parse(JSON.stringify(this.data)); }

  /** Record a finished game. Equal scores are not records. Persists in the background. */
  submit(gameId: string, e: ScoreEntry): SubmitResult {
    const g = this.game(gameId);
    const prev = g.species[e.species]?.score ?? null;
    const recordSpecies = e.score > 0 && (prev === null || e.score > prev);
    const recordOverall = e.score > 0 && (g.overall === null || e.score > g.overall.score);
    if (recordSpecies) g.species[e.species] = e;
    if (recordOverall) g.overall = e;
    if (recordSpecies || recordOverall) void this.save();
    return { recordSpecies, recordOverall, previous: prev };
  }
  async save(): Promise<void> {
    await this.load(); // never write before the saved scores have been folded in
    try { await this.kv().setItem(SCORES_KEY, JSON.stringify(this.data)); } catch { /* scores last for this session only */ }
  }
  clear() { this.data = {}; void this.save(); }
}
