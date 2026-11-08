import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StatusBar as StatusBar2, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { statusLine } from './src/core/pet';
import { ColorModeProvider } from './src/ui/ColorModeContext';
import { ChooseEgg } from './src/ui/ChooseEgg';
import { DevPanel } from './src/ui/DevPanel';
import { SettingsSheet } from './src/ui/SettingsSheet';
import { fitLines, PixelButton, PixelText, touchStyle } from './src/ui/PixelText';
import { useTheme } from './src/ui/theme';
import { Toy } from './src/ui/Toy';
import { useGame } from './src/ui/useGame';

const GEAR = ['...XX...', '.X.XX.X.', '..XXXX..', 'XXX..XXX', 'XXX..XXX', '..XXXX..', '.X.XX.X.', '...XX...'];
const GEAR_D = GEAR.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

const HINTS: Record<string, string> = {
  feed: 'A: next | B: eat | C: back', play: 'A: higher/lower | B: choose | C: quit',
  stats: 'B: next page | C: back', dex: 'A: family | B: next page | C: back',
};

const GUT = 12; // side gutter of the LCD column
const MAX_W = 640; // widest LCD square (desktop)
const MAX_SCALE = 1.6; // how far icon rows, message and buttons grow on tall phones
// design heights at scale 1 (all hit areas are at least 48 CSS px)
const U = { head: 48, row: 48, msg: 42, btn: 64, gap: 8, bottom: 12 };
const FIXED = U.head + 2 * U.row + U.msg + U.btn + 5 * U.gap + U.bottom;

export interface Layout { landscape: boolean; W: number; s: number; panelW: number }
/** Fit the toy to the viewport: the LCD square is as big as the width and the remaining height allow. */
export function layoutFor(availW: number, availH: number): Layout {
  const landscape = availW > availH * 1.25 && availH < 640;
  if (landscape) {
    const W = Math.floor(Math.max(160, Math.min(availH - 2 * U.row - 2 * U.gap, availW * 0.62, MAX_W)));
    const panelW = Math.floor(Math.min(availW - W - 24, 340));
    return { landscape, W, s: 1, panelW };
  }
  const W = Math.floor(Math.max(200, Math.min(availW, availH - FIXED, MAX_W)));
  const s = Math.max(1, Math.min(MAX_SCALE, (availH - W) / FIXED));
  return { landscape, W, s, panelW: W };
}

/** Safe-area insets: CSS env() probe on web, a guess on native. */
function useInsets(vw: number, vh: number) {
  const [ins, setIns] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return;
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(p);
      const c = getComputedStyle(p);
      setIns({ top: parseFloat(c.paddingTop) || 0, right: parseFloat(c.paddingRight) || 0, bottom: parseFloat(c.paddingBottom) || 0, left: parseFloat(c.paddingLeft) || 0 });
      document.body.removeChild(p);
    } else setIns({ top: Platform.OS === 'ios' ? 50 : (StatusBar2.currentHeight ?? 24), bottom: Platform.OS === 'ios' ? 20 : 0, left: 0, right: 0 });
  }, [vw, vh]);
  return ins;
}

/** Web only: no pinch/double-tap zoom, no tap flash, no selection, no scrolling. */
function useWebTouchSetup() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const st = document.createElement('style');
    st.textContent = 'html,body{touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;overflow:hidden;overscroll-behavior:none}input,textarea{-webkit-user-select:text;user-select:text}';
    document.head.appendChild(st);
    let m = document.querySelector('meta[name=viewport]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'viewport'); document.head.appendChild(m); }
    m.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    return () => { document.head.removeChild(st); };
  }, []);
}

function NameModal({ onDone }: { onDone: (n: string) => void }) {
  const [v, setV] = useState('Rexie');
  const t = useTheme();
  const mono = Platform.select({ web: 'ui-monospace, Menlo, Consolas, monospace', default: 'Courier' });
  return (
    <View style={[s.backdrop, { backgroundColor: t.scrim }]}>
      <View style={[s.modal, { backgroundColor: t.ground, borderColor: t.ink }]}>
        <PixelText text="It hatched!" ps={4} color={t.ink} />
        <View style={{ height: 10 }} />
        <PixelText text="Name your pet" ps={2} color={t.ink} />
        <TextInput value={v} onChangeText={setV} maxLength={10} autoFocus selectTextOnFocus
          onSubmitEditing={() => onDone(v)} autoCapitalize="words" accessibilityLabel="Pet name"
          style={[s.input, { borderColor: t.ink, color: t.ink, fontFamily: mono }]} />
        <PixelButton label="OK" ps={3} onPress={() => onDone(v)} style={{ minWidth: 120, minHeight: 56 }} />
      </View>
    </View>
  );
}

