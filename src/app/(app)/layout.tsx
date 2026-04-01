import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
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
        <div className="min-h-screen bg-[var(--bg)]">
          {/* Mobile: TopNav */}
          <div className="lg:hidden">
            <TopNav />
          </div>

          {/* Desktop: Sidebar + Content | Mobile: Full width */}
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-h-screen pb-20 lg:pb-0">
              {/* Desktop mini top bar */}
              <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-[#F0F0F0] bg-white">
                <TopNav />
              </div>
              <div className="mx-auto max-w-2xl px-4 lg:max-w-6xl lg:px-8 py-4">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile: Bottom Nav */}
          <div className="lg:hidden">
            <BottomNav />
          </div>
        </div>
      </I18nProvider>
    </AuthProvider>
  );
}
