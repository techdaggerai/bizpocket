'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceStatus } from '@/types/database';

export default function InvoicesPage() {
  const { organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuOpenId && listRef.current && !((e.target as HTMLElement).closest('[data-menu]'))) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  async function updateStatus(id: string, status: InvoiceStatus) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'sent') updateData.sent_at = new Date().toISOString();
    if (status === 'paid') updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) toast(error.message, 'error');
    else { toast(`Marked as ${status}`, 'success'); fetchData(); }
  }

  async function handleDeleteInvoice(id: string) {
    // Delete line items first, then the invoice
    await supabase.from('invoice_items').delete().eq('invoice_id', id).eq('organization_id', organization.id);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) {
      toast(`Delete failed: ${error.message}`, 'error');
    } else {
      toast('Invoice deleted', 'success');
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
    setDeleteConfirmId(null);
  }

  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-[var(--bg-3)] text-[var(--text-3)] border-[var(--border-strong)]',
    sent: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20',
    paid: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  };

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">Your Invoices</h1>
          <p className="text-xs text-[#999]">{invoices.length} total · {invoices.filter(i => i.status === 'paid').length} paid</p>
        </div>
        <a
          href="/invoices/new"
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
        >
          Fire New Invoice
        </a>
      </div>

      {/* Quick Links — Estimates & Time */}
      <div className="flex gap-3">
        <a href="/estimates" className="flex-1 flex items-center gap-3 rounded-xl border-2 border-[#F59E0B]/30 bg-[#F59E0B]/[0.03] px-4 py-3 text-sm font-medium text-[#0A0A0A] hover:bg-[#F59E0B]/[0.06] transition-colors">
          <svg className="h-5 w-5 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M13 2v6h6"/></svg>
          Estimates
        </a>
        <a href="/time-tracking" className="flex-1 flex items-center gap-3 rounded-xl border-2 border-[#F59E0B]/30 bg-[#F59E0B]/[0.03] px-4 py-3 text-sm font-medium text-[#0A0A0A] hover:bg-[#F59E0B]/[0.06] transition-colors">
          <svg className="h-5 w-5 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Time Tracking
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'draft', 'sent', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-4)] hover:text-[var(--text-2)]'
            }`}
          >
            {f === 'all' ? 'All' : t(`invoices.${f}`)} ({f === 'all' ? invoices.length : invoices.filter((i) => i.status === f).length})
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">{t('invoices.no_invoices')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-medium text-[var(--text-1)]">{inv.customer_name}</p>
                  <p className="text-xs text-[var(--text-4)]">{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-mono text-base font-medium text-[var(--text-1)]">{formatCurrency(inv.total, inv.currency)}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {(inv as any).invoice_type && (inv as any).invoice_type !== 'commercial' && (
                      <span className="inline-block rounded-btn border border-[var(--accent)]/20 bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                        {((inv as any).invoice_type as string).toUpperCase()}
                      </span>
                    )}
                    <span className={`inline-block rounded-btn border px-1.5 py-0.5 text-[10px] font-medium ${statusColors[inv.status]}`}>
                      {inv.status.toUpperCase()}
                    </span>
                    {(inv as any).viewed_at && !['paid'].includes(inv.status) && (
                      <span className="inline-block rounded-btn border border-[#0EA5E9]/20 bg-[#0EA5E9]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#0EA5E9]">
                        VIEWED
                      </span>
                    )}
                    {(inv as any).signature_url && (
                      <span className="inline-block rounded-btn border border-[#16A34A]/20 bg-[#16A34A]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#16A34A]">
                        SIGNED
                      </span>
                    )}
                  </div>
                </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {/* Status actions */}
                {inv.status === 'draft' && (
                  <button onClick={() => updateStatus(inv.id, 'sent')} className="rounded-btn bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]">
                    Mark Sent
                  </button>
                )}
                {inv.status === 'sent' && (
                  <button onClick={() => updateStatus(inv.id, 'paid')} className="rounded-btn bg-[var(--green)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    Mark Paid
                  </button>
                )}

                {/* Edit — draft/sent only */}
                {inv.status !== 'paid' ? (
                  <a
                    href={`/invoices/new?edit=${inv.id}`}
                    className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                  >
                    Edit
                  </a>
                ) : (
                  <span className="flex items-center gap-1 rounded-btn border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-4)]" title="Paid invoices are locked">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Locked
                  </span>
                )}

                {/* View */}
                <a
                  href={`/invoices/${inv.id}`}
                  className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-light)]"
                >
                  View
                </a>

                {/* 3-dot menu for delete */}
                <div className="relative ml-auto" data-menu>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === inv.id ? null : inv.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-4)] hover:bg-[var(--bg-2)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  </button>
                  {menuOpenId === inv.id && (
                    <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg">
                      <a
                        href={`/invoices/${inv.id}`}
                        className="block px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                      >
                        View Detail
                      </a>
                      {inv.status !== 'paid' && (
                        <a
                          href={`/invoices/new?edit=${inv.id}`}
                          className="block px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                        >
                          Edit Invoice
                        </a>
                      )}
                      {deleteConfirmId === inv.id ? (
                        <div className="flex items-center gap-1 px-3 py-2">
                          <button
                            onClick={() => { handleDeleteInvoice(inv.id); setMenuOpenId(null); }}
                            className="rounded bg-[#DC2626] px-2 py-1 text-[10px] font-medium text-white"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-[var(--text-4)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(inv.id)}
                          className="block w-full px-3 py-2 text-left text-xs text-[#DC2626] hover:bg-[var(--bg-2)]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
