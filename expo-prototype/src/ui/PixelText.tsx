import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONT, textWidth } from './pixel';
import { useTheme } from './theme';

/** Text drawn with the 3x5 LCD font. `ps` = size of one font pixel in points. */
export function PixelText({ text, ps = 2, color }: { text: string; ps?: number; color: string }) {
  const d = useMemo(() => {
    let out = '';
    let x = 0;
    for (const ch of text.toUpperCase()) {
      const g = FONT[ch] ?? FONT['?'];
      for (let y = 0; y < 5; y++) for (let gx = 0; gx < 3; gx++) if (g[y][gx] === 'X') out += `M${x + gx} ${y}h1v1h-1z`;
      x += 4;
    }
    return out;
  }, [text]);
  const w = Math.max(1, text.length * 4 - 1);
  return (
    <Svg width={w * ps} height={5 * ps} viewBox={`0 0 ${w} 5`}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

/** Wrap a message into at most two lines that fit `avail` points; returns lines and pixel size. */
export function fitLines(text: string, avail: number, maxPs = 3, minPs = 2): { lines: string[]; ps: number } {
  const one = Math.min(maxPs, avail / textWidth(text));
  if (one >= minPs || text.length < 2) return { lines: [text], ps: Math.max(1, one) };
  const per = Math.max(1, Math.floor((avail / minPs + 1) / 4));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > per) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  const widest = Math.max(...lines.map((l) => textWidth(l)));
  return { lines: lines.slice(0, 2), ps: Math.max(1, Math.min(minPs, avail / widest)) };
}

/** Flat ink-outlined button; pressed (or `on`) state is inverted. */
export function PixelButton({ label, onPress, on, ps = 2, style, accessibilityLabel }: {
  label: string; onPress: () => void; on?: boolean; ps?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress}
      style={({ pressed }) => [{ borderWidth: 2, borderColor: t.ink, backgroundColor: pressed || on ? t.ink : 'transparent',
        alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 }, style]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={StyleSheet.flatten({ alignItems: 'center' })}>
          <PixelText text={label} ps={ps} color={pressed || on ? t.ground : t.ink} />
        </View>
      )}
    </Pressable>
  );
}
