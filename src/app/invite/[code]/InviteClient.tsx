'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';

interface Props {
  inviter: {
    display_name: string;
    avatar_url: string | null;
    company_name?: string;
  };
  code: string;
}

export default function InviteClient({ inviter, code }: Props) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Logged in → instant connect
        setIsLoggedIn(true);
        handleLoggedInConnect();
      } else {
        setIsLoggedIn(false);
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Logged-in user: instant connect ───
  async function handleLoggedInConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (data.success || data.already_connected) {
        router.push('/chat');
      } else {
        setError(data.error || 'Could not connect');
        setLoading(false);
      }
    } catch {
      setError('Network error — try again');
      setLoading(false);
    }
  }

  // ─── Guest: create session and enter chat ───
  async function handleGuestStart() {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/guest/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName.trim(), inviteCode: code }),
      });
      const data = await res.json();

      if (data.success && data.chatId) {
        // Store guest session
        localStorage.setItem('evrywher_guest_session', JSON.stringify({
          guestId: data.guestId,
          guestToken: data.guestToken,
          guestName: guestName.trim(),
          chatId: data.chatId,
          inviterName: data.inviterName,
          inviterOrgId: data.inviterOrgId,
        }));

        // Redirect to guest chat
        router.push(`/guest/chat/${data.chatId}`);
      } else {
        setError(data.error || 'Could not start chat');
        setLoading(false);
      }
    } catch {
      setError('Network error — try again');
      setLoading(false);
    }
  }

  // Loading state (checking auth or connecting)
  if (isLoggedIn === null || (isLoggedIn && loading)) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center px-6">
        <PocketChatMark size={48} />
        <div className="mt-4 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Connecting...</p>
        </div>
      </div>
    );
  }

  // ─── Guest entry page ───
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <PocketChatMark size={28} />
        <EvryWherMark size="sm" />
      </div>

      {/* Inviter avatar */}
      <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-4 text-2xl font-bold text-white overflow-hidden">
        {inviter.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inviter.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          inviter.display_name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Inviter name */}
      <h1 className="text-xl font-bold text-white text-center">{inviter.display_name}</h1>
      <p className="text-sm text-slate-400 mt-1 mb-8">wants to chat with you</p>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 px-4 py-2 rounded-lg mb-4 text-center">{error}</p>
      )}

      {/* Name input */}
      <div className="w-full max-w-xs space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGuestStart(); }}
          placeholder="Your name"
          autoFocus
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-lg text-center outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
        />

        <button
          onClick={handleGuestStart}
          disabled={loading || !guestName.trim()}
          className="w-full bg-indigo-600 rounded-xl py-4 text-white font-semibold text-lg active:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Start Chatting →'
          )}
        </button>
      </div>

      {/* Already have account */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-600">Already have an account?</p>
        <button
          onClick={() => {
            localStorage.setItem('pending_invite_code', code);
            window.location.href = `/login?mode=pocketchat&invite=${code}`;
          }}
          className="text-xs text-indigo-400 font-semibold mt-0.5"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
