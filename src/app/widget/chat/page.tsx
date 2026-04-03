'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import PocketSendIcon from '@/components/PocketSendIcon';
import { LANGUAGES, getDisplayText } from '@/lib/translate';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Msg { id: string; content: string; sender_id: string; original_text?: string; original_language?: string; translations?: Record<string, string>; created_at: string; }

function WidgetChatInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org') || '';
  const defaultLang = searchParams.get('lang') || 'en';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [name, setName] = useState('');
  const [lang, setLang] = useState(defaultLang);
  const [setup, setSetup] = useState(false);
  const [orgName, setOrgName] = useState('Business');
  const [ownerLang, setOwnerLang] = useState('en');
  const [showOriginal, setShowOriginal] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const customerId = useRef('');

  useEffect(() => {
    let id = sessionStorage.getItem('pc_wid'); if (!id) { id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; sessionStorage.setItem('pc_wid', id); }
    customerId.current = id;
    const sn = sessionStorage.getItem('pc_name'); const sl = sessionStorage.getItem('pc_lang');
    if (sn && sl) { setName(sn); setLang(sl); setSetup(true); }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    supabase.from('organizations').select('name, language').eq('id', orgId).single().then(({ data }) => { if (data) { setOrgName(data.name || 'Business'); setOwnerLang(data.language || 'en'); } });
  }, [orgId]);

  useEffect(() => {
    if (!setup || !orgId) return;
    supabase.from('messages').select('*').eq('conversation_id', orgId).order('created_at', { ascending: true }).limit(100).then(({ data }) => { if (data) setMessages(data); });
    const ch = supabase.channel(`widget-${orgId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${orgId}` }, (p) => { setMessages(prev => [...prev, p.new as Msg]); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [setup, orgId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSetup = () => { if (!name.trim() || !lang) return; sessionStorage.setItem('pc_name', name); sessionStorage.setItem('pc_lang', lang); setSetup(true); };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim(); setInput(''); setSending(true);
    try {
      const translations: Record<string, string> = { [lang]: text };
      if (lang !== ownerLang) {
        const r = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-public-chat': 'true' }, body: JSON.stringify({ text, fromLanguage: lang, toLanguage: ownerLang }) });
        if (r.ok) { const d = await r.json(); if (d.translatedText) translations[ownerLang] = d.translatedText; }
      }
      await supabase.from('messages').insert({ conversation_id: orgId, sender_id: customerId.current, sender_name: name, content: text, original_text: text, original_language: lang, translations, org_id: orgId, type: 'text', is_public: true, created_at: new Date().toISOString() });
      fetch('/api/ai/bot-respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: orgId, senderName: name, senderMessage: text, senderLanguage: lang, orgId }) }).catch(() => {});
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (!setup) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ background: '#4F46E5', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><p style={{ margin: 0, color: 'white', fontSize: 15, fontWeight: 600 }}>Chat with {orgName}</p><p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Powered by PocketChat</p></div>
        </div>
        <div style={{ padding: 20, flex: 1 }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Enter your name and language. Messages are auto-translated.</p>
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', background: 'white' }}>
            <option value="">Select language</option>
            {Object.entries(LANGUAGES).map(([c, l]) => <option key={c} value={c}>{l.flag} {l.native} ({l.name})</option>)}
          </select>
          <button onClick={handleSetup} disabled={!name.trim() || !lang} style={{ width: '100%', padding: 12, borderRadius: 10, background: name.trim() && lang ? '#4F46E5' : '#d1d5db', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: name.trim() && lang ? 'pointer' : 'default' }}>Start chatting</button>
        </div>
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 20px', textAlign: 'center' }}>
          <a href="https://www.bizpocket.io?ref=widget" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'none' }}>Powered by <span style={{ color: '#4F46E5', fontWeight: 600 }}>PocketChat</span></a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#4F46E5', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 600 }}>{orgName.charAt(0)}</div>
        <div><p style={{ margin: 0, color: 'white', fontSize: 14, fontWeight: 600 }}>{orgName}</p><p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{LANGUAGES[lang]?.flag} ↔ {LANGUAGES[ownerLang]?.flag} Auto-translating</p></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px 16px' }}><p style={{ fontSize: 13, color: '#6b7280' }}>Say hello! Messages auto-translate.</p></div>}
        {messages.map(msg => {
          const isMe = msg.sender_id === customerId.current;
          const d = getDisplayText(msg, lang);
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div onClick={() => { if (d.isTranslated) setShowOriginal(showOriginal === msg.id ? null : msg.id); }}
                style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? '#4F46E5' : '#f3f4f6', cursor: d.isTranslated ? 'pointer' : 'default' }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: isMe ? 'white' : '#1f2937' }}>{showOriginal === msg.id ? msg.original_text || msg.content : d.text}</p>
                {d.isTranslated && <p style={{ margin: '3px 0 0', fontSize: 10, color: isMe ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{showOriginal === msg.id ? 'Original' : 'Translated'}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ padding: '3px 8px', borderRadius: 6, background: '#f3f4f6', fontSize: 12, color: '#6b7280' }}>{LANGUAGES[lang]?.flag}</div>
        <input type="text" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          style={{ width: 34, height: 34, borderRadius: 10, background: sending || !input.trim() ? '#d1d5db' : '#4F46E5', border: 'none', cursor: sending || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PocketSendIcon size={16} />
        </button>
      </div>
      <div style={{ borderTop: '1px solid #f3f4f6', padding: '7px 14px', textAlign: 'center', flexShrink: 0 }}>
        <a href="https://www.bizpocket.io?ref=widget" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#9ca3af', textDecoration: 'none' }}>Powered by <span style={{ color: '#4F46E5', fontWeight: 600 }}>PocketChat</span></a>
      </div>
    </div>
  );
}

export default function WidgetChatPage() {
  return <Suspense><WidgetChatInner /></Suspense>;
}
