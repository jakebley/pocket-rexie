import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { familyUnlocked } from '../core/entitlements';
import { BABIES, FAMILIES, SPECIES } from '../core/speciesData';
import { PixelButton, PixelText, touchStyle } from './PixelText';
import { CRISP, PixelPanel, PixelPressable } from './PixelBox';
import { density } from './density';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

const pathOf = (rows: string[]) => rows.map((r, y) => [...r].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : '')).join('')).join('');

/** The first hatchling of a family, as a little preview next to its name. */
function Hatchling({ family, size, color }: { family: string; size: number; color: string }) {
  const d = useMemo(() => {
    const id = BABIES.find((b) => SPECIES.find((s) => s.id === b)?.family === family);
    const sp = SPECIES.find((s) => s.id === id);
    return sp ? pathOf(sp.frames[0]) : '';
  }, [family]);
  return <Svg width={size} height={size} viewBox="0 0 16 16"><Path d={d} fill={color} /></Svg>;
}

/** 'Choose your egg': every family is listed; free ones are selectable, Plus ones are locked until the entitlement (or the testing preview in Settings) is on. No payments. */
export function ChooseEgg({ game }: { game: Game }) {
  const t = useTheme();
  const dn = density(t.mode);
  const fine = dn.chrome === 'pixel';
  const lock = dn.glyphs.lock;
  const lockD = pathOf(lock.rows);
  const { width: vw } = useWindowDimensions();
  const cardW = Math.min(440, vw - 20);
  return (
    <View style={[s.backdrop, { backgroundColor: t.scrim }]}>
      <PixelPanel accessibilityLabel="Choose your egg" kind="raised" radius={dn.cornerBig} flatStyle={[s.card, { backgroundColor: t.ground, borderColor: t.ink }]}
        style={[{ width: cardW, maxHeight: '100%', flexShrink: 1 }, fine && { padding: 18 }]}>
        <PixelText text="CHOOSE YOUR EGG" ps={3} color={t.ink} />
        <View style={{ height: 10 }} />
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
          {FAMILIES.map((f) => {
            const open = familyUnlocked(f, game.ent);
            return (
              <PixelPressable key={f.id} accessibilityRole="button" accessibilityLabel={`${f.name} egg${open ? '' : ', locked, needs Plus'}`}
                accessibilityState={{ disabled: !open }} onPress={() => game.chooseEgg(f.id)}
                kind={(pressed) => (pressed && open ? 'down' : 'raised')}
                flatStyle={(pressed) => ({ borderWidth: 2, borderColor: t.ink, backgroundColor: pressed && open ? t.ink : 'transparent' })}
                style={[s.rowBase, { opacity: open ? 1 : 0.55 }, touchStyle]}>
                {({ pressed }) => {
                  const fg = pressed && open ? t.ground : t.ink;
                  return (
                    <View pointerEvents="none" style={s.rowIn}>
                      <Hatchling family={f.id} size={40} color={fg} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <PixelText text={f.name.toUpperCase()} ps={3} color={fg} />
                        <PixelText text={open ? (f.isFree ? 'FREE' : 'PLUS') : 'LOCKED - NEEDS PLUS'} ps={1.5} color={fg} />
                      </View>
                      {!open && <Svg width={fine ? 24 : 20} height={fine ? 24 : 20} viewBox={`0 0 ${lock.size} ${lock.size}`}><Path d={lockD} fill={fg} {...(fine ? CRISP : null)} /></Svg>}
                    </View>
                  );
                }}
              </PixelPressable>
            );
          })}
        </ScrollView>
        {game.canCancelEgg && <PixelButton label="BACK" ps={2} onPress={game.cancelChooseEgg} style={{ marginTop: 8 }} />}
      </PixelPanel>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', padding: 10, zIndex: 70 },
  card: { maxHeight: '100%', borderWidth: 2, padding: 14, flexShrink: 1 },
  rowBase: { minHeight: 64, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  rowIn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
