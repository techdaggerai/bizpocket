'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AnimatedPocketChatLogo from './AnimatedPocketChatLogo';
import PocketChatTypingIndicator from './PocketChatTypingIndicator';

// Each step: typing indicator or message bubble (with translation pair)
const SCRIPT: Array<{
  type: 'dots';
  duration: number;
} | {
  type: 'msg';
  side: 'right' | 'left';
  text: string;
  label: string;
  variant: 'user' | 'tanaka' | 'user-tl' | 'tanaka-tl';
}> = [
  { type: 'dots', duration: 2000 },
  { type: 'msg', side: 'right', variant: 'user', text: 'Hi Tanaka-san, I sent invoice #042 for the Alphard repair', label: 'You · English' },
  { type: 'msg', side: 'right', variant: 'user-tl', text: '田中さん、アルファードの修理の請求書#042を送りました', label: '✨ Auto-translated to Japanese' },
  { type: 'dots', duration: 1500 },
  { type: 'msg', side: 'left', variant: 'tanaka', text: '受け取りました。金曜日までにお支払い処理します', label: 'Tanaka · Japanese' },
  { type: 'msg', side: 'left', variant: 'tanaka-tl', text: 'Received. I\'ll process the payment by Friday.', label: '✨ Translated for you' },
  { type: 'dots', duration: 1000 },
  { type: 'msg', side: 'right', variant: 'user', text: 'Perfect, thank you!', label: 'You · English' },
  { type: 'msg', side: 'right', variant: 'user-tl', text: '完璧です、ありがとうございます！', label: '✨ Auto-translated to Japanese' },
];

const DELAYS: Record<string, number> = {
  'user': 500,
  'tanaka': 500,
  'user-tl': 1500,
  'tanaka-tl': 1500,
};

interface Bubble {
  side: 'right' | 'left';
  text: string;
  label: string;
  variant: 'user' | 'tanaka' | 'user-tl' | 'tanaka-tl';
}

export default function HeroChatMockup() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [showDots, setShowDots] = useState(false);
  const [fading, setFading] = useState(false);
  const runId = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const sleep = useCallback((ms: number) => {
    return new Promise<void>(resolve => {
      const t = setTimeout(() => { timers.current.delete(t); resolve(); }, ms);
      timers.current.add(t);
    });
  }, []);

  useEffect(() => {
    const id = ++runId.current;
    const alive = () => id === runId.current;

    (async () => {
      while (alive()) {
        setBubbles([]);
        setFading(false);

        for (const step of SCRIPT) {
          if (!alive()) return;

          if (step.type === 'dots') {
            setShowDots(true);
            await sleep(step.duration);
            if (!alive()) return;
            setShowDots(false);
          } else {
            setBubbles(prev => [...prev, { side: step.side, text: step.text, label: step.label, variant: step.variant }]);
            const delay = DELAYS[step.variant] ?? 1000;
            await sleep(delay);
          }
        }

        await sleep(3000);
        if (!alive()) return;

        setFading(true);
        await sleep(600);
        if (!alive()) return;

        setBubbles([]);
        setFading(false);
        await sleep(500);
      }
    })();

    return () => {
      runId.current++;
      timers.current.forEach(t => clearTimeout(t));
      timers.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const BUBBLE_STYLES: Record<string, { bg: string; text: string; labelColor: string }> = {
    'user':      { bg: 'bg-[#4F46E5]', text: 'text-white', labelColor: 'text-white/50' },
    'user-tl':   { bg: 'bg-[#eef2ff]', text: 'text-[#312e81]', labelColor: 'text-[#6366f1]' },
    'tanaka':    { bg: 'bg-slate-800', text: 'text-slate-50', labelColor: 'text-slate-500' },
    'tanaka-tl': { bg: 'bg-[#ecfdf5]', text: 'text-[#064e3b]', labelColor: 'text-[#10b981]' },
  };

  return (
    <div className="hero-mockup-anim overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-lg" role="img" aria-label="Live chat demo showing real-time English to Japanese translation" style={{ maxWidth: 420 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes hMsgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .hero-mockup-anim, .hero-mockup-anim * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f4f6] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#4F46E5] to-[#7c3aed] text-sm font-semibold text-white">TK</div>
          <div>
            <p className="text-sm font-semibold text-slate-50">Tanaka CPA</p>
            <p className="text-[11px] text-[#22c55e]">● Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#4F46E5]">EN</span>
          <AnimatedPocketChatLogo size={36} isTranslating={true} />
          <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400e]">JP</span>
        </div>
      </div>

      {/* Messages — fixed 380px */}
      <div
        className="flex flex-col gap-1.5 px-3"
        style={{ height: 380, minHeight: 380, maxHeight: 380, overflow: 'hidden', paddingTop: 12, paddingBottom: 12, animation: fading ? 'hFadeOut 0.5s ease-out forwards' : undefined }}
      >
        {bubbles.map((b, i) => {
          const s = BUBBLE_STYLES[b.variant];
          const isRight = b.side === 'right';
          const isTl = b.variant.endsWith('-tl');
          return (
            <div key={`${i}-${b.variant}`} className={`flex ${isRight ? 'justify-end' : 'justify-start'}${isTl ? ' mt-[-2px]' : i > 0 ? ' mt-1' : ''}`} style={{ animation: 'hMsgIn 0.3s ease-out both' }}>
              <div className={`max-w-[82%] px-3.5 py-2 ${s.bg} ${isRight ? 'rounded-[14px_14px_4px_14px]' : 'rounded-[14px_14px_14px_4px]'}`}>
                <p className={`${isTl ? 'text-[13px]' : 'text-sm'} leading-relaxed ${s.text}`}>{b.text}</p>
                <p className={`mt-0.5 text-[10px] ${s.labelColor}`}>{b.label}</p>
              </div>
            </div>
          );
        })}

        {/* REAL PocketChatTypingIndicator component */}
        {showDots && (
          <div className="flex justify-start" style={{ animation: 'hMsgIn 0.2s ease-out both' }}>
            <div className="min-h-[60px] rounded-xl bg-slate-800 px-3 py-2.5">
              <PocketChatTypingIndicator contactName="Tanaka" compact={false} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-[#f3f4f6] px-4 py-2.5">
        <span className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400">EN ▼</span>
        <div className="flex min-h-[36px] flex-1 items-center rounded-[10px] border border-slate-700 px-3.5 py-2 text-[13px]">
          <span className="text-slate-500">Type a message...</span>
        </div>
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#4F46E5]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 8Q12 5 19 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/><rect x="5" y="10" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" opacity="0.3"/><path d="M12 16V8" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/><path d="M9 11l3-3 3 3" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
  );
}
