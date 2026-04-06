'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';
import LandingLanguageDropdown from '@/components/LandingLanguageDropdown';
import { LandingI18nProvider, useLandingI18n } from '@/lib/landing-i18n';
import { getBrandMode, BRAND } from '@/lib/brand';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isPocketChat = mode === 'pocketchat' || getBrandMode() === 'evrywher';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLandingI18n();
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = isPocketChat ? 'Log in — Evrywher' : 'Log in — BizPocket';
  }, [isPocketChat]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Read directly from DOM — autofill often doesn't fire onChange/onInput
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

    // Verify session is set before redirecting
    if (!data.session) {
      setError('Login succeeded but session was not created. Please try again.');
      setLoading(false);
      return;
    }

    // Small delay to let @supabase/ssr flush cookies, then hard redirect
    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.href = isPocketChat ? '/chat' : '/dashboard';
  }

  // Sync handler for both onChange and onInput (covers all autofill behaviors)
  const syncEmail = (e: React.SyntheticEvent<HTMLInputElement>) => setEmail(e.currentTarget.value);
  const syncPass = (e: React.SyntheticEvent<HTMLInputElement>) => setPassword(e.currentTarget.value);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute top-4 right-4 z-10">
        <LandingLanguageDropdown />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex flex-col items-center gap-3">
            {isPocketChat ? <PocketChatMark size={64} /> : <PocketMark variant="lg" />}
            {isPocketChat ? <EvryWherMark size="md" /> : <LogoWordmark />}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('login_welcome')}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">{isPocketChat ? t('login_subtitle_evrywher') : t('login_subtitle_bizpocket')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-input border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
              {error}
            </div>
          )}
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
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? t('login_loading') : t('login_button')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-3)]">
          {t('login_no_account')}{' '}
          <Link href={isPocketChat ? '/signup?mode=pocketchat' : '/signup'} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
            {t('login_signup')}
          </Link>
        </p>
      </div>
    </div>
  );
}
