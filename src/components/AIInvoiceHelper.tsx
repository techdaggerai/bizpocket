'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceSuggestion {
  items?: InvoiceItem[];
  notes?: string | null;
  disclaimer?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  message?: string;
}

interface AIInvoiceHelperProps {
  onSuggestion: (data: InvoiceSuggestion) => void;
}

const QUICK_SUGGESTIONS = [
  'Add 1 Toyota Hiace for ¥850,000',
  'Add shipping fee ¥120,000',
  'Set payment to cash',
  'Add disclaimer: All sales final',
];

export default function AIInvoiceHelper({ onSuggestion }: AIInvoiceHelperProps) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = text || message.trim();
    if (!msg || loading) return;

    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/invoice-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          organizationId: organization.id,
          currency: organization.currency || 'JPY',
        }),
      });

      const data = await res.json();

      if (data.suggestion) {
        const suggestion = data.suggestion as InvoiceSuggestion;
        setMessages((prev) => [...prev, { role: 'ai', text: suggestion.message || 'Done!' }]);
        onSuggestion(suggestion);
        toast('AI suggestion applied', 'success');
      } else if (data.error) {
        setMessages((prev) => [...prev, { role: 'ai', text: data.error }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Failed to connect to AI' }]);
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-lg transition-all hover:bg-[#4338CA] hover:scale-105"
        aria-label="AI Invoice Helper"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-30 w-[340px] rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#4F46E5] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-sm font-semibold text-white">AI Invoice Helper</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="h-[240px] overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-[#A3A3A3] mb-3">Tell me what to add to your invoice</p>
            <div className="space-y-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="block w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-left text-xs text-[#525252] hover:bg-[#FAFAFA] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-[#F5F5F5] text-[#0A0A0A]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-[#F5F5F5] px-3 py-2">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#E5E5E5] p-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="e.g., Add 2 Toyota Hiace at ¥850k each"
          className="flex-1 rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#0A0A0A] placeholder-[#A3A3A3] focus:border-[#4F46E5] focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!message.trim() || loading}
          className="rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
