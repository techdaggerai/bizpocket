'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import type { Notification, NotificationType } from '@/types/database';

const TYPE_ICONS: Record<NotificationType, { icon: string; color: string }> = {
  invoice_overdue: { icon: '!', color: 'bg-[#DC2626]/10 text-[#DC2626]' },
  payment_due: { icon: '$', color: 'bg-[#16A34A]/10 text-[#16A34A]' },
  tax_deadline: { icon: 'T', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  low_balance: { icon: '!', color: 'bg-[#DC2626]/10 text-[#DC2626]' },
  expense_reminder: { icon: 'E', color: 'bg-[#4F46E5]/10 text-[#4F46E5]' },
  planner_reminder: { icon: 'P', color: 'bg-[#7C3AED]/10 text-[#7C3AED]' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { organization } = useAuth();
  const supabase = createClient();
  const orgId = organization?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read_at).length);
    }
  }, [orgId, supabase]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[rgba(79,70,229,0.08)]"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] rounded-xl border border-[#E5E5E5] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-1)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#4F46E5] hover:opacity-80"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--text-4)]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const typeInfo = TYPE_ICONS[n.type as NotificationType] || TYPE_ICONS.expense_reminder;
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-2)] ${
                      !n.read_at ? 'bg-[rgba(79,70,229,0.03)]' : ''
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${typeInfo.color}`}>
                      {typeInfo.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.read_at ? 'font-medium text-[var(--text-1)]' : 'text-[var(--text-2)]'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--text-4)] line-clamp-2">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-4)]">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read_at && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
                    )}
                  </div>
                );

                if (n.action_url) {
                  return (
                    <Link
                      key={n.id}
                      href={n.action_url}
                      onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false); }}
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={n.id} onClick={() => { if (!n.read_at) markRead(n.id); }} className="cursor-pointer">
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
