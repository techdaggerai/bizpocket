'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface SearchResult {
  type: 'invoice' | 'customer' | 'expense' | 'cash_flow' | 'document' | 'contact';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  invoice: { icon: 'INV', color: 'bg-[#4F46E5]/10 text-[#4F46E5]' },
  customer: { icon: 'CUS', color: 'bg-[#16A34A]/10 text-[#16A34A]' },
  expense: { icon: 'EXP', color: 'bg-[#DC2626]/10 text-[#DC2626]' },
  cash_flow: { icon: 'CF', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  document: { icon: 'DOC', color: 'bg-[#7C3AED]/10 text-[#7C3AED]' },
  contact: { icon: 'CON', color: 'bg-[#0EA5E9]/10 text-[#0EA5E9]' },
};

export default function GlobalSearch() {
  const { organization } = useAuth();
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allData, setAllData] = useState<{
    invoices: any[];
    customers: any[];
    cashFlows: any[];
    documents: any[];
    contacts: any[];
    conversations: any[];
    messages: any[];
  }>({ invoices: [], customers: [], cashFlows: [], documents: [], contacts: [], conversations: [], messages: [] });
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currency = organization.currency || 'JPY';

  // Cmd/Ctrl + K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) { loadData(); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  // Load all data once when search opens
  const loadData = useCallback(async () => {
    if (loaded) return;
    const [invRes, custRes, cfRes, docRes, conRes, convRes, msgRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, customer_name, total, currency, status, created_at').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('customers').select('id, name, company, phone, email').eq('organization_id', organization.id).limit(200),
      supabase.from('cash_flows').select('id, category, from_to, description, amount, flow_type, date, currency').eq('organization_id', organization.id).order('date', { ascending: false }).limit(200),
      supabase.from('documents').select('id, title, category, date').eq('organization_id', organization.id).limit(200),
      supabase.from('contacts').select('id, name, company, phone, email, contact_type').eq('organization_id', organization.id).limit(200),
      supabase.from('conversations').select('id, title, group_name, last_message, is_bot_chat, is_group').eq('organization_id', organization.id).order('last_message_at', { ascending: false }).limit(100),
      supabase.from('messages').select('id, conversation_id, message, sender_name, created_at').eq('organization_id', organization.id).eq('message_type', 'text').order('created_at', { ascending: false }).limit(200),
    ]);
    setAllData({
      invoices: invRes.data || [],
      customers: custRes.data || [],
      cashFlows: cfRes.data || [],
      documents: docRes.data || [],
      contacts: conRes.data || [],
      conversations: convRes.data || [],
      messages: msgRes.data || [],
    });
    setLoaded(true);
  }, [organization.id, supabase, loaded]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || !loaded) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    // Search invoices
    for (const inv of allData.invoices) {
      if (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        String(inv.total).includes(q)
      ) {
        matched.push({
          type: 'invoice',
          id: inv.id,
          title: `${inv.invoice_number} — ${inv.customer_name}`,
          subtitle: `${formatCurrency(inv.total, inv.currency)} · ${inv.status}`,
          url: `/invoices/${inv.id}`,
        });
      }
    }

    // Search customers
    for (const c of allData.customers) {
      if (
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      ) {
        matched.push({
          type: 'customer',
          id: c.id,
          title: c.name,
          subtitle: [c.company, c.phone, c.email].filter(Boolean).join(' · '),
          url: `/customers/${c.id}`,
        });
      }
    }

    // Search cash flows
    for (const cf of allData.cashFlows) {
      if (
        cf.category?.toLowerCase().includes(q) ||
        cf.from_to?.toLowerCase().includes(q) ||
        cf.description?.toLowerCase().includes(q) ||
        String(cf.amount).includes(q)
      ) {
        matched.push({
          type: cf.flow_type === 'OUT' ? 'expense' : 'cash_flow',
          id: cf.id,
          title: `${cf.category}${cf.from_to ? ` — ${cf.from_to}` : ''}`,
          subtitle: `${cf.flow_type === 'IN' ? '+' : '-'}${formatCurrency(cf.amount, cf.currency)} · ${formatDate(cf.date)}`,
          url: '/cash-flow',
        });
      }
    }

    // Search documents
    for (const d of allData.documents) {
      if (
        d.title?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      ) {
        matched.push({
          type: 'document',
          id: d.id,
          title: d.title,
          subtitle: `${d.category} · ${formatDate(d.date)}`,
          url: '/documents',
        });
      }
    }

    // Search contacts
    for (const c of allData.contacts) {
      if (
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      ) {
        matched.push({
          type: 'contact',
          id: c.id,
          title: c.name,
          subtitle: [c.contact_type, c.company, c.phone].filter(Boolean).join(' · '),
          url: '/contacts',
        });
      }
    }

    // Search conversations
    for (const conv of allData.conversations) {
      const name = conv.group_name || conv.title || '';
      if (name.toLowerCase().includes(q) || conv.last_message?.toLowerCase().includes(q)) {
        matched.push({
          type: 'contact',
          id: conv.id,
          title: name,
          subtitle: conv.is_group ? 'Group' : conv.is_bot_chat ? 'AI Assistant' : (conv.last_message?.slice(0, 50) || 'Conversation'),
          url: `/chat?convo=${conv.id}`,
        });
      }
    }

    // Search messages
    for (const msg of allData.messages) {
      if (msg.message?.toLowerCase().includes(q)) {
        matched.push({
          type: 'document',
          id: msg.id,
          title: msg.sender_name || 'Message',
          subtitle: msg.message.slice(0, 60) + (msg.message.length > 60 ? '...' : ''),
          url: `/chat?convo=${msg.conversation_id}`,
        });
      }
    }

    setResults(matched.slice(0, 25));
  }, [query, allData, loaded, currency]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setOpen(true); loadData(); }}
          placeholder="Search invoices, customers, expenses..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-lg">
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[var(--text-4)]">No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="sticky top-0 bg-[var(--bg-2)] px-4 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-4)]">
                    {type.replace('_', ' ')}s ({items.length})
                  </span>
                </div>
                {items.map((r) => {
                  const ti = TYPE_ICONS[r.type] || TYPE_ICONS.contact;
                  return (
                    <Link
                      key={r.id}
                      href={r.url}
                      onClick={() => { setOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-2)]"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ti.color}`}>
                        {ti.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-1)]">{r.title}</p>
                        <p className="truncate text-xs text-[var(--text-4)]">{r.subtitle}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
