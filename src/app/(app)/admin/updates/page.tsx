'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface AppUpdate {
  id: string;
  title: string;
  body: string;
  type: string;
  version: string | null;
  deep_link: string | null;
  published_at: string;
  is_active: boolean;
}

const UPDATE_TYPES = [
  { value: 'feature', label: '🆕 Feature' },
  { value: 'bugfix', label: '🐛 Bug Fix' },
  { value: 'improvement', label: '⚡ Improvement' },
  { value: 'announcement', label: '📢 Announcement' },
  { value: 'tip', label: '💡 Tip' },
];

export default function AdminUpdatesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('feature');
  const [version, setVersion] = useState('');
  const [deepLink, setDeepLink] = useState('');

  // Check admin access
  const isAdmin = profile?.role === 'owner';

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      const { data } = await supabase
        .from('app_updates')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(50);
      if (data) setUpdates(data);
      setLoading(false);
    }
    load();
  }, [isAdmin, supabase]);

  async function handlePublish() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('app_updates')
      .insert({
        title: title.trim(),
        body: body.trim(),
        type,
        version: version.trim() || null,
        deep_link: deepLink.trim() || null,
        published_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (data) {
      setUpdates(prev => [data, ...prev]);
      setTitle('');
      setBody('');
      setVersion('');
      setDeepLink('');
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('app_updates').update({ is_active: !current }).eq('id', id);
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, is_active: !current } : u));
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-3 text-sm font-medium text-[var(--text-2)]">Admin access required</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-[#4F46E5]">← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-1)]">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
          <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[var(--text-1)]">Admin: Publish Updates</h1>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {/* Publish form */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="text-sm font-bold text-[var(--text-1)] mb-3">New Update</h2>

          {/* Type */}
          <div className="flex flex-wrap gap-2 mb-3">
            {UPDATE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  type === t.value
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-[var(--bg-2)] text-[var(--text-2)] hover:bg-[var(--bg-3)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Update title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-[var(--bg-1)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] mb-2"
          />

          {/* Body */}
          <textarea
            placeholder="Describe the update..."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-[var(--bg-1)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] resize-none mb-2"
          />

          {/* Version + Deep Link */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Version (e.g. 2.1.0)"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="w-1/2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[var(--bg-1)] px-3 py-2 text-xs text-[var(--text-1)] placeholder:text-[var(--text-4)]"
            />
            <input
              type="text"
              placeholder="Deep link (e.g. /detect)"
              value={deepLink}
              onChange={e => setDeepLink(e.target.value)}
              className="w-1/2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[var(--bg-1)] px-3 py-2 text-xs text-[var(--text-1)] placeholder:text-[var(--text-4)]"
            />
          </div>

          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim() || saving}
            className="w-full rounded-xl bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
          >
            {saving ? 'Publishing...' : '🚀 Publish Update'}
          </button>
        </div>

        {/* Existing updates */}
        <h2 className="mt-6 mb-3 text-xs font-bold tracking-wider text-[var(--text-4)] uppercase">
          Published Updates ({updates.length})
        </h2>
        {loading ? (
          <div className="py-8 text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {updates.map(u => (
              <div
                key={u.id}
                className={`flex items-start justify-between rounded-xl border p-3 ${
                  u.is_active
                    ? 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {UPDATE_TYPES.find(t => t.value === u.type)?.label || u.type}
                    </span>
                    {u.version && (
                      <span className="text-[9px] font-mono text-[var(--text-4)]">v{u.version}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--text-1)] truncate">{u.title}</p>
                  <p className="text-[10px] text-[var(--text-4)]">
                    {new Date(u.published_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(u.id, u.is_active)}
                  className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium ${
                    u.is_active
                      ? 'bg-[#16A34A]/10 text-[#16A34A]'
                      : 'bg-[#DC2626]/10 text-[#DC2626]'
                  }`}
                >
                  {u.is_active ? 'Active' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
