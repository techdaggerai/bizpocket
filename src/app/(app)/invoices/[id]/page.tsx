'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceChat, InvoiceStatus } from '@/types/database';
import CorridorMilestoneToast from '@/components/ui/CorridorMilestoneToast';

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]',
  sent: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/20',
  paid: 'bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20',
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { organization, profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [messages, setMessages] = useState<InvoiceChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [corridorMilestone, setCorridorMilestone] = useState<{ fromFlag: string; toFlag: string; label: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch invoice + messages
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [invRes, chatRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .eq('organization_id', organization.id)
          .single(),
        supabase
          .from('invoice_chats')
          .select('*')
          .eq('invoice_id', id)
          .order('created_at', { ascending: true }),
      ]);

      if (invRes.data) setInvoice(invRes.data);
      if (chatRes.data) {
        setMessages(chatRes.data);

        // Mark customer messages as read
        const unread = chatRes.data.filter(
          (m: InvoiceChat) => m.sender_type === 'customer' && !m.read_at
        );
        if (unread.length > 0) {
          await supabase
            .from('invoice_chats')
            .update({ read_at: new Date().toISOString() })
            .in(
              'id',
              unread.map((m: InvoiceChat) => m.id)
            );
        }
      }

      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`invoice-chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invoice_chats',
          filter: `invoice_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as InvoiceChat;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-mark customer messages as read
          if (newMsg.sender_type === 'customer' && !newMsg.read_at) {
            supabase
              .from('invoice_chats')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from('invoice_chats').insert({
      organization_id: organization.id,
      invoice_id: id,
      sender_type: 'owner',
      sender_name: profile.name,
      message: newMessage.trim(),
    });

    if (error) {
      toast(error.message, 'error');
    } else {
      setNewMessage('');
    }
    setSending(false);
  }

  async function updateStatus(status: InvoiceStatus) {
    if (!invoice) return;
    const updateData: Record<string, unknown> = { status };
    if (status === 'sent') updateData.sent_at = new Date().toISOString();
    if (status === 'paid') updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice.id)
      .eq('organization_id', organization.id);

    if (error) {
      toast(error.message, 'error');
    } else {
      toast(`Marked as ${status}`, 'success');
      setInvoice((prev) => (prev ? { ...prev, status, ...updateData } : prev));
      // ─── Trust events for paid invoices ─────────────────
      if (status === 'paid') {
        // Server handles first_paid vs repeat dedup:
        // Try first_paid_invoice first (one-time, server deduplicates),
        // then always log invoice_paid for repeat credit
        fetch('/api/trust/log-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'first_paid_invoice' }),
        }).then(r => r.json()).then(res => {
          // If first_paid was skipped (already awarded), log regular invoice_paid
          if (res.skipped) {
            fetch('/api/trust/log-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event_type: 'invoice_paid' }),
            }).catch(() => {})
          }
        }).catch(() => {})
        // ─── Corridor milestone check ───────────────────
        fetch('/api/trust/corridor-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoice.id }),
        }).then(r => r.json()).then(res => {
          if (res.milestone) {
            setCorridorMilestone({
              fromFlag: res.milestone.from_flag,
              toFlag: res.milestone.to_flag,
              label: res.milestone.label,
            })
          }
        }).catch(() => {})
      }
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    setDeleting(true);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)
      .eq('organization_id', organization.id);

    if (error) {
      toast(error.message, 'error');
      setDeleting(false);
    } else {
      toast('Invoice deleted', 'success');
      router.push('/invoices');
    }
  }

  async function handleDuplicate() {
    if (!invoice) return;
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);
    const seq = String((count || 0) + 1).padStart(4, '0');
    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const newNumber = `INV/${prefix}/${ymd}-${seq}`;

    const { data: newInv, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        invoice_number: newNumber,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        customer_address: invoice.customer_address,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        grand_total: invoice.grand_total,
        notes: invoice.notes,
        bank_name: invoice.bank_name,
        bank_branch: invoice.bank_branch,
        bank_account_name: invoice.bank_account_name,
        bank_account_number: invoice.bank_account_number,
        bank_account_type: invoice.bank_account_type,
        currency: invoice.currency,
        template: (invoice as any).template,
        invoice_type: (invoice as any).invoice_type,
        language: (invoice as any).language,
        payment_method: (invoice as any).payment_method,
        disclaimer: (invoice as any).disclaimer,
        status: 'draft',
        created_by: profile.user_id || (invoice as any).created_by,
      })
      .select()
      .single();

    if (error) {
      toast('Duplicate failed: ' + error.message, 'error');
    } else if (newInv) {
      // Clone invoice_items
      const { data: sourceItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      if (sourceItems && sourceItems.length > 0) {
        const clonedItems = sourceItems.map(({ id, invoice_id, ...rest }: any) => ({
          ...rest,
          invoice_id: newInv.id,
        }));
        await supabase.from('invoice_items').insert(clonedItems);
      }
      toast('Invoice duplicated', 'success');
      router.push(`/invoices/${newInv.id}`);
    }
  }

  function copyPublicLink() {
    if (!invoice?.chat_token) {
      toast('No public link available', 'error');
      return;
    }
    const url = `${window.location.origin}/i/${invoice.chat_token}`;
    navigator.clipboard.writeText(url);
    toast('Public link copied', 'success');
  }

  async function handleShare() {
    if (!invoice?.chat_token) {
      toast('No public link available', 'error');
      return;
    }
    const url = `${window.location.origin}/i/${invoice.chat_token}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoice_number}`,
          text: `Invoice for ${invoice.customer_name}`,
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      toast('Link copied (sharing not supported)', 'info');
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4 py-4">
        <Link href="/invoices" className="text-sm text-[#4F46E5] hover:opacity-80">
          &larr; Back to Invoices
        </Link>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
          <p className="text-sm text-[#A3A3A3]">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Corridor Milestone Toast */}
      {corridorMilestone && (
        <CorridorMilestoneToast
          fromFlag={corridorMilestone.fromFlag}
          toFlag={corridorMilestone.toFlag}
          label={corridorMilestone.label}
          onDismiss={() => setCorridorMilestone(null)}
        />
      )}
      <PageHeader title="Invoice" backPath="/invoices" />

      {/* Invoice Detail Card */}
      <div className="rounded-card border border-[#E5E5E5] bg-white p-5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-[#0A0A0A]">{invoice.invoice_number}</p>
            <p className="text-xs text-[#A3A3A3]">{formatDate(invoice.created_at)}</p>
          </div>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[invoice.status]}`}
          >
            {invoice.status.toUpperCase()}
          </span>
        </div>

        {/* Customer info */}
        <div className="mt-4">
          <p className="text-sm font-medium text-[#0A0A0A]">{invoice.customer_name}</p>
          {invoice.customer_address && (
            <p className="text-xs text-[#A3A3A3]">{invoice.customer_address}</p>
          )}
        </div>

        {/* Amount */}
        <div className="mt-4">
          <p className="font-mono text-2xl font-semibold text-[#0A0A0A]">
            {formatCurrency(invoice.total, invoice.currency)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => updateStatus('sent')}
              className="rounded-[10px] bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors"
            >
              Mark Sent
            </button>
          )}
          {invoice.status === 'sent' && (
            <button
              onClick={() => updateStatus('paid')}
              className="rounded-[10px] bg-[#16A34A] px-4 py-2 text-sm font-medium text-white hover:bg-[#15803D] transition-colors"
            >
              Mark Paid
            </button>
          )}
          <button
            onClick={copyPublicLink}
            className="rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F9F9F9] transition-colors"
          >
            Copy Public Link
          </button>
          <button
            onClick={handleShare}
            className="rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F9F9F9] transition-colors"
          >
            Share
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={() => updateStatus('paid')}
              className="rounded-[10px] bg-[#16A34A] px-4 py-2 text-sm font-medium text-white hover:bg-[#15803D] transition-colors"
            >
              Mark Paid
            </button>
          )}
          <Link
            href={`/invoices/new?edit=${invoice.id}`}
            className="rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F9F9F9] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDuplicate}
            className="rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#F9F9F9] transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-[10px] border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-2 text-sm font-medium text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-[10px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-4">
            <p className="text-sm text-[#DC2626] font-medium mb-2">Delete this invoice?</p>
            <p className="text-xs text-[#DC2626]/70 mb-3">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-medium text-white hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-[#E5E5E5] px-4 py-2 text-xs font-medium text-[#525252] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evrywher Section */}
      <div className="rounded-card border border-[#E5E5E5] bg-white overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Evrywher</h2>
            <span className="text-xs text-[#A3A3A3]">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-[#A3A3A3] py-8">
              No messages yet. Start a conversation.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender_type === 'owner' ? 'items-end' : 'items-start'}`}
              >
                <p className="text-[10px] text-[#A3A3A3] mb-0.5 px-1">
                  {msg.sender_name || (msg.sender_type === 'owner' ? 'You' : 'Customer')}
                </p>
                <div
                  className={`rounded-[12px] px-3.5 py-2.5 max-w-[80%] ${
                    msg.sender_type === 'owner'
                      ? 'bg-[#4F46E5] text-white ml-auto'
                      : 'bg-[#F3F3F1] text-[#0A0A0A]'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                </div>
                <p className="text-[10px] text-[#A3A3A3] mt-0.5 px-1">
                  {formatTime(msg.created_at)}
                </p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#E5E5E5] flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-[10px] border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder-[#A3A3A3] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="rounded-[10px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
