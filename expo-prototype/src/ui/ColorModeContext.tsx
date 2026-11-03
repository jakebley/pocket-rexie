import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_COLOR_MODE, loadColorMode, saveColorMode } from './colorModeStore';
import type { ColorMode } from './palette';

interface Value { mode: ColorMode; setMode: (m: ColorMode) => void }
const Ctx = createContext<Value>({ mode: DEFAULT_COLOR_MODE, setMode: () => {} });

/** Holds the Traditional / Technicolor choice: applies at once and is saved to AsyncStorage. */
export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadColorMode(AsyncStorage).then((m) => { if (alive) { setModeState(m); setReady(true); } });
    return () => { alive = false; };
  }, []);
  const setMode = useCallback((m: ColorMode) => { setModeState(m); saveColorMode(AsyncStorage, m); }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <Ctx.Provider value={value}>{ready ? children : null}</Ctx.Provider>;
}

export const useColorMode = () => useContext(Ctx);
