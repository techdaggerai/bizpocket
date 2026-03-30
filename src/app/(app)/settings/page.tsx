'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { profile, organization, user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'accountant'>('accountant');
  const [inviting, setInviting] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      organization_id: organization.id,
      role: inviteRole,
      name: `${inviteRole === 'accountant' ? 'Accountant' : 'Staff'} (Invited)`,
      email: inviteEmail,
      language: lang,
    });
    setInviting(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteEmail('');
    }
  }

  async function handleLanguageChange(newLang: string) {
    setLang(newLang as 'en' | 'ja' | 'ur');
    await supabase.from('profiles').update({ language: newLang }).eq('id', profile.id);
  }

  return (
    <div className="space-y-6 p-4">
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
          <option value="en">🌐 English</option>
          <option value="ja">🌐 日本語</option>
          <option value="ur">🌐 اردو</option>
          <option value="ar">🌐 العربية</option>
          <option value="bn">🌐 বাংলা</option>
          <option value="pt">🌐 Português</option>
          <option value="tl">🌐 Filipino</option>
          <option value="vi">🌐 Tiếng Việt</option>
          <option value="tr">🌐 Türkçe</option>
          <option value="zh">🌐 中文</option>
          <option value="fr">🌐 Français</option>
          <option value="nl">🌐 Nederlands</option>
          <option value="es">🌐 Español</option>
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

      {/* Team Management */}
      {profile.role === 'owner' && (
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('settings.team')}</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteRole('staff')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  inviteRole === 'staff' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]' : 'border-[#E5E5E5] text-[var(--text-3)]'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setInviteRole('accountant')}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  inviteRole === 'accountant' ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]' : 'border-[#E5E5E5] text-[var(--text-3)]'
                }`}
              >
                Accountant (Read-only)
              </button>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </form>
        </section>
      )}

      {/* Upgrade Plan */}
      {profile.role === 'owner' && (
        <Link
          href="/settings/upgrade"
          className="flex items-center justify-between rounded-card border-2 border-[#4F46E5]/20 bg-gradient-to-r from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4F46E5]">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text-1)]">Upgrade Plan</span>
              <p className="text-xs text-[var(--text-3)]">
                Current: <span className="capitalize font-medium text-[#4F46E5]">{organization.plan}</span>
              </p>
            </div>
          </div>
          <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* Navigation Links */}
      <div className="space-y-2">
        <Link
          href="/settings/business-setup"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <span className="text-sm font-medium text-[var(--text-1)]">Business Profile & Bank</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link
          href="/customers"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <span className="text-sm font-medium text-[var(--text-1)]">Customers</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        <Link
          href="/expenses"
          className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <span className="text-sm font-medium text-[var(--text-1)]">Expenses</span>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        {profile.role === 'owner' && (
          <Link
            href="/accountant"
            className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <span className="text-sm font-medium text-[var(--text-1)]">Accountant Portal</span>
            <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
      </div>

      {/* Account + Logout */}
      <div className="rounded-card border border-[#E5E5E5] bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5] text-white text-sm font-semibold">
            {(user.user_metadata?.full_name || profile.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-1)] truncate">{user.user_metadata?.full_name || profile.name}</p>
            <p className="text-xs text-[var(--text-4)] truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-btn border border-[#DC2626]/20 bg-[#DC2626]/5 py-3 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/10"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          {t('nav.logout')}
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-[var(--text-4)]">A TechDagger Product · MS Dynamics LLC</p>
    </div>
  );
}
