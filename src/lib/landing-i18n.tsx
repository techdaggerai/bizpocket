'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

import en from '@/locales/landing/en.json';
import ja from '@/locales/landing/ja.json';
import zh from '@/locales/landing/zh.json';
import vi from '@/locales/landing/vi.json';
import fil from '@/locales/landing/fil.json';
import ptBR from '@/locales/landing/pt-BR.json';
import es from '@/locales/landing/es.json';

export type LandingLocale = 'en' | 'ja' | 'zh' | 'vi' | 'fil' | 'pt-BR' | 'es';

type Messages = Record<string, string>;

const LOCALES: Record<LandingLocale, Messages> = {
  en, ja, zh, vi, fil, 'pt-BR': ptBR, es,
};

export const LANGUAGE_OPTIONS: { code: LandingLocale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const STORAGE_KEY = 'landing_locale';

function detectBrowserLocale(): LandingLocale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language?.toLowerCase() || '';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('vi')) return 'vi';
  if (lang.startsWith('fil') || lang.startsWith('tl')) return 'fil';
  if (lang.startsWith('pt')) return 'pt-BR';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

interface LandingI18nContextValue {
  locale: LandingLocale;
  setLocale: (l: LandingLocale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LandingI18nContext = createContext<LandingI18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LandingLocale | null;
    const initial = saved && LOCALES[saved] ? saved : detectBrowserLocale();
    setLocaleState(initial);
  }, []);

  const setLocale = useCallback((l: LandingLocale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string>): string => {
    let text = LOCALES[locale]?.[key] || LOCALES.en[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  }, [locale]);

  return (
    <LandingI18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LandingI18nContext.Provider>
  );
}

export function useLandingI18n() {
  return useContext(LandingI18nContext);
}
