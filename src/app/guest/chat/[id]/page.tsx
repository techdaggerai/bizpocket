'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { PocketChatMark } from '@/components/Logo';
import PocketAvatar from '@/components/PocketAvatar';
import PhoneInput from '@/components/PhoneInput';

interface GuestSession {
  guestId: string;
  guestToken: string;
  guestName: string;
  chatId: string;
  inviterName: string;
  inviterOrgId: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  message_type: string;
  created_at: string;
  sender_id?: string;
  attachment_url?: string | null;
}

// ─── Helpers matching auth chat styling ───

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GuestChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;

  const [session, setSession] = useState<GuestSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [showSignup, setShowSignup] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [signupError, setSignupError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── Load session ───
  useEffect(() => {
    const stored = localStorage.getItem('evrywher_guest_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GuestSession;
        if (parsed.chatId === chatId) { setSession(parsed); return; }
      } catch { /* invalid */ }
    }
    router.push('/');
  }, [chatId, router]);

  // ─── Fetch messages via API (bypasses RLS) ───
  const fetchMessages = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/guest/messages?chatId=${chatId}&guestToken=${session.guestToken}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(prev => {
            const realIds = new Set(data.messages.map((m: Message) => m.id));
            const temps = prev.filter(m => m.id.startsWith('temp-') && !realIds.has(m.id));
            if (data.messages.length !== prev.filter((m: Message) => !m.id.startsWith('temp-')).length) {
              return [...data.messages, ...temps];
            }
            return prev;
          });
        }
      }
    } catch (err) { console.error('[guest-chat] fetch:', err); }
  }, [chatId, session]);

  useEffect(() => {
    if (!session) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session, fetchMessages]);

  // ─── Scroll to bottom ───
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // ─── Send message via API ───
  const sendMessage = useCallback(async () => {
    const text = inputRef.current?.textContent?.trim();
    if (!text || !session || sending) return;
    if (inputRef.current) inputRef.current.textContent = '';
    setNewMessage('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, conversation_id: chatId, sender_type: 'contact',
      sender_name: session.guestName, message: text, message_type: 'text',
      created_at: new Date().toISOString(), sender_id: session.guestId,
    }]);
    setMsgCount(c => c + 1);

    try {
      const res = await fetch('/api/guest/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId, guestToken: session.guestToken, guestName: session.guestName,
          guestId: session.guestId, inviterOrgId: session.inviterOrgId, message: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      }
    } catch (err) { console.error('[guest-chat] send:', err); }
    setSending(false);
  }, [session, sending, chatId]);

  // ─── Phone signup (WhatsApp-style — server creates user, bypasses rate limits) ───
  const handlePhoneContinue = useCallback(async (fullPhone: string) => {
    if (!session) return;
    setSigningUp(true);
    setSignupError('');

    try {
      // Step 1: Create or find user via server API (admin key, no rate limits)
      const authRes = await fetch('/api/auth/phone-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, name: session.guestName }),
      });
      const authData = await authRes.json();

      if (!authRes.ok || !authData.success) {
        setSignupError(authData.error || 'Could not create account.');
        setSigningUp(false);
        return;
      }

      // Step 2: Sign in on client side
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: fullPhone,
      });

      if (signInErr) {
        setSignupError('Account ready! Tap Continue once more.');
        setSigningUp(false);
        return;
      }

      // Step 3: Upgrade guest → real user
      const res = await fetch('/api/guest/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: session.guestId,
          userId: authData.userId,
          name: session.guestName,
          phone: fullPhone,
        }),
      });
      const data = await res.json();

      if (data.success || data.already_connected) {
        localStorage.removeItem('evrywher_guest_session');
        window.location.href = '/chat';
      } else {
        setSignupError(data.error || 'Could not save account');
      }
    } catch { setSignupError('Network error — try again'); }
    setSigningUp(false);
  }, [session, supabase]);

  // ─── Cleanup ───
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ─── Loading state ───
  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const showBanner = !bannerDismissed || msgCount >= 5;

  // ═══════════════════════════════════════
  // RENDER — matches authenticated chat UI
  // ═══════════════════════════════════════

  return (
    <div className="fixed top-0 left-0 right-0 h-[100dvh] bg-slate-900 flex flex-col">

      {/* ─── Header — matches auth chat header ─── */}
      <div className="px-2 py-2.5 border-b border-slate-700 flex items-center gap-2 shrink-0">
        {/* Left: back */}
        <button
          onClick={() => router.back()}
          className="min-w-[40px] min-h-[40px] p-2 -ml-1 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors shrink-0"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="shrink-0">
          <PocketAvatar name={session.inviterName} size={36} />
        </div>

        {/* Center: name */}
        <div className="flex-1 min-w-0 text-center px-1">
          <p className="text-base font-semibold text-white truncate leading-tight">
            {session.inviterName}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Evrywher Chat</p>
        </div>

        {/* Right: sign up */}
        <button
          onClick={() => setShowSignup(true)}
          className="shrink-0 text-xs font-semibold text-indigo-400 px-3 py-2 rounded-full hover:bg-indigo-600/10 transition-colors active:opacity-60"
        >
          Sign Up
        </button>
      </div>

      {/* ─── Signup banner ─── */}
      {showBanner && !showSignup && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-2.5 flex items-center gap-2 shrink-0">
          <p className="text-xs text-indigo-300 flex-1">
            {msgCount >= 5 ? 'Enter your phone to keep your messages' : 'Save your chat — enter your phone number'}
          </p>
          {msgCount < 5 && (
            <button onClick={() => setBannerDismissed(true)} className="text-indigo-500/50 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
          <button onClick={() => setShowSignup(true)} className="shrink-0 text-[10px] font-bold text-indigo-400 bg-indigo-600/20 px-2.5 py-1 rounded-full">
            Sign Up
          </button>
        </div>
      )}

      {/* ─── Messages — matches auth chat bubbles ─── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 chat-bg-pattern"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        <div className="space-y-1">
          {messages.map((msg, idx) => {
            const isMe = msg.sender_type === 'contact' && (msg.sender_name === session.guestName || msg.sender_id === session.guestId);
            const isSystem = msg.sender_type === 'system';
            const prevMsg = messages[idx - 1];
            const msgDate = new Date(msg.created_at).toDateString();
            const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : '';
            const showDateSep = idx === 0 || msgDate !== prevDate;

            if (isSystem) {
              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-slate-700" />
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">{formatDateSep(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-slate-700" />
                    </div>
                  )}
                  <div className="flex justify-center py-1">
                    <p className="text-[11px] text-slate-400 bg-slate-800/70 px-3 py-1 rounded-full">{msg.message}</p>
                  </div>
                </div>
              );
            }

            const dateSep = showDateSep && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-[11px] font-medium text-slate-400 shrink-0">{formatDateSep(msg.created_at)}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            );

            const timestamp = (
              <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                <span className="text-[11px] text-slate-400">{formatTime(msg.created_at)}</span>
                {isMe && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6l3.5 4L11 1" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );

            // ── Image message ──
            if (msg.message_type === 'image' && msg.attachment_url) {
              return (
                <div key={msg.id}>
                  {dateSep}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      {!isMe && <p className="text-[12px] text-indigo-400 mb-1 ml-1 font-medium">{msg.sender_name}</p>}
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-[12px] overflow-hidden border border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.attachment_url} alt={msg.message || 'Image'} className="max-h-[240px] w-full object-cover" loading="lazy" />
                      </a>
                      {timestamp}
                    </div>
                  </div>
                </div>
              );
            }

            // ── Document message ──
            if (msg.message_type === 'document' && msg.attachment_url) {
              const fileName = msg.message || 'Document';
              const ext = fileName.split('.').pop()?.toLowerCase() || '';
              return (
                <div key={msg.id}>
                  {dateSep}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      {!isMe && <p className="text-[12px] text-indigo-400 mb-1 ml-1 font-medium">{msg.sender_name}</p>}
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-[12px] border border-slate-700 bg-slate-800 px-3.5 py-2.5 hover:bg-slate-700 transition-colors">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{fileName}</p>
                          <p className="text-[10px] text-slate-400">{ext.toUpperCase()} — Tap to download</p>
                        </div>
                      </a>
                      {timestamp}
                    </div>
                  </div>
                </div>
              );
            }

            // ── Voice message (show as audio link) ──
            if (msg.message_type === 'voice' && msg.attachment_url) {
              return (
                <div key={msg.id}>
                  {dateSep}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75vw] min-w-0`}>
                      {!isMe && <p className="text-[12px] mb-1 ml-1 font-medium text-indigo-400">{msg.sender_name}</p>}
                      <div className={`rounded-2xl px-3.5 py-2.5 ${isMe ? 'bg-[#4F46E5]' : 'bg-slate-800/80 backdrop-blur-[12px] border border-white/[0.06]'}`}>
                        <audio src={msg.attachment_url} controls className="h-8 w-[200px]" />
                      </div>
                      {timestamp}
                    </div>
                  </div>
                </div>
              );
            }

            // ── Text message (default) ──
            return (
              <div key={msg.id}>
                {dateSep}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75vw] sm:max-w-[80%] min-w-0 ${isMe ? 'ml-auto' : ''}`}>
                    {!isMe && (
                      <p className="text-[12px] mb-1 ml-1 font-medium text-indigo-400">{msg.sender_name}</p>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2.5 ${
                      isMe
                        ? 'bg-[#4F46E5] text-white'
                        : 'bg-slate-800/80 text-slate-200 backdrop-blur-[12px] border border-white/[0.06]'
                    }`}>
                      <p className="text-[15px] whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{msg.message}</p>
                    </div>
                    {timestamp}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Input bar — matches auth chat input ─── */}
      <div className="shrink-0 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Input */}
          <div
            ref={inputRef}
            contentEditable
            role="textbox"
            aria-label="Message input"
            data-placeholder="Type a message..."
            suppressContentEditableWarning
            onInput={(e) => setNewMessage(e.currentTarget.textContent || '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            className="flex-1 min-w-0 bg-slate-700 rounded-[20px] px-3.5 py-2.5 text-[15px] text-white max-h-24 overflow-y-auto whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:bg-slate-800 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
          />

          {/* Send button — PocketChatMark logo like auth chat */}
          {newMessage.trim() ? (
            <button onClick={sendMessage} disabled={sending} className="shrink-0 disabled:opacity-60">
              <PocketChatMark size={36} />
            </button>
          ) : (
            <button
              onClick={() => { setShowSignup(true); }}
              className="h-[42px] w-[42px] shrink-0 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-colors"
              title="Sign up to unlock voice messages"
            >
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ─── Save Your Chat modal (phone number only — WhatsApp-style) ─── */}
      {showSignup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => { setShowSignup(false); setSignupError(''); }}>
          <div className="w-full max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Save Your Chat</h3>
              <button onClick={() => { setShowSignup(false); setSignupError(''); }} className="text-slate-500 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <p className="text-xs text-slate-400">Enter your phone number to keep your messages and unlock AI translation, voice, and more.</p>

            {signupError && (
              <div className="rounded-lg border border-red-500/20 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                {signupError}
              </div>
            )}

            <PhoneInput
              onSubmit={handlePhoneContinue}
              loading={signingUp}
              buttonText="Continue →"
              dark={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
