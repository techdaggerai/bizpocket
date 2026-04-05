'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
import NextActions from '@/components/profile/NextActions';
import CorridorBadge from '@/components/profile/CorridorBadge';
import type { Tier } from '@/lib/tier-system';

interface ProfileData {
  profile: any;
  classification: any;
  generated: any;
}

export default function ProfilePreviewPage() {
  const router = useRouter();
  const { user, profile, organization } = useAuth();
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
    // Try sessionStorage first (coming from build page)
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
    // Fallback: fetch from API
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
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) console.error('[ProfilePreview] Save failed:', field);
    } catch (err) {
      console.error('[ProfilePreview] Save error:', err);
    }
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
      if (!res.ok) {
        setPublishing(false);
        return;
      }
      try { sessionStorage.removeItem('spaceship_profile_build'); } catch {}
      router.push('/profile/published');
    } catch {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
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
      {/* Header */}
      <h1 className="text-lg font-bold text-[var(--text-1)] dark:text-white px-3">Your Global Profile</h1>

      {/* ─── Card 1: Header ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#E5E5E5] dark:border-gray-600" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-2xl font-bold text-[#4F46E5]">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <button
              onClick={() => router.push('/settings')}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 border border-[#E5E5E5] dark:border-gray-600 rounded-full flex items-center justify-center text-xs shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {'\u{1F4F7}'}
            </button>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white truncate">{displayName}</h2>
            {/* Title - editable */}
            {editingTitle ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-sm border border-[#C7D2FE] dark:border-indigo-800 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-[var(--text-1)] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { saveField('title', title); setEditingTitle(false); }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
                <button onClick={() => { saveField('title', title); setEditingTitle(false); }} className="text-xs text-[#4F46E5] font-semibold">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 mt-0.5 group">
                <span className="text-sm text-[var(--text-2)] dark:text-gray-300">{title || 'Add your title'}</span>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">{'\u270F\uFE0F'}</span>
              </button>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">{'\u{1F1EF}\u{1F1F5}'}</span>
              <span className="text-xs text-[var(--text-3)] dark:text-gray-400">{organization.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card 2: Tier + Trust ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <TierBadge tier={tier} size="md" />
          {tier === 'starter' && (
            <span className="text-xs text-[var(--text-3)] dark:text-gray-400">First week boost active</span>
          )}
        </div>
        <TrustScoreBar score={trustScore} tier={tier} showBreakdown />
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

      {/* ─── Card 3: Bio ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">About</h3>
          <button onClick={() => setEditingBio(!editingBio)} className="text-xs text-[#4F46E5] font-semibold">{editingBio ? 'Done' : '\u270F\uFE0F Edit'}</button>
        </div>
        {editingBio ? (
          <textarea
            value={bioEn}
            onChange={(e) => setBioEn(e.target.value)}
            onBlur={() => saveField('bio_en', bioEn)}
            rows={4}
            className="w-full text-sm border border-[#C7D2FE] dark:border-indigo-800 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-[var(--text-1)] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] resize-none"
            autoFocus
          />
        ) : (
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {bioEn || 'Your bio will appear here.'}
          </p>
        )}

        {/* Japanese bio */}
        {bioJa && (
          <div>
            <button onClick={() => setShowBioJa(!showBioJa)} className="flex items-center gap-1.5 text-xs text-[var(--text-3)] dark:text-gray-400 hover:text-[var(--text-2)] dark:hover:text-gray-300">
              <span>{'\u{1F1EF}\u{1F1F5}'}</span>
              <span>Japanese</span>
              <svg className={`w-3 h-3 transition-transform ${showBioJa ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showBioJa && (
              <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-2 pl-5 leading-relaxed">{bioJa}</p>
            )}
          </div>
        )}

        {/* Native bio */}
        {bioNative && bioNative !== bioEn && (
          <div>
            <button onClick={() => setShowBioNative(!showBioNative)} className="flex items-center gap-1.5 text-xs text-[var(--text-3)] dark:text-gray-400 hover:text-[var(--text-2)] dark:hover:text-gray-300">
              <span>{'\u{1F310}'}</span>
              <span>Native language</span>
              <svg className={`w-3 h-3 transition-transform ${showBioNative ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showBioNative && (
              <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-2 pl-5 leading-relaxed">{bioNative}</p>
            )}
          </div>
        )}
      </div>

      {/* ─── Card 4: Services ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Services</h3>
          <button onClick={() => setEditingServices(!editingServices)} className="text-xs text-[#4F46E5] font-semibold">{editingServices ? 'Done' : '\u270F\uFE0F Edit'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {services.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 bg-[#EEF2FF] dark:bg-indigo-950/30 text-[#4338CA] dark:text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full border border-[#C7D2FE] dark:border-indigo-800">
              {s}
              {editingServices && (
                <button onClick={() => handleRemoveService(i)} className="text-[#4338CA]/60 hover:text-[#DC2626] ml-0.5">&times;</button>
              )}
            </span>
          ))}
          {services.length === 0 && !editingServices && (
            <span className="text-sm text-[var(--text-3)] dark:text-gray-400">No services yet</span>
          )}
        </div>
        {editingServices && (
          <div className="flex gap-2">
            <input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Add a service..."
              className="flex-1 text-sm border border-[#E5E5E5] dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-[var(--text-1)] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
            />
            <button onClick={handleAddService} className="text-xs bg-[#4F46E5] text-white px-3 py-2 rounded-lg font-semibold">Add</button>
          </div>
        )}
      </div>

      {/* ─── Card 5: Corridors ─── */}
      {corridors.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Operating Corridors</h3>
          <div className="flex flex-wrap gap-2">
            {corridors.map((c: any, i: number) => (
              <CorridorBadge key={i} from={c.from} to={c.to} flagFrom={c.flag_from} flagTo={c.flag_to} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Card 6: Compliance ─── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Verification</h3>
        <div className="space-y-2">
          {[
            { label: 'Email verified', verified: !!user.email_confirmed_at },
            { label: 'Tax registration', verified: cls.rawData?.hasTaxInfo, action: '/settings/business-setup', actionLabel: 'Add T-number \u2192' },
            { label: 'Profile photo', verified: cls.rawData?.hasPhoto, action: '/settings', actionLabel: 'Upload photo \u2192' },
            { label: 'Business address', verified: cls.rawData?.hasAddress, action: '/settings/business-setup', actionLabel: 'Add address \u2192' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.verified ? '\u2705' : '\u2B1C'}</span>
                <span className={`text-sm ${item.verified ? 'text-[var(--text-1)] dark:text-gray-200' : 'text-[var(--text-3)] dark:text-gray-400'}`}>{item.label}</span>
              </div>
              {!item.verified && item.action && (
                <button onClick={() => router.push(item.action!)} className="text-xs text-[#4F46E5] font-semibold">{item.actionLabel}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Card 7: Next Milestone ─── */}
      {nextMilestone && (
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#F0FDF4] dark:from-indigo-950/30 dark:to-emerald-950/30 rounded-2xl border border-[#C7D2FE] dark:border-indigo-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Next Milestone</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg">{tier === 'starter' ? '\u{1F33F}' : '\u{1F333}'}</span>
            <span className="text-sm font-medium text-[var(--text-1)] dark:text-gray-200">{nextMilestone.nextTier}</span>
          </div>
          <p className="text-xs text-[var(--text-2)] dark:text-gray-300">{nextMilestone.requirement}</p>
          {/* Progress */}
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-white/50 dark:bg-gray-800 overflow-hidden">
              {(() => {
                const parts = nextMilestone.progress.split('/');
                const pct = parts.length === 2 ? Math.min(100, (parseInt(parts[0]) / parseInt(parts[1])) * 100) : 0;
                return <div className="h-full rounded-full bg-[#4F46E5] transition-all duration-500" style={{ width: `${pct}%` }} />;
              })()}
            </div>
            <p className="text-xs text-[var(--text-3)] dark:text-gray-400 text-right">{nextMilestone.progress}</p>
          </div>
        </div>
      )}

      {/* Publish button */}
      <div className="pt-4 pb-8">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white font-semibold text-base py-4 rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {publishing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>Publish & Go Live {'\u{1F680}'}</>
          )}
        </button>
      </div>
    </div>
  );
}
