'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useDelight } from '@/contexts/DelightContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EvryWherMark from '@/components/EvryWherMark';
import NotificationSoundPicker from '@/components/NotificationSoundPicker';
import { useChatLock, ChatLockSetupModal } from '@/components/ChatLockScreen';
import PocketAvatar from '@/components/PocketAvatar';
import PocketAvatarUI from '@/components/ui/PocketAvatar';
import { wallpapers, getSavedWallpaperId, saveWallpaperId } from '@/lib/wallpapers';
import { getSoundPrefs, saveSoundPrefs, previewMessageSound } from '@/lib/sounds';
import TierBadge from '@/components/profile/TierBadge';
import GlassCard from '@/components/ui/GlassCard';
import type { Tier } from '@/lib/tier-system';
import { getBrandModeClient } from '@/lib/brand';

// ─── Dark mode helpers ────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

function useDarkMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('evrywher-theme') as ThemeMode) || 'system';
    setModeState(saved);
    applyTheme(saved);

    // Listen for system pref changes when in system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if ((localStorage.getItem('evrywher-theme') || 'system') === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = (m: ThemeMode) => {
    localStorage.setItem('evrywher-theme', m);
    setModeState(m);
    applyTheme(m);
  };

  return [mode, setMode];
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'ar', name: 'العربية', flag: '🇦🇪' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ps', name: 'پښتو', flag: '🇦🇫' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative shrink-0"
      style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: on ? '#4F46E5' : '#475569', transition: 'background-color 0.2s' }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-slate-800 shadow transition-transform"
        style={{ left: on ? 20 : 2 }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] uppercase font-medium tracking-[0.5px] text-[var(--text-3)] mb-1.5 px-1">
      {children}
    </p>
  );
}

function SettingsRow({ first, last, children }: { first?: boolean; last?: boolean; children: React.ReactNode }) {
  const radius = first && last ? '8px' : first ? '8px 8px 0 0' : last ? '0 0 8px 8px' : '0';
  return (
    <div
      className="flex items-center justify-between bg-slate-800 px-4 py-3"
      style={{ borderRadius: radius, marginTop: first ? 0 : 1 }}
    >
      {children}
    </div>
  );
}

