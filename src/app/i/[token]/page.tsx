'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import SignaturePad from '@/components/SignaturePad'
import { createBrowserClient } from '@supabase/ssr'
import type { Invoice, InvoiceItem, InvoiceChat, Organization } from '@/types/database'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ChatIdentity {
  name: string
  email: string
}

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [messages, setMessages] = useState<InvoiceChat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chat state
  const [identity, setIdentity] = useState<ChatIdentity | null>(null)
  const [showIdentityForm, setShowIdentityForm] = useState(false)
  const [identityName, setIdentityName] = useState('')
  const [identityEmail, setIdentityEmail] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const fmt = useCallback((amount: number) => {
    if (!invoice) return String(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(amount)
  }, [invoice])

  // Show toast helper
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Load identity from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pocketchat_identity')
      if (stored) {
        setIdentity(JSON.parse(stored))
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch invoice + org + messages
  useEffect(() => {
    if (!token) return

    async function load() {
      setLoading(true)
      setError(null)

      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('public_token', token)
        .single()

      if (invErr || !inv) {
        setError('Invoice not found')
        setLoading(false)
        return
      }

      setInvoice(inv as Invoice)

      // Track that invoice was viewed (via secure RPC)
      if (!(inv as any).viewed_at) {
        supabase.rpc('track_invoice_view', { p_token: token }).then(() => {});
      }

      // Fetch org for business name + bank details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', inv.organization_id)
        .single()

      if (orgData) setOrg(orgData as Organization)

      // Fetch chat messages
      const { data: chats } = await supabase
        .from('invoice_chats')
        .select('*')
        .eq('invoice_id', inv.id)
        .order('created_at', { ascending: true })

      if (chats) setMessages(chats as InvoiceChat[])

      setLoading(false)
    }

    load()
  }, [token])

  // Realtime subscription
  useEffect(() => {
    if (!invoice) return

    const channel = supabase
      .channel(`invoice-chat-${invoice.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invoice_chats',
          filter: `invoice_id=eq.${invoice.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === (payload.new as InvoiceChat).id)
            if (exists) return prev
            return [...prev, payload.new as InvoiceChat]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [invoice])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save identity
  const saveIdentity = () => {
    if (!identityName.trim() || !identityEmail.trim()) return
    const id: ChatIdentity = { name: identityName.trim(), email: identityEmail.trim() }
    setIdentity(id)
    localStorage.setItem('pocketchat_identity', JSON.stringify(id))
    setShowIdentityForm(false)
  }

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !invoice || !identity) return
    setSending(true)

    const { error: sendErr } = await supabase.from('invoice_chats').insert({
      organization_id: invoice.organization_id,
      invoice_id: invoice.id,
      sender_type: 'customer',
      sender_name: identity.name,
      message: messageText.trim(),
    })

    if (sendErr) {
      showToast('Failed to send message')
    } else {
      setMessageText('')
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Link copied!')
    } catch {
      showToast('Could not copy link')
    }
  }

  // Parse items
  const items: InvoiceItem[] = invoice
    ? (Array.isArray(invoice.items) ? invoice.items : [])
    : []

  const statusColor: Record<string, string> = {
    draft: 'bg-[#F3F3F1] text-[#737373]',
    sent: 'bg-[#EEF2FF] text-[#4F46E5]',
    paid: 'bg-[#ECFDF5] text-[#059669]',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center">
        <div className="text-[#A3A3A3] text-sm">Loading invoice...</div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#F9F9F8] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#0A0A0A] text-lg font-semibold mb-1">Invoice not found</div>
          <div className="text-[#A3A3A3] text-sm">This link may be invalid or expired.</div>
        </div>
      </div>
    )
  }

  const bankName = invoice.bank_name || org?.bank_name
  const bankBranch = invoice.bank_branch || org?.bank_branch
  const bankAccountName = invoice.bank_account_name || org?.bank_account_name
  const bankAccountNumber = invoice.bank_account_number || org?.bank_account_number
  const bankAccountType = invoice.bank_account_type || org?.bank_account_type
  const hasBankDetails = bankName || bankAccountNumber

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        {/* Branding */}
        <div className="text-center py-3 mb-4">
          <span className="text-[13px] font-medium tracking-wide text-[#A3A3A3]">
            BizPocket
          </span>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-[14px] border border-[#E5E5E5] p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[#0A0A0A] text-lg font-semibold">
                {org?.name || 'Business'}
              </div>
              {org?.address && (
                <div className="text-[#737373] text-xs mt-0.5 whitespace-pre-line">
                  {org.address}
                </div>
              )}
              {org?.phone && (
                <div className="text-[#737373] text-xs">{org.phone}</div>
              )}
              {org?.tax_number && (
                <div className="text-[#737373] text-xs">Tax: {org.tax_number}</div>
              )}
            </div>
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider ${
                statusColor[invoice.status] || statusColor.draft
              }`}
            >
              {invoice.status}
            </span>
          </div>

          {/* Invoice meta */}
          <div className="flex justify-between items-start mb-6 pb-5 border-b border-[#E5E5E5]">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#A3A3A3] mb-0.5">
                Invoice
              </div>
              <div className="text-[#0A0A0A] text-sm font-semibold font-mono">
                {invoice.invoice_prefix || ''}{invoice.invoice_number}
              </div>
              <div className="text-[#A3A3A3] text-xs mt-0.5">
                {new Date(invoice.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#A3A3A3] mb-0.5">
                Bill To
              </div>
              <div className="text-[#0A0A0A] text-sm font-semibold">
                {invoice.customer_name}
              </div>
              {invoice.customer_address && (
                <div className="text-[#737373] text-xs mt-0.5 whitespace-pre-line">
                  {invoice.customer_address}
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#A3A3A3] border-b border-[#E5E5E5]">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-right pb-2 font-medium w-14">Qty</th>
                  <th className="text-right pb-2 font-medium w-24">Unit Price</th>
                  <th className="text-right pb-2 font-medium w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-[#F3F3F1]">
                    <td className="py-2.5 text-[#0A0A0A] text-[13px]">{item.description}</td>
                    <td className="py-2.5 text-right text-[#737373] text-[13px] font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right text-[#737373] text-[13px] font-mono">
                      {fmt(item.unit_price)}
                    </td>
                    <td className="py-2.5 text-right text-[#0A0A0A] text-[13px] font-mono">
                      {fmt(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1.5 mb-5 pb-5 border-b border-[#E5E5E5]">
            <div className="flex justify-between w-48 text-[13px]">
              <span className="text-[#A3A3A3]">Subtotal</span>
              <span className="text-[#0A0A0A] font-mono">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between w-48 text-[13px]">
              <span className="text-[#A3A3A3]">
                Tax{invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ''}
              </span>
              <span className="text-[#0A0A0A] font-mono">
                {fmt(invoice.tax_amount ?? invoice.tax)}
              </span>
            </div>
            <div className="flex justify-between w-48 text-base font-semibold mt-1">
              <span className="text-[#0A0A0A]">Total</span>
              <span className="text-[#0A0A0A] font-mono">
                {fmt(invoice.grand_total ?? invoice.total)}
              </span>
            </div>
          </div>

          {/* Bank details */}
          {hasBankDetails && (
            <div className="mb-5 pb-5 border-b border-[#E5E5E5]">
              <div className="text-[10px] uppercase tracking-wider text-[#A3A3A3] mb-2 font-medium">
                Bank Details
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                {bankName && (
                  <>
                    <span className="text-[#A3A3A3]">Bank</span>
                    <span className="text-[#0A0A0A]">{bankName}</span>
                  </>
                )}
                {bankBranch && (
                  <>
                    <span className="text-[#A3A3A3]">Branch</span>
                    <span className="text-[#0A0A0A]">{bankBranch}</span>
                  </>
                )}
                {bankAccountType && (
                  <>
                    <span className="text-[#A3A3A3]">Type</span>
                    <span className="text-[#0A0A0A]">{bankAccountType}</span>
                  </>
                )}
                {bankAccountNumber && (
                  <>
                    <span className="text-[#A3A3A3]">Account #</span>
                    <span className="text-[#0A0A0A] font-mono">{bankAccountNumber}</span>
                  </>
                )}
                {bankAccountName && (
                  <>
                    <span className="text-[#A3A3A3]">Name</span>
                    <span className="text-[#0A0A0A]">{bankAccountName}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-5 pb-5 border-b border-[#E5E5E5]">
              <div className="text-[10px] uppercase tracking-wider text-[#A3A3A3] mb-1.5 font-medium">
                Notes
              </div>
              <div className="text-[#737373] text-[13px] whitespace-pre-line">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* E-Signature */}
          {!(invoice as any).signature_url && !signed ? (
            <div className="mt-6">
              <SignaturePad onSave={async (dataUrl, name) => {
                try {
                  const res = await fetch('/api/invoices/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, signature_url: dataUrl, signature_name: name }),
                  });
                  if (res.ok) {
                    setSigned(true);
                    showToast('Invoice signed successfully!');
                  } else {
                    const data = await res.json().catch(() => ({}));
                    showToast(data.error || 'Failed to sign invoice');
                  }
                } catch {
                  showToast('Failed to sign invoice');
                }
              }} />
            </div>
          ) : (invoice as any).signature_url ? (
            <div className="mt-6 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-[#16A34A]" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                <p className="text-sm font-medium text-[#16A34A]">Signed by {(invoice as any).signature_name}</p>
              </div>
              <img src={(invoice as any).signature_url} alt="Signature" className="h-16 object-contain" />
            </div>
          ) : signed ? (
            <div className="mt-6 rounded-xl border border-[#16A34A]/20 bg-[#16A34A]/5 p-4 text-center">
              <svg className="h-5 w-5 text-[#16A34A] mx-auto mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              <p className="text-sm font-medium text-[#16A34A]">Signed successfully!</p>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={() => showToast('PDF coming soon')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0A0A0A] text-white text-[13px] font-medium py-2.5 rounded-[10px] hover:bg-[#171717] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 bg-[#F3F3F1] text-[#0A0A0A] text-[13px] font-medium px-4 py-2.5 rounded-[10px] hover:bg-[#E5E5E5] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Link
            </button>
          </div>
        </div>

        {/* PocketChat */}
        <div className="bg-white rounded-[14px] border border-[#E5E5E5] mt-4 overflow-hidden">
          {/* Chat header */}
          <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-base font-semibold text-[#0A0A0A]">PocketChat</span>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="px-4 py-4 max-h-[380px] overflow-y-auto space-y-3"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[#A3A3A3] text-sm">
                  Start a conversation about this invoice
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwner = msg.sender_type === 'owner'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`text-[10px] text-[#A3A3A3] mb-0.5 px-1 ${isOwner ? 'text-right' : ''}`}>
                      {msg.sender_name || (isOwner ? 'Business' : 'Customer')}
                    </div>
                    <div
                      className={`px-3.5 py-2.5 rounded-[12px] max-w-[80%] text-[13px] leading-relaxed ${
                        isOwner
                          ? 'bg-[#4F46E5] text-white ml-auto'
                          : 'bg-[#F3F3F1] text-[#0A0A0A]'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <div className={`text-[10px] text-[#A3A3A3] mt-0.5 px-1 ${isOwner ? 'text-right' : ''}`}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-[#E5E5E5]">
            {!identity && !showIdentityForm ? (
              <button
                onClick={() => setShowIdentityForm(true)}
                className="w-full bg-[#4F46E5] text-white text-[13px] font-medium py-2.5 rounded-[10px] hover:bg-[#4338CA] transition-colors"
              >
                Join Conversation
              </button>
            ) : showIdentityForm ? (
              <div className="space-y-2.5">
                <div className="text-[13px] font-medium text-[#0A0A0A]">
                  Enter your details to chat
                </div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:border-[#4F46E5] transition-colors"
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={identityEmail}
                  onChange={(e) => setIdentityEmail(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:border-[#4F46E5] transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowIdentityForm(false)}
                    className="flex-1 bg-[#F3F3F1] text-[#0A0A0A] text-[13px] font-medium py-2.5 rounded-[10px] hover:bg-[#E5E5E5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveIdentity}
                    disabled={!identityName.trim() || !identityEmail.trim()}
                    className="flex-1 bg-[#4F46E5] text-white text-[13px] font-medium py-2.5 rounded-[10px] hover:bg-[#4338CA] transition-colors disabled:opacity-40"
                  >
                    Start Chatting
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:border-[#4F46E5] transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sending}
                  className="bg-[#4F46E5] text-white rounded-[10px] px-4 py-2.5 hover:bg-[#4338CA] transition-colors disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 pt-4 border-t border-[#f3f4f6]">
          <a href="https://www.bizpocket.io?ref=invoice" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#9ca3af] no-underline">
            Sent with <span className="text-[#4F46E5] font-semibold">BizPocket</span> — AI Business Autopilot
          </a>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0A0A0A] text-white text-[13px] font-medium px-4 py-2.5 rounded-[10px] shadow-lg animate-in fade-in slide-in-from-bottom-2 z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
