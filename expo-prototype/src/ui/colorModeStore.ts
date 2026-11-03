// Color mode persistence (no React or native imports, so tests can run it with an in-memory store).
import { isColorMode, type ColorMode } from './palette';

export const COLOR_MODE_KEY = 'pocket-rexie-colormode-v1';
export const DEFAULT_COLOR_MODE: ColorMode = 'traditional';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** The saved mode; anything missing, unreadable or unknown falls back to Traditional. */
export async function loadColorMode(store: KeyValueStore): Promise<ColorMode> {
  try {
    const v = await store.getItem(COLOR_MODE_KEY);
    return isColorMode(v) ? v : DEFAULT_COLOR_MODE;
  } catch {
    return DEFAULT_COLOR_MODE;
  }
}

export async function saveColorMode(store: KeyValueStore, mode: ColorMode): Promise<void> {
  try { await store.setItem(COLOR_MODE_KEY, mode); } catch { /* storage unavailable: the choice still applies for this session */ }
}
