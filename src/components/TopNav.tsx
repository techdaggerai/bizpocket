'use client';

import NotificationBell from './NotificationBell';
import Link from 'next/link';

export default function TopNav() {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5E5E5] bg-white/95 px-4 py-2 backdrop-blur-sm">
      <Link href="/dashboard" className="text-base font-bold text-[#4F46E5]">
        BizPocket
      </Link>
      <div className="flex items-center gap-1">
        <NotificationBell />
      </div>
    </div>
  );
}
