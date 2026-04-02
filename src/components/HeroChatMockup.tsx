'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CONVERSATION = [
  { sender: 'user', text: 'Hi Tanaka-san, I sent invoice #042 for the Alphard repair', note: 'You typed in English' },
  { sender: 'tanaka', text: '受け取りました。金曜日までにお支払い処理します', note: '🇯🇵 Tanaka typed in Japanese · translated for you' },
  { sender: 'user', text: 'Perfect. Are March receipts ready for tax filing?', note: 'You typed in English' },
  { sender: 'tanaka', text: 'はい、Vaultにアップロード済みです。合計47枚の領収書', note: '🇯🇵 Tanaka typed in Japanese · translated for you' },
  { sender: 'user', text: 'Amazing, thank you!', note: 'You typed in English' },
];

function charDelay(char: string): number {
  const base = 35 + Math.random() * 15;
  if (char === ',') return base + 80;
  if (char === '?') return base + 60;
  if (char === ' ') return base + 20;
  return base;
}

interface VisibleMsg {
  sender: string;
  text: string;
  note: string;
}

export default function HeroChatMockup() {
  const [visibleMessages, setVisibleMessages] = useState<VisibleMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const running = useRef(true);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const typeIntoInput = useCallback(async (text: string) => {
    setIsTyping(true);
    for (let i = 0; i < text.length; i++) {
      if (!running.current) return;
      setInputText(text.slice(0, i + 1));
      await sleep(charDelay(text[i]));
    }
    await sleep(300);
    setInputText('');
    setIsTyping(false);
  }, []);

  const showTypingDots = useCallback(async () => {
    setShowDots(true);
    await sleep(1200 + Math.random() * 600);
    setShowDots(false);
  }, []);

  const runConversation = useCallback(async () => {
    while (running.current) {
      setVisibleMessages([]);
      setInputText('');
      setShowDots(false);

      for (const msg of CONVERSATION) {
        if (!running.current) return;

        if (msg.sender === 'user') {
          await typeIntoInput(msg.text);
          setVisibleMessages(prev => [...prev, { sender: msg.sender, text: msg.text, note: msg.note }]);
        } else {
          await showTypingDots();
          setVisibleMessages(prev => [...prev, { sender: msg.sender, text: msg.text, note: msg.note }]);
        }

        await sleep(800 + Math.random() * 100);
      }

      await sleep(3000);
    }
  }, [typeIntoInput, showTypingDots]);

  useEffect(() => {
    running.current = true;
    runConversation();
    return () => { running.current = false; };
  }, [runConversation]);

  // No scroll — fixed height, overflow hidden

  return (
    <div className="bg-[#f9fafb] rounded-[20px] p-5">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dotPulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }
      `}} />
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#4F46E5] to-[#7c3aed] flex items-center justify-center text-white text-sm font-semibold">TK</div>
            <div><p className="text-sm font-semibold text-[#111827]">Tanaka CPA</p><p className="text-[11px] text-[#22c55e]">● Online</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#4F46E5] font-semibold">EN</span>
            <span className="text-[11px] text-[#d1d5db]">⇄</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-semibold">JP</span>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 flex flex-col gap-3.5 h-[320px] overflow-hidden relative">
          {visibleMessages.map((msg, i) => (
            msg.sender === 'user' ? (
              <div key={i} className="flex justify-end animate-[fadeSlideUp_0.3s_ease-out]">
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_4px_14px] bg-[#4F46E5]">
                  <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                  <p className="text-[10px] text-white/50 mt-1">{msg.note}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start animate-[fadeSlideUp_0.3s_ease-out]">
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#f3f4f6]">
                  <p className="text-sm text-[#111827] leading-relaxed">{msg.text}</p>
                  <p className="text-[10px] text-[#9ca3af] mt-1">{msg.note}</p>
                </div>
              </div>
            )
          ))}
          {showDots && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-[14px_14px_14px_4px] bg-[#f3f4f6] flex gap-1.5">
                {[0, 1, 2].map(d => (
                  <div key={d} className="w-2 h-2 rounded-full bg-[#9ca3af]" style={{ animation: `dotPulse 1.2s infinite`, animationDelay: `${d * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 py-2.5 border-t border-[#f3f4f6] flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg border border-[#E5E5E5] text-xs text-[#6b7280]">🇬🇧 EN ▼</span>
          <div className="flex-1 px-3.5 py-2 rounded-[10px] border border-[#E5E5E5] text-[13px] min-h-[36px] flex items-center">
            {inputText ? (
              <span className="text-[#111827]">
                {inputText}
                <span className="inline-block w-[1.5px] h-4 bg-[#4F46E5] ml-[1px] align-middle" style={{ animation: 'blink 0.8s step-end infinite' }} />
              </span>
            ) : (
              <span className="text-[#9ca3af]">
                {isTyping ? '' : 'Type a message...'}
                {!isTyping && !inputText && null}
              </span>
            )}
          </div>
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#4F46E5] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
