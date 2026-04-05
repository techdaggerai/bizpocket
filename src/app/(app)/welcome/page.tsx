'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PocketAvatar from '@/components/PocketAvatar';
import PageHeader from '@/components/PageHeader';

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

// Bot greeting preview messages
const BOT_PREVIEWS = [
  { from: 'them', text: 'Hola! 👋', lang: 'es' },
  { from: 'me', text: 'Hi! Great to meet you 😊', lang: 'en' },
  { from: 'them', text: 'Encantado! ¿Cómo estás?', lang: 'es' },
  { from: 'me', text: 'I\'m great! Evrywher is magic 🌐', lang: 'en' },
];

export default function EvryWherOnboarding() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // If already completed onboarding, redirect immediately
  useEffect(() => {
    if (profile.onboarding_completed) {
      router.replace('/chat');
    }
  }, [profile.onboarding_completed, router]);

  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');

  // Screen 2 state
  const [displayName, setDisplayName] = useState(profile.full_name || profile.name || '');
  const [selectedLang, setSelectedLang] = useState(profile.language || 'en');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Track which preview messages have appeared
  const [visiblePreviews, setVisiblePreviews] = useState(0);
  useEffect(() => {
    if (step !== 2) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisiblePreviews(i);
      if (i >= BOT_PREVIEWS.length) clearInterval(t);
    }, 600);
    return () => clearInterval(t);
  }, [step]);

  function goTo(next: number) {
    if (transitioning) return;
    setDirection(next > step ? 'fwd' : 'back');
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 200);
  }

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
      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error('[Avatar upload]', err);
      toast('Upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile() {
    if (!displayName.trim()) { toast('Please enter your name', 'error'); return; }
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        name: displayName.trim(),
        full_name: displayName.trim(),
        language: selectedLang,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }).eq('id', profile.id);
      goTo(2);
    } catch (err) {
      console.error('[Save profile]', err);
      toast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish(dest: '/chat' | '/contacts') {
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id);
    router.push(dest);
  }

  const currentLang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

  // ── Step dots ────────────────────────────────────────────────
  function StepDots() {
    return (
      <div className="flex items-center justify-center gap-1.5 mb-8">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              backgroundColor: i === step ? '#4F46E5' : '#D1D5DB',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg, #FFFFFF)' }}
    >
      <PageHeader title="Welcome" />
      <div className="flex-1 flex items-center justify-center">
      <div
        className="w-full max-w-sm mx-auto px-6 transition-all duration-200"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning
            ? `translateX(${direction === 'fwd' ? '-20px' : '20px'})`
            : 'translateX(0)',
        }}
      >
        {/* ── SCREEN 0: Welcome ── */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-8" style={{ animation: 'breathe 3s ease-in-out infinite' }}>
              <AnimatedPocketChatLogo size={80} isTranslating />
            </div>

            <h1 className="text-[28px] font-bold text-[var(--text-1)] mb-3 leading-tight">
              Welcome to<br />Evrywher
            </h1>
            <p className="text-[16px] text-[var(--text-3)] mb-2 leading-relaxed">
              Chat in 21 languages with AI translation
            </p>
            <p className="text-[13px] text-[var(--text-4)] mb-10">
              Type in yours. They read theirs. No apps needed.
            </p>

            {/* Language preview pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {['🇬🇧 EN', '🇯🇵 JA', '🇵🇰 UR', '🇦🇪 AR', '🇨🇳 ZH', '🇪🇸 ES', '🇧🇷 PT', '🇰🇷 KO'].map(l => (
                <span key={l} className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EEF2FF] text-[#4F46E5]">{l}</span>
              ))}
              <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#F3F4F6] text-[#6B7280]">+13 more</span>
            </div>

            <StepDots />

            <button
              onClick={() => goTo(1)}
              className="w-full rounded-xl bg-[#4F46E5] py-4 text-[15px] font-semibold text-white hover:bg-[#4338CA] transition-colors shadow-md"
            >
              Get started →
            </button>
          </div>
        )}

        {/* ── SCREEN 1: Profile setup ── */}
        {step === 1 && (
          <div className="flex flex-col items-center">
            <h1 className="text-[24px] font-bold text-[var(--text-1)] mb-1 text-center">Set up your profile</h1>
            <p className="text-[13px] text-[var(--text-3)] mb-8 text-center">How should people know you?</p>

            {/* Avatar upload */}
            <div className="relative mb-6">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative block rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                aria-label="Upload photo"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <PocketAvatar name={displayName || 'Me'} size={96} />
                  </div>
                )}
                {/* Camera overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? (
                    <span className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin block" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="text-[13px] text-[#4F46E5] font-medium mb-6 hover:underline"
            >
              {avatarUrl ? 'Change photo' : 'Add photo'}
            </button>
            {!avatarUrl && (
              <p className="text-[11px] text-[var(--text-4)] -mt-4 mb-6">optional</p>
            )}

            {/* Display name */}
            <div className="w-full mb-4">
              <label className="block text-[11px] uppercase tracking-wider font-medium text-[var(--text-3)] mb-1.5 px-1">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How should people address you?"
                className="w-full rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-3 text-[15px] text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                onKeyDown={e => e.key === 'Enter' && displayName.trim() && handleSaveProfile()}
              />
            </div>

            {/* Language picker */}
            <div className="w-full mb-8">
              <label className="block text-[11px] uppercase tracking-wider font-medium text-[var(--text-3)] mb-1.5 px-1">
                Your language
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  className="w-full flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-3 text-[15px] text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none hover:border-[#4F46E5] transition-colors"
                >
                  <span>{currentLang.flag} {currentLang.name}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {showLangPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                    <div className="absolute left-0 right-0 top-14 z-50 max-h-52 overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white shadow-xl">
                      {LANGUAGES.map(l => (
                        <button
                          key={l.code}
                          onClick={() => { setSelectedLang(l.code); setShowLangPicker(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-[#F3F4F6] transition-colors ${selectedLang === l.code ? 'text-[#4F46E5] font-medium bg-[#EEF2FF]' : 'text-[var(--text-1)]'}`}
                        >
                          <span className="text-lg">{l.flag}</span> {l.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <StepDots />

            <div className="w-full space-y-2.5">
              <button
                onClick={handleSaveProfile}
                disabled={!displayName.trim() || saving}
                className="w-full rounded-xl bg-[#4F46E5] py-4 text-[15px] font-semibold text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50 shadow-md"
              >
                {saving ? 'Saving…' : 'Next →'}
              </button>
              <button
                onClick={() => { setDisplayName(profile.full_name || profile.name || ''); goTo(2); }}
                className="w-full py-2 text-[13px] text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: Ready! ── */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            {/* Celebration */}
            <div className="text-5xl mb-4" style={{ animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</div>
            <h1 className="text-[26px] font-bold text-[var(--text-1)] mb-2">You&rsquo;re ready!</h1>
            <p className="text-[14px] text-[var(--text-3)] mb-8">
              Start chatting in your language.<br />Evrywher handles the rest.
            </p>

            {/* Bot greeting preview chat bubbles */}
            <div className="w-full mb-8 space-y-2">
              {BOT_PREVIEWS.slice(0, visiblePreviews).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
                  style={{ animation: 'slideUp 0.25s ease-out' }}
                >
                  <div
                    className="max-w-[70%] rounded-2xl px-3.5 py-2 text-[13px]"
                    style={{
                      backgroundColor: msg.from === 'me' ? '#4F46E5' : '#F3F4F6',
                      color: msg.from === 'me' ? '#FFFFFF' : '#0A0A0A',
                      borderBottomRightRadius: msg.from === 'me' ? 4 : undefined,
                      borderBottomLeftRadius: msg.from === 'them' ? 4 : undefined,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {visiblePreviews < BOT_PREVIEWS.length && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 bg-[#F3F4F6]">
                    <div className="flex gap-1 items-center h-3">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]"
                          style={{ animation: `bounce 1s infinite ${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <StepDots />

            <div className="w-full space-y-2.5">
              <button
                onClick={() => handleFinish('/chat')}
                className="w-full rounded-xl bg-[#4F46E5] py-4 text-[15px] font-semibold text-white hover:bg-[#4338CA] transition-colors shadow-md"
              >
                💬 Start chatting
              </button>
              <button
                onClick={() => handleFinish('/contacts')}
                className="w-full rounded-xl border border-[#4F46E5] py-4 text-[15px] font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
              >
                👥 Invite a friend
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
      </div>
    </div>
  );
}
