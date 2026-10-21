import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { statusLine } from './src/core/pet';
import { DevPanel } from './src/ui/DevPanel';
import { Toy } from './src/ui/Toy';
import { useGame } from './src/ui/useGame';

const GEAR = ['...XX...', '.X.XX.X.', '..XXXX..', 'XXX..XXX', 'XXX..XXX', '..XXXX..', '.X.XX.X.', '...XX...'];
const GEAR_D = GEAR.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

const HINTS: Record<string, string> = {
  feed: 'A: next | B: eat | C: back', play: 'A: higher/lower | B: choose | C: quit',
  stats: 'B: next page | C: back', dex: 'B: next page | C: back',
};

function NameModal({ onDone }: { onDone: (n: string) => void }) {
  const [v, setV] = useState('Rexie');
  return (
    <View style={s.modalBackdrop}>
      <View style={s.modal}>
        <Text style={s.modalTitle}>It hatched!</Text>
        <Text style={s.modalSub}>What will you name your dino?</Text>
        <TextInput value={v} onChangeText={setV} maxLength={10} autoFocus selectTextOnFocus style={s.input}
          onSubmitEditing={() => onDone(v)} autoCapitalize="words" />
        <Pressable onPress={() => onDone(v)} style={s.okBtn}><Text style={s.okText}>OK</Text></Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const game = useGame();
  const { width: vw, height: vh } = useWindowDimensions();
  const W = Math.max(260, Math.min(vw - 16, 440, (vh - 120) / 1.6));
  const pet = game.pet;
  const hint = HINTS[game.mode];
  const pill = game.msg ?? hint ?? (pet ? statusLine(pet) : 'Loading...');

  return (
    <View style={s.page}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ width: W, alignItems: 'center' }}>
          <Toy game={game} width={W} />
          <View style={[s.pill, { width: W * 0.92 }]}>
            <Text style={s.pillText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{pill}</Text>
          </View>
          {pet?.stage === 'ghost' && (
            <Pressable onPress={game.hatchNew} style={s.hatch}><Text style={s.hatchText}>HATCH A NEW EGG</Text></Pressable>
          )}
        </View>
      </ScrollView>
      <Pressable accessibilityLabel="Dev panel" onPress={() => game.setDevOpen(true)} style={s.gear}>
        <Svg width={20} height={20} viewBox="0 0 8 8"><Path d={GEAR_D} fill="#4A3A5E" /></Svg>
      </Pressable>
      {game.needsName && <NameModal onDone={game.setName} />}
      {game.devOpen && pet && <DevPanel game={game} onClose={() => game.setDevOpen(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#DDD6F1', ...(Platform.OS === 'web' ? { minHeight: '100vh' as any, userSelect: 'none' as any } : null) },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  pill: { marginTop: 6, backgroundColor: '#FFF9F0', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#B9648F' },
  pillText: { fontSize: 15, fontWeight: '700', color: '#4A3A5E' },
  hatch: { marginTop: 10, backgroundColor: '#4A3A5E', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  hatchText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  gear: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF9F0',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#B9648F', zIndex: 5 },
  modalBackdrop: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(30,25,50,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 60 },
  modal: { width: 300, backgroundColor: '#FFF9F0', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#4A3A5E' },
  modalSub: { marginTop: 4, marginBottom: 12, color: '#6b5f80' },
  input: { width: '100%', borderWidth: 2, borderColor: '#B9648F', borderRadius: 12, padding: 10, fontSize: 18, textAlign: 'center', color: '#3b3250' },
  okBtn: { marginTop: 14, backgroundColor: '#B9648F', paddingHorizontal: 40, paddingVertical: 10, borderRadius: 16 },
  okText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
