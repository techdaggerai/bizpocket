'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AIInvoiceHelperProps {
  onSuggestion?: (data: {
    customer_name?: string;
    items?: { description: string; quantity: number; unit_price: number }[];
    notes?: string;
    disclaimer?: string;
    payment_method?: string;
  }) => void;
}

export default function AIInvoiceHelper({ onSuggestion }: AIInvoiceHelperProps) {
  const { organization, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I can help you create your invoice. Tell me what you need — describe your items, ask for a disclaimer, or even send a voice note and I\'ll generate everything for you.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/invoice-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          businessName: organization.name,
          businessType: organization.business_type || '',
          currency: organization.currency || 'JPY',
          language: profile.language || 'en',
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      }
      if (data.suggestion && onSuggestion) {
        onSuggestion(data.suggestion);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t process that. Try again.' }]);
    }
    setLoading(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setMessages(prev => [...prev, { role: 'user', text: '\uD83C\uDFA4 Voice message sent...' }]);
        setLoading(true);

        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');
        formData.append('businessName', organization.name);
        formData.append('businessType', organization.business_type || '');
        formData.append('currency', organization.currency || 'JPY');
        formData.append('language', profile.language || 'en');

        try {
          const res = await fetch('/api/ai/invoice-helper', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.reply) setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
          if (data.suggestion && onSuggestion) onSuggestion(data.suggestion);
        } catch {
          setMessages(prev => [...prev, { role: 'ai', text: 'Could not process voice. Try typing instead.' }]);
        }
        setLoading(false);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Microphone access denied. Please type your request.' }]);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-lg hover:bg-[#4338CA] transition-all hover:scale-105"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-[320px] rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-[13px] font-medium text-[#0A0A0A]">AI Invoice Helper</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-[#999] hover:text-[#0A0A0A]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="h-[280px] overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#4F46E5] text-white'
                : 'bg-[#F5F5F5] text-[#333]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#F5F5F5] rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
        {['Write a disclaimer', 'Suggest payment terms', 'Add tax notes'].map((s) => (
          <button key={s} onClick={() => sendMessage(s)} className="shrink-0 rounded-full border border-[#E5E5E5] px-2.5 py-1 text-[10px] text-[#666] hover:bg-[#F5F5F5]">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#F0F0F0]">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            recording ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
          placeholder="Ask AI anything about your invoice..."
          className="flex-1 text-[12px] text-[#0A0A0A] placeholder-[#BBB] bg-transparent focus:outline-none"
        />
        <button
          onClick={() => sendMessage(message)}
          disabled={!message.trim() || loading}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#4F46E5] text-white disabled:opacity-30"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
