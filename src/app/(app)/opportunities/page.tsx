'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import MatchCard from '@/components/matches/MatchCard';

export default function OpportunitiesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [signupDate, setSignupDate] = useState<string | null>(null);

  // Pull-to-refresh
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const profileRes = await fetch('/api/profile/me');
        if (!profileRes.ok) throw new Error('Profile fetch failed');
        const profileJson = await profileRes.json();

        if (!profileJson.profile) {
          setHasProfile(false);
          setLoading(false);
          return;
        }
        setHasProfile(true);
        setSignupDate(profileJson.profile.created_at || null);

        const matchRes = await fetch('/api/matches/list');
        if (matchRes.ok) {
          const matchJson = await matchRes.json();
          setMatches(matchJson.matches || []);
        }
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    }
    load();
  }, []);

  const generateMatches = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setEmptyMessage('');
    try {
      const res = await fetch('/api/matches/generate', { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        setEmptyMessage(res.status === 429
          ? (json.upgradeHint || 'Daily match limit reached. Check back tomorrow!')
          : (json.error || 'Failed to generate matches'));
        setGenerating(false);
        return;
      }

      if (json.matches?.length > 0) {
        setMatches((prev) => [...json.matches, ...prev]);
      } else {
        setEmptyMessage(json.message || 'No new matches found. Check back later!');
      }
    } catch {
      setEmptyMessage('Something went wrong. Please try again.');
    }
    setGenerating(false);
  }, [generating]);

  async function handleConnect(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/connect`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);

    setTipVisible(true);
    setTimeout(() => {
      setTipVisible(false);
      if (json.conversation_id) router.push('/chat');
    }, 2000);
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  }

  async function handleDismiss(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/dismiss`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error);
    }
    setTimeout(() => {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    }, 100);
  }

  // Pull-to-refresh handlers
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const el = scrollRef.current;
    if (el && el.scrollTop <= 0 && dy > 80) {
      generateMatches();
    }
  }

  const isFirstWeek = signupDate
    ? (Date.now() - new Date(signupDate).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Error
  if (loadError) {
    return (
      <div className="px-4 py-6 space-y-6">
        <PageHeader title={'\u{1F91D} Opportunities'} />
        <EmptyState
          icon={<span>{'\u26A0\uFE0F'}</span>}
          title="Failed to load"
          description="Please check your connection and try again."
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  // No profile
  if (hasProfile === false) {
    return (
      <div className="px-4 py-6 space-y-6">
        <PageHeader title={'\u{1F91D} Opportunities'} />
        <EmptyState
          icon={<span>{'\u{1F30D}'}</span>}
          title="Build Your Profile First"
          description="Create your global professional profile so AI can match you with the right partners."
          action={{ label: 'Build My Profile →', onClick: () => router.push('/profile/build') }}
        />
      </div>
    );
  }

  const pendingMatches = matches.filter((m) => m.status === 'pending');
  const connectedMatches = matches.filter((m) => m.status === 'connected');

  return (
    <div
      ref={scrollRef}
      className="min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <PageHeader
        title={'\u{1F91D} Opportunities'}
        rightAction={
          <button
            onClick={generateMatches}
            disabled={generating}
            className="flex items-center justify-center w-[44px] h-[44px] rounded-full active:bg-black/5 transition-colors disabled:opacity-50"
            aria-label="Refresh matches"
          >
            <RefreshCw size={20} className={`text-[var(--pm-text-secondary)] ${generating ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Tip banner */}
        {tipVisible && (
          <GlassCard tier="established" className="animate-[cardSlideDown_300ms_var(--ease-out)_both]">
            <div className="flex items-center gap-3">
              <span>{'\u{1F4A1}'}</span>
              <p className="text-sm text-emerald-700">Share your Business Card to build trust faster</p>
            </div>
          </GlassCard>
        )}

        {/* First week badge */}
        {isFirstWeek && (
          <GlassCard tier="starter" glow>
            <div className="flex items-center gap-2">
              <span className="animate-[emojiFloat_3s_ease-in-out_infinite]">{'\u{1F331}'}</span>
              <span className="text-sm font-semibold text-amber-700">First week: unlimited matches!</span>
            </div>
          </GlassCard>
        )}

        {/* Subtitle */}
        {pendingMatches.length > 0 && (
          <p className="text-sm text-[var(--pm-text-secondary)]">
            {'\u{1F916}'} AI found{' '}
            <span className="font-semibold text-[var(--pm-text-primary)]">{pendingMatches.length}</span>{' '}
            potential partner{pendingMatches.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Match cards */}
        {generating && pendingMatches.length === 0 ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <p className="text-sm text-[var(--pm-text-tertiary)] text-center">
              AI is scanning partners across your corridors...
            </p>
          </div>
        ) : pendingMatches.length > 0 ? (
          <div className="space-y-4">
            {pendingMatches.map((match, i) => (
              <MatchCard
                key={match.id}
                match={match}
                index={i}
                onConnect={handleConnect}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<span>{emptyMessage ? '\u{1F50D}' : '\u{1F91D}'}</span>}
            title={emptyMessage ? 'No matches right now' : 'Find your partners'}
            description={emptyMessage || 'No matches yet. Let AI find business partners for you.'}
            action={{
              label: emptyMessage ? 'Try Again' : 'Find Partners →',
              onClick: generateMatches,
            }}
          />
        )}

        {/* Stats */}
        {(connectedMatches.length > 0 || pendingMatches.length > 0) && (
          <p className="text-sm text-[var(--pm-text-secondary)] text-center">
            {connectedMatches.length} connection{connectedMatches.length !== 1 ? 's' : ''}{' '}
            {'\u00B7'} {'\u{1F6E1}\uFE0F'} growing
          </p>
        )}

        {/* Action buttons */}
        <div className="space-y-2.5 pt-2">
          <Link href="/invite" className="block no-underline">
            <Button variant="outline" size="lg" className="w-full border-amber-400 text-amber-400 hover:bg-amber-950/20">
              Invite Friends (+15 Trust)
            </Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            onClick={generateMatches}
            loading={generating}
            className="w-full"
          >
            Find More Partners
          </Button>
        </div>
      </div>
    </div>
  );
}
