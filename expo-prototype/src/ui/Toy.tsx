import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { allCellsPath, ICONS, ICON_LABELS, ICON_ORDER, litPath } from './pixel';
import { FEED_ROW_H, FEED_TOP, PLAY_ROWS, renderScreen } from './screens';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

export const COLORS = {
  shell: '#F4B9D2', shellLight: '#FAD3E4', shellDark: '#D98FB3', shellEdge: '#B9648F',
  bezel: '#4B5273', ink: '#2B3320', lcd: '#B5C19A', icon: '#4A3A5E',
};

const SPECKLES: [number, number, number, number][] = [
  [20, 56, 1.1, 0], [78, 60, 0.9, 1], [12, 92, 1.3, 1], [88, 98, 1.0, 0], [24, 150, 1.1, 1], [74, 148, 0.9, 0],
  [34, 20, 0.8, 1], [66, 18, 0.9, 0], [8, 120, 0.8, 0], [92, 126, 1.2, 1], [40, 154, 0.8, 0], [58, 10, 0.7, 1],
];
const EGG_PATH = 'M50 2 C 80 2, 99 52, 99 100 C 99 136, 76 158, 50 158 C 24 158, 1 136, 1 100 C 1 52, 20 2, 50 2 Z';

export function useTick(ms = 300) {
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);
  // Respect the system "reduce motion" setting: the pet holds one pose and the alert glyph stays lit.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      if (!q) return;
      setStill(q.matches);
      const on = (e: MediaQueryListEvent) => setStill(e.matches);
      q.addEventListener?.('change', on);
      return () => q.removeEventListener?.('change', on);
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms, still]);
  return still ? 0 : t;
}

function IconBitmap({ name, size, color }: { name: string; size: number; color: string }) {
  const d = useMemo(() => {
    let s = '';
    ICONS[name].forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'X') s += `M${x} ${y}h1v1h-1z`; });
    return s;
  }, [name]);
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8"><Path d={d} fill={color} /></Svg>
  );
}
export { IconBitmap };

