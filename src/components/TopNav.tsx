'use client';

import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PocketMark, PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';
import NotificationBell from './NotificationBell';
import UpdateBell from './UpdateBell';
import { getBrandModeClient, BRAND } from '@/lib/brand';
import Link from 'next/link';
import { useState } from 'react';

export default function TopNav() {
  const { profile, organization } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const currentPlan = organization?.plan || 'free';
  const brandMode = getBrandModeClient(organization?.signup_source);
  const isPocketChatMode = brandMode === 'evrywher';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 shadow-sm px-4 py-2 backdrop-blur-sm lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:shadow-none lg:static lg:px-0 lg:py-0">
      {/* Mobile: centered wordmark */}
      <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
        <Link href={isPocketChatMode ? '/chat' : '/dashboard'} className="flex items-center gap-2">
          {isPocketChatMode ? (
            <>
              <PocketChatMark size={32} />
              <EvryWherMark size="sm" />
            </>
          ) : (
            <>
              <div className="h-7 w-7 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span className="text-base font-bold text-[#4F46E5]">BizPocket</span>
            </>
          )}
        </Link>
      </div>
      {/* Mobile: spacer for left side */}
      <div className="w-8 lg:hidden" />
      <div className="flex items-center gap-2">
        <div data-spotlight="update-bell">
          <UpdateBell />
        </div>
        <NotificationBell />
        {/* Profile menu — desktop only on mobile, always on desktop top bar */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
          >
            {isPocketChatMode ? <PocketChatMark size={32} /> : <PocketMark variant="xl" />}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-2 shadow-lg">
                <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                  <p className="text-sm font-semibold text-[var(--text-1)] truncate">{profile?.full_name || profile?.name || ''}</p>
                  <p className="text-[10px] text-[var(--text-4)] truncate">{organization?.name || ''}</p>
                  <span className="mt-1 inline-block rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5] capitalize">{currentPlan} plan</span>
                </div>
                {isPocketChatMode ? (
                  <Link href="/chat" onClick={() => setShowMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--bg-2)] transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                    Chats
                  </Link>
                ) : (
                  <>
                    <Link href="/dashboard" onClick={() => setShowMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--bg-2)] transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" /></svg>
                      Dashboard
                    </Link>
                    {(currentPlan === 'free') && (
                      <Link href="/settings/upgrade" onClick={() => setShowMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#4F46E5] hover:bg-[#4F46E5]/5 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                        Upgrade to Pro
                      </Link>
                    )}
                  </>
                )}
                <Link href="/settings" onClick={() => setShowMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--bg-2)] transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  Settings
                </Link>
                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
