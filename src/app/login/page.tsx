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

  // ─── Phone: instant login (no OTP — WhatsApp-style) ───
  async function handlePhoneSubmit(fullPhone: string) {
    setLoading(true);
    setError('');

    const fakeEmail = `${fullPhone.replace(/\+/g, '')}@evrywher.io`;
    const fakePass = fullPhone;

    // Try login first
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: fakeEmail, password: fakePass,
    });

    if (signInErr) {
      // Account doesn't exist — create it
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail, password: fakePass,
        options: { data: { phone: fullPhone } },
      });
      if (signUpErr) {
        if (signUpErr.message.includes('security') || signUpErr.message.includes('after')) {
          setError('Please wait a moment and try again.');
        } else {
          setError(signUpErr.message);
        }
        setLoading(false); return;
      }
      // signUp may return a session directly — if so, use it
      if (signUpData?.session) {
        const uid = signUpData.user!.id;
        const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', uid).maybeSingle();
        if (prof) { window.location.href = isPocketChat ? '/chat' : '/dashboard'; }
        else { window.location.href = isPocketChat ? '/signup?mode=pocketchat&phone=verified' : '/signup?phone=verified'; }
        return;
      }
      // No session — need to sign in (with delay to avoid rate limit)
      await new Promise(r => setTimeout(r, 1000));
      const { error: retryErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: fakePass });
      if (retryErr) { setError('Account created! Tap Continue again to log in.'); setLoading(false); return; }
      // Re-fetch user after sign in
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setError('Please tap Continue again.'); setLoading(false); return; }
      const { data: prof2 } = await supabase.from('profiles').select('id').eq('user_id', u.id).maybeSingle();
      if (prof2) { window.location.href = isPocketChat ? '/chat' : '/dashboard'; }
      else { window.location.href = isPocketChat ? '/signup?mode=pocketchat&phone=verified' : '/signup?phone=verified'; }
      return;
    }

    if (!data?.session) { setError('Could not sign in. Try again.'); setLoading(false); return; }

    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', data.user!.id)
      .maybeSingle();

    if (profile) {
      window.location.href = isPocketChat ? '/chat' : '/dashboard';
    } else {
      window.location.href = isPocketChat ? '/signup?mode=pocketchat&phone=verified' : '/signup?phone=verified';
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
