import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { DEFAULT_LOCALE, type LocaleCode, resolveLocale, getTranslation } from '@/src/i18n/translations';

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => Promise<void>;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const LOCALE_STORAGE_KEY = 'bizflow_locale';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string | null>(LOCALE_STORAGE_KEY, null);
      if (saved) {
        setLocaleState(resolveLocale(saved));
      }
    })();
  }, []);

  const setLocale = async (next: LocaleCode) => {
    setLocaleState(next);
    await storage.setItem(LOCALE_STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string) => getTranslation(locale, key),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
