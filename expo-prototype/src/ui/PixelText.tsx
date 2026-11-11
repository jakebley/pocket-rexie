import React, { useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Look } from './pixel';
import { density, fitLinesD, fontPx, textWidthD } from './density';
import { CRISP, PixelPressable, snapPx } from './PixelBox';
import { useTheme } from './theme';

/** Text drawn with the look's pixel font (density.ts; 3x5 Traditional, 5x7 Technicolor). `ps` = size of one font pixel in 3x5-font points (scaled by the look's textScale); `exact` skips the whole-device-pixel snap (the caller already did it). */
export function PixelText({ text, ps = 2, color, exact }: { text: string; ps?: number; color: string; exact?: boolean }) {
  const { mode } = useTheme();
  const dn = density(mode);
  const font = dn.font;
  const d = useMemo(() => {
    let out = '';
    let x = 0;
    for (const ch of text.toUpperCase()) {
      const g = font.glyphs[ch] ?? font.glyphs['?'];
      for (let y = 0; y < font.h; y++) for (let gx = 0; gx < font.w; gx++) if (g[y][gx] === 'X') out += `M${x + gx} ${y}h1v1h-1z`;
      x += font.adv;
    }
    return out;
  }, [text, font]);
  const w = Math.max(1, textWidthD(dn, text));
  const px = dn.chrome === 'pixel' ? (exact ? fontPx(dn, ps) : snapPx(fontPx(dn, ps))) : ps;
  const svg = (
    <Svg width={w * px} height={font.h * px} viewBox={`0 0 ${w} ${font.h}`}>
      <Path d={d} fill={color} {...(dn.chrome === 'pixel' ? CRISP : null)} />
    </Svg>
  );
  // a positioned wrapper so the text paints above a pixel box drawn behind it (an unpositioned svg would sit under the absolute box layer)
  return dn.chrome === 'pixel' ? <View>{svg}</View> : svg;
}

/** Wrap a message into at most two lines that fit `avail` points; returns lines and pixel size (callers' ps units). Pass the look so the right font metrics are used. */
export function fitLines(text: string, avail: number, maxPs = 3, minPs = 2, look: Look = 'traditional'): { lines: string[]; ps: number } {
  const dn = density(look);
  return fitLinesD(dn, text, avail, maxPs, minPs, dn.chrome === 'pixel' ? (v) => snapPx(v, 'down') : undefined, dn.chrome === 'pixel' ? snapPx(0, 'down') : 0);
}

const WEB_TOUCH: object = Platform.OS === 'web'
  ? { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none', cursor: 'pointer' }
  : {};
/** Style bits every touch target gets on web: no double-tap zoom, no grey tap flash, no text selection. */
export const touchStyle = WEB_TOUCH as ViewStyle;

/**
 * Button: flat ink-outlined (Traditional) or pixel-drawn with stepped corners and a bevel (Technicolor); pressed (or `on`) state inverts the moment the finger lands.
 * `instant` fires onPress on press-in (A/B/C feel like toy buttons); otherwise it fires on release. `big` is the A / B / C button shape.
 */
export function PixelButton({ label, onPress, on, ps = 2, style, accessibilityLabel, instant, big }: {
  label: string; onPress: () => void; on?: boolean; ps?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; instant?: boolean; big?: boolean;
}) {
  const t = useTheme();
  const dn = density(t.mode);
  const fired = useRef(false);
  // instant buttons act on finger-down; onPress is only a fallback for taps so quick (or synthetic) that press-in never reported
  const down = () => { fired.current = true; onPress(); };
  const up = () => { if (!fired.current) onPress(); fired.current = false; };
  const common = { accessibilityRole: 'button' as const, accessibilityLabel: accessibilityLabel ?? label, hitSlop: 6, onPressIn: instant ? down : undefined, onPress: instant ? up : onPress };
  if (dn.chrome === 'pixel') {
    return (
      <PixelPressable {...common} kind={(pressed) => (pressed || on ? 'down' : 'raised')} radius={big ? dn.cornerBig : dn.corner}
        style={[{ alignItems: 'center', justifyContent: 'center', minHeight: dn.btnMinH, paddingHorizontal: 14, paddingVertical: 8 }, touchStyle, style]}>
        {({ pressed }) => (
          <View pointerEvents="none" style={{ alignItems: 'center' }}>
            <PixelText text={label} ps={ps} color={pressed || on ? t.ground : t.ink} />
          </View>
        )}
      </PixelPressable>
    );
  }
  return (
    <Pressable {...common}
      style={({ pressed }) => [{ borderWidth: dn.border, borderColor: t.ink, backgroundColor: pressed || on ? t.ink : 'transparent',
        alignItems: 'center', justifyContent: 'center', minHeight: dn.btnMinH, paddingHorizontal: 12, paddingVertical: 8 }, touchStyle, style]}>
      {({ pressed }) => (
        <View pointerEvents="none" style={StyleSheet.flatten({ alignItems: 'center' })}>
          <PixelText text={label} ps={ps} color={pressed || on ? t.ground : t.ink} />
        </View>
      )}
    </Pressable>
  );
}
