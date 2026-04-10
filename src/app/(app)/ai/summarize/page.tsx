'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/lib/auth-context';
import SummarySheet from '@/components/SummarySheet';
import PocketAvatar from '@/components/PocketAvatar';

interface ConvoRow {
  id: string;
  title: string | null;
  contact_name: string | null;
  last_message: string | null;
  updated_at: string;
  is_group: boolean;
}

export default function SummarizePage() {
  const router = useRouter();
  const { organization } = useAuth();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [conversations, setConversations] = useState<ConvoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<ConvoRow | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    if (!organization?.id) return;
    supabase
      .from('conversations')
      .select('id, title, updated_at, is_group, contacts!inner(name)')
      .eq('organization_id', organization.id)
      .order('updated_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          setConversations(data.map((c: any) => ({
            id: c.id,
            title: c.title,
            contact_name: c.contacts?.name || c.title || 'Unknown',
            last_message: null,
            updated_at: c.updated_at,
            is_group: c.is_group,
          })));
        }
        setLoading(false);
      });
  }, [organization?.id]);

  async function summarizeConvo(convo: ConvoRow) {
    setSelectedConvo(convo);
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryText('');

    try {
      // Fetch last 50 messages
      const { data: messages } = await supabase
        .from('messages')
        .select('sender_type, sender_name, message, created_at, deleted_at')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!messages?.length) {
        setSummaryText('No messages to summarize.');
        setSummaryLoading(false);
        return;
      }

      const res = await fetch('/api/evryai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.reverse(),
          contactName: convo.contact_name || 'Contact',
        }),
      });

      const data = await res.json();
      setSummaryText(data.summary || 'Could not generate summary.');
    } catch {
      setSummaryText('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center h-14 px-2 bg-[#0f172a] border-b border-slate-700">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-white ml-1">Conversation Summary</h1>
        <span className="ml-2 text-lg">🧠</span>
      </div>

      <div style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-slate-400 text-sm text-center">No conversations yet. Start chatting to see summaries here.</p>
          </div>
        )}

        {/* Conversation list */}
        {!loading && conversations.length > 0 && (
          <div className="px-4 pt-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Tap a conversation to summarize</p>
            <div className="space-y-1">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => summarizeConvo(convo)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-800 active:bg-slate-800 transition-colors text-left"
                >
                  <PocketAvatar name={convo.contact_name || '?'} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{convo.contact_name || convo.title || 'Unknown'}</p>
                    <p className="text-[11px] text-slate-500">
                      {convo.is_group ? 'Group chat' : 'Direct message'} · {new Date(convo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Sheet */}
      <SummarySheet
        isOpen={summaryOpen}
        onClose={() => { setSummaryOpen(false); setSelectedConvo(null); }}
        contactName={selectedConvo?.contact_name || 'Contact'}
        summary={summaryText}
        loading={summaryLoading}
      />
    </div>
  );
}
