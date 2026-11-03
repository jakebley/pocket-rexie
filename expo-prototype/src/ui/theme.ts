import { useColorScheme } from 'react-native';
import { useColorMode } from './ColorModeContext';
import { screenColors, type ColorMode } from './palette';

export type Theme = { ground: string; ink: string; dark: boolean; mode: ColorMode; /** translucent ground for modal backdrops */ scrim: string };

export function themeFor(mode: ColorMode, dark: boolean): Theme {
  const { ground, ink } = screenColors(mode, dark);
  const r = parseInt(ground.slice(1, 3), 16), g = parseInt(ground.slice(3, 5), 16), b = parseInt(ground.slice(5, 7), 16);
  return { ground, ink, dark, mode, scrim: `rgba(${r},${g},${b},0.9)` };
}

/** The whole screen is the LCD. Traditional: light = classic green LCD, dark = backlit LCD (colours swap). Technicolor: muted colour in both. */
export function useTheme(): Theme {
  const { mode } = useColorMode();
  return themeFor(mode, useColorScheme() === 'dark');
}
