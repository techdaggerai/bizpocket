'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: on ? '#4F46E5' : '#D1D5DB', transition: 'background-color 0.2s' }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform"
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
      className="flex items-center justify-between bg-[#F9FAFB] px-4 py-3"
      style={{ borderRadius: radius, marginTop: first ? 0 : 1 }}
    >
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { profile, organization, user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && (window.location.hostname.includes('evrywher') || window.location.hostname.includes('evrywyre') || window.location.hostname.includes('pocketchat') || window.location.hostname.includes('evrywhere')));

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
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [translationSounds, setTranslationSounds] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

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

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const plan = organization?.plan || 'free';
  const userName = profile.full_name || profile.name || 'User';

  // ─── PocketChat Settings ───
  if (isPocketChatMode) {
    return (
      <div className="max-w-lg mx-auto space-y-5 py-6">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-[#EDE9FE] flex items-center justify-center text-2xl font-semibold text-[#4F46E5]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-[#4F46E5] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <p className="text-[16px] font-medium text-[var(--text-1)]">{userName}</p>
          <p className="text-[13px] text-[var(--text-3)]">{statusValue}</p>
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
                  className="w-36 border border-[#D1D5DB] rounded-lg px-2 py-1 text-[14px] text-right focus:outline-none focus:border-[#4F46E5]"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="text-[#4F46E5] text-[13px] font-medium">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="text-[14px] text-[var(--text-1)] font-medium flex items-center gap-1">
                {userName}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
          </SettingsRow>
          <SettingsRow>
            <span className="text-[14px] text-[var(--text-2)]">Status</span>
            {editingStatus ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}
                  className="w-36 border border-[#D1D5DB] rounded-lg px-2 py-1 text-[14px] text-right focus:outline-none focus:border-[#4F46E5]"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && setEditingStatus(false)}
                />
                <button onClick={() => setEditingStatus(false)} className="text-[#4F46E5] text-[13px] font-medium">Done</button>
              </div>
            ) : (
              <button onClick={() => setEditingStatus(true)} className="text-[14px] text-[var(--text-3)] flex items-center gap-1">
                {statusValue}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
          </SettingsRow>
          <SettingsRow last>
            <span className="text-[14px] text-[var(--text-2)]">Email</span>
            <span className="text-[14px] text-[var(--text-3)]">{user.email}</span>
          </SettingsRow>
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
                  <div className="absolute right-0 top-8 z-50 w-48 max-h-60 overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white shadow-lg">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => handleLanguageChange(l.code)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-[#F3F4F6] ${lang === l.code ? 'text-[#4F46E5] font-medium' : 'text-[var(--text-1)]'}`}>
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

        {/* NOTIFICATIONS */}
        <div>
          <SectionLabel>Notifications</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Message notifications</span>
            <Toggle on={messageNotifs} onChange={setMessageNotifs} />
          </SettingsRow>
          <SettingsRow last>
            <span className="text-[14px] text-[var(--text-2)]">Translation sounds</span>
            <Toggle on={translationSounds} onChange={setTranslationSounds} />
          </SettingsRow>
        </div>

        {/* ACCOUNT */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <SettingsRow first>
            <span className="text-[14px] text-[var(--text-2)]">Plan</span>
            <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${plan === 'free' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#EDE9FE] text-[#4F46E5]'}`}>
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

        <p className="text-center text-xs text-[var(--text-4)] pt-2">Evrywher by TechDagger</p>
      </div>
    );
  }

  // ─── BizPocket Settings (unchanged) ───
  return (
    <div className="space-y-6 py-4">
      <h1 className="text-xl font-bold text-[var(--text-1)]">{t('settings.title')}</h1>

      {/* Business Profile */}
      <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
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
            <span className="font-medium text-[#4F46E5] capitalize">{organization.plan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-3)]">Your Role</span>
            <span className="font-medium text-[var(--text-1)] capitalize">{profile.role}</span>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.language')}</h2>
        <select
          value={lang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="rounded-input border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]"
        >
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
        </select>
      </section>

      {/* Currency */}
      <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Primary Currency</h2>
        <select
          value={organization.currency || 'JPY'}
          onChange={async (e) => {
            await supabase.from('organizations').update({ currency: e.target.value }).eq('id', organization.id);
            toast('Currency updated', 'success');
          }}
          className="rounded-input border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] w-full"
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
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Away Message</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-1)]">Enable away message</span>
              <button
                onClick={() => setAwayEnabled(!awayEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${awayEnabled ? 'bg-[#4F46E5]' : 'bg-[#E5E5E5]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${awayEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {awayEnabled && (
              <>
                <textarea
                  value={awayMessage} onChange={(e) => setAwayMessage(e.target.value)}
                  placeholder="Thanks for reaching out! We're currently away and will respond during business hours."
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">Start</label>
                    <input type="time" value={businessHoursStart} onChange={(e) => setBusinessHoursStart(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">End</label>
                    <input type="time" value={businessHoursEnd} onChange={(e) => setBusinessHoursEnd(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none" />
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
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.team')}</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address" required
              className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setInviteRole('staff')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${inviteRole === 'staff' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]' : 'border-[#E5E5E5] text-[var(--text-3)]'}`}>
                Staff
              </button>
              <button type="button" onClick={() => setInviteRole('accountant')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${inviteRole === 'accountant' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]' : 'border-[#E5E5E5] text-[var(--text-3)]'}`}>
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
              <p className="text-xs text-[var(--text-3)]">Current: <span className="capitalize font-medium text-[#4F46E5]">{organization.plan}</span></p>
            </div>
          </div>
          <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* Navigation Links */}
      <div className="space-y-2">
        <Link href="/settings/business-setup"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Business Profile & Bank</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        <Link href="/customers"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Customers</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        <Link href="/expenses"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <span className="text-sm font-medium text-[var(--text-1)]">Expenses</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
        {profile.role === 'owner' && (
          <Link href="/accountant"
            className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
            <span className="text-sm font-medium text-[var(--text-1)]">Accountant Portal</span>
            <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        )}
      </div>

      {/* Account + Logout */}
      <div className="rounded-card border border-[#E5E5E5] bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5] text-white text-sm font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
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

      <p className="text-center text-xs text-[var(--text-4)]">A TechDagger Product · MS Dynamics LLC</p>
    </div>
  );
}
