'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PRACTICE_TOPICS = [
  { id: 'konbini', icon: '🏪', title: 'At the Konbini', titleJa: 'コンビニで', vocab: ['お弁当', 'レジ袋', 'ポイントカード', 'お箸', '温めますか'] },
  { id: 'train', icon: '🚃', title: 'Taking the Train', titleJa: '電車に乗る', vocab: ['切符', '改札', '乗り換え', '次の駅', '特急'] },
  { id: 'restaurant', icon: '🍱', title: 'Ordering Food', titleJa: 'レストランで', vocab: ['メニュー', 'お水', 'お会計', 'おすすめ', 'アレルギー'] },
  { id: 'bank', icon: '🏦', title: 'At the Bank', titleJa: '銀行で', vocab: ['口座', '振込', 'ATM', '暗証番号', '通帳'] },
  { id: 'doctor', icon: '🏥', title: 'Visiting a Doctor', titleJa: '病院で', vocab: ['熱', '頭痛', '薬', '保険証', '予約'] },
  { id: 'apartment', icon: '🏠', title: 'Renting an Apartment', titleJa: 'アパートを借りる', vocab: ['家賃', '敷金', '礼金', '間取り', '管理費'] },
  { id: 'postoffice', icon: '📮', title: 'At the Post Office', titleJa: '郵便局で', vocab: ['荷物', '速達', '切手', '国際便', '届ける'] },
  { id: 'shopping', icon: '🛍️', title: 'Shopping for Clothes', titleJa: '服を買う', vocab: ['サイズ', '試着', '色違い', '割引', 'レシート'] },
];

export default function PracticePage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = profile?.id;

  const topicId = searchParams.get('topic');
  const selectedTopic = PRACTICE_TOPICS.find(t => t.id === topicId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [level, setLevel] = useState('beginner');
  const [targetLang, setTargetLang] = useState('ja');
  const [nativeLang, setNativeLang] = useState('en');
  const [started, setStarted] = useState(false);
  const [wordsUsed, setWordsUsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    supabase.from('learning_profiles').select('level, target_language, native_language').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data) {
          setLevel(data.level || 'beginner');
          setTargetLang(data.target_language || 'ja');
          setNativeLang(data.native_language || 'en');
        }
      });
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startConversation(topic: typeof PRACTICE_TOPICS[0]) {
    setStarted(true);
    setSending(true);

    const initialMessages: ChatMessage[] = [
      { role: 'user', content: `Start a practice conversation about: ${topic.title} (${topic.titleJa}). Greet me and set the scene.` }
    ];

    const res = await fetch('/api/ai/language-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: initialMessages,
        level,
        topic: topic.title,
        topicVocabulary: topic.vocab,
        targetLanguage: targetLang,
        nativeLanguage: nativeLang,
      }),
    });
    const data = await res.json();
    if (data.reply) {
      setMessages([{ role: 'assistant', content: data.reply }]);
    }
    setSending(false);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);
    setWordsUsed(prev => prev + 1);

    const topic = selectedTopic || PRACTICE_TOPICS[0];
    const res = await fetch('/api/ai/language-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        level,
        topic: topic.title,
        topicVocabulary: topic.vocab,
        targetLanguage: targetLang,
        nativeLanguage: nativeLang,
      }),
    });
    const data = await res.json();
    if (data.reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    }
    setSending(false);
  }

  async function endSession() {
    if (messages.length < 2) { router.push('/learn'); return; }
    // Save XP for practice
    const xp = Math.min(messages.filter(m => m.role === 'user').length * 8, 80);
    await supabase.from('study_sessions').insert({
      user_id: userId,
      session_type: 'conversation',
      words_studied: wordsUsed,
      words_correct: wordsUsed,
      xp_earned: xp,
      duration_seconds: 0,
    });
    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const { data: lp } = await supabase.from('learning_profiles')
      .select('last_study_date, streak_days, total_xp').eq('user_id', userId).single();
    let newStreak = lp?.streak_days || 0;
    if (lp?.last_study_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = lp?.last_study_date === yesterday ? newStreak + 1 : 1;
    }
    await supabase.from('learning_profiles').update({
      last_study_date: today, streak_days: newStreak, total_xp: (lp?.total_xp || 0) + xp,
    }).eq('user_id', userId);
    router.push('/learn');
  }

  // Topic selection screen
  if (!started && !selectedTopic) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
          <button onClick={() => router.push('/learn')} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
            <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-[var(--text-1)]">Conversation Practice</h1>
        </div>
        <div className="px-4 pt-4">
          <p className="text-sm text-[var(--text-2)] mb-4">
            Practice real conversations with AI. Pick a scenario:
          </p>
          <div className="space-y-2">
            {PRACTICE_TOPICS.map(topic => (
              <button
                key={topic.id}
                onClick={() => startConversation(topic)}
                className="w-full flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-left transition-colors hover:border-[#4F46E5]/20"
              >
                <span className="text-2xl">{topic.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-1)]">{topic.title}</p>
                  <p className="text-xs text-[var(--text-4)]">{topic.titleJa}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {topic.vocab.slice(0, 3).map(v => (
                      <span key={v} className="rounded-md bg-[#4F46E5]/5 px-1.5 py-0.5 text-[9px] font-medium text-[#4F46E5]">{v}</span>
                    ))}
                  </div>
                </div>
                <svg className="h-4 w-4 shrink-0 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Auto-start if topic is pre-selected
  if (selectedTopic && !started && messages.length === 0) {
    startConversation(selectedTopic);
  }

  // Chat interface
  const topic = selectedTopic || PRACTICE_TOPICS[0];

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--bg-1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={endSession} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
            <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-bold text-[var(--text-1)]">{topic.icon} {topic.title}</p>
            <p className="text-[10px] text-[var(--text-4)]">Practice · {level}</p>
          </div>
        </div>
        <button onClick={endSession} className="rounded-lg bg-[var(--bg-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)]">
          End
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Tip banner */}
        <div className="rounded-xl bg-[#EEF2FF] p-3 text-center">
          <p className="text-[10px] text-[#4F46E5]">
            Type in Japanese to practice, or in English to learn how to say it
          </p>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-[#4F46E5] text-white rounded-br-md'
                : 'bg-slate-800 border border-slate-700 text-[var(--text-1)] rounded-bl-md'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 rounded-bl-md">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-800 px-4 py-3 safe-bottom">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type in Japanese or English..."
            className="flex-1 rounded-xl border border-slate-700 bg-[var(--bg-1)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white transition-colors disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
