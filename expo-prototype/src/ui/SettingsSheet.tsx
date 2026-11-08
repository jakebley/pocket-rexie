import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorMode } from './ColorModeContext';
import { screenColors, type ColorMode } from './palette';
import { PixelButton, PixelText, touchStyle } from './PixelText';
import { FrameSvg } from './Toy';
import { previewFrame } from './render';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

const CHECK = ['.......', '......X', '.....XX', 'X...XX.', 'XX.XX..', '.XXX...', '..X....'];
const CHECK_D = CHECK.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

const LOOKS: { mode: ColorMode; label: string }[] = [
  { mode: 'traditional', label: 'TRADITIONAL' },
  { mode: 'technicolor', label: 'TECHNICOLOR' },
];

function LookTile({ mode, label, selected, size, species, onPress }: { mode: ColorMode; label: string; selected: boolean; size: number; species: string | null; onPress: () => void }) {
  const t = useTheme();
  const own = screenColors(mode, t.dark);
  const frame = useMemo(() => previewFrame(species, { mode, dark: t.dark }), [species, mode, t.dark]);
  const inner = size - 8;
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={`${label} look`} accessibilityState={{ selected }} onPress={onPress}
      style={[{ width: size, borderWidth: 2, borderColor: t.ink, padding: 2, backgroundColor: selected ? t.ink : 'transparent' }, touchStyle]}>
      <View pointerEvents="none">
        <View style={{ width: inner, height: inner, backgroundColor: own.ground }}>
          <FrameSvg frame={frame} size={inner} ground={own.ground} ink={own.ink} />
        </View>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {selected && (
            <Svg width={14} height={14} viewBox="0 0 7 7"><Path d={CHECK_D} fill={t.ground} /></Svg>
          )}
          <PixelText text={label} ps={selected ? 2 : 2} color={selected ? t.ground : t.ink} />
        </View>
      </View>
    </Pressable>
  );
}

function ToggleRow({ label, hint, on, onPress }: { label: string; hint: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onPress}
      style={({ pressed }) => [s.row, { borderColor: t.ink, backgroundColor: pressed ? t.ink : 'transparent' }, touchStyle]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={s.rowIn}>
          <View style={{ gap: 5, flexShrink: 1 }}>
            <PixelText text={label} ps={2.5} color={pressed ? t.ground : t.ink} />
            <PixelText text={hint} ps={1.5} color={pressed ? t.ground : t.ink} />
          </View>
          <View style={[s.pill, { borderColor: pressed ? t.ground : t.ink, backgroundColor: on && !pressed ? t.ink : 'transparent' }]}>
            <PixelText text={on ? 'ON' : 'OFF'} ps={2} color={on && !pressed ? t.ground : pressed ? t.ground : t.ink} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function Section({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 16, marginBottom: 8, gap: 5 }}>
      <PixelText text={title} ps={2.5} color={t.ink} />
      <View style={{ height: 2, backgroundColor: t.ink }} />
    </View>
  );
}

/** Settings sheet opened by the gear: Look (color mode), sound and game modes, and the developer tools. */
export function SettingsSheet({ game, onClose, onDev }: { game: Game; onClose: () => void; onDev: () => void }) {
  const t = useTheme();
  const { mode, setMode } = useColorMode();
  const { width: vw } = useWindowDimensions();
  const pet = game.pet;
  const cardW = Math.min(440, vw - 20);
  const tileW = Math.floor((cardW - 2 * 2 - 2 * 14 - 12) / 2);
  const species = pet && pet.stage !== 'egg' && pet.stage !== 'ghost' ? pet.species : null;
  return (
    <View style={[s.backdrop, { backgroundColor: t.scrim }]}>
      <View accessibilityLabel="Settings" style={[s.card, { backgroundColor: t.ground, borderColor: t.ink, width: cardW }]}>
        <View style={s.head}>
          <PixelText text="SETTINGS" ps={3} color={t.ink} />
          <PixelButton label="CLOSE" ps={2} onPress={onClose} style={{ minWidth: 88 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 6 }}>
          <Section title="LOOK" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {LOOKS.map((l) => (
              <LookTile key={l.mode} mode={l.mode} label={l.label} selected={mode === l.mode} size={tileW} species={species} onPress={() => setMode(l.mode)} />
            ))}
          </View>
          <Section title="PLAY" />
          <View style={{ gap: 8 }}>
            <ToggleRow label="SOUND" hint="BEEPS AND TUNES" on={!game.muted} onPress={game.dev.toggleMute} />
            {pet && <ToggleRow label="CLASSIC" hint="STRICT CARE, MORE MISTAKES" on={!pet.gentle} onPress={game.dev.toggleClassic} />}
            {pet && <ToggleRow label="VACATION" hint="PAUSE THE PET" on={pet.paused} onPress={game.dev.toggleVacation} />}
          </View>
          <Section title="PLUS" />
          <ToggleRow label="PREVIEW PLUS (TESTING)" hint="UNLOCK PLUS FAMILIES. NO PAYMENT" on={game.ent.previewPlus} onPress={() => game.setPreviewPlus(!game.ent.previewPlus)} />
          <Section title="MORE" />
          <PixelButton label="DEVELOPER TOOLS" ps={2.5} onPress={onDev} style={{ minHeight: 56 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', padding: 10, zIndex: 65 },
  card: { maxHeight: '100%', borderWidth: 2, padding: 14, flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { borderWidth: 2, minHeight: 60, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  rowIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { borderWidth: 2, minWidth: 64, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
