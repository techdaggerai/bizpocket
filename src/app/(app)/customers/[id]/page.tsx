'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import NoteEditor from '@/components/NoteEditor';
import Link from 'next/link';
import type { Customer, Invoice, CashFlow } from '@/types/database';

type Tab = 'invoices' | 'payments' | 'chat' | 'notes' | 'documents';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<CashFlow[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('invoices');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [custRes, invRes, payRes, docRes, convRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization.id)
        .single(),
      supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('cash_flows')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('flow_type', 'IN')
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('last_message_at', { ascending: false })
        .limit(50),
    ]);

    if (custRes.error) {
      toast('Customer not found', 'error');
    } else {
      setCustomer(custRes.data);
    }
    setInvoices(invRes.data || []);
    // Filter payments that mention customer name
    const custName = custRes.data?.name?.toLowerCase() || '';
    setPayments(
      (payRes.data || []).filter(
        (p) => p.from_to?.toLowerCase().includes(custName) || p.description?.toLowerCase().includes(custName)
      )
    );
    setDocuments(docRes.data || []);
    setConversations(convRes.data || []);
    setLoading(false);
  }, [id, organization.id, supabase, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-[var(--text-3)]">Customer not found</p>
        <Link href="/customers" className="mt-2 inline-block text-sm text-[#4F46E5]">Back to customers</Link>
      </div>
    );
  }

  const totalBusiness = invoices.reduce((s, inv) => s + inv.total, 0);
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const paidTotal = paidInvoices.length;
  const onTimeRate = invoices.length > 0 ? Math.round((paidTotal / invoices.length) * 100) : 0;
  const lastInvoice = invoices[0];
  const lastInvoiceDays = lastInvoice
    ? Math.floor((Date.now() - new Date(lastInvoice.created_at).getTime()) / 86400000)
    : null;

  const initials = customer.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'invoices', label: 'Invoices', count: invoices.length },
    { key: 'payments', label: 'Payments', count: payments.length },
    { key: 'chat', label: 'Chat', count: conversations.length },
    { key: 'notes', label: 'Notes', count: customer.notes ? 1 : 0 },
    { key: 'documents', label: 'Docs', count: documents.length },
  ];

  const statusColors: Record<string, string> = {
    draft: 'bg-[var(--bg-3)] text-[var(--text-3)]',
    sent: 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5]',
    paid: 'bg-[rgba(22,163,74,0.08)] text-[#16A34A]',
  };

  return (
    <div className="space-y-4 py-4">
      {/* Back */}
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs text-[var(--text-4)] hover:text-[var(--accent)]">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to customers
      </Link>

      {/* Profile Card */}
      <div className="rounded-card border border-[#E5E5E5] bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-lg font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-[var(--text-1)]">{customer.name}</h1>
            {customer.company && <p className="text-sm text-[var(--text-3)]">{customer.company}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-3)]">
              {customer.phone && <span>{customer.phone}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.address && <span>{customer.address}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[var(--bg-2)] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">Total Business</p>
            <p className="font-mono text-sm font-semibold text-[#4F46E5]">{formatCurrency(totalBusiness, currency)}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-2)] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">Last Invoice</p>
            <p className="text-sm font-medium text-[var(--text-1)]">{lastInvoiceDays !== null ? `${lastInvoiceDays}d ago` : 'None'}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-2)] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">Payment Rate</p>
            <p className={`text-sm font-medium ${onTimeRate >= 80 ? 'text-[#16A34A]' : onTimeRate >= 50 ? 'text-[#F59E0B]' : 'text-[#DC2626]'}`}>{onTimeRate}% on time</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/invoices/new?customer=${customer.id}`}
            className="flex-1 rounded-btn bg-[#4F46E5] py-2 text-center text-xs font-medium text-white hover:bg-[#4338CA]"
          >
            Fire Invoice
          </Link>
          <Link
            href={`/chat?contact=${customer.id}`}
            className="flex-1 rounded-btn border border-[#E5E5E5] py-2 text-center text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)]"
          >
            Start Chat
          </Link>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center justify-center rounded-btn border border-[#E5E5E5] px-3 py-2 text-[var(--text-3)] hover:bg-[var(--bg-2)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5]'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'invoices' && (
        <div className="space-y-2">
          {invoices.length === 0 ? (
            <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
              <p className="text-sm text-[var(--text-3)]">No invoices for this customer yet.</p>
              <Link href={`/invoices/new?customer=${customer.id}`} className="mt-2 inline-block text-sm text-[#4F46E5]">Create first invoice</Link>
            </div>
          ) : (
            invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3 transition-colors hover:border-[#4F46E5]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{inv.invoice_number}</p>
                  <p className="text-xs text-[var(--text-4)]">{formatDate(inv.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium text-[var(--text-1)]">{formatCurrency(inv.total, inv.currency)}</p>
                  <span className={`inline-block rounded-btn px-1.5 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || ''}`}>
                    {inv.status.toUpperCase()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
              <p className="text-sm text-[var(--text-3)]">No payments recorded from this customer.</p>
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{p.category}</p>
                  <p className="text-xs text-[var(--text-4)]">{formatDate(p.date)}{p.description ? ` · ${p.description}` : ''}</p>
                </div>
                <span className="font-mono text-sm font-medium text-[#16A34A]">+{formatCurrency(p.amount, currency)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
              <p className="text-sm text-[var(--text-3)]">No chat history with this customer.</p>
              <Link href={`/chat?contact=${customer.id}`} className="mt-2 inline-block text-sm text-[#4F46E5]">Start a conversation</Link>
            </div>
          ) : (
            conversations.map((c) => (
              <Link
                key={c.id}
                href={`/chat?conversation=${c.id}`}
                className="flex items-center justify-between rounded-card border border-[#E5E5E5] bg-white px-4 py-3 transition-colors hover:border-[#4F46E5]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{c.title || 'Conversation'}</p>
                  <p className="text-xs text-[var(--text-4)] truncate max-w-[200px]">{c.last_message || 'No messages'}</p>
                </div>
                {c.unread_count > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#4F46E5] px-1.5 text-[10px] font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--text-1)]">Customer Notes</h3>
          <NoteEditor
            note={customer.notes}
            onSave={async (note) => {
              await supabase.from('customers').update({ notes: note }).eq('id', customer.id);
              setCustomer({ ...customer, notes: note });
              toast('Note saved', 'success');
            }}
            onDelete={async () => {
              await supabase.from('customers').update({ notes: null }).eq('id', customer.id);
              setCustomer({ ...customer, notes: null });
              toast('Note removed', 'success');
            }}
          />
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
              <p className="text-sm text-[var(--text-3)]">No documents yet.</p>
              <Link href="/documents" className="mt-2 inline-block text-sm text-[#4F46E5]">Go to Vault</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {documents.slice(0, 10).map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-card border border-[#E5E5E5] bg-white p-3 transition-colors hover:border-[#4F46E5]"
                >
                  <div className="mb-1.5 flex h-16 items-center justify-center rounded-lg bg-[var(--bg-2)]">
                    {doc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={doc.file_url} alt={doc.title} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <svg className="h-6 w-6 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-[var(--text-1)]">{doc.title}</p>
                  <span className="text-[10px] text-[var(--text-4)]">{formatDate(doc.date)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
