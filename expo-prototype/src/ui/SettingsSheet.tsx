import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorMode } from './ColorModeContext';
import { screenColors, type ColorMode } from './palette';
import { fitLines, PixelButton, PixelText, touchStyle } from './PixelText';
import { CRISP, PixelPanel, PixelPressable } from './PixelBox';
import { density } from './density';
import { FrameSvg } from './Toy';
import { previewFrame } from './render';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

const pathOf = (rows: string[]) => rows.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

const LOOKS: { mode: ColorMode; label: string }[] = [
  { mode: 'traditional', label: 'TRADITIONAL' },
  { mode: 'technicolor', label: 'TECHNICOLOR' },
];

function LookTile({ mode, label, selected, size, species, onPress }: { mode: ColorMode; label: string; selected: boolean; size: number; species: string | null; onPress: () => void }) {
  const t = useTheme();
  const dn = density(t.mode);
  const fine = dn.chrome === 'pixel';
  const own = screenColors(mode, t.dark);
  const frame = useMemo(() => previewFrame(species, { mode, dark: t.dark }), [species, mode, t.dark]);
  const pad = fine ? 6 : 2;
  const inner = size - (fine ? 12 : 8);
  const tick = dn.glyphs.tick;
  const tickPx = fine ? 16 : 14;
  return (
    <PixelPressable accessibilityRole="radio" accessibilityLabel={`${label} look`} accessibilityState={{ selected }} onPress={onPress}
      kind={() => (selected ? 'down' : 'raised')}
      flatStyle={() => ({ borderWidth: 2, borderColor: t.ink, backgroundColor: selected ? t.ink : 'transparent' })}
      style={[{ width: size, padding: pad }, touchStyle]}>
      {() => (
        <View pointerEvents="none">
          <View style={{ width: inner, height: inner, backgroundColor: own.ground }}>
            <FrameSvg frame={frame} size={inner} ground={own.ground} ink={own.ink} />
          </View>
          <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {selected && (
              <Svg width={tickPx} height={tickPx} viewBox={`0 0 ${tick.size} ${tick.size}`}><Path d={pathOf(tick.rows)} fill={t.ground} {...(fine ? CRISP : null)} /></Svg>
            )}
            <PixelText text={label} ps={2} color={selected ? t.ground : t.ink} />
          </View>
        </View>
      )}
    </PixelPressable>
  );
}

function ToggleRow({ label, hint, on, onPress, avail }: { label: string; hint: string; on: boolean; onPress: () => void; avail: number }) {
  const t = useTheme();
  const fine = density(t.mode).chrome === 'pixel';
  // Technicolor: the hint wraps / shrinks to the room left of the ON / OFF pill instead of running under it
  const hf = fine ? fitLines(hint, avail, 1.5, 1, t.mode) : null;
  return (
    <PixelPressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onPress}
      kind={(pressed) => (pressed ? 'down' : 'raised')}
      flatStyle={(pressed) => ({ borderWidth: 2, borderColor: t.ink, backgroundColor: pressed ? t.ink : 'transparent' })}
      style={[s.rowBase, fine && { paddingHorizontal: 14 }, touchStyle]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={s.rowIn}>
          <View style={{ gap: 5, flexShrink: 1 }}>
            <PixelText text={label} ps={2.5} color={pressed ? t.ground : t.ink} />
            {hf ? hf.lines.map((l) => <PixelText key={l} text={l} ps={hf.ps} color={pressed ? t.ground : t.ink} />) : <PixelText text={hint} ps={1.5} color={pressed ? t.ground : t.ink} />}
          </View>
          <PixelPanel kind={on && !pressed ? 'down' : 'inset'} radius={2}
            flatStyle={{ borderWidth: 2, borderColor: pressed ? t.ground : t.ink, backgroundColor: on && !pressed ? t.ink : 'transparent' }} style={s.pillBase}>
            <PixelText text={on ? 'ON' : 'OFF'} ps={2} color={on && !pressed ? t.ground : pressed ? t.ground : t.ink} />
          </PixelPanel>
        </View>
      )}
    </PixelPressable>
  );
}

function Section({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 16, marginBottom: 8, gap: 5 }}>
      <PixelText text={title} ps={2.5} color={t.ink} />
      <View style={{ height: density(t.mode).chrome === 'pixel' ? 1.5 : 2, backgroundColor: t.ink }} />
    </View>
  );
}

/** Settings sheet opened by the gear: Look (color mode), sound and game modes, and the developer tools. */
export function SettingsSheet({ game, onClose, onDev }: { game: Game; onClose: () => void; onDev: () => void }) {
  const t = useTheme();
  const { mode, setMode } = useColorMode();
  const { width: vw } = useWindowDimensions();
  const pet = game.pet;
  const dn = density(t.mode);
  const cardW = Math.min(440, vw - 20);
  const tileW = Math.floor((cardW - (dn.chrome === 'pixel' ? 2 * 18 + 6 : 2 * 2 + 2 * 14) - 12) / 2);
  const species = pet && pet.stage !== 'egg' && pet.stage !== 'ghost' ? pet.species : null;
  return (
    <View style={[s.backdrop, { backgroundColor: t.scrim }]}>
      <PixelPanel accessibilityLabel="Settings" kind="raised" radius={dn.cornerBig} flatStyle={[s.card, { backgroundColor: t.ground, borderColor: t.ink }]}
        style={[{ width: cardW, maxHeight: '100%', flexShrink: 1 }, dn.chrome === 'pixel' && { padding: 18 }]}>
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
            <ToggleRow avail={cardW - 36 - 28 - 64 - 24} label="SOUND" hint="BEEPS AND TUNES" on={!game.muted} onPress={game.dev.toggleMute} />
            {pet && <ToggleRow avail={cardW - 36 - 28 - 64 - 24} label="CLASSIC" hint="STRICT CARE, MORE MISTAKES" on={!pet.gentle} onPress={game.dev.toggleClassic} />}
            {pet && <ToggleRow avail={cardW - 36 - 28 - 64 - 24} label="VACATION" hint="PAUSE THE PET" on={pet.paused} onPress={game.dev.toggleVacation} />}
          </View>
          <Section title="PLUS" />
          <ToggleRow avail={cardW - 36 - 28 - 64 - 24} label="PREVIEW PLUS (TESTING)" hint="UNLOCK PLUS FAMILIES. NO PAYMENT" on={game.ent.previewPlus} onPress={() => game.setPreviewPlus(!game.ent.previewPlus)} />
          <Section title="MORE" />
          <PixelButton label="DEVELOPER TOOLS" ps={2.5} onPress={onDev} style={{ minHeight: 56 }} />
        </ScrollView>
      </PixelPanel>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', padding: 10, zIndex: 65 },
  card: { maxHeight: '100%', borderWidth: 2, padding: 14, flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBase: { minHeight: 60, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  rowIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pillBase: { minWidth: 64, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
