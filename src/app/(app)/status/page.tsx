'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import PocketAvatar from '@/components/PocketAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Status {
  id: string;
  user_id: string;
  org_id: string;
  type: 'text' | 'image';
  content: string | null;
  image_url: string | null;
  background_color: string;
  views: string[];
  expires_at: string;
  created_at: string;
  // joined
  profile?: {
    name: string;
    full_name: string | null;
    avatar_url: string | null;
    language: string;
  };
}

const BG_COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#0891B2', '#374151',
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function timeLeft(expiresAt: string): string {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (diff <= 0) return 'Expired';
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  return `${Math.floor(diff / 3600)}h left`;
}

// ─── Status Ring (arc progress) ───────────────────────────────────────────────

function StatusRing({ count, viewed, size = 52 }: { count: number; viewed: boolean; size?: number }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = count > 1 ? 3 : 0;
  const segmentLength = (circumference - gap * count) / count;
  const color = viewed ? '#D1D5DB' : '#4F46E5';

  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const offset = i * (segmentLength + gap);
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke 0.3s' }}
          />
        );
      })}
    </svg>
  );
}

// ─── Status Viewer (full-screen) ─────────────────────────────────────────────

function StatusViewer({
  statuses,
  initialIndex,
  onClose,
  currentUserId,
  onMarkViewed,
}: {
  statuses: Status[];
  initialIndex: number;
  onClose: () => void;
  currentUserId: string;
  onMarkViewed: (statusId: string) => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const DURATION = 5000; // ms per status

  const status = statuses[idx];

  const advance = useCallback(() => {
    if (idx < statuses.length - 1) {
      setIdx(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [idx, statuses.length, onClose]);

  useEffect(() => {
    if (!status) return;
    onMarkViewed(status.id);
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) {
        if (timerRef.current) clearInterval(timerRef.current);
        advance();
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, status, advance, onMarkViewed]);

  if (!status) return null;

  const name = status.profile?.full_name || status.profile?.name || 'Unknown';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: status.type === 'image' ? '#000' : status.background_color }}>
      {/* Progress bars */}
      <div className="flex gap-1 p-3 pt-safe">
        {statuses.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-none"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="relative h-9 w-9 shrink-0">
          {status.profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={status.profile.avatar_url} alt={name} className="h-9 w-9 rounded-[10px] object-cover" />
          ) : (
            <PocketAvatar name={name} size={36} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{name}</p>
          <p className="text-[11px] text-white/60">{timeAgo(status.created_at)}</p>
        </div>
        <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Content */}
      <div
        className="flex flex-1 items-center justify-center px-6"
        onClick={advance}
      >
        {status.type === 'image' && status.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={status.image_url} alt="" className="max-h-full max-w-full object-contain rounded-xl" />
        ) : (
          <p className="text-center text-[clamp(20px,5vw,32px)] font-bold text-white leading-snug" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            {status.content}
          </p>
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div
          className="w-1/3 h-full pointer-events-auto"
          onClick={(e) => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)); setProgress(0); }}
        />
        <div className="flex-1 pointer-events-auto" onClick={advance} />
      </div>

      {/* View count (own status) */}
      {status.user_id === currentUserId && (
        <div className="flex items-center gap-1.5 px-5 pb-safe pb-6 mt-auto pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="text-[13px] text-white/80 font-medium">{status.views.length} view{status.views.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished: () => void;
}) {
  const { user, profile, organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [type, setType] = useState<'text' | 'image'>('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('Max 10MB', 'error'); return; }
    setUploading(true);
    try {
      const path = `${user.id}/status-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path);
      setImageUrl(publicUrl);
      setType('image');
    } catch (err) {
      console.error('[Status upload]', err);
      toast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (type === 'text' && !content.trim()) { toast('Add some text first', 'error'); return; }
    if (type === 'image' && !imageUrl) { toast('Upload an image first', 'error'); return; }
    setPublishing(true);
    try {
      const { error } = await supabase.from('statuses').insert({
        user_id: user.id,
        org_id: organization.id,
        type,
        content: type === 'text' ? content.trim() : (content.trim() || null),
        image_url: type === 'image' ? imageUrl : null,
        background_color: bgColor,
      });
      if (error) throw error;
      toast('Status posted!', 'success');
      onPublished();
      onClose();
    } catch (err) {
      console.error('[Status publish]', err);
      toast('Failed to post status', 'error');
    } finally {
      setPublishing(false);
    }
  }

  const name = profile.full_name || profile.name || 'Me';

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
        <button onClick={onClose} className="text-[#4F46E5] font-medium text-[14px]">Cancel</button>
        <p className="text-[15px] font-bold text-[#0A0A0A]">New Status</p>
        <button
          onClick={handlePublish}
          disabled={publishing || (type === 'text' ? !content.trim() : !imageUrl)}
          className="text-[14px] font-bold text-[#4F46E5] disabled:opacity-40"
        >
          {publishing ? 'Posting…' : 'Post'}
        </button>
      </div>

      {/* Type selector */}
      <div className="flex border-b border-[#F0F0F0]">
        {(['text', 'image'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 text-[13px] font-semibold capitalize transition-colors border-b-2 ${type === t ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#9CA3AF]'}`}
          >
            {t === 'text' ? '✏️ Text' : '📷 Image'}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div
        className="flex flex-1 items-center justify-center p-6 relative"
        style={{ background: type === 'image' && imageUrl ? '#000' : bgColor }}
      >
        {type === 'text' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={200}
            rows={4}
            className="w-full text-center bg-transparent text-white text-[22px] font-bold placeholder-white/50 focus:outline-none resize-none"
            autoFocus
          />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="max-h-64 max-w-full rounded-xl object-contain" />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-3 text-white/70 hover:text-white transition-colors"
          >
            {uploading ? (
              <span className="h-10 w-10 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            )}
            <span className="text-[15px] font-medium">Tap to add photo</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Author badge */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="h-7 w-7 shrink-0 rounded-lg overflow-hidden">
            <PocketAvatar name={name} size={28} />
          </div>
          <span className="text-[12px] font-semibold text-white/80">{name}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-[#F0F0F0] p-4 space-y-3">
        {/* Background colors (text only) */}
        {type === 'text' && (
          <div>
            <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-2">Background</p>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: bgColor === c ? `2.5px solid ${c}` : '2.5px solid transparent', outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
        )}
        {/* Optional caption for image */}
        {type === 'image' && imageUrl && (
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a caption (optional)"
            maxLength={100}
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] px-3 py-2.5 text-[14px] text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none"
          />
        )}
        {/* Change image button */}
        {type === 'image' && imageUrl && (
          <button
            onClick={() => { setImageUrl(''); fileRef.current?.click(); }}
            className="text-[13px] text-[#4F46E5] font-medium"
          >
            Change photo
          </button>
        )}
        <p className="text-[11px] text-[#C4C4C4] text-center">Status disappears after 24 hours</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const { user, profile, organization } = useAuth();
  const supabase = createClient();
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [contactStatuses, setContactStatuses] = useState<{ name: string; statuses: Status[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [viewer, setViewer] = useState<{ statuses: Status[]; index: number } | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!user?.id || !organization?.id) return;
    setLoading(true);
    try {
      // My statuses
      const { data: mine } = await supabase
        .from('statuses')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setMyStatuses((mine || []) as Status[]);

      // Statuses from contacts in same org (other users)
      const { data: others } = await supabase
        .from('statuses')
        .select('*, profile:profiles!statuses_user_id_fkey(name, full_name, avatar_url, language)')
        .eq('org_id', organization.id)
        .neq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Group by user
      const grouped: Record<string, { name: string; statuses: Status[] }> = {};
      for (const s of (others || []) as Status[]) {
        const name = s.profile?.full_name || s.profile?.name || 'Unknown';
        if (!grouped[s.user_id]) grouped[s.user_id] = { name, statuses: [] };
        grouped[s.user_id].statuses.push(s);
      }
      setContactStatuses(Object.values(grouped));
    } catch (err) {
      console.error('[Status fetch]', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, organization?.id, supabase]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  async function handleMarkViewed(statusId: string) {
    if (!user?.id) return;
    const { data: current } = await supabase.from('statuses').select('views').eq('id', statusId).single();
    if (!current) return;
    const views = current.views || [];
    if (views.includes(user.id)) return;
    await supabase.from('statuses').update({ views: [...views, user.id] }).eq('id', statusId);
  }

  const myName = profile.full_name || profile.name || 'My Status';
  const hasMyStatus = myStatuses.length > 0;
  const allViewed = hasMyStatus && myStatuses.every(s => s.views.includes(user?.id || ''));

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0] px-4 py-3">
        <h1 className="text-[18px] font-bold text-[#0A0A0A]">Status</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#F5F5F5]">

          {/* My Status */}
          <div className="px-4 py-2">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-[#9CA3AF] mb-3">My Status</p>
            <div className="flex items-center gap-3">
              {/* Avatar with ring */}
              <button
                onClick={() => hasMyStatus ? setViewer({ statuses: myStatuses, index: 0 }) : setShowCompose(true)}
                className="relative shrink-0"
              >
                <div className="h-[52px] w-[52px] relative">
                  {hasMyStatus && (
                    <StatusRing count={myStatuses.length} viewed={allViewed} size={52} />
                  )}
                  <div className="absolute inset-[4px] rounded-[14px] overflow-hidden">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt={myName} className="h-full w-full object-cover" />
                    ) : (
                      <PocketAvatar name={myName} size={44} />
                    )}
                  </div>
                  {/* + badge for add */}
                  {!hasMyStatus && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#4F46E5] flex items-center justify-center border-2 border-white">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                  )}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">{myName}</p>
                <p className="text-[12px] text-[#9CA3AF]">
                  {hasMyStatus ? `${myStatuses.length} status${myStatuses.length !== 1 ? 'es' : ''} · ${timeLeft(myStatuses[0].expires_at)}` : 'Tap to add status'}
                </p>
              </div>
              <button
                onClick={() => setShowCompose(true)}
                className="h-9 w-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] hover:bg-[#4F46E5] hover:text-white transition-colors"
                title="Add new status"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>

          {/* Recent Updates */}
          {contactStatuses.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-[#9CA3AF] mb-3">Recent Updates</p>
              <div className="space-y-1">
                {contactStatuses.map((group) => {
                  const latest = group.statuses[0];
                  const viewed = latest.views.includes(user?.id || '');
                  return (
                    <button
                      key={latest.user_id}
                      onClick={() => setViewer({ statuses: group.statuses, index: 0 })}
                      className="w-full flex items-center gap-3 py-2 hover:bg-[#F9FAFB] rounded-xl px-2 transition-colors text-left"
                    >
                      <div className="relative h-[52px] w-[52px] shrink-0">
                        <StatusRing count={group.statuses.length} viewed={viewed} size={52} />
                        <div className="absolute inset-[4px] rounded-[14px] overflow-hidden">
                          {latest.profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={latest.profile.avatar_url} alt={group.name} className="h-full w-full object-cover" />
                          ) : (
                            <PocketAvatar name={group.name} size={44} />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] truncate ${viewed ? 'font-medium text-[#374151]' : 'font-bold text-[#0A0A0A]'}`}>
                          {group.name}
                        </p>
                        <p className="text-[12px] text-[#9CA3AF] truncate">
                          {timeAgo(latest.created_at)} · {group.statuses.length} update{group.statuses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {/* Color preview dot */}
                      <div
                        className="h-8 w-8 rounded-lg shrink-0"
                        style={{ background: latest.type === 'image' && latest.image_url ? '#000' : latest.background_color }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {contactStatuses.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
              <div className="h-16 w-16 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <p className="text-[15px] font-semibold text-[#0A0A0A]">No updates yet</p>
              <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
                When your contacts post statuses, you&apos;ll see them here. Post your own to get started.
              </p>
              <button
                onClick={() => setShowCompose(true)}
                className="mt-2 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#4338CA] transition-colors"
              >
                Post your first status
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onPublished={() => fetchStatuses()}
        />
      )}

      {/* Status viewer */}
      {viewer && (
        <StatusViewer
          statuses={viewer.statuses}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          currentUserId={user?.id || ''}
          onMarkViewed={handleMarkViewed}
        />
      )}
    </div>
  );
}
