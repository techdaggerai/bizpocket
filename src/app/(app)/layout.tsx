import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';
import type { Language } from '@/lib/i18n';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/onboarding');

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  if (!organization) redirect('/onboarding');

  return (
    <AuthProvider user={user} profile={profile} organization={organization}>
      <I18nProvider initialLang={(profile.language || 'en') as Language}>
        <div className="min-h-screen bg-[var(--bg)] pb-20">
          <main className="mx-auto max-w-2xl">
            {children}
          </main>
          <BottomNav />
        </div>
      </I18nProvider>
    </AuthProvider>
  );
}
