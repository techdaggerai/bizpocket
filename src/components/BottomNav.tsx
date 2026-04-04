'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  bizpocketOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/invoices',
    labelKey: 'nav.invoices',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v1H8v-1zm0 3h5v1H8v-1z"/>
      </svg>
    ),
  },
  {
    href: '/contacts',
    labelKey: 'nav.contacts',
    bizpocketOnly: false,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/chat',
    labelKey: 'nav.chat',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h3l3.5 4 3.5-4H20a2 2 0 002-2V4a2 2 0 00-2-2z"/>
      </svg>
    ),
  },
  {
    href: '/cash-flow',
    labelKey: 'nav.cash_flow',
    bizpocketOnly: true,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="14" width="3.5" height="6" rx="1"/><rect x="10" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    labelKey: 'nav.more',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="19" r="2.5"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { organization } = useAuth();

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && (window.location.hostname.includes('evrywher') || window.location.hostname.includes('evrywyre') || window.location.hostname.includes('pocketchat') || window.location.hostname.includes('evrywhere')));

  const items = isPocketChatMode
    ? NAV_ITEMS.filter(item => !item.bizpocketOnly)
    : NAV_ITEMS.filter(item => item.href !== '/contacts'); // BizPocket doesn't need separate contacts tab

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[#E5E5E5] bg-white safe-bottom">
      <div className="mx-auto flex h-full max-w-lg items-center justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-[#4F46E5]'
                  : 'text-[#A3A3A3] hover:text-[var(--text-2)]'
              }`}
            >
              {item.icon}
              <span className="mt-0.5 text-[10px] font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
