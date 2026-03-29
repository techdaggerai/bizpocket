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
        <div className="flex gap-2">
          {[
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' },
            { value: 'ur', label: 'اردو' },
          ].map((l) => (
            <button
              key={l.value}
              onClick={() => handleLanguageChange(l.value)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                lang === l.value
                  ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]'
                  : 'border-[#E5E5E5] text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
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

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-card border border-[#DC2626]/20 bg-[#DC2626]/5 py-3 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626]/10"
      >
        {t('nav.logout')}
      </button>

      {/* Footer */}
      <p className="text-center text-xs text-[var(--text-4)]">A TechDagger Product · MS Dynamics LLC</p>
    </div>
  );
}
