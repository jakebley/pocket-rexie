import React, { useCallback, useMemo, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, View, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { boxColors, boxPaths, cellsFor, type BoxStyle } from './chrome96';
import { density } from './density';
import { useTheme } from './theme';

/** crisp pixel edges where the renderer honours it (web SVG) */
export const CRISP = { shapeRendering: 'crispEdges' } as object;

/** Device pixel ratio (1 where unknown). */
export const dpr = () => Math.max(1, PixelRatio.get() || 1);
/** Smallest font pixel / chrome cell worth drawing, in points (1.15 pt is 2 device pixels at 1x, 3 at 2x, 4 at 3x). */
const MIN_CELL = 1.15;
/** Snap a size to whole device pixels: `up` rounds like a ceiling with a little slack (0.35), `down` floors (used to guarantee that text fits). */
export const snapPx = (v: number, dir: 'near' | 'down' = 'near', minPt = MIN_CELL) => {
  const r = dpr();
  const min = Math.ceil(minPt * r);
  const dev = dir === 'down' ? Math.floor(v * r + 1e-6) : Math.ceil(v * r - 0.35);
  return Math.max(min, dev) / r;
};
/** Points per chrome cell of a look, snapped to whole device pixels. */
export const cellPx = (cp: number) => snapPx(cp);

/** Size of a laid-out view (0 until the first layout). */
export function useBoxSize(): [{ w: number; h: number }, (e: LayoutChangeEvent) => void] {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSz((p) => (Math.abs(p.w - width) < 0.01 && Math.abs(p.h - height) < 0.01 ? p : { w: width, h: height }));
  }, []);
  return [sz, onLayout];
}

/** The pixel-drawn box behind a view: stepped rounded corners, 1-cell ink border and (for raised / inset / down) a 1-cell inner highlight and shadow. */
export function PixelBg({ w, h, kind, radius }: { w: number; h: number; kind: BoxStyle; radius: number }) {
  const t = useTheme();
  const dn = density(t.mode);
  const cell = cellPx(dn.cp);
  const wc = cellsFor(w, cell), hc = cellsFor(h, cell);
  const paths = useMemo(() => boxPaths(wc, hc, radius, boxColors(kind, t.ground, t.ink, t.dark)), [wc, hc, radius, kind, t.ground, t.ink, t.dark]);
  if (w <= 0 || h <= 0) return null;
  return (
    <Svg pointerEvents="none" width={w} height={h} viewBox={`0 0 ${wc} ${hc}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {paths.map((p) => <Path key={p.color} d={p.d} fill={p.color} {...CRISP} />)}
    </Svg>
  );
}

/**
 * A rectangle that is a CSS-bordered View in Traditional (`flatStyle`, exactly as before) and a pixel-drawn box in Technicolor (`kind`, `radius` in cells).
 * `style` is layout (size, padding, margin) for both.
 */
export function PixelPanel({ kind, radius, flatStyle, style, children, ...rest }: {
  kind: BoxStyle; radius?: number; flatStyle?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle>; children?: React.ReactNode; accessibilityLabel?: string; pointerEvents?: 'none' | 'auto';
}) {
  const t = useTheme();
  const dn = density(t.mode);
  const [sz, onLayout] = useBoxSize();
  if (dn.chrome === 'flat') return <View {...rest} style={[flatStyle, style]}>{children}</View>;
  return (
    <View {...rest} onLayout={onLayout} style={style}>
      <PixelBg w={sz.w} h={sz.h} kind={kind} radius={radius ?? dn.corner} />
      {children}
    </View>
  );
}

type PressRender = (s: { pressed: boolean }) => React.ReactNode;
/** Same split for a Pressable: `flatStyle(pressed)` for Traditional, `kind(pressed)` for the Technicolor box (null: no box, the children draw everything). */
export function PixelPressable({ kind, radius, flatStyle, style, children, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  kind: (pressed: boolean) => BoxStyle | null; radius?: number; flatStyle?: (pressed: boolean) => ViewStyle; style?: StyleProp<ViewStyle>; children: PressRender;
}) {
  const t = useTheme();
  const dn = density(t.mode);
  const [sz, onLayout] = useBoxSize();
  const flat = dn.chrome === 'flat';
  return (
    <Pressable {...rest} onLayout={flat ? rest.onLayout : onLayout}
      style={({ pressed }) => [flat ? flatStyle?.(pressed) : null, style]}>
      {({ pressed }) => {
        const k = flat ? null : kind(pressed);
        return (
          <>
            {k && <PixelBg w={sz.w} h={sz.h} kind={k} radius={radius ?? dn.corner} />}
            {children({ pressed })}
          </>
        );
      }}
    </Pressable>
  );
}
