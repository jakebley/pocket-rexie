import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { allCellsPath, ICONS, ICON_LABELS, ICON_ORDER, litPath } from './pixel';
import { FEED_ROW_H, FEED_TOP, PLAY_ROWS, renderScreen } from './screens';
import { PixelText } from './PixelText';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

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
  const th = useTheme();
  const { buf, dark } = renderScreen({
    pet: pet!, tick, mode: game.mode, feedSel: game.feedSel, play: game.play,
    statsPage: game.statsPage, dexPage: game.dexPage, evo: game.evo,
  });
  const n = buf.n;
  const lit = useMemo(() => litPath(buf.px, n), [buf.px.join(''), n]); // eslint-disable-line react-hooks/exhaustive-deps
  const cells = useMemo(() => allCellsPath(n), [n]);
  const c = size / n;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', backgroundColor: th.ground }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill={th.ground} />
        <Path d={cells} fill={th.ink} opacity={n > 32 ? 0.08 : 0.07} />
        <Path d={lit} fill={th.ink} opacity={dark && th.dark ? 0.2 : 1} />
        {dark && !th.dark && <Rect x={0} y={0} width={n} height={n} fill="#0b0f06" opacity={0.55} />}
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


export const ICON_ROW_H = 48;

export function Toy({ game, width }: { game: Game; width: number }) {
  const tick = useTick(300);
  const th = useTheme();
  const hasPet = !!game.pet;
  const tileW = width / 5;

  const row = (from: number) => (
    <View style={{ width, height: ICON_ROW_H, flexDirection: 'row' }}>
      {hasPet && ICON_ORDER.slice(from, from + 5).map((name, k) => {
        const i = from + k;
        const selected = game.sel === i && game.mode === 'home';
        return (
          <Pressable key={name} accessibilityLabel={ICON_LABELS[i]} onPress={() => game.selectIcon(i)}
            style={{ width: tileW, height: ICON_ROW_H, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: ICON_ROW_H - 6, height: ICON_ROW_H - 6, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? th.ink : 'transparent' }}>
              <IconBitmap name={name} size={ICON_ROW_H - 20} color={selected ? th.ground : th.ink} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={{ width }}>
      {row(0)}
      <View style={{ width, height: width, borderWidth: 1, borderColor: th.ink }}>
        {hasPet && <Lcd game={game} size={width - 2} tick={tick} />}
      </View>
      {row(5)}
    </View>
  );
}
