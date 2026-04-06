import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase-server';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import ChatLockWrapper from '@/components/ChatLockWrapper';
import SwipeBackGesture from '@/components/SwipeBackGesture';
import FeatureSpotlight from '@/components/FeatureSpotlight';
import DelightProvider from '@/components/DelightProvider';
import type { Language } from '@/lib/i18n';
import { getBrandFromHost } from '@/lib/brand';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Single query: fetch profile + organization together (saves a round-trip)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('user_id', user.id)
    .single();

  // If no profile exists, auto-create org+profile for Evrywher users
  if (!profile) {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const isPocketChat = getBrandFromHost(host) === 'evrywher';

    if (isPocketChat) {
      // Auto-create org + profile so Evrywher users never hit /onboarding
      const userLang = user.user_metadata?.preferred_language || 'en';
      const { data: newOrg } = await supabase.from('organizations').insert({
        name: 'My Evrywher',
        created_by: user.id,
        plan: 'free',
        language: userLang,
        currency: 'JPY',
        signup_source: 'pocketchat',
      }).select().single();

      if (newOrg) {
        await supabase.from('profiles').insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'owner',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
          email: user.email!,
          language: userLang,
        });
        // Re-fetch the profile we just created
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (freshProfile) {
          const { data: freshOrg } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', freshProfile.organization_id)
            .single();
          if (freshOrg) {
            return (
              <AuthProvider user={user} profile={freshProfile} organization={freshOrg}>
                <I18nProvider initialLang={(freshProfile.language || 'en') as Language}>
                  <ChatLockWrapper>
                  <DelightProvider>
                  <div className="min-h-screen bg-[var(--bg)] overflow-x-hidden group/root has-[.chat-fullbleed]:overflow-hidden">
                    <SwipeBackGesture />
                    <div className="lg:hidden group-has-[.chat-fullbleed]/root:hidden"><TopNav /></div>
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 min-h-screen pb-20 lg:pb-0 lg:ml-[220px] overflow-x-hidden">
                        <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]"><TopNav /></div>
                        <div className="mx-auto max-w-2xl px-4 lg:max-w-7xl lg:px-8 py-4 has-[.chat-fullbleed]:px-0 has-[.chat-fullbleed]:py-0 has-[.chat-fullbleed]:max-w-none">{children}</div>
                      </main>
                    </div>
                    <div className="group-has-[.chat-fullbleed]/root:hidden"><BottomNav /></div>
                    <FeatureSpotlight />
                  </div>
                  </DelightProvider>
                  </ChatLockWrapper>
                </I18nProvider>
              </AuthProvider>
            );
          }
        }
      }
    }

    redirect('/onboarding');
  }

  // Organization was fetched in the joined profile query above
  const organization = (profile as any).organization;
  if (!organization) redirect('/onboarding');

  // Remove the joined org from profile to keep types clean
  const cleanProfile = { ...profile };
  delete (cleanProfile as any).organization;

  // Trial auto-downgrade: if trial expired and still on free, ensure downgraded
  if (organization.trial_ends_at && organization.plan !== 'free') {
    const trialEnd = new Date(organization.trial_ends_at);
    if (trialEnd < new Date()) {
      await supabase.from('organizations').update({ plan: 'free' }).eq('id', organization.id);
      organization.plan = 'free';
    }
  }

  // Trial 3-day warning notification (fire once)
  if (organization.trial_ends_at && organization.plan !== 'free') {
    const trialEnd = new Date(organization.trial_ends_at);
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3 && daysLeft > 0) {
      const { data: existing } = await supabase.from('notifications')
        .select('id').eq('organization_id', organization.id).eq('type', 'trial_expiring').limit(1);
      if (!existing?.length) {
        await supabase.from('notifications').insert({
          organization_id: organization.id,
          type: 'trial_expiring',
          title: `Pro trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
          body: 'Upgrade now to keep unlimited translations and AI features.',
          action_url: '/settings/upgrade',
        });
      }
    }
  }

  return (
    <AuthProvider user={user} profile={cleanProfile} organization={organization}>
      <I18nProvider initialLang={(cleanProfile.language || 'en') as Language}>
        <ChatLockWrapper>
        <DelightProvider>
        <div className="min-h-screen bg-[var(--bg)] overflow-x-hidden group/root has-[.chat-fullbleed]:overflow-hidden">
          <SwipeBackGesture />
          {/* Mobile: TopNav — hidden when chat view is active */}
          <div className="lg:hidden group-has-[.chat-fullbleed]/root:hidden">
            <TopNav />
          </div>

          {/* Desktop: Sidebar + Content | Mobile: Full width */}
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-h-screen pb-20 lg:pb-0 lg:ml-[220px] overflow-x-hidden">
              {/* Desktop mini top bar */}
              <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-[var(--border)] bg-[var(--card-bg)]">
                <TopNav />
              </div>
              <div className="mx-auto max-w-2xl px-4 lg:max-w-7xl lg:px-8 py-4 has-[.chat-fullbleed]:px-0 has-[.chat-fullbleed]:py-0 has-[.chat-fullbleed]:max-w-none">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile: Bottom Nav — hidden when chat view is active */}
          <div className="group-has-[.chat-fullbleed]/root:hidden">
            <BottomNav />
          </div>
          <FeatureSpotlight />
        </div>
        </DelightProvider>
        </ChatLockWrapper>
      </I18nProvider>
    </AuthProvider>
  );
}
