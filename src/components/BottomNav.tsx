'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';
import { getBrandModeClient } from '@/lib/brand';

export default function BottomNav() {
  const pathname = usePathname();
  const { organization } = useAuth();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!organization?.id) return;
    const supabase = createClient();
    supabase.from('conversations').select('unread_count').eq('organization_id', organization.id).gt('unread_count', 0).then(({ data }) => {
      setChatUnread(data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0);
    });
    const ch = supabase.channel('unread-' + organization.id).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${organization.id}` }, () => {
      supabase.from('conversations').select('unread_count').eq('organization_id', organization.id).gt('unread_count', 0).then(({ data }) => {
        setChatUnread(data?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0);
      });
    }).subscribe();
    return () => { ch.unsubscribe(); };
  }, [organization?.id]);

  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';

  /* ---------- Evrywher 5-tab layout ---------- */
  if (isPocketChatMode) {
    const evrywherTabs = [
      { href: '/chat', label: 'Chats', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      )},
      { href: '/contacts', label: 'Contacts', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      )},
      { href: '/ai', label: 'EvryAI', isCenter: true },
      { href: '/learn', label: 'Learn', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
      )},
      { href: '/settings', label: 'Settings', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82"/>
        </svg>
      )},
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around relative">
          {evrywherTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');

            /* EvryAI center elevated orb */
            if (tab.isCenter) {
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-col items-center -mt-3">
                  <div className="relative w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 overflow-visible" style={{ animation: 'orb-glow 2s ease-in-out infinite' }}>
                    <svg width="32" height="32" viewBox="0 0 36 36" className="overflow-visible">
                      <circle cx="18" cy="18" r="16" fill="#4F46E5"/>
                      <path d="M9 18 L13 14 L17 18 L21 14 L25 18" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 24 L13 20 L17 24 L21 20 L25 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="30" cy="6" r="4.5" fill="#F59E0B"/>
                      <path d="M28.5 6 L30 4 L31.5 6 L30 8 Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold mt-1">
                    <span style={{ color: '#818CF8' }}>Evry</span>
                    <span style={{ color: '#F59E0B' }}>AI</span>
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {tab.href === '/chat' && chatUnread > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ---------- BizPocket standard layout ---------- */
  const bizpocketTabs = [
    {
      href: '/dashboard', label: 'Home',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    },
    {
      href: '/invoices', label: 'Invoices',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v1H8v-1zm0 3h5v1H8v-1z"/></svg>,
    },
    {
      href: '/chat', label: 'Chat',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h3l3.5 4 3.5-4H20a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>,
    },
    {
      href: '/cash-flow', label: 'Cash Flow',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="14" width="3.5" height="6" rx="1"/><rect x="10" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/></svg>,
    },
    {
      href: '/settings', label: 'Settings',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82"/></svg>,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {bizpocketTabs.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.href === '/chat' && chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
