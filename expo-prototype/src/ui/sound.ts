// Square-wave beeps via WebAudio, web only. On native this is a silent no-op.
import { Platform } from 'react-native';

let ctx: any = null;
let muted = false;
export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;

function audio(): any {
  if (Platform.OS !== 'web') return null;
  const g: any = globalThis as any;
  const AC = g.AudioContext || g.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume?.();
  return ctx;
}

function tone(freq: number, start: number, dur: number, vol = 0.05) {
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(vol, t0);
  g.gain.setValueAtTime(0, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export function beep() { if (!muted) tone(1800, 0, 0.06); }
export function bad() { if (!muted) { tone(300, 0, 0.12); tone(220, 0.12, 0.16); } }
export function callJingle() { if (!muted) [1568, 1319, 1568, 1319].forEach((f, i) => tone(f, i * 0.14, 0.1)); }
export function evolveJingle() { if (!muted) [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.1)); }
export function chirp() { if (!muted) { tone(2200, 0, 0.05, 0.04); tone(2900, 0.06, 0.07, 0.04); } }
