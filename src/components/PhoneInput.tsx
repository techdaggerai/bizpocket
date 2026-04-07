'use client';

import { useState, useRef, useEffect } from 'react';

const COUNTRY_CODES = [
  { code: '+81', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', iso: 'JP' },
  { code: '+92', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan', iso: 'PK' },
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', iso: 'IN' },
  { code: '+880', flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladesh', iso: 'BD' },
  { code: '+977', flag: '\u{1F1F3}\u{1F1F5}', name: 'Nepal', iso: 'NP' },
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', iso: 'US' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', iso: 'GB' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE', iso: 'AE' },
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia', iso: 'SA' },
  { code: '+63', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines', iso: 'PH' },
  { code: '+84', flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnam', iso: 'VN' },
  { code: '+90', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey', iso: 'TR' },
  { code: '+86', flag: '\u{1F1E8}\u{1F1F3}', name: 'China', iso: 'CN' },
  { code: '+82', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', iso: 'KR' },
  { code: '+66', flag: '\u{1F1F9}\u{1F1ED}', name: 'Thailand', iso: 'TH' },
  { code: '+62', flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesia', iso: 'ID' },
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', iso: 'BR' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', name: 'France', iso: 'FR' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', iso: 'DE' },
  { code: '+31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands', iso: 'NL' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', iso: 'ES' },
  { code: '+93', flag: '\u{1F1E6}\u{1F1EB}', name: 'Afghanistan', iso: 'AF' },
  { code: '+98', flag: '\u{1F1EE}\u{1F1F7}', name: 'Iran', iso: 'IR' },
  { code: '+94', flag: '\u{1F1F1}\u{1F1F0}', name: 'Sri Lanka', iso: 'LK' },
  { code: '+234', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria', iso: 'NG' },
];

interface PhoneInputProps {
  onSubmit: (fullPhone: string) => void;
  loading?: boolean;
  buttonText?: string;
  dark?: boolean;
}

export default function PhoneInput({ onSubmit, loading, buttonText = 'Send Code \u2192', dark = true }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState('+81');
  const [phone, setPhone] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect country from locale
  useEffect(() => {
    try {
      const locale = navigator.language || '';
      const region = locale.split('-')[1]?.toUpperCase();
      if (region) {
        const match = COUNTRY_CODES.find(c => c.iso === region);
        if (match) setCountryCode(match.code);
      }
    } catch { /* ignore */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  function handlePhoneChange(val: string) {
    // Strip non-digits, then auto-format with spaces
    const digits = val.replace(/\D/g, '').slice(0, 15);
    setPhone(digits);
  }

  function formatDisplay(digits: string): string {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  function handleSubmit() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return;
    onSubmit(`${countryCode}${digits}`);
  }

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];
  const bg = dark ? 'bg-slate-800' : 'bg-[var(--bg)]';
  const border = dark ? 'border-slate-700' : 'border-[var(--border-strong)]';
  const text = dark ? 'text-white' : 'text-[var(--text-1)]';
  const placeholder = dark ? 'placeholder:text-slate-500' : 'placeholder:text-[var(--text-4)]';

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2">
        {/* Country code selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className={`${bg} ${text} ${border} border rounded-xl px-3 py-4 text-lg flex items-center gap-1.5 min-w-[100px] active:bg-slate-700/50`}
          >
            <span className="text-xl">{selected.flag}</span>
            <span className="text-sm font-medium">{selected.code}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto opacity-40"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showDropdown && (
            <div className={`absolute top-full left-0 mt-1 w-64 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto`}>
              {COUNTRY_CODES.map(c => (
                <button
                  key={c.code + c.iso}
                  onClick={() => { setCountryCode(c.code); setShowDropdown(false); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm ${text} ${countryCode === c.code ? (dark ? 'bg-indigo-600/20' : 'bg-indigo-50') : ''} ${dark ? 'active:bg-slate-700' : 'active:bg-gray-100'}`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="opacity-50 text-xs">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={formatDisplay(phone)}
          onChange={e => handlePhoneChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Phone number"
          autoFocus
          className={`flex-1 ${bg} ${text} text-xl ${border} border rounded-xl px-4 py-4 outline-none focus:border-indigo-500/50 ${placeholder} font-medium tracking-wide`}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || phone.replace(/\D/g, '').length < 6}
        className="w-full bg-indigo-600 text-white text-lg font-semibold rounded-xl py-4 active:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}

export { COUNTRY_CODES };
