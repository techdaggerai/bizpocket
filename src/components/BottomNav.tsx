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
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h3l3.5 4 3.5-4H20a2 2 0 002-2V4a2 2 0 00-2-2z"/>
        </svg>
      )},
      { href: '/contacts', label: 'Contacts', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      )},
      { href: '/chat/bot-setup', label: 'EvryAI', isCenter: true },
      { href: '/learn', label: 'Learn', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
        </svg>
      )},
      { href: '/settings', label: 'Settings', icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82"/>
        </svg>
      )},
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-900 safe-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.2)] md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around relative">
          {evrywherTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');

            /* EvryAI center elevated orb */
            if (tab.isCenter) {
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-col items-center -mt-5 relative">
                  <div className={`relative h-14 w-14 rounded-full flex items-center justify-center shadow-lg ${
                    isActive
                      ? 'bg-[#4F46E5] shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                      : 'bg-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                  }`}>
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ boxShadow: '0 0 16px 4px #818CF8' }} />
                    {/* EvryAI logo */}
                    <svg width="28" height="28" viewBox="0 0 36 36">
                      <path d="M9 18 L13 14 L17 18 L21 14 L25 18" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 24 L13 20 L17 24 L21 20 L25 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="30" cy="6" r="4.5" fill="#F59E0B"/>
                      <path d="M28.5 6 L30 4 L31.5 6 L30 8 Z" fill="white"/>
                    </svg>
                  </div>
                  <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-[#4F46E5]' : 'text-[#A3A3A3]'}`}>
                    <span style={{ color: isActive ? '#818CF8' : undefined }}>Evry</span>
                    <span style={{ color: isActive ? '#F59E0B' : undefined }}>AI</span>
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                  isActive ? 'text-[#4F46E5]' : 'text-[#A3A3A3] hover:text-[var(--text-2)]'
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
                <span className="mt-0.5 text-[11px] font-medium">{tab.label}</span>
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-700 bg-slate-900 safe-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.2)] md:hidden">
      <div className="mx-auto flex h-full max-w-lg items-center justify-around">
        {bizpocketTabs.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                isActive ? 'text-[#4F46E5]' : 'text-[#A3A3A3] hover:text-[var(--text-2)]'
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
              <span className="mt-0.5 text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
