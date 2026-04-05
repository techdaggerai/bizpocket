'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  bizpocketOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/invoices',
    label: 'Invoices',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v1H8v-1zm0 3h5v1H8v-1z"/>
      </svg>
    ),
  },
  {
    href: '/contacts',
    label: 'Contacts',
    bizpocketOnly: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  // Status tab hidden for launch — route still exists at /status
  {
    href: '/chat',
    label: 'Chat',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h3l3.5 4 3.5-4H20a2 2 0 002-2V4a2 2 0 00-2-2z"/>
      </svg>
    ),
  },
  {
    href: '/cash-flow',
    label: 'Cash Flow',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="14" width="3.5" height="6" rx="1"/><rect x="10" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/learn',
    label: 'Learn',
    bizpocketOnly: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82"/>
      </svg>
    ),
  },
];

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

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && (window.location.hostname.includes('evrywher') || window.location.hostname.includes('evrywyre') || window.location.hostname.includes('pocketchat') || window.location.hostname.includes('evrywhere')));

  const items = isPocketChatMode
    ? NAV_ITEMS.filter(item => !item.bizpocketOnly)
    : NAV_ITEMS.filter(item => item.href !== '/contacts');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 safe-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-full max-w-lg items-center justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 transition-colors ${
                isActive
                  ? 'text-[#4F46E5]'
                  : 'text-[#A3A3A3] hover:text-[var(--text-2)]'
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
