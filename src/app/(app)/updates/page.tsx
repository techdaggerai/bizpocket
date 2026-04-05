'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AppUpdate {
  id: string;
  title: string;
  body: string;
  type: 'feature' | 'bugfix' | 'improvement' | 'announcement' | 'tip';
  version: string | null;
  deep_link: string | null;
  image_url: string | null;
  tutorial_steps: { title: string; description: string; image?: string }[] | null;
  published_at: string;
  is_active: boolean;
}

const TYPE_CONFIG: Record<string, { badge: string; color: string; bgColor: string }> = {
  feature:      { badge: '🆕 New Feature',   color: 'text-[#16A34A]', bgColor: 'bg-[#16A34A]/10' },
  bugfix:       { badge: '🐛 Bug Fix',       color: 'text-[#6B7280]', bgColor: 'bg-[#6B7280]/10' },
  improvement:  { badge: '⚡ Improvement',    color: 'text-[#4F46E5]', bgColor: 'bg-[#4F46E5]/10' },
  announcement: { badge: '📢 Announcement',  color: 'text-[#D97706]', bgColor: 'bg-[#D97706]/10' },
  tip:          { badge: '💡 Tip',            color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/10' },
};

const CTA_LABELS: Record<string, string> = {
  feature: 'Try It Now →',
  announcement: 'Learn More →',
  tip: 'Try It →',
  improvement: 'Check It Out →',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function groupByTime(updates: AppUpdate[]): { label: string; items: AppUpdate[] }[] {
  const now = Date.now();
  const today: AppUpdate[] = [];
  const thisWeek: AppUpdate[] = [];
  const earlier: AppUpdate[] = [];

  for (const u of updates) {
    const age = now - new Date(u.published_at).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days < 1) today.push(u);
    else if (days < 7) thisWeek.push(u);
    else earlier.push(u);
  }

  const groups: { label: string; items: AppUpdate[] }[] = [];
  if (today.length) groups.push({ label: '🆕 TODAY', items: today });
  if (thisWeek.length) groups.push({ label: '📅 THIS WEEK', items: thisWeek });
  if (earlier.length) groups.push({ label: '📦 EARLIER', items: earlier });
  return groups;
}

export default function UpdateCenterPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const userId = profile?.id;

  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedTutorial, setExpandedTutorial] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: allUpdates } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false });

      if (allUpdates) setUpdates(allUpdates);

      if (userId) {
        const { data: reads } = await supabase
          .from('user_update_reads')
          .select('update_id')
          .eq('user_id', userId);
        if (reads) setReadIds(new Set(reads.map(r => r.update_id)));
      }
      setLoading(false);
    }
    load();
  }, [userId, supabase]);

  async function markAllRead() {
    if (!userId || updates.length === 0) return;
    const unreadIds = updates.filter(u => !readIds.has(u.id)).map(u => u.id);
    if (unreadIds.length === 0) return;

    const rows = unreadIds.map(id => ({ user_id: userId, update_id: id }));
    await supabase.from('user_update_reads').upsert(rows, { onConflict: 'user_id,update_id' });
    setReadIds(new Set(updates.map(u => u.id)));
  }

  // Auto-mark all as read when page opens
  useEffect(() => {
    if (!loading && userId && updates.length > 0) {
      markAllRead();
    }
  }, [loading, userId, updates.length]);

  const unreadCount = updates.filter(u => !readIds.has(u.id)).length;
  const groups = groupByTime(updates);

  return (
    <div className="min-h-screen bg-[var(--bg-1)]">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)] transition-colors">
            <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[var(--text-1)]">What&apos;s New</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          className="text-xs font-medium text-[#4F46E5] hover:opacity-80 transition-opacity"
        >
          ✅ Mark All Read
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-4)]">Loading updates...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl">🎉</div>
            <p className="mt-3 text-sm font-medium text-[var(--text-2)]">You&apos;re all caught up!</p>
            <p className="mt-1 text-xs text-[var(--text-4)]">New features and updates will appear here.</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-6">
              <h2 className="mb-3 text-xs font-bold tracking-wider text-[var(--text-4)] uppercase">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map(update => {
                  const config = TYPE_CONFIG[update.type] || TYPE_CONFIG.feature;
                  const isUnread = !readIds.has(update.id);
                  const hasTutorial = update.tutorial_steps && update.tutorial_steps.length > 0;
                  const showTutorial = expandedTutorial === update.id;

                  return (
                    <div
                      key={update.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isUnread
                          ? 'border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] shadow-sm'
                          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                      }`}
                    >
                      {/* Type badge + time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.color} ${config.bgColor}`}>
                          {config.badge}
                        </span>
                        <span className="text-[10px] text-[var(--text-4)]">
                          {timeAgo(update.published_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-[var(--text-1)] leading-snug">
                        {update.title}
                      </h3>

                      {/* Body */}
                      <p className="mt-1.5 text-xs text-[var(--text-2)] leading-relaxed">
                        {update.body}
                      </p>

                      {/* Version tag */}
                      {update.version && (
                        <span className="mt-2 inline-block rounded-md bg-[var(--bg-2)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--text-4)]">
                          v{update.version}
                        </span>
                      )}

                      {/* Tutorial steps (expandable) */}
                      {hasTutorial && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedTutorial(showTutorial ? null : update.id)}
                            className="text-xs font-medium text-[#4F46E5] hover:opacity-80"
                          >
                            {showTutorial ? 'Hide tutorial ▲' : 'See how it works ▼'}
                          </button>
                          {showTutorial && (
                            <div className="mt-2 space-y-2 rounded-xl bg-[var(--bg-2)] p-3">
                              {update.tutorial_steps!.map((step, i) => (
                                <div key={i} className="flex gap-2">
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-[10px] font-bold text-white">
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--text-1)]">{step.title}</p>
                                    <p className="text-[10px] text-[var(--text-3)]">{step.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA button */}
                      {update.deep_link && CTA_LABELS[update.type] && (
                        <Link
                          href={update.deep_link}
                          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
                        >
                          {CTA_LABELS[update.type]}
                        </Link>
                      )}

                      {/* Unread dot */}
                      {isUnread && (
                        <div className="mt-2 flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                          <span className="text-[9px] text-[#4F46E5] font-medium">New</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
