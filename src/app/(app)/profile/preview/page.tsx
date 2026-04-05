'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useDelight } from '@/contexts/DelightContext';
import { createClient } from '@/lib/supabase-client';
import GlassCard from '@/components/ui/GlassCard';
import PocketAvatar from '@/components/ui/PocketAvatar';
import Button from '@/components/ui/Button';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
import CorridorBadge from '@/components/profile/CorridorBadge';
import NextActions from '@/components/profile/NextActions';
import type { Tier } from '@/lib/tier-system';

interface ProfileData {
  profile: any;
  classification: any;
  generated: any;
}

export default function ProfilePreviewPage() {
  const router = useRouter();
  const { user, profile, organization } = useAuth();
  const { trigger: triggerDelight } = useDelight();
  const supabase = createClient();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Editable fields
  const [editingBio, setEditingBio] = useState(false);
  const [bioEn, setBioEn] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingServices, setEditingServices] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');

  // Collapsible bios
  const [showBioJa, setShowBioJa] = useState(false);
  const [showBioNative, setShowBioNative] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('spaceship_profile_build');
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setBioEn(parsed.generated?.bio_en || parsed.profile?.bio_en || '');
        setTitle(parsed.generated?.title || parsed.profile?.title || '');
        setServices(parsed.generated?.services || parsed.profile?.services || []);
        setLoading(false);
        return;
      }
    } catch {}
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile/me');
      const json = await res.json();
      if (json.profile) {
        setData({ profile: json.profile, classification: null, generated: null });
        setBioEn(json.profile.bio_en || '');
        setTitle(json.profile.title || '');
        setServices(json.profile.services || []);
      } else {
        router.push('/profile/build');
      }
    } catch {
      router.push('/profile/build');
    }
    setLoading(false);
  }

  async function saveField(field: string, value: any) {
    try {
      await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {}
  }

  function handleAddService() {
    const trimmed = newService.trim();
    if (trimmed && !services.includes(trimmed)) {
      const updated = [...services, trimmed];
      setServices(updated);
      saveField('services', updated);
    }
    setNewService('');
  }

  function handleRemoveService(idx: number) {
    const updated = services.filter((_, i) => i !== idx);
    setServices(updated);
    saveField('services', updated);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: true }),
      });
      if (!res.ok) { setPublishing(false); return; }
      try { sessionStorage.removeItem('spaceship_profile_build'); } catch {}
      const result = await res.json();
      triggerDelight({ type: 'profile_published' });
      if (result.referralAwarded) {
        // Delay referral delight so it doesn't overlap with profile_published confetti
        setTimeout(() => triggerDelight({ type: 'referral_published', points: 15 }), 3000);
      }
      router.push('/profile/published');
    } catch {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const p = data.profile || {};
  const cls = data.classification || {};
  const gen = data.generated || {};
  const tier = (p.tier || cls.tier || 'starter') as Tier;
  const trustScore = p.trust_score || cls.trustScore || 20;
  const corridors = gen.operating_corridors || p.operating_corridors || [];
  const nextActions = cls.nextActions || [];
  const nextMilestone = cls.nextMilestone;
  const bioJa = gen.bio_ja || p.bio_ja || '';
  const bioNative = gen.bio_native || p.bio_native || '';
  const avatarUrl = profile.avatar_url || '';
  const displayName = profile.full_name || profile.name || '';

  return (
    <div className="space-y-4 py-6 px-1">
      <h1
        className="text-lg font-semibold text-[var(--pm-text-primary)] px-3"
        style={{ fontFamily: 'var(--font-display), sans-serif' }}
      >
        Your Global Profile
      </h1>

      {/* ─── Card 1: Header ─── */}
      <GlassCard adaptiveRefraction>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <PocketAvatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              tier={tier}
            />
            <button
              onClick={() => router.push('/settings')}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-xs shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {'\u{1F4F7}'}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--pm-text-primary)] truncate">{displayName}</h2>
            {/* Title - editable */}
            {editingTitle ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-sm border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-[var(--pm-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { saveField('title', title); setEditingTitle(false); }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
                <button onClick={() => { saveField('title', title); setEditingTitle(false); }} className="text-xs text-indigo-600 font-semibold">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 mt-0.5 group">
                <span className="text-sm text-[var(--pm-text-secondary)]">{title || 'Add your title'}</span>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">{'\u270F\uFE0F'}</span>
              </button>
            )}
            <div className="flex items-center gap-2 mt-2">
              <TierBadge tier={tier} size="sm" />
            </div>
            <p className="text-xs text-[var(--pm-text-tertiary)] mt-1">{organization.name}</p>
          </div>
        </div>
      </GlassCard>

      {/* ─── Card 2: Bio ─── */}
      <GlassCard adaptiveRefraction>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">About</h3>
            <button onClick={() => setEditingBio(!editingBio)} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              {editingBio ? 'Done' : '\u270F\uFE0F Edit'}
            </button>
          </div>
          {editingBio ? (
            <textarea
              value={bioEn}
              onChange={(e) => setBioEn(e.target.value)}
              onBlur={() => saveField('bio_en', bioEn)}
              rows={4}
              className="w-full text-sm border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-[var(--pm-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              autoFocus
            />
          ) : (
            <p className="text-sm text-[var(--pm-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {bioEn || 'Your bio will appear here.'}
            </p>
          )}

          {/* Japanese bio */}
          {bioJa && (
            <div>
              <button onClick={() => setShowBioJa(!showBioJa)} className="flex items-center gap-1.5 text-xs text-[var(--pm-text-tertiary)] hover:text-[var(--pm-text-secondary)]">
                <span>{'\u{1F1EF}\u{1F1F5}'}</span>
                <span>Japanese</span>
                <svg className={`w-3 h-3 transition-transform ${showBioJa ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showBioJa && (
                <p className="text-sm text-[var(--pm-text-secondary)] mt-2 pl-5 leading-relaxed">{bioJa}</p>
              )}
            </div>
          )}

          {/* Native bio */}
          {bioNative && bioNative !== bioEn && (
            <div>
              <button onClick={() => setShowBioNative(!showBioNative)} className="flex items-center gap-1.5 text-xs text-[var(--pm-text-tertiary)] hover:text-[var(--pm-text-secondary)]">
                <span>{'\u{1F310}'}</span>
                <span>Native language</span>
                <svg className={`w-3 h-3 transition-transform ${showBioNative ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showBioNative && (
                <p className="text-sm text-[var(--pm-text-secondary)] mt-2 pl-5 leading-relaxed">{bioNative}</p>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ─── Card 3: Services ─── */}
      <GlassCard adaptiveRefraction>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">Services</h3>
            <button onClick={() => setEditingServices(!editingServices)} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              {editingServices ? 'Done' : '\u270F\uFE0F Edit'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {s}
                {editingServices && (
                  <button onClick={() => handleRemoveService(i)} className="text-indigo-400 hover:text-red-500 ml-0.5">&times;</button>
                )}
              </span>
            ))}
            {services.length === 0 && !editingServices && (
              <span className="text-sm text-[var(--pm-text-tertiary)]">No services yet</span>
            )}
          </div>
          {editingServices && (
            <div className="flex gap-2">
              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add a service..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-[var(--pm-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
              />
              <button onClick={handleAddService} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg font-semibold">Add</button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ─── Card 4: Corridors ─── */}
      {corridors.length > 0 && (
        <GlassCard adaptiveRefraction>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">Operating Corridors</h3>
            <div className="flex flex-wrap gap-2">
              {corridors.map((c: any, i: number) => (
                <CorridorBadge key={i} from={c.from} to={c.to} flagFrom={c.flag_from} flagTo={c.flag_to} variant="card" />
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* ─── Card 5: Trust ─── */}
      <GlassCard tier={tier} glow adaptiveRefraction>
        <div className="space-y-4">
          <TierBadge tier={tier} trustScore={trustScore} size="lg" />
          {nextActions.length > 0 && tier === 'starter' && (
            <NextActions
              actions={nextActions}
              onActionTap={(a) => {
                if (a.action.includes('invoice')) router.push('/invoices/new');
                else if (a.action.includes('photo')) router.push('/settings');
                else if (a.action.includes('phone') || a.action.includes('address')) router.push('/settings/business-setup');
                else if (a.action.includes('tax')) router.push('/settings/business-setup');
              }}
            />
          )}
        </div>
      </GlassCard>

      {/* ─── Card 6: Next Milestone ─── */}
      {nextMilestone && (
        <GlassCard adaptiveRefraction className="bg-gradient-to-r from-indigo-50/80 to-emerald-50/80 dark:from-indigo-950/30 dark:to-emerald-950/30">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">Next Milestone</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg">{tier === 'starter' ? '\u{1F33F}' : '\u{1F333}'}</span>
              <span className="text-sm font-medium text-[var(--pm-text-primary)]">{nextMilestone.nextTier}</span>
            </div>
            <p className="text-xs text-[var(--pm-text-secondary)]">{nextMilestone.requirement}</p>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-white/50 dark:bg-gray-800 overflow-hidden">
                {(() => {
                  const parts = nextMilestone.progress.split('/');
                  const pct = parts.length === 2 ? Math.min(100, (parseInt(parts[0]) / parseInt(parts[1])) * 100) : 0;
                  return <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-[1200ms] [transition-timing-function:var(--ease-out)]" style={{ width: `${pct}%` }} />;
                })()}
              </div>
              <p className="text-xs text-[var(--pm-text-tertiary)] text-right">{nextMilestone.progress}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Publish button */}
      <div className="pt-4 pb-8">
        <Button
          variant="primary"
          size="xl"
          onClick={handlePublish}
          loading={publishing}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
        >
          Publish & Go Live {'\u{1F680}'}
        </Button>
      </div>
    </div>
  );
}
