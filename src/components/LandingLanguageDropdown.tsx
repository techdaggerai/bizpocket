'use client';

import { useState, useRef, useEffect } from 'react';
import { useLandingI18n, LANGUAGE_OPTIONS } from '@/lib/landing-i18n';

export default function LandingLanguageDropdown() {
  const { locale, setLocale } = useLandingI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGE_OPTIONS.find(l => l.code === locale) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-[#E5E5E5] px-2.5 py-1.5 text-[12px] font-medium text-[#666] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
        aria-label="Change language"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
        <span>{current.flag} {current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-[#E5E5E5] bg-white shadow-lg py-1 overflow-hidden">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-[#F3F4F6] transition-colors ${
                locale === lang.code ? 'text-[#4F46E5] font-semibold bg-[#EEF2FF]' : 'text-[#374151]'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && (
                <svg className="ml-auto h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
