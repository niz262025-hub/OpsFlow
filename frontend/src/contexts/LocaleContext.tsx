import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { workflowText } from '@/src/i18n/workflows';
import { storage } from '@/src/utils/storage';
import { DEFAULT_LOCALE, type LocaleCode, resolveLocale, getTranslation } from '@/src/i18n/translations';

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => Promise<void>;
  t: (key: string) => string;
  tx: (source: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const LOCALE_STORAGE_KEY = 'myops_locale';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  const changed = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await storage.getItem<string | null>(LOCALE_STORAGE_KEY, null);
      if (alive && !changed.current && saved) {
        setLocaleState(resolveLocale(saved));
      }
    })();
    return () => { alive = false; };
  }, []);

  const setLocale = async (next: LocaleCode) => {
    changed.current = true;
    setLocaleState(resolveLocale(next));
    await storage.setItem(LOCALE_STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string) => getTranslation(locale, key),
    tx: (source: string) => workflowText(locale, source),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