function FeedbackSection() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [fbMessage, setFbMessage] = useState('');
  const [fbType, setFbType] = useState('general');
  const [fbSending, setFbSending] = useState(false);

  async function handleSendFeedback() {
    if (!fbMessage.trim() || !user?.id) return;
    setFbSending(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      org_id: organization?.id || null,
      message: fbMessage.trim(),
      type: fbType,
    });
    setFbSending(false);
    if (error) {
      console.error('[Feedback]', error);
      toast('Failed to send feedback', 'error');
    } else {
      setFbMessage('');
      setFbType('general');
      toast("Thanks! We'll look into this.", 'success');
    }
  }

  return (
    <div>
      <SectionLabel>Feedback</SectionLabel>
      <div className="bg-slate-800 rounded-lg p-4 space-y-3">
        <select
          value={fbType}
          onChange={(e) => setFbType(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none"
        >
          <option value="general">General</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
        </select>
        <textarea
          value={fbMessage}
          onChange={(e) => setFbMessage(e.target.value)}
          placeholder="Tell us what you think..."
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none resize-none"
        />
        <button
          onClick={handleSendFeedback}
          disabled={fbSending || !fbMessage.trim()}
          className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors"
        >
          {fbSending ? 'Sending...' : 'Send Feedback'}
        </button>
      </div>
    </div>
  );
}

/* ---------- Wallpaper Picker ---------- */

function WallpaperPicker() {
  const [activeId, setActiveId] = useState(getSavedWallpaperId());

  const select = (id: string) => {
    setActiveId(id);
    saveWallpaperId(id);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {wallpapers.map(wp => (
          <button
            key={wp.id}
            onClick={() => select(wp.id)}
            className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
              activeId === wp.id ? 'border-[#4F46E5] ring-1 ring-[#4F46E5]/50' : 'border-slate-700'
            }`}
          >
            {/* Preview thumbnail */}
            <div className="h-[80px] relative" style={wp.previewStyle}>
              {/* Mini fake message bubbles */}
              <div className="absolute left-2 top-3 bg-slate-700/60 rounded-lg rounded-tl-sm px-2 py-1 max-w-[60%]">
                <div className="h-1.5 w-10 bg-slate-500/40 rounded-full" />
                <div className="h-1.5 w-6 bg-slate-500/30 rounded-full mt-1" />
              </div>
              <div className="absolute right-2 top-[38px] bg-indigo-600/40 rounded-lg rounded-tr-sm px-2 py-1">
                <div className="h-1.5 w-8 bg-indigo-400/40 rounded-full" />
              </div>
              {activeId === wp.id && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#4F46E5] flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </div>
            {/* Label */}
            <div className="px-2 py-1.5 bg-slate-800">
              <p className="text-[10px] text-slate-400 text-center truncate">{wp.emoji} {wp.name}</p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9CA3AF] mt-2">Tap to apply. Reopen chat to see the change.</p>
    </div>
  );
}

function InviteLinkRow() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('profiles').select('username').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.username) setUsername(data.username);
    });
  }, [user.id, supabase]);

  async function handleCopy() {
    if (!username) return;
    const link = `evrywher.io/c/${username}`;
    try { await navigator.clipboard.writeText(`https://${link}`); } catch {
      const el = document.createElement('input');
      el.value = `https://${link}`;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!username) return null;

  return (
    <SettingsRow last>
      <span className="text-[14px] text-[var(--text-2)]">Invite link</span>
      <button onClick={handleCopy} className="text-[14px] text-indigo-400 font-medium flex items-center gap-1">
        <span className="font-mono text-[13px]">evrywher.io/c/{username}</span>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
    </SettingsRow>
  );
}

export default function SettingsPage() {
  const { profile, organization, user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const { trigger: triggerDelight } = useDelight();
  const supabase = createClient();
  const router = useRouter();
  const [themeMode, setThemeMode] = useDarkMode();

  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';

  useEffect(() => { document.title = isPocketChatMode ? 'Evrywher — Settings' : 'BizPocket — Settings'; }, [isPocketChatMode]);

  // Shared state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'accountant'>('accountant');
  const [inviting, setInviting] = useState(false);
  const [awayEnabled, setAwayEnabled] = useState(organization.away_enabled || false);
  const [awayMessage, setAwayMessage] = useState(organization.away_message || '');
  const [businessHoursStart, setBusinessHoursStart] = useState(organization.business_hours_start || '09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState(organization.business_hours_end || '18:00');
  const [savingAway, setSavingAway] = useState(false);

  // PocketChat-only state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.full_name || profile.name || '');
  const [statusValue, setStatusValue] = useState('Available');
  const [editingStatus, setEditingStatus] = useState(false);

  // Status message state
  const STATUS_PRESETS = ['Available', 'Busy', 'At work', 'In a meeting', 'On vacation', 'Do not disturb'];
  const [statusMsg, setStatusMsg] = useState<string>(profile.status_message || '');
  const [editingStatusMsg, setEditingStatusMsg] = useState(false);
  const [savingStatusMsg, setSavingStatusMsg] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [translationSounds, setTranslationSounds] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Chat Lock state
  const { enabled: chatLockEnabled, enableLock, disableLock } = useChatLock();
  const [showLockSetup, setShowLockSetup] = useState(false);

  // Sound prefs
  const [soundPrefs, setSoundPrefsState] = useState(getSoundPrefs);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const updateSoundPref = (update: Partial<typeof soundPrefs>) => {
    const next = { ...soundPrefs, ...update };
    setSoundPrefsState(next);
    saveSoundPrefs(update);
  };

  function handleChatLockToggle(val: boolean) {
    if (val) {
      setShowLockSetup(true);
    } else {
      disableLock();
      toast('Chat Lock disabled', 'success');
    }
  }

  async function handleLockSave(pin: string) {
    await enableLock(pin);
    setShowLockSetup(false);
    toast('Chat Lock enabled', 'success');
  }

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Global profile for tier badge
  const [gpData, setGpData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/profile/me').then(r => r.json()).then(d => { if (d.profile) setGpData(d.profile); }).catch(() => {});
  }, []);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast('Avatar updated!', 'success');
      // ─── Trust event: photo_uploaded (one-time, deduped server-side)
      fetch('/api/trust/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'photo_uploaded' }),
      }).then(r => r.json()).then(res => {
        if (!res.skipped) triggerDelight({ type: 'trust_earned', points: 2 })
      }).catch(() => {})
    } catch (err: unknown) {
      console.error('[Avatar upload]', err);
      toast('Upload failed. Please try again.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;
    setDeleting(true);
    try {
      // Delete profile data (cascade will handle org data via RLS policies)
      await supabase.from('profiles').delete().eq('id', profile.id);
      // Best-effort: call delete_user_account RPC if it exists
      try {
        await supabase.rpc('delete_user_account');
      } catch (_) {
        // RPC may not exist yet — sign out anyway
      }
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.error('[Delete account]', err);
      toast('Failed to delete account. Please contact support.', 'error');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const { error } = await supabase.from('profiles').insert({
      user_id: user.id, organization_id: organization.id, role: inviteRole,
      name: `${inviteRole === 'accountant' ? 'Accountant' : 'Staff'} (Invited)`,
      email: inviteEmail, language: lang,
    });
    setInviting(false);
    if (error) { toast(error.message, 'error'); }
    else { toast(`Invitation sent to ${inviteEmail}`, 'success'); setInviteEmail(''); }
  }

  async function handleSaveAway() {
    setSavingAway(true);
    const { error } = await supabase.from('organizations').update({
      away_enabled: awayEnabled, away_message: awayMessage,
      business_hours_start: businessHoursStart, business_hours_end: businessHoursEnd,
    }).eq('id', organization.id);
    setSavingAway(false);
    if (error) toast(error.message, 'error');
    else toast('Away settings saved', 'success');
  }

  async function handleLanguageChange(newLang: string) {
    setLang(newLang as 'en' | 'ja' | 'ur');
    await supabase.from('profiles').update({ language: newLang }).eq('id', profile.id);
    setShowLangPicker(false);
    toast('Language updated', 'success');
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return;
    await supabase.from('profiles').update({ name: nameValue.trim(), full_name: nameValue.trim() }).eq('id', profile.id);
    setEditingName(false);
    toast('Name updated', 'success');
  }

  async function handleSaveStatusMsg(value: string) {
    setSavingStatusMsg(true);
    try {
      await supabase.from('profiles').update({ status_message: value.trim() || null }).eq('id', profile.id);
      setStatusMsg(value.trim());
      setEditingStatusMsg(false);
      toast('Status updated', 'success');
    } catch (err) {
      console.error('[status msg]', err);
      toast('Failed to save', 'error');
    } finally {
      setSavingStatusMsg(false);
    }
  }

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const plan = organization?.plan || 'free';
  const userName = profile.full_name || profile.name || 'User';

  // ─── PocketChat Settings ───
  if (isPocketChatMode) {
    return (
      <>
      <div className="max-w-lg mx-auto space-y-5 py-6">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <PocketAvatar name={userName} size={80} />
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-[#4F46E5] flex items-center justify-center hover:bg-[#4338CA] transition-colors disabled:opacity-70"
              title="Change photo"
            >
              {uploadingAvatar ? (
                <span className="h-3 w-3 rounded-full border border-white border-t-transparent animate-spin block" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-[16px] font-medium text-[var(--text-1)]">{userName}</p>
          <p className="text-[13px] text-[var(--text-3)]">{user?.email || statusValue}</p>
          {gpData && (
            <div className="mt-1.5">
              <TierBadge tier={(gpData.tier || 'starter') as Tier} trustScore={gpData.trust_score} size="sm" />
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div>
          <SectionLabel>Profile</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Name</span>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  className="w-36 border border-[#475569] rounded-lg px-2 py-1 text-[14px] text-right focus:outline-none focus:border-[#4F46E5]"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="text-indigo-400 text-[13px] font-medium">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="text-[14px] text-[var(--text-1)] font-medium flex items-center gap-1">
                {userName}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Status message</span>
            <button
              onClick={() => setEditingStatusMsg(true)}
              className="text-[14px] text-[var(--text-3)] flex items-center gap-1 max-w-[160px] truncate"
            >
              <span className="truncate">{statusMsg || 'Add a status…'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </SettingsRow>

          {/* Status message editor modal */}
          {editingStatusMsg && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[15px] font-bold text-[var(--text-1)]">Status Message</p>
                  <button onClick={() => setEditingStatusMsg(false)} className="text-[#9CA3AF] hover:text-[#374151]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {STATUS_PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setStatusMsg(preset)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                        statusMsg === preset
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-slate-700 text-[#374151] border-slate-700 hover:border-[#4F46E5] hover:text-indigo-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <textarea
                  value={statusMsg}
                  onChange={e => setStatusMsg(e.target.value.slice(0, 140))}
                  placeholder="Or write your own status…"
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-[14px] text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none resize-none mb-1"
                  autoFocus
                />
                <p className="text-[11px] text-[#9CA3AF] text-right mb-3">{statusMsg.length}/140</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setStatusMsg(''); handleSaveStatusMsg(''); }}
                    className="flex-1 rounded-lg border border-slate-700 py-2.5 text-[13px] font-medium text-[var(--text-3)] hover:bg-slate-800 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleSaveStatusMsg(statusMsg)}
                    disabled={savingStatusMsg}
                    className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-[13px] font-medium text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors"
                  >
                    {savingStatusMsg ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Email</span>
            <span className="text-[14px] text-[var(--text-3)]">{user.email}</span>
          </SettingsRow>
          <InviteLinkRow />
        </div>

        {/* LANGUAGE & TRANSLATION */}
        <div>
          <SectionLabel>Language & Translation</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">My language</span>
            <div className="relative">
              <button onClick={() => setShowLangPicker(!showLangPicker)} className="text-[14px] text-[var(--text-1)] font-medium flex items-center gap-1">
                {currentLang.flag} {currentLang.name}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
              {showLangPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                  <div className="absolute right-0 top-8 z-50 w-48 max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-lg">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => handleLanguageChange(l.code)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-700 ${lang === l.code ? 'text-indigo-400 font-medium' : 'text-[var(--text-1)]'}`}>
                        {l.flag} {l.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </SettingsRow>
          <SettingsRow last>
            <span className="text-[14px] text-[var(--text-2)]">Auto-translate messages</span>
            <Toggle on={autoTranslate} onChange={setAutoTranslate} />
          </SettingsRow>
        </div>

        {/* PRIVACY */}
        <div>
          <SectionLabel>Privacy</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Last seen</span>
            <span className="text-[14px] text-[var(--text-3)]">Everyone</span>
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Read receipts</span>
            <Toggle on={readReceipts} onChange={setReadReceipts} />
          </SettingsRow>
          <SettingsRow last>
            <span className="text-[14px] text-[var(--text-2)]">Block list</span>
            <span className="text-[14px] text-[var(--text-3)] flex items-center gap-1">
              0 blocked
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </span>
          </SettingsRow>
        </div>

        {/* CHAT LOCK */}
        <div>
          <SectionLabel>Chat Lock</SectionLabel>
          <SettingsRow first last>
            <div>
              <span className="text-[14px] text-[var(--text-2)]">Require PIN to open app</span>
              <p className="text-[11px] text-[var(--text-4)] mt-0.5">
                {chatLockEnabled ? '4–6 digit PIN set' : 'Disabled'}
              </p>
            </div>
            <Toggle on={chatLockEnabled} onChange={handleChatLockToggle} />
          </SettingsRow>
        </div>

        {/* SOUNDS & NOTIFICATIONS */}
        <div>
          <SectionLabel>Sounds & Notifications</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Message notifications</span>
            <Toggle on={messageNotifs} onChange={setMessageNotifs} />
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Message sounds</span>
            <Toggle on={soundPrefs.messageEnabled} onChange={v => updateSoundPref({ messageEnabled: v })} />
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Send sound</span>
            <Toggle on={soundPrefs.sendEnabled} onChange={v => updateSoundPref({ sendEnabled: v })} />
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Call ringtone</span>
            <Toggle on={soundPrefs.callEnabled} onChange={v => updateSoundPref({ callEnabled: v })} />
          </SettingsRow>
          <SettingsRow last>
            <span className="text-[14px] text-[var(--text-2)]">Message sound style</span>
            <button
              onClick={() => setShowStylePicker(v => !v)}
              className="text-[14px] text-indigo-400 font-medium flex items-center gap-1"
            >
              {{ chime: '🔔 Chime', bubble: '🫧 Bubble', melody: '🎵 Melody', silent: '🔕 Silent' }[soundPrefs.messageStyle]}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </SettingsRow>

          {/* Sound style picker */}
          {showStylePicker && (
            <div className="mt-1 rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
              {([
                { id: 'chime' as const, emoji: '🔔', name: 'Chime', desc: 'Gentle two-tone chime' },
                { id: 'bubble' as const, emoji: '🫧', name: 'Bubble', desc: 'Bubbly pop sound' },
                { id: 'melody' as const, emoji: '🎵', name: 'Melody', desc: 'Three-note ascending' },
                { id: 'silent' as const, emoji: '🔕', name: 'Silent', desc: 'Vibration only' },
              ] as const).map(s => (
                <button
                  key={s.id}
                  onClick={() => { updateSoundPref({ messageStyle: s.id }); previewMessageSound(s.id); }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <span className="text-xl w-8 text-center">{s.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-[14px] font-semibold ${soundPrefs.messageStyle === s.id ? 'text-indigo-400' : 'text-slate-200'}`}>{s.name}</p>
                    <p className="text-[12px] text-slate-500">{s.desc}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    soundPrefs.messageStyle === s.id ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-slate-600 bg-slate-800'
                  }`}>
                    {soundPrefs.messageStyle === s.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Existing notification sound picker */}
          <SettingsRow first last>
            <span className="text-[14px] text-[var(--text-2)]">Notification sound</span>
            <button
              onClick={() => setShowSoundPicker(v => !v)}
              className="text-[14px] text-indigo-400 font-medium flex items-center gap-1"
            >
              Choose
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </SettingsRow>

          {showSoundPicker && (
            <div className="mt-1 rounded-xl overflow-hidden border border-slate-700">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                <p className="text-[13px] font-semibold text-[var(--text-1)]">Notification Sound</p>
                <button onClick={() => setShowSoundPicker(false)} className="text-[#9CA3AF] hover:text-[#374151]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <NotificationSoundPicker />
            </div>
          )}
        </div>

        {/* APPEARANCE */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-slate-200">Theme</span>
              <span className="px-3 py-1 rounded-md text-[12px] font-medium bg-[#4F46E5] text-white">Dark</span>
            </div>
          </div>
        </div>

        {/* CHAT WALLPAPER */}
        <div>
          <SectionLabel>Chat Wallpaper</SectionLabel>
          <div className="bg-slate-800 rounded-lg p-4">
            <WallpaperPicker />
          </div>
        </div>

        {/* LANGUAGE LEARNING */}
        <div>
          <SectionLabel>Language Learning</SectionLabel>
          <SettingsRow first>
            <div>
              <span className="text-[14px] text-[var(--text-2)]">Learn from messages</span>
              <p className="text-[11px] text-[var(--text-4)] mt-0.5">Show vocabulary cards on translated messages</p>
            </div>
            <Toggle on={typeof window !== 'undefined' && localStorage.getItem('language_learning') === 'on'} onChange={(val) => { localStorage.setItem('language_learning', val ? 'on' : 'off'); toast(val ? 'Language Learning enabled' : 'Language Learning disabled', 'success'); }} />
          </SettingsRow>
          <SettingsRow last>
            <Link href="/vocabulary" className="flex items-center justify-between w-full">
              <div>
                <p className="text-[14px] text-[var(--text-1)] font-medium">My Vocabulary</p>
                <p className="text-[12px] text-[var(--text-3)]">Review saved words from conversations</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
        </div>

        {/* BOT & AI */}
        <div>
          <SectionLabel>Bot & AI</SectionLabel>
          <SettingsRow first last>
            <Link href="/chat/bot-setup" className="flex items-center justify-between w-full">
              <div>
                <p className="text-[14px] text-[var(--text-1)] font-medium">Bot Setup</p>
                <p className="text-[12px] text-[var(--text-3)]">Name, personality, rules, avatar</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
        </div>

        {/* TRUST & VERIFICATION */}
        <div>
          <SectionLabel>Trust & Verification</SectionLabel>
          <SettingsRow first>
            <Link href={gpData ? '/profile/preview' : '/profile/build'} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-xl">{'\u{1F30D}'}</span>
                <div>
                  <p className="text-[14px] text-[var(--text-1)] font-medium">Global Profile</p>
                  <p className="text-[12px] text-[var(--text-3)]">{gpData ? 'View & edit your profile' : 'Build your AI-powered profile'}</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
          <SettingsRow>
            <Link href="/verification" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-xl">{'\u{1F7E2}'}</span>
                <div>
                  <p className="text-[14px] text-[var(--text-1)] font-medium">ID Verification</p>
                  <p className="text-[12px] text-[var(--text-3)]">Get the green verified badge</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
          <SettingsRow last>
            <Link href="/invite" className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span className="text-xl">{'\u{1F4E4}'}</span>
                <div>
                  <p className="text-[14px] text-[var(--text-1)] font-medium">Invite Friends</p>
                  <p className="text-[12px] text-[var(--text-3)]">Both earn +15 Trust Score</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
        </div>

        {/* (Referrals section moved to Trust & Verification above) */}

        {/* FEEDBACK */}
        <FeedbackSection />

        {/* ACCOUNT */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Plan</span>
            <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${plan === 'free' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#EDE9FE] text-indigo-400'}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </SettingsRow>
          <SettingsRow>
            <Link href="/settings/upgrade" className="flex items-center justify-between w-full">
              <div>
                <p className="text-[14px] text-[var(--text-1)] font-medium">Unlock BizPocket</p>
                <p className="text-[12px] text-[var(--text-3)]">Invoices, business tools, team management</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </SettingsRow>
          <SettingsRow last>
            <button onClick={handleLogout} className="text-[14px] text-[#DC2626] font-medium">Log out</button>
          </SettingsRow>
        </div>

        {/* ABOUT EVRYWHER */}
        <div>
          <SectionLabel>About <EvryWherMark size="sm" /></SectionLabel>
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ marginTop: 0 }}>
              <span className="text-[14px] text-[var(--text-2)]">Version</span>
              <span className="text-[14px] text-[var(--text-3)] font-mono">1.0.0</span>
            </div>
            <div className="h-px bg-[#EFEFEF]" />
            <a href="https://evrywher.io" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors">
              <span className="text-[14px] text-[var(--text-2)]">Website</span>
              <span className="text-[14px] text-indigo-400 flex items-center gap-1">
                evrywher.io
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </span>
            </a>
            <div className="h-px bg-[#EFEFEF]" />
            <Link href="/updates" className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors">
              <span className="text-[14px] text-[var(--text-2)]">What&apos;s New ✨</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
            <div className="h-px bg-[#EFEFEF]" />
            <Link href="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors">
              <span className="text-[14px] text-[var(--text-2)]">Privacy Policy</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
            <div className="h-px bg-[#EFEFEF]" />
            <Link href="/terms" className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors" style={{ borderRadius: '0 0 8px 8px' }}>
              <span className="text-[14px] text-[var(--text-2)]">Terms of Service</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
          <p className="text-center text-[12px] text-[var(--text-4)] mt-3">Made with ❤️ in Japan · TechDagger</p>
        </div>

        {/* EMERGENCY CARD */}
        <div>
          <SectionLabel>Safety</SectionLabel>
          <Link href="/emergency" className="flex items-center gap-3 bg-[#FEF2F2] rounded-lg px-4 py-3 border border-[#FECACA]/50">
            <span className="text-xl">🆘</span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#DC2626]">Emergency Card</p>
              <p className="text-[11px] text-[#991B1B]/60">Offline emergency phrases + your medical info</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>

        {/* DELETE ACCOUNT */}
        <div className="pb-2">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full rounded-lg border border-[#DC2626]/20 bg-[#FEF2F2] py-3 text-[14px] font-medium text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
          >
            Delete Account
          </button>
        </div>

        {/* DELETE CONFIRM DIALOG */}
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--text-1)]">Delete Account</p>
                  <p className="text-[12px] text-[var(--text-3)]">This cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] text-[var(--text-2)] mb-4">
                All your data — messages, contacts, settings — will be permanently deleted. Type <strong>delete</strong> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type &quot;delete&quot; to confirm"
                className="w-full rounded-lg border border-slate-700 px-3 py-2.5 text-[13px] text-[var(--text-1)] focus:border-[#DC2626] focus:outline-none mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-[14px] font-medium text-[var(--text-2)] hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                  className="flex-1 rounded-lg bg-[#DC2626] py-2.5 text-[14px] font-medium text-white disabled:opacity-40 hover:bg-[#B91C1C] transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Lock PIN Setup Modal */}
      {showLockSetup && (
        <ChatLockSetupModal
          onSave={handleLockSave}
          onCancel={() => setShowLockSetup(false)}
        />
      )}
    </>
    );
  }

  // ─── BizPocket Settings (unchanged) ───
  return (
    <>
    <div className="space-y-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text-1)]">{t('settings.title')}</h1>

      {/* Business Profile */}
      <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.business_profile')}</h2>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Business Name</span>
            <span className="font-medium text-[var(--text-1)]">{organization.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Type</span>
            <span className="font-medium text-[var(--text-1)] capitalize">{organization.business_type?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Plan</span>
            <span className="font-medium text-indigo-400 capitalize">{organization.plan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Your Role</span>
            <span className="font-medium text-[var(--text-1)] capitalize">{profile.role}</span>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.language')}</h2>
        <select
          value={lang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="rounded-input border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]"
        >
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
        </select>
      </section>

      {/* Appearance / Dark Mode — always dark */}
      <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">Theme</span>
          <span className="px-3 py-1 rounded-md text-[12px] font-medium bg-[#4F46E5] text-white">Dark</span>
        </div>
      </section>

      {/* Currency */}
      <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Primary Currency</h2>
        <select
          value={organization.currency || 'JPY'}
          onChange={async (e) => {
            await supabase.from('organizations').update({ currency: e.target.value }).eq('id', organization.id);
            toast('Currency updated', 'success');
          }}
          className="rounded-input border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] w-full"
        >
          <option value="JPY">¥ JPY — Japanese Yen</option>
          <option value="USD">$ USD — US Dollar</option>
          <option value="EUR">€ EUR — Euro</option>
          <option value="GBP">£ GBP — British Pound</option>
          <option value="INR">₹ INR — Indian Rupee</option>
          <option value="PKR">₨ PKR — Pakistani Rupee</option>
          <option value="SAR">﷼ SAR — Saudi Riyal</option>
          <option value="AED">د.إ AED — UAE Dirham</option>
          <option value="BDT">৳ BDT — Bangladeshi Taka</option>
          <option value="NGN">₦ NGN — Nigerian Naira</option>
          <option value="BRL">R$ BRL — Brazilian Real</option>
          <option value="VND">₫ VND — Vietnamese Dong</option>
          <option value="TRY">₺ TRY — Turkish Lira</option>
          <option value="CNY">¥ CNY — Chinese Yuan</option>
          <option value="PHP">₱ PHP — Philippine Peso</option>
          <option value="IDR">Rp IDR — Indonesian Rupiah</option>
        </select>
      </section>

      {/* Away Message */}
      {profile.role === 'owner' && (
        <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Away Message</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-1)]">Enable away message</span>
              <button
                onClick={() => setAwayEnabled(!awayEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${awayEnabled ? 'bg-[#4F46E5]' : 'bg-[#E5E5E5]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-slate-800 shadow transition-transform ${awayEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {awayEnabled && (
              <>
                <textarea
                  value={awayMessage} onChange={(e) => setAwayMessage(e.target.value)}
                  placeholder="Thanks for reaching out! We're currently away and will respond during business hours."
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">Start</label>
                    <input type="time" value={businessHoursStart} onChange={(e) => setBusinessHoursStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">End</label>
                    <input type="time" value={businessHoursEnd} onChange={(e) => setBusinessHoursEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none" />
                  </div>
                </div>
              </>
            )}
            <button onClick={handleSaveAway} disabled={savingAway}
              className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50">
              {savingAway ? 'Saving...' : 'Save Away Settings'}
            </button>
          </div>
        </section>
      )}

      {/* Team Management */}
      {profile.role === 'owner' && (
        <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.team')}</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setInviteRole('staff')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${inviteRole === 'staff' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-indigo-400' : 'border-slate-700 text-[var(--text-3)]'}`}>
                Staff
              </button>
              <button type="button" onClick={() => setInviteRole('accountant')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${inviteRole === 'accountant' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-indigo-400' : 'border-slate-700 text-[var(--text-3)]'}`}>
                Accountant (Read-only)
              </button>
            </div>
            <button type="submit" disabled={inviting}
              className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50">
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </form>
        </section>
      )}

      {/* Upgrade Plan */}
      {profile.role === 'owner' && (
        <Link href="/settings/upgrade"
          className="flex items-center justify-between rounded-card border-2 border-[#4F46E5]/20 bg-gradient-to-r from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4F46E5]">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text-1)]">Upgrade Plan</span>
              <p className="text-xs text-[var(--text-3)]">Current: <span className="capitalize font-medium text-indigo-400">{organization.plan}</span></p>
            </div>
          </div>
          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* Navigation Links */}
      <div className="space-y-2">
        <Link href="/settings/business-setup"
          className="flex items-center justify-between rounded-card border border-slate-700 bg-slate-800 p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Business Profile & Bank</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        <Link href="/customers"
          className="flex items-center justify-between rounded-card border border-slate-700 bg-slate-800 p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Customers</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        <Link href="/expenses"
          className="flex items-center justify-between rounded-card border border-slate-700 bg-slate-800 p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Expenses</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        {profile.role === 'owner' && (
          <Link href="/accountant"
            className="flex items-center justify-between rounded-card border border-slate-700 bg-slate-800 p-4 transition-shadow hover:shadow-sm">
            <span className="text-sm font-medium text-[var(--text-1)]">Accountant Portal</span>
            <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        )}
      </div>

      {/* Account + Logout */}
      <div className="rounded-card border border-slate-700 bg-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <PocketAvatar name={userName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-1)] truncate">{userName}</p>
            <p className="text-xs text-[var(--text-4)] truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-btn border border-[#DC2626]/20 bg-[#DC2626]/5 py-3 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/10">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          {t('nav.logout')}
        </button>
      </div>

      {/* About */}
      <section className="rounded-card border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">About</h2>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Version</span>
            <span className="font-mono text-[var(--text-1)]">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Made with</span>
            <span className="text-[var(--text-1)]">❤️ in Japan</span>
          </div>
          <div className="flex justify-between text-sm">
            <Link href="/updates" className="text-[var(--text-3)] hover:text-indigo-400">What&apos;s New ✨</Link>
            <span className="text-xs text-indigo-400">→</span>
          </div>
          <div className="flex gap-4 pt-1">
            <Link href="/privacy" className="text-xs text-indigo-400 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-indigo-400 hover:underline">Terms of Service</Link>
            <a href="https://evrywher.io" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline">evrywher.io ↗</a>
          </div>
        </div>
      </section>

      {/* Delete Account */}
      <button
        onClick={() => setShowDeleteDialog(true)}
        className="flex w-full items-center justify-center gap-2 rounded-btn border border-[#DC2626]/20 bg-[#DC2626]/5 py-3 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/10"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Delete Account
      </button>

      {/* Delete Confirm Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--text-1)]">Delete Account</p>
                <p className="text-[12px] text-[var(--text-3)]">This cannot be undone</p>
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-2)] mb-4">
              All your data — invoices, cash flows, contacts, messages — will be permanently deleted. Type <strong>delete</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "delete" to confirm`}
              className="w-full rounded-lg border border-slate-700 px-3 py-2.5 text-[13px] text-[var(--text-1)] focus:border-[#DC2626] focus:outline-none mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}
                className="flex-1 rounded-lg border border-slate-700 py-2.5 text-[14px] font-medium text-[var(--text-2)] hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                className="flex-1 rounded-lg bg-[#DC2626] py-2.5 text-[14px] font-medium text-white disabled:opacity-40 hover:bg-[#B91C1C] transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-[var(--text-4)]">A TechDagger Product · MS Dynamics LLC</p>
    </div>

    {/* Chat Lock PIN Setup Modal */}
    {showLockSetup && (
      <ChatLockSetupModal
        onSave={handleLockSave}
        onCancel={() => setShowLockSetup(false)}
      />
    )}
    </>
  );
}
