import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { statusLine } from './src/core/pet';
import { DevPanel } from './src/ui/DevPanel';
import { fitLines, PixelButton, PixelText } from './src/ui/PixelText';
import { useTheme } from './src/ui/theme';
import { ICON_ROW_H, Toy } from './src/ui/Toy';
import { useGame } from './src/ui/useGame';

const GEAR = ['...XX...', '.X.XX.X.', '..XXXX..', 'XXX..XXX', 'XXX..XXX', '..XXXX..', '.X.XX.X.', '...XX...'];
const GEAR_D = GEAR.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

const HINTS: Record<string, string> = {
  feed: 'A: next | B: eat | C: back', play: 'A: higher/lower | B: choose | C: quit',
  stats: 'B: next page | C: back', dex: 'B: next page | C: back',
};

const GUTTER = 16;
const MAX_W = 440;
const MSG_H = 38;
const BTN_H = 56;
const HEAD_H = 44;
// vertical space everything except the square needs (head + 2 icon rows + message + buttons + padding)
const RESERVED = HEAD_H + 2 * ICON_ROW_H + MSG_H + BTN_H + 16 + 24 + 16;

function NameModal({ onDone }: { onDone: (n: string) => void }) {
  const [v, setV] = useState('Rexie');
  const t = useTheme();
  const mono = Platform.select({ web: 'ui-monospace, Menlo, Consolas, monospace', default: 'Courier' });
  return (
    <View style={[s.backdrop, { backgroundColor: t.dark ? 'rgba(30,36,24,0.88)' : 'rgba(181,193,154,0.88)' }]}>
      <View style={[s.modal, { backgroundColor: t.ground, borderColor: t.ink }]}>
        <PixelText text="It hatched!" ps={4} color={t.ink} />
        <View style={{ height: 10 }} />
        <PixelText text="Name your dino" ps={2} color={t.ink} />
        <TextInput value={v} onChangeText={setV} maxLength={10} autoFocus selectTextOnFocus
          onSubmitEditing={() => onDone(v)} autoCapitalize="words" accessibilityLabel="Dino name"
          style={[s.input, { borderColor: t.ink, color: t.ink, fontFamily: mono }]} />
        <PixelButton label="OK" ps={3} onPress={() => onDone(v)} style={{ minWidth: 120 }} />
      </View>
    </View>
  );
}

export default function App() {
  const game = useGame();
  const t = useTheme();
  const { width: vw, height: vh } = useWindowDimensions();
  const colW = Math.min(vw, MAX_W + 2 * GUTTER);
  const inner = colW - 2 * GUTTER;
  const W = Math.floor(Math.max(200, Math.min(inner, vh - RESERVED)));
  const pet = game.pet;
  const hint = HINTS[game.mode];
  const msg = game.msg ?? hint ?? (pet ? statusLine(pet) : 'Loading...');
  const fit = fitLines(msg, W, 3, 2);
  const ghost = pet?.stage === 'ghost';
  const btnW = Math.floor((inner - 2 * 12) / 3);

  return (
    <SafeAreaView style={[s.page, { backgroundColor: t.ground }]}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={[s.col, { width: colW, paddingHorizontal: GUTTER }]}>
        <View style={{ height: HEAD_H }} />
        <View style={s.main}>
          <Toy game={game} width={W} />
          <Pressable accessibilityLabel="Message" onPress={game.dismissMsg} style={{ width: W, height: MSG_H, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {ghost ? (
              <PixelButton label="HATCH A NEW EGG" ps={2} onPress={game.hatchNew} style={{ minHeight: 34, paddingVertical: 4 }} />
            ) : fit.lines.map((l, i) => <PixelText key={i + l} text={l} ps={fit.ps} color={t.ink} />)}
          </Pressable>
        </View>
        <View style={s.buttons}>
          {([['A', game.pressA], ['B', game.pressB], ['C', game.pressC]] as const).map(([l, f]) => (
            <PixelButton key={l} label={l} ps={5} accessibilityLabel={`Button ${l}`} onPress={f}
              style={{ width: btnW, height: BTN_H, borderRadius: 14 }} />
          ))}
        </View>
      </View>
      <Pressable accessibilityLabel="Dev panel" onPress={() => game.setDevOpen(true)} hitSlop={4} style={s.gear}>
        <Svg width={18} height={18} viewBox="0 0 8 8"><Path d={GEAR_D} fill={t.ink} /></Svg>
      </Pressable>
      {game.needsName && <NameModal onDone={game.setName} />}
      {game.devOpen && pet && <DevPanel game={game} onClose={() => game.setDevOpen(false)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', ...(Platform.OS === 'web' ? { minHeight: '100vh' as any, userSelect: 'none' as any, paddingBottom: 'env(safe-area-inset-bottom)' as any } : null) },
  col: { flex: 1, alignItems: 'center', paddingBottom: 24 },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 4 },
  gear: { position: 'absolute', top: Platform.OS === 'web' ? 0 : 36, right: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', zIndex: 60 },
  modal: { width: 300, borderWidth: 2, padding: 20, alignItems: 'center' },
  input: { width: '100%', borderWidth: 2, padding: 10, fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 14 },
});
