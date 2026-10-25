import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkColors, lightColors, type ColorTokens } from './colors';
import {
  createShadows,
  fonts,
  layout,
  radius,
  spacing,
  typography,
  type ShadowTokens
} from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'expense-counter:theme-mode';

interface ThemeValue {
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  typography: typeof typography;
  fonts: typeof fonts;
  shadows: ShadowTokens;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  statusBarStyle: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (!active) return;
      if (stored === 'system' || stored === 'light' || stored === 'dark') {
        setModeState(stored);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const value = useMemo<ThemeValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      colors,
      spacing,
      radius,
      layout,
      typography,
      fonts,
      shadows: createShadows(colors, isDark),
      isDark,
      mode,
      setMode,
      statusBarStyle: isDark ? 'light' : 'dark'
    };
  }, [isDark, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
