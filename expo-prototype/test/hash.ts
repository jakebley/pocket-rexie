/** FNV-1a 64-bit-ish (two 32-bit lanes) hash of a 0/1 mask, hex. */
export function hashMask(m: number[]): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0xdeadbeef;
  for (let i = 0; i < m.length; i++) {
    a = Math.imul(a ^ m[i], 0x01000193) >>> 0;
    b = Math.imul(b ^ (m[i] + i), 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}
