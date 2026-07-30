import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { storage } from '@/src/utils/storage';
import { lightTheme, darkTheme, Theme } from '@/src/constants/theme';

type Mode = 'light' | 'dark' | 'system';

interface Ctx {
  theme: Theme;
  mode: Mode;
  setMode: (m: Mode) => Promise<void>;
}

const ThemeContext = createContext<Ctx | undefined>(undefined);
const KEY = 'bizflow_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('light');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<Mode>(KEY, 'light');
      if (saved) setModeState(saved as Mode);
    })();
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const setMode = async (m: Mode) => {
    setModeState(m);
    await storage.setItem(KEY, m);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={{ theme, mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
