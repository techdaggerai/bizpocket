'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function UpdateBell() {
  const { profile } = useAuth();
  const supabase = createClient();
  const userId = profile?.id;
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    // Count active updates not yet read by this user
    const { count } = await supabase
      .from('app_updates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('id', 'in', `(SELECT update_id FROM user_update_reads WHERE user_id='${userId}')`);

    // Fallback: fetch both lists and diff client-side
    const { data: allUpdates } = await supabase
      .from('app_updates')
      .select('id')
      .eq('is_active', true);
    const { data: readUpdates } = await supabase
      .from('user_update_reads')
      .select('update_id')
      .eq('user_id', userId);

    if (allUpdates && readUpdates) {
      const readSet = new Set(readUpdates.map(r => r.update_id));
      const unread = allUpdates.filter(u => !readSet.has(u.id)).length;
      setUnreadCount(unread);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 120000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <button
      onClick={() => router.push('/updates')}
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[rgba(79,70,229,0.08)]"
      aria-label="What's New"
    >
      <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
