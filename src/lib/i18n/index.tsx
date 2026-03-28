'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import ur from '@/locales/ur.json';

export type Language = 'en' | 'ja' | 'ur';

const translations: Record<Language, typeof en> = { en, ja, ur };

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

export function I18nProvider({
  initialLang = 'en',
  children,
}: {
  initialLang?: Language;
  children: ReactNode;
}) {
  const [lang, setLangInternal] = useState<Language>(initialLang);
  const isRTL = lang === 'ur';

  function setLang(newLang: Language) {
    setLangInternal(newLang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    }
  }

  const currentTranslations = translations[lang];

  function t(key: string): string {
    return resolve(currentTranslations as unknown as Record<string, unknown>, key);
  }

  const value = useMemo(() => ({ lang, setLang, t, isRTL }), [lang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
