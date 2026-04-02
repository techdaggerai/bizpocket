'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free';
  const mode = searchParams.get('mode');
  const isPocketChat = mode === 'pocketchat';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(isPocketChat ? '/chat' : `/onboarding?plan=${plan}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex flex-col items-center gap-3">
            {isPocketChat ? <PocketChatMark size={48} /> : <PocketMark variant="lg" />}
            {!isPocketChat && <LogoWordmark />}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{isPocketChat ? 'Sign up for PocketChat' : 'Create your account'}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">{isPocketChat ? 'Chat in any language. Free.' : 'Start managing your business'}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-input border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Creating account...' : isPocketChat ? 'Get PocketChat free' : 'Open Your Pocket'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-3)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
