'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import EvryWherMark from '@/components/EvryWherMark';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';

// ─── Complete international dialing codes (sorted by region, then alphabetical) ───
const COUNTRY_CODES = [
  // East Asia
  { code: '+81', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', iso: 'JP' },
  { code: '+82', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', iso: 'KR' },
  { code: '+86', flag: '\u{1F1E8}\u{1F1F3}', name: 'China', iso: 'CN' },
  { code: '+886', flag: '\u{1F1F9}\u{1F1FC}', name: 'Taiwan', iso: 'TW' },
  { code: '+852', flag: '\u{1F1ED}\u{1F1F0}', name: 'Hong Kong', iso: 'HK' },
  { code: '+853', flag: '\u{1F1F2}\u{1F1F4}', name: 'Macau', iso: 'MO' },
  { code: '+976', flag: '\u{1F1F2}\u{1F1F3}', name: 'Mongolia', iso: 'MN' },
  // South Asia
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', iso: 'IN' },
  { code: '+92', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan', iso: 'PK' },
  { code: '+880', flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladesh', iso: 'BD' },
  { code: '+94', flag: '\u{1F1F1}\u{1F1F0}', name: 'Sri Lanka', iso: 'LK' },
  { code: '+977', flag: '\u{1F1F3}\u{1F1F5}', name: 'Nepal', iso: 'NP' },
  { code: '+975', flag: '\u{1F1E7}\u{1F1F9}', name: 'Bhutan', iso: 'BT' },
  { code: '+960', flag: '\u{1F1F2}\u{1F1FB}', name: 'Maldives', iso: 'MV' },
  { code: '+93', flag: '\u{1F1E6}\u{1F1EB}', name: 'Afghanistan', iso: 'AF' },
  // Southeast Asia
  { code: '+62', flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesia', iso: 'ID' },
  { code: '+63', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines', iso: 'PH' },
  { code: '+66', flag: '\u{1F1F9}\u{1F1ED}', name: 'Thailand', iso: 'TH' },
  { code: '+84', flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnam', iso: 'VN' },
  { code: '+60', flag: '\u{1F1F2}\u{1F1FE}', name: 'Malaysia', iso: 'MY' },
  { code: '+65', flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore', iso: 'SG' },
  { code: '+95', flag: '\u{1F1F2}\u{1F1F2}', name: 'Myanmar', iso: 'MM' },
  { code: '+855', flag: '\u{1F1F0}\u{1F1ED}', name: 'Cambodia', iso: 'KH' },
  { code: '+856', flag: '\u{1F1F1}\u{1F1E6}', name: 'Laos', iso: 'LA' },
  // Middle East
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE', iso: 'AE' },
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia', iso: 'SA' },
  { code: '+974', flag: '\u{1F1F6}\u{1F1E6}', name: 'Qatar', iso: 'QA' },
  { code: '+973', flag: '\u{1F1E7}\u{1F1ED}', name: 'Bahrain', iso: 'BH' },
  { code: '+968', flag: '\u{1F1F4}\u{1F1F2}', name: 'Oman', iso: 'OM' },
  { code: '+965', flag: '\u{1F1F0}\u{1F1FC}', name: 'Kuwait', iso: 'KW' },
  { code: '+962', flag: '\u{1F1EF}\u{1F1F4}', name: 'Jordan', iso: 'JO' },
  { code: '+961', flag: '\u{1F1F1}\u{1F1E7}', name: 'Lebanon', iso: 'LB' },
  { code: '+964', flag: '\u{1F1EE}\u{1F1F6}', name: 'Iraq', iso: 'IQ' },
  { code: '+98', flag: '\u{1F1EE}\u{1F1F7}', name: 'Iran', iso: 'IR' },
  { code: '+972', flag: '\u{1F1EE}\u{1F1F1}', name: 'Israel', iso: 'IL' },
  { code: '+90', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey', iso: 'TR' },
  // Americas
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', iso: 'US' },
  { code: '+1', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', iso: 'CA' },
  { code: '+52', flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico', iso: 'MX' },
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', iso: 'BR' },
  { code: '+54', flag: '\u{1F1E6}\u{1F1F7}', name: 'Argentina', iso: 'AR' },
  { code: '+57', flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombia', iso: 'CO' },
  { code: '+56', flag: '\u{1F1E8}\u{1F1F1}', name: 'Chile', iso: 'CL' },
  { code: '+51', flag: '\u{1F1F5}\u{1F1EA}', name: 'Peru', iso: 'PE' },
  { code: '+58', flag: '\u{1F1FB}\u{1F1EA}', name: 'Venezuela', iso: 'VE' },
  { code: '+593', flag: '\u{1F1EA}\u{1F1E8}', name: 'Ecuador', iso: 'EC' },
  // Europe
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', iso: 'GB' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', name: 'France', iso: 'FR' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', iso: 'DE' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy', iso: 'IT' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', iso: 'ES' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal', iso: 'PT' },
  { code: '+31', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands', iso: 'NL' },
  { code: '+32', flag: '\u{1F1E7}\u{1F1EA}', name: 'Belgium', iso: 'BE' },
  { code: '+41', flag: '\u{1F1E8}\u{1F1ED}', name: 'Switzerland', iso: 'CH' },
  { code: '+43', flag: '\u{1F1E6}\u{1F1F9}', name: 'Austria', iso: 'AT' },
  { code: '+46', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden', iso: 'SE' },
  { code: '+47', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway', iso: 'NO' },
  { code: '+45', flag: '\u{1F1E9}\u{1F1F0}', name: 'Denmark', iso: 'DK' },
  { code: '+358', flag: '\u{1F1EB}\u{1F1EE}', name: 'Finland', iso: 'FI' },
  { code: '+48', flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland', iso: 'PL' },
  { code: '+420', flag: '\u{1F1E8}\u{1F1FF}', name: 'Czech Republic', iso: 'CZ' },
  { code: '+36', flag: '\u{1F1ED}\u{1F1FA}', name: 'Hungary', iso: 'HU' },
  { code: '+40', flag: '\u{1F1F7}\u{1F1F4}', name: 'Romania', iso: 'RO' },
  { code: '+30', flag: '\u{1F1EC}\u{1F1F7}', name: 'Greece', iso: 'GR' },
  { code: '+353', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland', iso: 'IE' },
  { code: '+380', flag: '\u{1F1FA}\u{1F1E6}', name: 'Ukraine', iso: 'UA' },
  { code: '+7', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia', iso: 'RU' },
  // Africa
  { code: '+234', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria', iso: 'NG' },
  { code: '+27', flag: '\u{1F1FF}\u{1F1E6}', name: 'South Africa', iso: 'ZA' },
  { code: '+20', flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt', iso: 'EG' },
  { code: '+254', flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenya', iso: 'KE' },
  { code: '+233', flag: '\u{1F1EC}\u{1F1ED}', name: 'Ghana', iso: 'GH' },
  { code: '+212', flag: '\u{1F1F2}\u{1F1E6}', name: 'Morocco', iso: 'MA' },
  { code: '+213', flag: '\u{1F1E9}\u{1F1FF}', name: 'Algeria', iso: 'DZ' },
  { code: '+216', flag: '\u{1F1F9}\u{1F1F3}', name: 'Tunisia', iso: 'TN' },
  { code: '+251', flag: '\u{1F1EA}\u{1F1F9}', name: 'Ethiopia', iso: 'ET' },
  { code: '+255', flag: '\u{1F1F9}\u{1F1FF}', name: 'Tanzania', iso: 'TZ' },
  { code: '+256', flag: '\u{1F1FA}\u{1F1EC}', name: 'Uganda', iso: 'UG' },
  { code: '+237', flag: '\u{1F1E8}\u{1F1F2}', name: 'Cameroon', iso: 'CM' },
  // Oceania
  { code: '+61', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', iso: 'AU' },
  { code: '+64', flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand', iso: 'NZ' },
];

type View = 'buttons' | 'phone' | 'phoneCode' | 'email' | 'password';

interface UniversalSignupProps {
  /** Compact mode for modals (no logo/tagline/badge) */
  compact?: boolean;
  /** Start in sign-in mode */
  defaultMode?: 'signup' | 'signin';
  /** Called after successful auth. If provided, parent handles redirect. */
  onSuccess?: (data: { userId: string; phone?: string; email?: string; method: string }) => void;
  /** Brand mode — determines post-auth redirect */
  isPocketChat?: boolean;
}

export default function UniversalSignup({
  compact = false,
  defaultMode = 'signup',
  onSuccess,
  isPocketChat = true,
}: UniversalSignupProps) {
  const supabase = createClient();
  const [view, setView] = useState<View>('buttons');
  const [mode, setMode] = useState<'signup' | 'signin'>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Phone state
  const [countryCode, setCountryCode] = useState('+81');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Email state
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Password state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Auto-detect country from browser locale
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
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (showDropdown) searchRef.current?.focus();
  }, [showDropdown]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // ─── Post-auth: redirect or call onSuccess ───
  const handleAuthComplete = useCallback(async (data: { userId: string; phone?: string; email?: string; method: string }) => {
    if (onSuccess) {
      onSuccess(data);
    } else {
      window.location.href = isPocketChat ? '/chat' : '/dashboard';
    }
  }, [onSuccess, isPocketChat]);

  // ─── Phone submit ───
  async function handlePhoneSubmit() {
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length < 4 || digits.length > 15) return;
    setLoading(true);
    setError('');

    // Strip leading 0 (domestic trunk prefix) before prepending country code
    const normalized = digits.replace(/^0+/, '');
    const fullPhone = `${countryCode}${normalized}`;

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: { shouldCreateUser: true },
      });

      if (otpErr) {
        setError(otpErr.message || 'Could not send verification code.');
        setLoading(false);
        return;
      }

      setPhoneForOtp(fullPhone);
      setOtpCode('');
      setView('phoneCode');
    } catch {
      setError('Network error - try again');
    }
    setLoading(false);
  }

  async function handlePhoneCodeSubmit() {
    const code = otpCode.replace(/\D/g, '');
    if (!phoneForOtp || code.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: phoneForOtp,
        token: code,
        type: 'sms',
      });

      if (verifyErr || !data.user) {
        setError(verifyErr?.message || 'Invalid verification code.');
        setLoading(false);
        return;
      }

      const completeRes = await fetch('/api/auth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneForOtp,
          source: isPocketChat ? 'pocketchat' : 'bizpocket',
        }),
      });
      const completeData = await completeRes.json();

      if (!completeRes.ok || !completeData.success) {
        setError(completeData.error || 'Could not finish signup.');
        setLoading(false);
        return;
      }

      await handleAuthComplete({ userId: data.user.id, phone: phoneForOtp, method: 'phone' });
    } catch {
      setError('Network error - try again');
    }
    setLoading(false);
  }

  // ─── Email magic link ───
  async function handleEmailSubmit() {
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    setError('');

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?source=${isPocketChat ? 'pocketchat' : 'bizpocket'}` },
      });

      if (otpErr) {
        // Supabase rate limit: show friendly message instead of scary error
        const msg = otpErr.message || '';
        if (msg.toLowerCase().includes('security') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('seconds')) {
          setMagicLinkSent(true);
          setResendCountdown(60);
        } else {
          setError(msg || 'Could not send magic link.');
        }
        setLoading(false);
        return;
      }

      setMagicLinkSent(true);
      setResendCountdown(30);
    } catch {
      setError('Network error — try again');
    }
    setLoading(false);
  }

  // ─── Username + password ───
  async function handlePasswordSubmit() {
    if (!username.trim() || !password || password.length < 6) return;
    setError('');
    setError('Username-only signup is disabled. Use phone verification or email magic link.');
  }

  const selected = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 4 && phoneDigits.length <= 15;

  const filteredCountries = countrySearch
    ? COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
    : COUNTRY_CODES;

  const isSignIn = mode === 'signin';

  // ═══════════════════════════════════════
  // BUTTONS VIEW — three LINE-style cards
  // ═══════════════════════════════════════

  if (view === 'buttons') {
    return (
      <div className="w-full flex flex-col items-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>

        {/* ─── Logo + headings (full mode only) ─── */}
        {!compact && (
          <div className="flex flex-col items-center mb-8">
            {/* Breathing logo */}
            <div className="evrywher-logo-glow mb-4">
              <AnimatedPocketChatLogo size={72} isTranslating={true} />
            </div>
            <EvryWherMark size="lg" className="mb-3" />

            {/* Welcome heading */}
            <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 500 }} className="mb-1">
              Welcome to Evrywher
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }} className="mb-3">
              Chat with anyone, in any language
            </p>

            {/* Tagline with green italic "e" */}
            <p style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }} className="mb-4">
              You bring the missing{' '}
              <span style={{ fontFamily: 'Georgia, serif', color: '#10B981', fontStyle: 'italic' }}>e</span>
              . We bring the world.
            </p>

            {/* Green pill badge */}
            <span
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '0.5px solid rgba(16,185,129,0.3)',
                color: '#34d399',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                padding: '6px 16px',
              }}
            >
              All features free — upgrade anytime for more
            </span>
          </div>
        )}

        {/* ─── Compact header ─── */}
        {compact && (
          <div className="w-full mb-5">
            <h3 className="text-base font-bold text-white">Save Your Chat</h3>
            <p className="text-xs text-slate-400 mt-1">Keep your messages and unlock all features</p>
          </div>
        )}

        {/* ─── Three buttons ─── */}
        <div className="w-full space-y-3.5 px-3">
          {/* Button 1 — Phone (indigo hero) */}
          <button
            onClick={() => { setView('phone'); setError(''); }}
            className="w-full flex items-center gap-3.5 rounded-[14px] border-none cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              boxShadow: '0 0 20px rgba(79,70,229,0.25)',
              padding: '16px 20px',
            }}
          >
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.18)', borderRadius: 12 }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-[16px] font-medium leading-tight">
                {isSignIn ? 'Sign in with phone number' : 'Continue with phone number'}
              </p>
              <p className="text-[12px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {isSignIn ? 'SMS code required' : 'Verified by SMS code'}
              </p>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Button 2 — Email (teal) */}
          <button
            onClick={() => { setView('email'); setError(''); setMagicLinkSent(false); }}
            className="w-full flex items-center gap-3.5 rounded-[14px] border-none cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
              boxShadow: '0 0 20px rgba(13,148,136,0.25)',
              padding: '16px 20px',
            }}
          >
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.18)', borderRadius: 12 }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-[16px] font-medium leading-tight">
                {isSignIn ? 'Sign in with email' : 'Continue with email'}
              </p>
              <p className="text-[12px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {isSignIn ? 'Magic link to your inbox' : 'Magic link — no password needed'}
              </p>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Button 3 — Username & Password (amber) */}
          <button
            onClick={() => setError('Username-only signup is disabled. Use phone verification or email magic link.')}
            className="w-full flex items-center gap-3.5 rounded-[14px] border-none cursor-not-allowed opacity-60"
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
              padding: '16px 20px',
            }}
          >
            <div className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.18)', borderRadius: 12 }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-[16px] font-medium leading-tight">
                Username signup disabled
              </p>
              <p className="text-[12px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Use phone verification or email
              </p>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* ─── Footer text (full mode only) ─── */}
        {!compact && (
          <div className="mt-8 space-y-3 text-center px-4">
            <p style={{ color: '#475569', fontSize: 14 }}>
              {isSignIn ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(isSignIn ? 'signup' : 'signin')} style={{ color: '#818cf8', fontWeight: 500 }} className="bg-transparent border-none cursor-pointer">
                {isSignIn ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            <p style={{ color: '#334155', fontSize: 11 }}>
              Every signup gets full free access. Upgrade to{' '}
              <span style={{ color: '#818cf8' }}>Pro</span> or{' '}
              <span style={{ color: '#f59e0b' }}>Business</span>{' '}
              anytime for premium features.
            </p>
            <p style={{ color: '#334155', fontSize: 11 }}>
              By continuing, you agree to our{' '}
              <a href="/terms" style={{ color: '#64748b' }}>Terms</a> &{' '}
              <a href="/privacy" style={{ color: '#64748b' }}>Privacy Policy</a>
            </p>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // FLOW VIEWS — phone / email / password
  // ═══════════════════════════════════════

  return (
    <div className="w-full" style={{ paddingBottom: compact ? 0 : 'max(env(safe-area-inset-bottom), 20px)' }}>
      {/* Back arrow + heading */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setView('buttons'); setError(''); setMagicLinkSent(false); }}
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-white">
          {view === 'phone' && 'Phone number'}
          {view === 'phoneCode' && 'Verification code'}
          {view === 'email' && 'Email'}
          {view === 'password' && 'Create account'}
        </h2>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* ═══ PHONE FLOW ═══ */}
      {view === 'phone' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {/* Country code selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-4 text-lg flex items-center gap-1.5 min-w-[100px] active:bg-slate-700/50"
              >
                <span className="text-xl">{selected.flag}</span>
                <span className="text-sm font-medium">{selected.code}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto opacity-40"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-hidden flex flex-col">
                  {/* Search input */}
                  <div className="p-2 border-b border-slate-700">
                    <input
                      ref={searchRef}
                      type="text"
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      placeholder="Search country..."
                      className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code + c.iso}
                        onClick={() => { setCountryCode(c.code); setShowDropdown(false); setCountrySearch(''); phoneInputRef.current?.focus(); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white ${countryCode === c.code && selected.iso === c.iso ? 'bg-indigo-600/20' : ''} active:bg-slate-700`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1 text-left">{c.name}</span>
                        <span className="opacity-50 text-xs">{c.code}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No countries found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Phone input — accepts any format */}
            <input
              ref={phoneInputRef}
              type="tel"
              inputMode="tel"
              value={phoneRaw}
              onChange={e => setPhoneRaw(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePhoneSubmit(); }}
              placeholder="Enter your number"
              autoFocus
              className="flex-1 bg-slate-800 text-white text-xl border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-indigo-500/50 placeholder:text-slate-500 font-medium tracking-wide"
            />
          </div>

          <button
            onClick={handlePhoneSubmit}
            disabled={loading || !phoneValid}
            className="w-full text-white text-lg font-semibold rounded-[14px] py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#4f46e5' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Continue \u2192'
            )}
          </button>
        </div>
      )}

      {view === 'phoneCode' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Enter the SMS code sent to <strong className="text-white">{phoneForOtp}</strong>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={e => { if (e.key === 'Enter') handlePhoneCodeSubmit(); }}
            placeholder="Verification code"
            autoFocus
            className="w-full bg-slate-800 text-white text-xl border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-indigo-500/50 placeholder:text-slate-500 font-medium tracking-wide"
          />

          <button
            onClick={handlePhoneCodeSubmit}
            disabled={loading || otpCode.replace(/\D/g, '').length < 4}
            className="w-full text-white text-lg font-semibold rounded-[14px] py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#4f46e5' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Verify & continue'
            )}
          </button>

          <button
            onClick={handlePhoneSubmit}
            disabled={loading}
            className="w-full py-2 text-sm text-indigo-400 disabled:opacity-40"
          >
            Resend code
          </button>
        </div>
      )}

      {/* ═══ EMAIL FLOW ═══ */}
      {view === 'email' && (
        <div className="space-y-3">
          {magicLinkSent ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#14b8a6" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Check your email</h3>
              <p className="text-sm text-slate-400">
                We sent a magic link to <strong className="text-white">{email}</strong>. Tap it to sign in.
              </p>
              <button
                onClick={() => {
                  if (resendCountdown > 0) return;
                  handleEmailSubmit();
                }}
                disabled={resendCountdown > 0}
                className="text-sm font-medium disabled:opacity-40"
                style={{ color: '#14b8a6' }}
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend link'}
              </button>
            </div>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit(); }}
                placeholder="Enter your email"
                autoFocus
                className="w-full bg-slate-800 text-white text-lg border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-teal-500/50 placeholder:text-slate-500"
              />

              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email.trim() || !email.includes('@')}
                className="w-full text-white text-lg font-semibold rounded-[14px] py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#0d9488' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue \u2192'
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ USERNAME + PASSWORD FLOW ═══ */}
      {view === 'password' && (
        <div className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoFocus
            autoComplete="username"
            className="w-full bg-slate-800 text-white text-lg border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-amber-500/50 placeholder:text-slate-500"
          />

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handlePasswordSubmit(); }}
            placeholder="Choose a password"
            autoComplete="new-password"
            className="w-full bg-slate-800 text-white text-lg border border-slate-700 rounded-xl px-4 py-4 outline-none focus:border-amber-500/50 placeholder:text-slate-500"
          />
          {password && password.length < 6 && (
            <p className="text-xs text-amber-400/70">Minimum 6 characters</p>
          )}

          <button
            onClick={handlePasswordSubmit}
            disabled={loading || !username.trim() || !password || password.length < 6}
            className="w-full text-white text-lg font-semibold rounded-[14px] py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#d97706' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create Account \u2192'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
