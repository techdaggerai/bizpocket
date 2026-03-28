'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" className="mx-auto">
              <path d="M16 2L28.66 9V23L16 30L3.34 23V9L16 2Z" fill="var(--accent)" />
              <text x="16" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" fontFamily="var(--font-dm-sans), system-ui">B</text>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">Log in to BizPocket</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-input border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
              {error}
            </div>
          )}
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
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-3)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
