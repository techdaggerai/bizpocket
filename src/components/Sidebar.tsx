'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PocketMark, LogoWordmark, PocketChatMark } from '@/components/Logo';

const FULL_NAV = [
  {
    label: '',
    items: [
      { href: '/dashboard', label: 'Hub', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    ],
  },
  {
    label: 'CORE',
    items: [
      { href: '/chat', label: 'Evrywher', icon: '__pocketchat__' },
      { href: '/invoices', label: 'Invoices', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5' },
      { href: '/cash-flow', label: 'Cash Flow', icon: 'M4 14h3.5v6H4zM10 8h3.5v12H10zM16 4h3.5v16H16z' },
      { href: '/detect', label: 'AI Detect', icon: 'M3 3h18v18H3zM11 11a4 4 0 100-8M15 15l4 4' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { href: '/estimates', label: 'Estimates', icon: 'M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 2v6h6' },
      { href: '/time-tracking', label: 'Time Track', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },
      { href: '/expenses', label: 'Expenses', icon: 'M2 5h20v14H2zM2 10h20' },
      { href: '/documents', label: 'Vault', icon: 'M3 3h18v18H3zM7 7h10M7 11h7M7 15h4' },
      { href: '/planner', label: 'Planner', icon: 'M3 4h18v18H3zM3 10h18M8 2v4M16 2v4' },
      { href: '/contacts', label: 'Contacts', icon: 'M12 8a4 4 0 100-8M4 20c0-4 3.6-7 8-7s8 3 8 7' },
      { href: '/team', label: 'Team', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 006.375-7.5c0-5.523-4.477-10-10-10S4 6.477 4 12a9.337 9.337 0 006.375 7.5M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M10.5 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z' },
    ],
  },
  {
    label: 'AI TOOLS',
    items: [
      { href: '/website-builder', label: 'Website', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a16 16 0 014 10 16 16 0 01-4 10 16 16 0 01-4-10A16 16 0 0112 2z' },
      { href: '/social-media', label: 'Social', icon: 'M3 3h18v18H3zM12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM17 7a1.2 1.2 0 100-2.4' },
      { href: '/ops-radar', label: 'Ops Radar', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a5 5 0 100 10M12 3v6' },
      { href: '/items', label: 'Pipeline', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
      { href: '/accountant', label: 'Accountant', icon: 'M2 4h20v16H2zM17 4v16M5 8h5M5 11h4M5 14h6' },
      { href: '/form-fill', label: 'Form Fill', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h4' },
      { href: '/chat/live-guide', label: 'Live Guide', icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z' },
    ],
  },
];

const POCKETCHAT_NAV = [
  {
    label: '',
    items: [
      { href: '/chat', label: 'Evrywher', icon: '__pocketchat__' },
      { href: '/contacts', label: 'Contacts', icon: 'M12 8a4 4 0 100-8M4 20c0-4 3.6-7 8-7s8 3 8 7' },
      { href: '/chat/bot-setup', label: 'Bot Setup', icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01' },
      { href: '/settings', label: 'Settings', icon: 'M12 8a4 4 0 100-8M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82' },
    ],
  },
];

const ADMIN_EMAILS = ['bilal@techdagger.com', 'test123@techdagger.com'];

export default function Sidebar() {
  const pathname = usePathname();
  const { organization, user } = useAuth();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const plan = organization?.plan || 'free';
  const isPocketChatOnly = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && (window.location.hostname.includes('evrywher') || window.location.hostname.includes('evrywyre') || window.location.hostname.includes('pocketchat') || window.location.hostname.includes('evrywhere')));
  const NAV_SECTIONS = isPocketChatOnly ? POCKETCHAT_NAV : FULL_NAV;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:border-r lg:border-[#F0F0F0] lg:bg-white lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#F0F0F0]">
        <Link href={isPocketChatOnly ? '/chat' : '/dashboard'} className="flex items-center gap-2">
          {isPocketChatOnly ? (
            <>
              <PocketChatMark size={32} />
              <span className="text-[14px] font-bold text-[#111827]"><span className="text-[#0A0A0A]">Evry</span><span className="text-[#F59E0B]">wher</span></span>
            </>
          ) : (
            <>
              <PocketMark variant="xl" />
              <LogoWordmark />
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F59E0B]">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                const isAI = ['/website-builder', '/social-media', '/ops-radar', '/items', '/accountant'].some(p => item.href.includes(p));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium transition-all ${
                      isActive
                        ? isAI ? 'bg-[#F59E0B]/[0.06] text-[#F59E0B]' : 'bg-[#4F46E5]/[0.06] text-[#4F46E5]'
                        : 'text-[#666] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {item.icon === '__pocketchat__' ? (
                      <PocketChatMark size={28} />
                    ) : (
                      <svg
                        className={`h-[18px] w-[18px] shrink-0 ${isActive ? (isAI ? 'text-[#F59E0B]' : 'text-[#4F46E5]') : 'text-[#999]'}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={item.icon} />
                      </svg>
                    )}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — Admin + Settings + Upgrade */}
      <div className="px-2 py-3 border-t border-[#F0F0F0] space-y-1">
        {isAdmin && !isPocketChatOnly && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium transition-all ${
              pathname === '/admin'
                ? 'bg-[#F43F5E]/[0.06] text-[#F43F5E]'
                : 'text-[#666] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            <svg className="h-[18px] w-[18px] text-[#999]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4.5v15m7.5-7.5h-15" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            Admin
          </Link>
        )}
        {!isPocketChatOnly && (
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium transition-all ${
              pathname === '/settings' || pathname?.startsWith('/settings/')
                ? 'bg-[#4F46E5]/[0.06] text-[#4F46E5]'
                : 'text-[#666] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
            }`}
          >
            <svg className="h-[18px] w-[18px] text-[#999]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </Link>
        )}
        {isPocketChatOnly ? (
          <Link
            href="/settings/upgrade"
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white text-[12px] font-semibold hover:opacity-90 transition-colors"
          >
            <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
            Unlock Full Suite →
          </Link>
        ) : (plan === 'free') && (
          <Link
            href="/settings/upgrade"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white text-[12px] font-semibold hover:opacity-90 transition-colors"
          >
            <svg className="h-[14px] w-[14px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            Upgrade to Pro
          </Link>
        )}
      </div>
    </aside>
  );
}
