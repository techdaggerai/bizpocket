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
    // Create placeholder profile for invited user
    const { error } = await supabase.from('profiles').insert({
      user_id: user.id, // placeholder
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
      <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>

      {/* Business Profile */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase">{t('settings.business_profile')}</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Business Name</span>
            <span className="text-white">{organization.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Type</span>
            <span className="text-white capitalize">{organization.business_type?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Plan</span>
            <span className="text-amber-400 capitalize">{organization.plan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Role</span>
            <span className="text-white capitalize">{profile.role}</span>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase">{t('settings.language')}</h2>
        <div className="flex gap-2">
          {[
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' },
            { value: 'ur', label: 'اردو' },
          ].map((l) => (
            <button
              key={l.value}
              onClick={() => handleLanguageChange(l.value)}
              className={`flex-1 rounded-lg border py-2.5 text-sm transition-colors ${
                lang === l.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Team Management */}
      {profile.role === 'owner' && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase">{t('settings.team')}</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteRole('staff')}
                className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                  inviteRole === 'staff' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setInviteRole('accountant')}
                className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                  inviteRole === 'accountant' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400'
                }`}
              >
                Accountant (Read-only)
              </button>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-gray-950 disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </form>
        </section>
      )}

      {/* Navigation Links */}
      <div className="space-y-2">
        <Link
          href="/expenses"
          className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700"
        >
          <span className="text-sm text-white">Expenses</span>
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
        {profile.role === 'owner' && (
          <Link
            href="/accountant"
            className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700"
          >
            <span className="text-sm text-white">Accountant Portal</span>
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/5 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        {t('nav.logout')}
      </button>

      {/* Footer */}
      <p className="text-center text-xs text-gray-600">A TechDagger Product · MS Dynamics LLC</p>
    </div>
  );
}
