'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CONVERSATION = [
  { sender: 'user', text: 'Hi Tanaka-san, I sent invoice #042 for the Alphard repair', note: 'You typed in English', dots: 1500 },
  { sender: 'tanaka', text: '受け取りました。金曜日までにお支払い処理します', note: '🇯🇵 Tanaka typed in Japanese · translated for you', dots: 1500 },
  { sender: 'user', text: 'Perfect, thanks!', note: 'You typed in English', dots: 1000 },
];

interface VisibleMsg {
  sender: string;
  text: string;
  note: string;
}

export default function HeroChatMockup() {
  const [messages, setMessages] = useState<VisibleMsg[]>([]);
  const [showDots, setShowDots] = useState(false);
  const [fading, setFading] = useState(false);
  const runId = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const sleep = useCallback((ms: number, id: number) => {
    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { timers.current.delete(t); resolve(); }, ms);
      timers.current.add(t);
      // Attach id so we can check staleness after await
      void id;
    });
  }, []);

  useEffect(() => {
    const id = ++runId.current;
    const alive = () => id === runId.current;

    (async () => {
      while (alive()) {
        setMessages([]);
        setFading(false);

        for (const msg of CONVERSATION) {
          if (!alive()) return;

          setShowDots(true);
          await sleep(msg.dots, id);
          if (!alive()) return;
          setShowDots(false);

          setMessages(prev => [...prev, { sender: msg.sender, text: msg.text, note: msg.note }]);
          await sleep(1000, id);
        }

        await sleep(2000, id);
        if (!alive()) return;

        setFading(true);
        await sleep(600, id);
        if (!alive()) return;

        setMessages([]);
        setFading(false);
        await sleep(400, id);
      }
    })();

    return () => {
      runId.current++;
      timers.current.forEach(t => clearTimeout(t));
      timers.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="hero-mockup-anim rounded-2xl bg-white shadow-lg border border-[#e5e7eb] overflow-hidden" role="img" aria-label="Live chat demo showing English to Japanese translation" style={{ maxWidth: 400 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heroMsgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroDotBounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
        @keyframes heroBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes heroFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .hero-mockup-anim, .hero-mockup-anim * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f4f6] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#4F46E5] to-[#7c3aed] text-sm font-semibold text-white">TK</div>
            {/* PocketChat breathing logo */}
            <svg className="absolute -bottom-1 -right-1" width="16" height="16" viewBox="0 0 88 88" fill="none" style={{ animation: 'heroBreathe 2s ease-in-out infinite' }}>
              <rect width="88" height="88" rx="20" fill="#4F46E5" />
              <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95" />
              <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">Tanaka CPA</p>
            <p className="text-[11px] text-[#22c55e]">● Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#4F46E5]">EN</span>
          <span className="text-[11px] text-[#d1d5db]">⇄</span>
          <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400e]">JP</span>
        </div>
      </div>

      {/* Messages area — fixed height for ~420px total container */}
      <div
        className="flex flex-col gap-2.5 px-3.5"
        style={{ height: 316, minHeight: 316, maxHeight: 316, overflow: 'hidden', paddingTop: 14, paddingBottom: 14, animation: fading ? 'heroFadeOut 0.5s ease-out forwards' : undefined }}
      >
        {messages.map((msg, i) => (
          msg.sender === 'user' ? (
            <div key={`${i}-${msg.text}`} className="flex justify-end" style={{ animation: 'heroMsgIn 0.35s ease-out both' }}>
              <div className="max-w-[80%] rounded-[14px_14px_4px_14px] bg-[#4F46E5] px-3.5 py-2.5">
                <p className="text-sm leading-relaxed text-white">{msg.text}</p>
                <p className="mt-1 text-[10px] text-white/50">{msg.note}</p>
              </div>
            </div>
          ) : (
            <div key={`${i}-${msg.text}`} className="flex justify-start" style={{ animation: 'heroMsgIn 0.35s ease-out both' }}>
              <div className="max-w-[80%] rounded-[14px_14px_14px_4px] bg-[#f3f4f6] px-3.5 py-2.5">
                <p className="text-sm leading-relaxed text-[#111827]">{msg.text}</p>
                <p className="mt-1 text-[10px] text-[#9ca3af]">{msg.note}</p>
              </div>
            </div>
          )
        ))}

        {/* Typing indicator */}
        {showDots && (
          <div className="flex justify-start" style={{ animation: 'heroMsgIn 0.2s ease-out both' }}>
            <div>
              <div className="flex gap-1 rounded-[14px_14px_14px_4px] bg-[#f3f4f6] px-4 py-3">
                {[0, 1, 2].map(d => (
                  <div
                    key={d}
                    className="h-2 w-2 rounded-full bg-[#9ca3af]"
                    style={{ animation: 'heroDotBounce 1.2s ease-in-out infinite', animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="mt-0.5 pl-1 text-[10px] text-[#9ca3af]">typing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-[#f3f4f6] px-4 py-2.5">
        <span className="rounded-lg border border-[#e5e7eb] px-2.5 py-1 text-xs text-[#6b7280]">🇬🇧 EN ▼</span>
        <div className="flex min-h-[36px] flex-1 items-center rounded-[10px] border border-[#e5e7eb] px-3.5 py-2 text-[13px]">
          <span className="text-[#9ca3af]">Type a message...</span>
        </div>
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#4F46E5]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
        </div>
      </div>
    </div>
  );
}
