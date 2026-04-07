'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';
import LandingLanguageDropdown from '@/components/LandingLanguageDropdown';
import { LandingI18nProvider, useLandingI18n } from '@/lib/landing-i18n';
import { getBrandMode } from '@/lib/brand';
import PhoneInput from '@/components/PhoneInput';
import OTPInput from '@/components/OTPInput';

export default function LoginPage() {
  return (
    <LandingI18nProvider>
      <Suspense>
        <LoginInner />
      </Suspense>
    </LandingI18nProvider>
  );
}

function LoginInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isPocketChat = mode === 'pocketchat' || getBrandMode() === 'evrywher';
  const { t } = useLandingI18n();

  const [step, setStep] = useState<'phone' | 'otp' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email fallback state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = isPocketChat ? 'Log in \u2014 Evrywher' : 'Log in \u2014 BizPocket';
  }, [isPocketChat]);

  // ─── Phone: send OTP ───
  async function handlePhoneSubmit(fullPhone: string) {
    setLoading(true);
    setError('');
    setPhone(fullPhone);

    const { error: authError } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setStep('otp');
    setLoading(false);
  }

  // ─── OTP: verify ───
  async function handleVerify(code: string) {
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError('Verification succeeded but session was not created. Please try again.');
      setLoading(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if user has a profile — if not, they need to complete signup
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', data.user!.id)
      .maybeSingle();

    if (profile) {
      window.location.href = isPocketChat ? '/chat' : '/dashboard';
    } else {
      // New user via phone — redirect to signup to enter name
      window.location.href = isPocketChat ? '/signup?mode=pocketchat&phone=verified' : '/signup?phone=verified';
    }
  }

  // ─── Email fallback: login ───
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const emailVal = email || emailRef.current?.value || '';
    const passVal = password || passRef.current?.value || '';

    if (!emailVal || !passVal) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passVal,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError('Login succeeded but session was not created. Please try again.');
      setLoading(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.href = isPocketChat ? '/chat' : '/dashboard';
  }

  const syncEmail = (e: React.SyntheticEvent<HTMLInputElement>) => setEmail(e.currentTarget.value);
  const syncPass = (e: React.SyntheticEvent<HTMLInputElement>) => setPassword(e.currentTarget.value);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute top-4 right-4 z-10">
        <LandingLanguageDropdown />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex flex-col items-center gap-3">
            {isPocketChat ? <PocketChatMark size={64} /> : <PocketMark variant="lg" />}
            {isPocketChat ? <EvryWherMark size="md" /> : <LogoWordmark />}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('login_welcome')}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">
            {step === 'email' ? 'Sign in with your email' : step === 'otp' ? '' : 'Enter your phone to start'}
          </p>
        </div>

        {error && step !== 'otp' && (
          <div className="rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)] mb-4">
            {error}
          </div>
        )}

        {/* ─── Step: Phone ─── */}
        {step === 'phone' && (
          <>
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              loading={loading}
              buttonText="Send Code \u2192"
              dark={false}
            />

            <p className="mt-6 text-center text-sm text-[var(--text-3)]">
              {t('login_no_account')}{' '}
              <Link href={isPocketChat ? '/signup?mode=pocketchat' : '/signup'} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                {t('login_signup')}
              </Link>
            </p>

            <button
              onClick={() => { setStep('email'); setError(''); }}
              className="mt-4 w-full text-center text-xs text-[var(--text-4)] active:text-[var(--text-3)]"
            >
              Use email instead
            </button>
          </>
        )}

        {/* ─── Step: OTP ─── */}
        {step === 'otp' && (
          <>
            <OTPInput
              phone={phone}
              onVerify={handleVerify}
              onResend={() => handlePhoneSubmit(phone)}
              loading={loading}
              error={error}
              dark={false}
            />

            <button
              onClick={() => { setStep('phone'); setError(''); }}
              className="mt-6 w-full text-center text-sm text-[var(--accent)] font-medium active:opacity-60"
            >
              Change phone number
            </button>
          </>
        )}

        {/* ─── Step: Email fallback ─── */}
        {step === 'email' && (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">{t('login_email')}</label>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={email}
                  onChange={syncEmail}
                  onInput={syncEmail}
                  autoComplete="email"
                  className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">{t('login_password')}</label>
                <div className="relative">
                  <input
                    ref={passRef}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={syncPass}
                    onInput={syncPass}
                    autoComplete="current-password"
                    className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 pr-11 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? t('login_loading') : t('login_button')}
              </button>
            </form>

            <button
              onClick={() => { setStep('phone'); setError(''); }}
              className="mt-4 w-full text-center text-sm text-[var(--accent)] font-medium active:opacity-60"
            >
              Use phone instead
            </button>

            <p className="mt-4 text-center text-sm text-[var(--text-3)]">
              {t('login_no_account')}{' '}
              <Link href={isPocketChat ? '/signup?mode=pocketchat' : '/signup'} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                {t('login_signup')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
