// Which animal families a player may start. No payments yet: `plus` is the entitlement flag a future purchase
// will set; the Settings "Preview Plus (testing)" toggle stands in for it. Pure, so the gating is unit-testable.
import { FAMILIES } from './speciesData';
import type { FamilyDef } from './types';

export interface Entitlements {
  /** the player owns Plus (nothing sets this yet) */
  plus: boolean;
  /** the testing toggle in Settings: behaves like owning Plus */
  previewPlus: boolean;
}
export const NO_ENTITLEMENTS: Entitlements = { plus: false, previewPlus: false };

export const hasPlus = (e: Entitlements) => e.plus || e.previewPlus;
export const familyUnlocked = (f: FamilyDef, e: Entitlements) => f.isFree || hasPlus(e);
export const familyById = (id: string): FamilyDef | undefined => FAMILIES.find((f) => f.id === id);
export const familyIdUnlocked = (id: string, e: Entitlements) => { const f = familyById(id); return !!f && familyUnlocked(f, e); };

/** The family an egg will really be: the request if the player may use it, otherwise the free first family. */
export function resolveEggFamily(requested: string, e: Entitlements): string {
  return familyIdUnlocked(requested, e) ? requested : FAMILIES[0].id;
}
/** Feed menu labels (meat, veggie, pasta) for a family, upper-cased for the LCD font. */
export function foodLabels(family: string): [string, string, string] {
  const f = familyById(family) ?? FAMILIES[0];
  return [f.foods[0].toUpperCase(), f.foods[1].toUpperCase(), f.foods[2].toUpperCase()];
}

export const PREVIEW_PLUS_KEY = 'pocket-rexie-previewplus-v1';
interface KV { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> }
export async function loadPreviewPlus(store: KV): Promise<boolean> {
  try { return (await store.getItem(PREVIEW_PLUS_KEY)) === '1'; } catch { return false; }
}
export async function savePreviewPlus(store: KV, on: boolean): Promise<void> {
  try { await store.setItem(PREVIEW_PLUS_KEY, on ? '1' : '0'); } catch { /* applies for this session only */ }
}
