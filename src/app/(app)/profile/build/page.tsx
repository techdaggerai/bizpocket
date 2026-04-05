'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

const CHECKLIST = [
  { icon: '\u2713', label: 'Your business info' },
  { icon: '\u2713', label: 'Invoice history (if any)' },
  { icon: '\u2713', label: 'Languages you speak' },
  { icon: '\u2713', label: 'Your network' },
];

const LOADING_STEPS = [
  { prefix: '\u2713', text: '' }, // dynamic — filled from API
  { prefix: '\u2713', text: '' },
  { prefix: '\u25D0', text: 'Building bio in 3 languages...' },
  { prefix: '\u25CC', text: 'Finding trade corridors...' },
];

export default function ProfileBuildPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const [building, setBuilding] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleBuild() {
    setBuilding(true);
    setError('');
    setVisibleSteps([]);
    setProgress(0);

    // Animate loading steps
    const steps = [
      '\u2713 Scanning your business activity...',
      '\u2713 Detected languages and corridors',
      '\u25D0 Building bio in 3 languages...',
      '\u25CC Finding trade corridors...',
    ];
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setVisibleSteps((prev) => [...prev, steps[i]]);
      setProgress(((i + 1) / steps.length) * 80);
    }

    try {
      const res = await fetch('/api/profile/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Build failed');
      setProgress(100);
      try { sessionStorage.setItem('spaceship_profile_build', JSON.stringify(data)); } catch {}
      await new Promise((r) => setTimeout(r, 400));
      router.push('/profile/preview');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setBuilding(false);
    }
  }

  // Loading state
  if (building) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        {/* PocketChat breathing logo */}
        <div className="relative mb-8">
          <div className="text-6xl animate-[pcBreathe_2s_ease-in-out_infinite]">{'\u{1F30D}'}</div>
        </div>

        {/* Live status lines */}
        <div className="w-full max-w-xs space-y-2.5 mb-8">
          {visibleSteps.map((step, i) => (
            <p
              key={i}
              className="text-sm text-[var(--pm-text-primary)] animate-[trustCountUp_400ms_var(--ease-out)_both]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {step}
            </p>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-[width] duration-500 [transition-timing-function:var(--ease-out)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh] px-6 py-8">
      {/* Globe hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div
          className="text-7xl mb-4"
          style={{ animation: 'spin 20s linear infinite' }}
        >
          {'\u{1F30D}'}
        </div>
        <p
          className="text-lg text-[var(--pm-text-primary)] max-w-xs leading-relaxed"
          style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600 }}
        >
          Let AI build your professional profile from your real business activity.
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2.5 mb-8">
        {CHECKLIST.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 animate-[trustCountUp_400ms_var(--ease-out)_both]"
            style={{ animationDelay: `${i * 250}ms` }}
          >
            <span className="text-emerald-500 text-sm font-bold">{item.icon}</span>
            <span className="text-sm text-[var(--pm-text-primary)]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* No minimum callout */}
      <p className="text-lg text-[var(--pm-text-primary)] text-center mb-8">
        No minimum requirements. Start small, grow fast.
      </p>

      {/* Error */}
      {error && (
        <GlassCard className="mb-4 border-red-800">
          <p className="text-sm text-red-400">{error}</p>
        </GlassCard>
      )}

      {/* CTA */}
      <div className="mt-auto space-y-2">
        <Button
          variant="primary"
          size="xl"
          onClick={handleBuild}
          className="w-full"
        >
          Build My Profile {'\u2192'}
        </Button>
        <p className="text-sm text-[var(--pm-text-secondary)] text-center">
          Average build time: 30 seconds {'\u26A1'}
        </p>
      </div>
    </div>
  );
}
