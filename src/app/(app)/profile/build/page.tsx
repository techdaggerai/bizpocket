'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const DATA_POINTS = [
  { icon: '\u{1F9FE}', label: 'Invoice history & payment track record' },
  { icon: '\u{1F465}', label: 'Contacts & business network' },
  { icon: '\u{1F30D}', label: 'Languages you speak & operate in' },
  { icon: '\u{1F4CA}', label: 'Business activity & growth signals' },
];

const LOADING_MESSAGES = [
  'Analyzing your activity...',
  'Building your profile...',
  'Generating your bio in 3 languages...',
  'Almost ready...',
];

export default function ProfileBuildPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const [building, setBuilding] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [error, setError] = useState('');

  // Cycle loading messages
  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => {
      setLoadingIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [building]);

  async function handleBuild() {
    setBuilding(true);
    setError('');
    try {
      const res = await fetch('/api/profile/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Build failed');
      }
      // Store in sessionStorage for preview page
      try { sessionStorage.setItem('spaceship_profile_build', JSON.stringify(data)); } catch {}
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
        {/* Breathing globe animation */}
        <div className="relative mb-8">
          <div className="text-6xl animate-pulse">{'\u{1F30D}'}</div>
          <div className="absolute inset-0 rounded-full bg-[#4F46E5]/10 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <p className="text-lg font-semibold text-[var(--text-1)] dark:text-white transition-opacity duration-500">
          {LOADING_MESSAGES[loadingIdx]}
        </p>
        <p className="text-sm text-[var(--text-3)] dark:text-gray-400 mt-2">This takes a few seconds</p>
        <div className="mt-6 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#4F46E5]"
              style={{
                animation: 'bounce 1.2s infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <style jsx>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[80vh] px-6 py-8">
      {/* Globe hero */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="text-7xl mb-4">{'\u{1F30D}'}</div>
        <h1 className="text-2xl font-bold text-[var(--text-1)] dark:text-white mb-3">
          Build Your Global Profile
        </h1>
        <p className="text-sm text-[var(--text-2)] dark:text-gray-300 max-w-xs leading-relaxed">
          Let AI build your professional profile from your real business activity.
        </p>
      </div>

      {/* Data points list */}
      <div className="space-y-3 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400 px-1">
          What we'll use
        </p>
        {DATA_POINTS.map((dp, i) => (
          <div key={i} className="flex items-center gap-3 bg-[#F9FAFB] dark:bg-gray-800 rounded-xl px-4 py-3 border border-[#E5E5E5] dark:border-gray-700">
            <span className="text-xl flex-shrink-0">{dp.icon}</span>
            <span className="text-sm text-[var(--text-1)] dark:text-gray-200">{dp.label}</span>
          </div>
        ))}
      </div>

      {/* No minimum callout */}
      <div className="flex items-center gap-3 bg-[#EEF2FF] dark:bg-indigo-950/30 rounded-xl px-4 py-3 mb-8 border border-[#C7D2FE] dark:border-indigo-800">
        <span className="text-lg">{'\u{1F331}'}</span>
        <p className="text-sm text-[#4338CA] dark:text-indigo-300">
          <span className="font-semibold">No minimum requirements.</span> Start small, grow fast.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto">
        <button
          onClick={handleBuild}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-base py-4 rounded-xl transition-colors active:scale-[0.98]"
        >
          Build My Profile {'\u2192'}
        </button>
      </div>
    </div>
  );
}
