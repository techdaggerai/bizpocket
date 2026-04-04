'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const ADMIN_EMAILS = ['bilal@techdagger.com', 'test123@techdagger.com'];

interface SignupRow {
  name: string;
  email: string;
  created_at: string;
  organization: { plan: string; signup_source: string } | null;
}

interface FeedbackRow {
  id: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
  profile: { name: string; email: string } | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [todaySignups, setTodaySignups] = useState(0);
  const [paidSubs, setPaidSubs] = useState(0);
  const [activeUsers7d, setActiveUsers7d] = useState(0);
  const [recentSignups, setRecentSignups] = useState<SignupRow[]>([]);
  const [sourceCounts, setSourceCounts] = useState<{ bizpocket: number; evrywher: number }>({ bizpocket: 0, evrywher: 0 });
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard');
      return;
    }
    document.title = 'Evrywher — Admin';
    fetchAll();
  }, [isAdmin]);

  async function fetchAll() {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesRes,
      todayRes,
      paidRes,
      signupsRes,
      bizpocketRes,
      evrywherRes,
      feedbackRes,
      activeRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'team', 'business']),
      supabase.from('profiles').select('name, email, created_at, organization:organizations(plan, signup_source)').order('created_at', { ascending: false }).limit(20),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).or('signup_source.is.null,signup_source.neq.pocketchat'),
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('signup_source', 'pocketchat'),
      supabase.from('feedback').select('id, message, type, status, created_at, profile:profiles(name, email)').order('created_at', { ascending: false }).limit(20),
      supabase.from('messages').select('sender_name', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    ]);

    setTotalUsers(profilesRes.count || 0);
    setTodaySignups(todayRes.count || 0);
    setPaidSubs(paidRes.count || 0);
    setRecentSignups((signupsRes.data || []) as unknown as SignupRow[]);
    setSourceCounts({
      bizpocket: bizpocketRes.count || 0,
      evrywher: evrywherRes.count || 0,
    });
    setFeedback((feedbackRes.data || []) as unknown as FeedbackRow[]);
    setActiveUsers7d(activeRes.count || 0);
    setLoading(false);
  }

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  const estimatedRevenue = paidSubs * 1980;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0A0A0A]">Admin Dashboard</h1>
        <button onClick={fetchAll} className="text-sm text-[#4F46E5] font-medium hover:underline">Refresh</button>
      </div>

      {/* ROW 1 — Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: totalUsers, color: '#4F46E5' },
          { label: "Today's Signups", value: todaySignups, color: '#16A34A' },
          { label: 'Paid Subscribers', value: paidSubs, color: '#F59E0B' },
          { label: 'Est. Monthly Revenue', value: `¥${estimatedRevenue.toLocaleString()}`, color: '#F43F5E' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[#E5E5E5] bg-white p-5">
            <p className="text-sm text-[#6B7280] mb-1">{m.label}</p>
            <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* ROW 2 — Recent Signups */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F0F0F0]">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Recent Signups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-left text-xs text-[#6B7280]">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Plan</th>
                <th className="px-5 py-2 font-medium">Source</th>
                <th className="px-5 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((s, i) => {
                const org = Array.isArray(s.organization) ? s.organization[0] : s.organization;
                return (
                  <tr key={i} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA]">
                    <td className="px-5 py-2.5 text-[#0A0A0A] font-medium">{s.name || '—'}</td>
                    <td className="px-5 py-2.5 text-[#6B7280]">{s.email}</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${org?.plan === 'pro' || org?.plan === 'business' ? 'bg-[#EDE9FE] text-[#4F46E5]' : 'bg-[#F0FDF4] text-[#166534]'}`}>
                        {org?.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-[#6B7280]">{org?.signup_source === 'pocketchat' ? 'Evrywher' : 'BizPocket'}</td>
                    <td className="px-5 py-2.5 text-[#9CA3AF]">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW 3 — Source Breakdown + Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">Signup Source</h2>
          <div className="space-y-3">
            {[
              { label: 'BizPocket', count: sourceCounts.bizpocket, color: '#4F46E5' },
              { label: 'Evrywher', count: sourceCounts.evrywher, color: '#F59E0B' },
            ].map((s) => {
              const total = sourceCounts.bizpocket + sourceCounts.evrywher;
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#374151]">{s.label}</span>
                    <span className="text-sm text-[#6B7280]">{s.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F3F4F6]">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">Active Users (7 days)</h2>
          <p className="text-4xl font-bold text-[#4F46E5]">{activeUsers7d}</p>
          <p className="text-sm text-[#6B7280] mt-1">Users with messages in last 7 days</p>
        </div>
      </div>

      {/* ROW 4 — Recent Feedback */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F0F0F0]">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Recent Feedback</h2>
        </div>
        {feedback.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#9CA3AF]">No feedback yet</div>
        ) : (
          <div className="divide-y divide-[#F8F8F8]">
            {feedback.map((f) => {
              const prof = Array.isArray(f.profile) ? f.profile[0] : f.profile;
              return (
                <div key={f.id} className="px-5 py-3 hover:bg-[#FAFAFA]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#0A0A0A]">{prof?.name || 'Anonymous'}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        f.type === 'bug' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                        f.type === 'feature' ? 'bg-[#EDE9FE] text-[#4F46E5]' :
                        'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        {f.type}
                      </span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#374151]">{f.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