function Lcd({ game, size, tick }: { game: Game; size: number; tick: number }) {
  const { pet } = game;
  const { buf, dark } = renderScreen({
    pet: pet!, tick, mode: game.mode, feedSel: game.feedSel, play: game.play,
    statsPage: game.statsPage, dexPage: game.dexPage, evo: game.evo,
  });
  const n = buf.n;
  const lit = useMemo(() => litPath(buf.px, n), [buf.px.join(''), n]); // eslint-disable-line react-hooks/exhaustive-deps
  const cells = useMemo(() => allCellsPath(n), [n]);
  const c = size / n;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.03, overflow: 'hidden', backgroundColor: COLORS.lcd }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill={COLORS.lcd} />
        <Path d={cells} fill={COLORS.ink} opacity={n > 32 ? 0.08 : 0.07} />
        <Path d={lit} fill={COLORS.ink} />
        {dark && <Rect x={0} y={0} width={n} height={n} fill="#0b0f06" opacity={0.55} />}
      </Svg>
      {game.mode === 'feed' && [0, 1, 2, 3, 4].map((i) => (
        <Pressable key={i} onPress={() => game.tapFeedRow(i)} style={{ position: 'absolute', left: 0, width: size, top: (FEED_TOP + i * FEED_ROW_H) * c, height: FEED_ROW_H * c }} />
      ))}
      {game.mode === 'play' && PLAY_ROWS.map((r, i) => (
        <Pressable key={i} onPress={() => game.tapPlayOption(i as 0 | 1)} style={{ position: 'absolute', left: 0, width: size, top: (r.y - 1) * c, height: (r.h + 2) * c }} />
      ))}
      {(game.mode === 'home' || game.mode === 'stats' || game.mode === 'dex') && (
        <Pressable onPress={game.tapScreen} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

function RoundButton({ label, size, onPress, color, dark }: { label: string; size: number; onPress: () => void; color: string; dark: string }) {
  const id = 'g' + label;
  return (
    <Pressable accessibilityLabel={`Button ${label}`} onPress={onPress} style={({ pressed }) => ({ width: size, height: size, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.9} />
            <Stop offset="0.35" stopColor={color} />
            <Stop offset="1" stopColor={dark} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={54} r={46} fill="#00000030" />
        <Circle cx={50} cy={50} r={46} fill={`url(#${id})`} stroke={dark} strokeWidth={3} />
      </Svg>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontWeight: '800', fontSize: size * 0.34, color: '#4A3A5E', opacity: 0.8 }}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Toy({ game, width }: { game: Game; width: number }) {
  const tick = useTick(300);
  const u = width / 100;
  const H = width * 1.6;
  const tile = 11.5 * u;
  const xs = [14, 31.5, 49, 66.5, 84]; // tile centres (units)
  const lcdSize = 66 * u;
  const hasPet = !!game.pet;

  const iconTile = (i: number, cx: number, cy: number) => {
    const selected = game.sel === i && game.mode === 'home';
    return (
      <Pressable key={i} accessibilityLabel={ICON_LABELS[i]} onPress={() => game.selectIcon(i)}
        style={{ position: 'absolute', left: cx * u - tile / 2, top: cy * u - tile / 2, width: tile, height: tile, borderRadius: tile * 0.22,
          alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? COLORS.icon : 'transparent' }}>
        <IconBitmap name={ICON_ORDER[i]} size={tile * 0.7} color={selected ? COLORS.shellLight : COLORS.icon} />
      </Pressable>
    );
  };

  return (
    <View style={{ width, height: H }}>
      <Svg width={width} height={H} viewBox="0 0 100 160" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={COLORS.shellLight} />
            <Stop offset="0.6" stopColor={COLORS.shell} />
            <Stop offset="1" stopColor={COLORS.shellDark} />
          </LinearGradient>
        </Defs>
        <Path d={EGG_PATH} fill="#00000022" transform="translate(0 1.6)" />
        <Path d={EGG_PATH} fill="url(#shell)" stroke={COLORS.shellEdge} strokeWidth={0.8} />
        <Path d="M50 6 C 76 6, 94 52, 94 100 C 94 132, 74 153, 50 153 C 26 153, 6 132, 6 100 C 6 52, 24 6, 50 6 Z"
          fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.5} />
        <Ellipse cx={30} cy={34} rx={9} ry={15} fill="#ffffff" opacity={0.25} transform="rotate(25 30 34)" />
        {SPECKLES.map(([x, y, r, k], i) => <Circle key={i} cx={x} cy={y} r={r} fill={k ? '#ffffff' : COLORS.shellDark} opacity={k ? 0.7 : 0.55} />)}
        <Circle cx={50} cy={6.5} r={2.6} fill="#ffffff" opacity={0.7} stroke={COLORS.shellEdge} strokeWidth={0.5} />
        {/* LCD bezel */}
        <Rect x={13} y={37} width={74} height={74} rx={7} fill={COLORS.bezel} stroke="#2f3550" strokeWidth={0.8} />
        <Rect x={14.2} y={38.2} width={71.6} height={71.6} rx={6} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.5} />
      </Svg>

      <Text style={{ position: 'absolute', left: 0, right: 0, top: 11.5 * u, textAlign: 'center', fontSize: 3.4 * u, fontWeight: '900',
        letterSpacing: 0.9 * u, color: '#6B2F50' }}>POCKET REXIE</Text>

      {hasPet && ICON_ORDER.slice(0, 5).map((_, i) => iconTile(i, xs[i], 26))}
      {hasPet && ICON_ORDER.slice(5).map((_, i) => iconTile(i + 5, xs[i], 120))}

      <View style={{ position: 'absolute', left: 17 * u, top: 41 * u }}>
        {hasPet && <Lcd game={game} size={lcdSize} tick={tick} />}
      </View>

      <View style={{ position: 'absolute', left: 30 * u - 6.5 * u, top: 133 * u - 6.5 * u }}>
        <RoundButton label="A" size={13 * u} onPress={game.pressA} color="#FFE08A" dark="#E0A93C" />
      </View>
      <View style={{ position: 'absolute', left: 50 * u - 6.5 * u, top: 140 * u - 6.5 * u }}>
        <RoundButton label="B" size={13 * u} onPress={game.pressB} color="#9FD8F2" dark="#4E9CCB" />
      </View>
      <View style={{ position: 'absolute', left: 70 * u - 6.5 * u, top: 133 * u - 6.5 * u }}>
        <RoundButton label="C" size={13 * u} onPress={game.pressC} color="#B7E6B2" dark="#5BAE6A" />
      </View>
    </View>
  );
}
