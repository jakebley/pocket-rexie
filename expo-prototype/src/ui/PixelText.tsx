import React, { useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
  if (text.includes('\n')) {
    const lines = text.split('\n').slice(0, 2);
    const widest = Math.max(...lines.map((l) => textWidth(l)));
    return { lines, ps: Math.max(1, Math.min(maxPs, avail / widest)) };
  }
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

const WEB_TOUCH: object = Platform.OS === 'web'
  ? { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none', cursor: 'pointer' }
  : {};
/** Style bits every touch target gets on web: no double-tap zoom, no grey tap flash, no text selection. */
export const touchStyle = WEB_TOUCH as ViewStyle;

/**
 * Flat ink-outlined button; pressed (or `on`) state inverts the moment the finger lands.
 * `instant` fires onPress on press-in (A/B/C feel like toy buttons); otherwise it fires on release.
 */
export function PixelButton({ label, onPress, on, ps = 2, style, accessibilityLabel, instant }: {
  label: string; onPress: () => void; on?: boolean; ps?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; instant?: boolean;
}) {
  const t = useTheme();
  const fired = useRef(false);
  // instant buttons act on finger-down; onPress is only a fallback for taps so quick (or synthetic) that press-in never reported
  const down = () => { fired.current = true; onPress(); };
  const up = () => { if (!fired.current) onPress(); fired.current = false; };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={6}
      onPressIn={instant ? down : undefined} onPress={instant ? up : onPress}
      style={({ pressed }) => [{ borderWidth: 2, borderColor: t.ink, backgroundColor: pressed || on ? t.ink : 'transparent',
        alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, paddingVertical: 8 }, touchStyle, style]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={StyleSheet.flatten({ alignItems: 'center' })}>
          <PixelText text={label} ps={ps} color={pressed || on ? t.ground : t.ink} />
        </View>
      )}
    </Pressable>
  );
}
