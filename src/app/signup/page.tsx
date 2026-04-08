'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';
import { getBrandMode } from '@/lib/brand';
import PhoneInput from '@/components/PhoneInput';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free';
  const mode = searchParams.get('mode');
  const refOrgId = searchParams.get('ref');
  const phoneVerified = searchParams.get('phone') === 'verified';
  const isPocketChat = mode === 'pocketchat' || getBrandMode() === 'evrywher';

  // If redirected from login after phone verify, skip to name step
  const [step, setStep] = useState<'phone' | 'name'>(phoneVerified ? 'name' : 'phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = isPocketChat ? 'Sign up — Evrywher' : 'Sign up — BizPocket';
  }, [isPocketChat]);

  // ─── Phone: instant signup (no OTP — WhatsApp-style) ───
  async function handlePhoneSubmit(fullPhone: string) {
    setLoading(true);
    setError('');
    setPhone(fullPhone);

    const fakeEmail = `${fullPhone.replace(/\+/g, '')}@evrywher.io`;
    const fakePass = fullPhone;

    // Try login first (existing account)
    let { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: fakeEmail, password: fakePass,
    });

    if (signInErr) {
      // Account doesn't exist — create it
      const { error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail, password: fakePass,
      });
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: fakeEmail, password: fakePass,
      });
      if (loginErr) { setError(loginErr.message); setLoading(false); return; }
      data = loginData;
    }

    if (!data?.session) { setError('Could not create account. Try again.'); setLoading(false); return; }

    // Check if user already has a profile (returning user)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', data.user!.id)
      .maybeSingle();

    if (existing) {
      window.location.href = isPocketChat ? '/chat' : '/dashboard';
      return;
    }

    setStep('name');
    setLoading(false);
  }

  // ─── Step 3: Enter name + create profile ───
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please try again.');
      setLoading(false);
      return;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: org } = await supabase.from('organizations').insert({
        name: name.trim(),
        created_by: user.id,
        plan: 'free',
        language: 'en',
        currency: 'JPY',
        signup_source: isPocketChat ? 'pocketchat' : 'bizpocket',
      }).select().single();

      if (org) {
        await supabase.from('profiles').insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'owner',
          name: name.trim(),
          full_name: name.trim(),
          phone: user.phone || phone || null,
          language: 'en',
          onboarding_completed: isPocketChat,
        });

        // Handle referral if present
        if (refOrgId && isPocketChat) {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('name, full_name, email, language')
            .eq('organization_id', refOrgId)
            .eq('role', 'owner')
            .single();

          if (inviterProfile) {
            await supabase.from('contacts').insert([
              {
                organization_id: org.id,
                name: inviterProfile.full_name || inviterProfile.name || 'Contact',
                email: inviterProfile.email,
                contact_type: 'friend',
                language: inviterProfile.language || 'en',
              },
              {
                organization_id: refOrgId,
                name: name.trim(),
                phone: user.phone || phone || null,
                contact_type: 'friend',
                language: 'en',
              },
            ]);
          }
        }
      }
    }

    // Process pending invite code
    if (isPocketChat) {
      const inviteCode = localStorage.getItem('pending_invite_code') || searchParams.get('invite');
      if (inviteCode) {
        try {
          const res = await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode }),
          });
          await res.json();
          localStorage.removeItem('pending_invite_code');
        } catch {
          localStorage.removeItem('pending_invite_code');
        }
      }
    }

    window.location.href = isPocketChat ? '/chat' : `/onboarding?plan=${plan}`;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] px-4 pb-[env(safe-area-inset-bottom,20px)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex flex-col items-center gap-3">
            {isPocketChat ? <PocketChatMark size={64} /> : <PocketMark variant="lg" />}
            {!isPocketChat && <LogoWordmark />}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">
            {step === 'name' ? "What\u2019s your name?" : isPocketChat ? 'Welcome to Evrywher' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">
            {step === 'phone' && (isPocketChat ? 'Chat in any language. Free.' : 'Enter your phone to start')}
            {step === 'name' && 'One last thing \u2014 your name for chats'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)] mb-4">
            {error}
          </div>
        )}

        {/* ─── Step 1: Phone ─── */}
        {step === 'phone' && (
          <>
            <PhoneInput
              onSubmit={handlePhoneSubmit}
              loading={loading}
              buttonText="Continue →"
              dark={false}
            />

            <p className="mt-3 text-center text-xs text-[var(--text-4)]">
              By signing up you agree to our{' '}
              <Link href="/terms" className="text-indigo-400">Terms</Link> and{' '}
              <Link href="/privacy" className="text-indigo-400">Privacy Policy</Link>
            </p>

            <p className="mt-6 text-center text-sm text-[var(--text-3)]">
              Already have an account?{' '}
              <Link href={isPocketChat ? '/login?mode=pocketchat' : '/login'} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                Log In
              </Link>
            </p>
          </>
        )}

        {/* ─── Step 2: Name ─── */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] px-4 py-3.5 text-lg text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none text-center"
              required
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-indigo-600 text-white text-lg font-semibold rounded-xl py-4 active:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Start Chatting →'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
