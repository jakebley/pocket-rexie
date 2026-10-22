import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, type GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { allCellsPath, ICONS, ICON_LABELS, ICON_ORDER, litPath } from './pixel';
import { FEED_ROW_H, FEED_TOP, PLAY_ROWS, renderScreen } from './screens';
import { initScene, step, type Scene } from './scene';
import { GROUND_Y, HEAD_Y } from './sceneDraw';
import { useTheme } from './theme';
import type { useGame } from './useGame';

type Game = ReturnType<typeof useGame>;

/** System "reduce motion" preference. */
export function useStill() {
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
  return still;
}

export function useTick(ms = 300) {
  const [t, setT] = useState(0);
  const still = useStill();
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

const isHidden = () => Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** The LCD owns its own 125 ms loop (director + painter), so only this component re-renders on animation frames. */
function Lcd({ game, size }: { game: Game; size: number }) {
  const th = useTheme();
  const still = useStill();
  const gameRef = useRef(game); gameRef.current = game;
  const stillRef = useRef(still); stillRef.current = still;
  const sceneRef = useRef<Scene | null>(null);
  const lastKey = useRef('');
  const [fr, setFr] = useState<{ lit: string; n: number; dark: boolean }>({ lit: '', n: 48, dark: false });

  const render = useCallback(() => {
    const g = gameRef.current;
    const pet = g.pet;
    if (!pet) return;
    const now = g.now();
    const env = g.sceneEnv.current;
    let sc = sceneRef.current;
    if (!sc || sc.seed !== pet.seed) sc = initScene(pet, now, env.hour ?? undefined);
    sc = step(sc, pet, { events: g.takeSceneEvents(), hour: env.hour ?? undefined, rain: env.rain }, now, { reducedMotion: stillRef.current });
    sceneRef.current = sc;
    const { buf, dark } = renderScreen({
      pet, tick: stillRef.current ? 0 : Math.floor(Date.now() / 300), mode: g.mode, feedSel: g.feedSel, play: g.play,
      statsPage: g.statsPage, dexPage: g.dexPage, evo: g.evo, scene: sc,
    });
    const lit = litPath(buf.px, buf.n);
    const key = `${buf.n}${dark ? 'd' : 'l'}${lit}`;
    if (key !== lastKey.current) { lastKey.current = key; setFr({ lit, n: buf.n, dark }); }
  }, []);

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => { if (isHidden() && n++ % 2 === 1) return; render(); }, 125); // 4 fps while hidden
    return () => clearInterval(id);
  }, [render]);
  useEffect(() => { render(); }, [render, still, game.mode, game.feedSel, game.statsPage, game.dexPage, game.play, game.evo, game.pet]);

  const n = fr.n;
  const cells = useMemo(() => allCellsPath(n), [n]);
  const c = size / n;

  const onTap = (e: GestureResponderEvent) => {
    if (game.mode !== 'home') { game.tapScreen(); return; }
    const ne: any = e.nativeEvent;
    let lx = ne.locationX, ly = ne.locationY;
    const r = (e.currentTarget as any)?.getBoundingClientRect?.();
    if (Platform.OS === 'web' && r && ne.clientX !== undefined) { lx = ne.clientX - r.left; ly = ne.clientY - r.top; }
    const cx = Math.max(0, Math.min(47, Math.floor((lx ?? 0) / c)));
    const cy = Math.max(0, Math.min(47, Math.floor((ly ?? 0) / c)));
    const sc = sceneRef.current;
    const px = sc ? Math.round(sc.x) : 8;
    const onPet = !!sc && cx >= px && cx <= px + 15 && cy >= HEAD_Y - 3 && cy <= GROUND_Y;
    game.tapScene(cx, cy, onPet);
  };

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', backgroundColor: th.ground }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill={th.ground} />
        <Path d={cells} fill={th.ink} opacity={n > 48 ? 0.08 : 0.07} />
        <Path d={fr.lit} fill={th.ink} />
      </Svg>
      {game.mode === 'feed' && [0, 1, 2, 3, 4].map((i) => (
        <Pressable key={i} onPress={() => game.tapFeedRow(i)} style={{ position: 'absolute', left: 0, width: size, top: (FEED_TOP + i * FEED_ROW_H) * c, height: FEED_ROW_H * c }} />
      ))}
      {game.mode === 'play' && PLAY_ROWS.map((r, i) => (
        <Pressable key={i} onPress={() => game.tapPlayOption(i as 0 | 1)} style={{ position: 'absolute', left: 0, width: size, top: (r.y - 1) * c, height: (r.h + 2) * c }} />
      ))}
      {(game.mode === 'home' || game.mode === 'stats' || game.mode === 'dex') && (
        <Pressable accessibilityLabel="Scene" onPress={onTap} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}


export const ICON_ROW_H = 48;

export function Toy({ game, width }: { game: Game; width: number }) {
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
        {hasPet && <Lcd game={game} size={width - 2} />}
      </View>
      {row(5)}
    </View>
  );
}