export default function App() {
  return <ColorModeProvider><AppBody /></ColorModeProvider>;
}

function AppBody() {
  const game = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = useTheme();
  useWebTouchSetup();
  const { width: vw, height: vh } = useWindowDimensions();
  const ins = useInsets(vw, vh);
  const availW = vw - ins.left - ins.right - 2 * GUT;
  const availH = vh - ins.top - ins.bottom;
  const L = layoutFor(availW, availH);
  const { W, s: k } = L;
  const pet = game.pet;
  const hint = HINTS[game.mode];
  const msg = game.msg ?? hint ?? (pet ? statusLine(pet) : 'Loading...');
  const msgH = Math.round(U.msg * k);
  const fit = fitLines(msg, L.panelW - 8, 3 * k, 2 * k);
  const ghost = pet?.stage === 'ghost';
  const btnGap = Math.round(12 * k);
  const btnW = Math.floor((L.panelW - 2 * btnGap) / 3);
  const btnH = Math.round(U.btn * k);
  const gear = Math.max(48, Math.round(44 * k));

  const message = (
    <Pressable accessibilityLabel="Message" onPress={game.dismissMsg} style={[{ width: L.panelW, minHeight: msgH, alignItems: 'center', justifyContent: 'center', gap: Math.round(4 * k) }, touchStyle]}>
      {ghost ? (
        <PixelButton label="HATCH A NEW EGG" ps={2 * k} onPress={game.hatchNew} style={{ minHeight: 48, paddingVertical: 4 }} />
      ) : fit.lines.map((l, i) => <PixelText key={i + l} text={l} ps={fit.ps} color={t.ink} />)}
    </Pressable>
  );
  const buttons = (
    <View style={{ width: L.panelW, flexDirection: 'row', gap: btnGap, justifyContent: 'center' }}>
      {([['A', game.pressA], ['B', game.pressB], ['C', game.pressC]] as const).map(([l, f]) => (
        <PixelButton key={l} label={l} ps={5 * k} accessibilityLabel={`Button ${l}`} onPress={f} instant
          style={{ width: btnW, height: btnH, borderRadius: Math.round(14 * k) }} />
      ))}
    </View>
  );
  const gearBtn = (
    <Pressable accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)} style={[{ width: gear, height: gear, alignItems: 'center', justifyContent: 'center' }, touchStyle]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={{ width: gear - 8, height: gear - 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.ink : 'transparent' }}>
          <Svg width={Math.round(gear * 0.45)} height={Math.round(gear * 0.45)} viewBox="0 0 8 8"><Path d={GEAR_D} fill={pressed ? t.ground : t.ink} /></Svg>
        </View>
      )}
    </Pressable>
  );

  const body = L.landscape ? (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <Toy game={game} width={W} rowH={U.row} />
      <View style={{ width: L.panelW, alignItems: 'center', gap: 12 }}>
        <View style={{ width: L.panelW, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <PixelText text="POCKET REXIE" ps={2} color={t.ink} />
          {gearBtn}
        </View>
        {message}
        {buttons}
      </View>
    </View>
  ) : (
    <View style={{ flex: 1, width: W, alignItems: 'center', justifyContent: 'space-evenly', paddingBottom: U.bottom }}>
      <View style={{ width: W, height: Math.round(U.head * Math.min(k, 1.25)), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PixelText text="POCKET REXIE" ps={Math.max(2, Math.round(2 * k))} color={t.ink} />
        {gearBtn}
      </View>
      <Toy game={game} width={W} rowH={Math.round(U.row * k)} />
      {message}
      {buttons}
    </View>
  );

  return (
    <View style={[s.page, { backgroundColor: t.ground, width: vw, height: vh, paddingTop: ins.top, paddingBottom: ins.bottom, paddingLeft: ins.left, paddingRight: ins.right }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {body}
      {game.needsName && <NameModal onDone={game.setName} />}
      {game.choosingEgg && pet && <ChooseEgg game={game} />}
      {settingsOpen && <SettingsSheet game={game} onClose={() => setSettingsOpen(false)} onDev={() => { setSettingsOpen(false); game.setDevOpen(true); }} />}
      {game.devOpen && pet && <DevPanel game={game} onClose={() => game.setDevOpen(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  page: { alignItems: 'center', overflow: 'hidden', ...(Platform.OS === 'web' ? { userSelect: 'none' as any } : null) },
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', zIndex: 60 },
  modal: { width: 300, borderWidth: 2, padding: 20, alignItems: 'center' },
  input: { width: '100%', borderWidth: 2, padding: 10, fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 14 },
});
