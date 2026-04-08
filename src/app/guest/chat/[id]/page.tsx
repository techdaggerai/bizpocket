'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { PocketChatMark } from '@/components/Logo';
import PhoneInput from '@/components/PhoneInput';
import OTPInput from '@/components/OTPInput';

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
  const [signupStep, setSignupStep] = useState<'phone' | 'otp'>('phone');
  const [signupPhone, setSignupPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [signupError, setSignupError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── Load session from localStorage ───
  useEffect(() => {
    const stored = localStorage.getItem('evrywher_guest_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GuestSession;
        if (parsed.chatId === chatId) {
          setSession(parsed);
          return;
        }
      } catch { /* invalid JSON */ }
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
            // Merge: keep optimistic temp messages, replace with real ones
            const realIds = new Set(data.messages.map((m: Message) => m.id));
            const temps = prev.filter(m => m.id.startsWith('temp-') && !realIds.has(m.id));
            // Only update if there are new messages
            if (data.messages.length !== prev.filter((m: Message) => !m.id.startsWith('temp-')).length) {
              return [...data.messages, ...temps];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error('[guest-chat] fetch error:', err);
    }
  }, [chatId, session]);

  // Initial fetch + polling every 3s (replaces realtime which requires auth)
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

  // ─── Send message via API (bypasses RLS) ───
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !session || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: chatId,
      sender_type: 'contact',
      sender_name: session.guestName,
      message: text,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender_id: session.guestId,
    };
    setMessages(prev => [...prev, tempMsg]);
    setMsgCount(c => c + 1);

    try {
      const res = await fetch('/api/guest/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          guestToken: session.guestToken,
          guestName: session.guestName,
          guestId: session.guestId,
          inviterOrgId: session.inviterOrgId,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      }
    } catch (err) {
      console.error('[guest-chat] send error:', err);
    }

    setSending(false);
  }, [newMessage, session, sending, chatId]);

  // ─── Phone signup: send OTP ───
  const handlePhoneSubmit = useCallback(async (fullPhone: string) => {
    console.log('[guest-signup] handlePhoneSubmit called:', fullPhone);
    setSigningUp(true);
    setSignupError('');
    setSignupPhone(fullPhone);

    try {
      // Try signUp first — creates user + sends OTP
      const { error } = await supabase.auth.signUp({ phone: fullPhone });
      console.log('[guest-signup] signUp result:', error?.message || 'success');

      if (error) {
        // User may already exist — try OTP login instead
        console.log('[guest-signup] Trying signInWithOtp fallback');
        const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        console.log('[guest-signup] signInWithOtp result:', otpErr?.message || 'success');
        if (otpErr) {
          setSignupError(otpErr.message);
          setSigningUp(false);
          return;
        }
      }

      setSignupStep('otp');
    } catch (err) {
      console.error('[guest-signup] Unexpected error:', err);
      setSignupError('Something went wrong. Please try again.');
    }
    setSigningUp(false);
  }, [supabase]);

  // ─── Phone signup: verify OTP + upgrade guest ───
  const handleVerifyOTP = useCallback(async (code: string) => {
    if (!session) return;
    setSigningUp(true);
    setSignupError('');

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone: signupPhone,
      token: code,
      type: 'sms',
    });

    if (authError) {
      setSignupError(authError.message);
      setSigningUp(false);
      return;
    }

    if (!authData.session || !authData.user) {
      setSignupError('Verification failed. Try again.');
      setSigningUp(false);
      return;
    }

    // Now upgrade guest → real user via API
    try {
      const res = await fetch('/api/guest/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: session.guestId,
          phone: signupPhone,
          userId: authData.user.id,
          name: session.guestName,
        }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.removeItem('evrywher_guest_session');
        window.location.href = '/chat';
      } else {
        setSignupError(data.error || 'Upgrade failed');
      }
    } catch {
      setSignupError('Network error \u2014 try again');
    }
    setSigningUp(false);
  }, [session, signupPhone, supabase]);

  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const showBanner = !bannerDismissed || msgCount >= 5;
  const bannerPersistent = msgCount >= 5;

  return (
    <div className="fixed top-0 left-0 right-0 h-[100dvh] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="pt-3 pb-3 flex items-center gap-3 flex-1">
          <PocketChatMark size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session.inviterName}</p>
            <p className="text-[10px] text-slate-500">Evrywher Chat</p>
          </div>
        </div>
        <button
          onClick={() => setShowSignup(true)}
          className="pt-3 pb-3 text-xs font-semibold text-indigo-400 active:opacity-60"
        >
          Sign Up
        </button>
      </div>

      {/* Signup banner */}
      {showBanner && !showSignup && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-2.5 flex items-center gap-2">
          <p className="text-xs text-indigo-300 flex-1">
            {msgCount >= 5
              ? 'Enter your phone to keep your messages'
              : 'Save your chat \u2014 enter your phone number'}
          </p>
          {!bannerPersistent && (
            <button onClick={() => setBannerDismissed(true)} className="text-indigo-500/50 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
          <button
            onClick={() => setShowSignup(true)}
            className="shrink-0 text-[10px] font-bold text-indigo-400 bg-indigo-600/20 px-2.5 py-1 rounded-full"
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 chat-bg-pattern">
        {messages.map(msg => {
          const isMe = msg.sender_type === 'contact' && (msg.sender_name === session.guestName || msg.sender_id === session.guestId);
          const isSystem = msg.sender_type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <p className="text-[10px] text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">{msg.message}</p>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                isMe
                  ? 'bg-indigo-600 rounded-tr-md'
                  : 'bg-slate-800/80 rounded-tl-md'
              }`}>
                {!isMe && (
                  <p className="text-[10px] text-slate-400 mb-0.5">{msg.sender_name}</p>
                )}
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                <p className={`text-[9px] mt-1 ${isMe ? 'text-indigo-200/50' : 'text-slate-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-800 px-4 py-2 bg-slate-900/95 backdrop-blur-sm" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800/60 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-slate-700/50 focus:border-indigo-500/50 placeholder:text-slate-600"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-indigo-600 rounded-xl text-white disabled:opacity-30 active:bg-indigo-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>

      {/* Inline phone signup modal */}
      {showSignup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => { setShowSignup(false); setSignupStep('phone'); }}>
          <div className="w-full max-w-md bg-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {signupStep === 'phone' ? 'Save Your Chat' : 'Enter the code'}
              </h3>
              <button onClick={() => { setShowSignup(false); setSignupStep('phone'); }} className="text-slate-500 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {signupStep === 'phone' && (
              <p className="text-xs text-slate-400">Enter your phone to keep your messages + unlock AI translation, voice, and more.</p>
            )}

            {signupStep === 'phone' ? (
              <PhoneInput
                onSubmit={handlePhoneSubmit}
                loading={signingUp}
                buttonText="Send Code →"
                dark={true}
              />
            ) : (
              <>
                <OTPInput
                  phone={signupPhone}
                  onVerify={handleVerifyOTP}
                  onResend={() => handlePhoneSubmit(signupPhone)}
                  loading={signingUp}
                  error={signupError}
                  dark={true}
                />
                <button
                  onClick={() => { setSignupStep('phone'); setSignupError(''); }}
                  className="w-full text-center text-sm text-indigo-400 font-medium active:opacity-60 mt-2"
                >
                  Change phone number
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
