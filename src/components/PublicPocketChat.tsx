'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { LANGUAGES, getDisplayText } from '@/lib/translate';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  content: string;
  sender_id: string;
  original_text?: string;
  original_language?: string;
  translations?: Record<string, string>;
  created_at: string;
  type: string;
}

interface PublicPocketChatProps {
  conversationId: string;
  ownerId: string;
  ownerName: string;
  ownerLanguage: string;
  orgId: string;
  publicToken?: string;
  context?: 'invoice' | 'order';
}

export default function PublicPocketChat({ conversationId, ownerId, ownerName, ownerLanguage, orgId, publicToken, context = 'order' }: PublicPocketChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerLanguage, setCustomerLanguage] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [showOriginal, setShowOriginal] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const customerId = useRef<string>('');

  useEffect(() => {
    let id = sessionStorage.getItem('pocketchat_customer_id');
    if (!id) { id = `public_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; sessionStorage.setItem('pocketchat_customer_id', id); }
    customerId.current = id;
    const savedName = sessionStorage.getItem('pocketchat_name');
    const savedLang = sessionStorage.getItem('pocketchat_language');
    if (savedName && savedLang) { setCustomerName(savedName); setCustomerLanguage(savedLang); setIsSetup(true); }
  }, []);

  useEffect(() => {
    if (!isSetup || !conversationId) return;
    const loadMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(100);
      if (data) setMessages(data);
    };
    loadMessages();
    const channel = supabase.channel(`public-chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => { setMessages((prev) => [...prev, payload.new as Message]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSetup, conversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSetup = () => {
    if (!customerName.trim() || !customerLanguage) return;
    sessionStorage.setItem('pocketchat_name', customerName);
    sessionStorage.setItem('pocketchat_language', customerLanguage);
    setIsSetup(true);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      let translations: Record<string, string> = { [customerLanguage]: text };
      if (customerLanguage !== ownerLanguage) {
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, fromLanguage: customerLanguage, toLanguage: ownerLanguage, publicToken }),
        });
        if (res.ok) { const data = await res.json(); translations[ownerLanguage] = data.translatedText; }
      }
      await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: customerId.current, sender_name: customerName,
        content: text, original_text: text, original_language: customerLanguage, translations,
        org_id: orgId, type: 'text', is_public: true, created_at: new Date().toISOString(),
      });
    } catch (err) { console.error('Send error:', err); }
    finally { setSending(false); }
  };

  if (!chatOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button onClick={() => setChatOpen(true)} className="w-14 h-14 rounded-2xl bg-[#4F46E5] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30 hover:scale-105 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" /></svg>
        </button>
        <div className="absolute bottom-16 right-0 bg-white rounded-xl px-3.5 py-2.5 shadow-lg whitespace-nowrap text-[13px] font-medium text-[#1f2937]">
          Questions? Chat with us
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-white transform rotate-45 shadow-sm" />
        </div>
      </div>
    );
  }

  if (!isSetup) {
    return (
      <div className="fixed bottom-5 right-5 w-[360px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50">
        <div className="bg-[#4F46E5] px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-white text-[15px] font-semibold">Chat with {ownerName}</p>
            <p className="text-white/70 text-xs">Powered by PocketChat</p>
          </div>
          <button onClick={() => setChatOpen(false)} className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-white text-base">×</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-[#6b7280]">Enter your name and language. Messages are automatically translated.</p>
          <input type="text" placeholder="Your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#e5e7eb] text-sm outline-none focus:border-[#4F46E5]" />
          <select value={customerLanguage} onChange={(e) => setCustomerLanguage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#e5e7eb] text-sm outline-none focus:border-[#4F46E5] bg-white">
            <option value="">Select your language</option>
            {Object.entries(LANGUAGES).map(([code, lang]) => (<option key={code} value={code}>{lang.flag} {lang.native} ({lang.name})</option>))}
          </select>
          <button onClick={handleSetup} disabled={!customerName.trim() || !customerLanguage}
            className="w-full py-3 rounded-[10px] bg-[#4F46E5] text-white text-sm font-semibold disabled:bg-[#d1d5db] disabled:cursor-default">Start chatting</button>
        </div>
        <div className="border-t border-[#f3f4f6] py-2.5 text-center">
          <a href="https://www.bizpocket.io?ref=pocketchat" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#9ca3af] no-underline">
            Powered by <span className="text-[#4F46E5] font-semibold">BizPocket</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 w-[380px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-40px)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
      <div className="bg-[#4F46E5] px-4 py-3.5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-white/20 flex items-center justify-center text-white text-sm font-semibold">{ownerName.charAt(0).toUpperCase()}</div>
          <div>
            <p className="text-white text-sm font-semibold">{ownerName}</p>
            <p className="text-white/70 text-[11px]">{LANGUAGES[customerLanguage]?.flag} ↔ {LANGUAGES[ownerLanguage]?.flag} Auto-translating</p>
          </div>
        </div>
        <button onClick={() => setChatOpen(false)} className="bg-white/20 rounded-lg w-7 h-7 flex items-center justify-center text-white text-base">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {messages.length === 0 && <div className="text-center py-10"><p className="text-sm text-[#6b7280]">Say hello! Your message will be translated automatically.</p></div>}
        {messages.map((msg) => {
          const isMe = msg.sender_id === customerId.current;
          const display = getDisplayText(msg, customerLanguage);
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div onClick={() => { if (display.isTranslated) setShowOriginal(showOriginal === msg.id ? null : msg.id); }}
                className={`max-w-[80%] px-3.5 py-2.5 ${isMe ? 'rounded-[14px_14px_4px_14px] bg-[#4F46E5]' : 'rounded-[14px_14px_14px_4px] bg-[#f3f4f6]'} ${display.isTranslated ? 'cursor-pointer' : ''}`}>
                <p className={`text-[13px] leading-relaxed ${isMe ? 'text-white' : 'text-[#1f2937]'}`}>
                  {showOriginal === msg.id ? msg.original_text || msg.content : display.text}
                </p>
                {display.isTranslated && (
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-[#9ca3af]'}`}>
                    {showOriginal === msg.id ? `Original · ${LANGUAGES[display.originalLanguage || '']?.flag || ''}` : 'Translated · tap to see original'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#f3f4f6] px-3 py-2.5 flex items-center gap-2 shrink-0">
        <div className="px-2 py-1 rounded-md bg-[#f3f4f6] text-xs text-[#6b7280] shrink-0">{LANGUAGES[customerLanguage]?.flag}</div>
        <input type="text" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2.5 rounded-[10px] border border-[#e5e7eb] text-[13px] outline-none" />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${sending || !input.trim() ? 'bg-[#d1d5db]' : 'bg-[#4F46E5]'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
        </button>
      </div>

      <div className="border-t border-[#f3f4f6] py-2 text-center shrink-0">
        <a href="https://www.bizpocket.io?ref=pocketchat" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#9ca3af] no-underline">
          Powered by <span className="text-[#4F46E5] font-semibold">BizPocket</span> — AI Business Autopilot
        </a>
      </div>
    </div>
  );
}
