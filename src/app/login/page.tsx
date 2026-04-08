'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';
import LandingLanguageDropdown from '@/components/LandingLanguageDropdown';
import { LandingI18nProvider, useLandingI18n } from '@/lib/landing-i18n';
import { getBrandMode } from '@/lib/brand';
import PhoneInput from '@/components/PhoneInput';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = isPocketChat ? 'Log in — Evrywher' : 'Log in — BizPocket';
  }, [isPocketChat]);

  // ─── Phone: instant login (server creates user + signs in, returns session) ───
  async function handlePhoneSubmit(fullPhone: string) {
    setLoading(true);
    setError('');

    try {
      const authRes = await fetch('/api/auth/phone-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const authData = await authRes.json();

      if (!authRes.ok || !authData.success) {
        setError(authData.error || 'Could not sign in.');
        setLoading(false);
        return;
      }

      // Set session directly from server tokens
      await supabase.auth.setSession({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
      });

      // Check for profile and redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.userId)
        .maybeSingle();

      if (profile) {
        window.location.href = isPocketChat ? '/chat' : '/dashboard';
      } else {
        window.location.href = isPocketChat ? '/signup?mode=pocketchat&phone=verified' : '/signup?phone=verified';
      }
    } catch {
      setError('Network error — try again');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] px-4 pb-[env(safe-area-inset-bottom,20px)]">
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

        <PhoneInput
          onSubmit={handlePhoneSubmit}
          loading={loading}
          buttonText="Continue →"
          dark={false}
        />

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
