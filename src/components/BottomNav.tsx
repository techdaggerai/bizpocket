'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />
      </svg>
    ),
  },
  {
    href: '/invoices',
    labelKey: 'nav.invoices',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V8.25L14.25 1.5H5.625ZM14.25 3.75v3.375c0 .621.504 1.125 1.125 1.125H18.75M8.25 15h7.5M8.25 18h4.5" />
      </svg>
    ),
  },
  {
    href: '/chat',
    labelKey: 'nav.chat',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 20.97v-1.95a49.655 49.655 0 0 1-1.088-.085c-1.922-.25-3.291-1.861-3.405-3.727A51.658 51.658 0 0 1 1.5 12.01c0-1.074.015-2.14.088-3.196.114-1.866 1.483-3.477 3.405-3.727Zm6.337 2.592c-2.03 0-4.032.133-5.997.392C4.095 5.811 3.25 6.83 3.25 8.032v3.978c0 1.203.845 2.221 2.003 2.39a48.155 48.155 0 0 0 5.997.392c2.03 0 4.032-.133 5.997-.392 1.158-.169 2.003-1.187 2.003-2.39V8.032c0-1.203-.845-2.221-2.003-2.39a48.155 48.155 0 0 0-5.997-.392ZM9 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
    ),
  },
  {
    href: '/cash-flow',
    labelKey: 'nav.cash_flow',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 19h2V9H4v10Zm4 0h2V5H8v14Zm4 0h2v-7h-2v7Zm4 0h2V11h-2v8Zm4 0h2V7h-2v12Z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    labelKey: 'nav.more',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5.5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="18.5" r="2" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[#E5E5E5] bg-white safe-bottom">
      <div className="mx-auto flex h-full max-w-lg items-center justify-around">
        {NAV_ITEMS.map((item) => {
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
