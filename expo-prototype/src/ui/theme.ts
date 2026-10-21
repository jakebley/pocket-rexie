import { useColorScheme } from 'react-native';

export type Theme = { ground: string; ink: string; dark: boolean };
const LIGHT: Theme = { ground: '#B5C19A', ink: '#2B3320', dark: false };
const DARK: Theme = { ground: '#1E2418', ink: '#B5C19A', dark: true };

/** The whole screen is the LCD: light = classic green LCD, dark = backlit LCD (colours swap). */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
