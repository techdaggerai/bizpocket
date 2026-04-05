'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

interface VocabCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  example_sentence: string | null;
  example_translation: string | null;
  context: string | null;
  difficulty: number;
  mastery_level: number;
  times_reviewed: number;
  times_correct: number;
}

// SM-2 intervals in hours
const SM2_INTERVALS = {
  hard:  [0.017, 0.17, 1, 6, 24],      // 1min → 10min → 1h → 6h → 1d
  good:  [1, 24, 72, 168, 720],          // 1h → 1d → 3d → 1w → 1mo
  easy:  [72, 168, 720, 2160, 4320],     // 3d → 1w → 1mo → 3mo → 6mo
};

type Difficulty = 'hard' | 'good' | 'easy';
type CardState = 'question' | 'answer';

function getNextInterval(mastery: number, difficulty: Difficulty): { intervalHours: number; newMastery: number } {
  const intervals = SM2_INTERVALS[difficulty];
  let newMastery: number;

  if (difficulty === 'hard') {
    newMastery = Math.max(0, mastery - 1);
  } else if (difficulty === 'easy') {
    newMastery = Math.min(3, mastery + 2);
  } else {
    newMastery = Math.min(3, mastery + 1);
  }

  const idx = Math.min(mastery, intervals.length - 1);
  return { intervalHours: intervals[idx], newMastery };
}

function formatNextReview(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins <= 1 ? '1 min' : `${mins} min`;
  }
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

export default function StudyPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = profile?.id;

  const mode = searchParams.get('mode') || 'review';
  const source = searchParams.get('source');

  const [cards, setCards] = useState<VocabCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardState, setCardState] = useState<CardState>('question');
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [speakingWord, setSpeakingWord] = useState(false);
  const [flipAnim, setFlipAnim] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadCards();
  }, [userId]);

  async function loadCards() {
    let query = supabase
      .from('vocabulary')
      .select('*')
      .eq('user_id', userId);

    if (mode === 'review') {
      query = query.lte('next_review_at', new Date().toISOString());
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data } = await query
      .order('next_review_at', { ascending: true })
      .limit(20);

    if (data && data.length > 0) {
      const shuffled = data.sort(() => Math.random() - 0.5);
      setCards(shuffled);
    }
    setLoading(false);
  }

  function speak(text: string) {
    setSpeakingWord(true);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.8;
    u.onend = () => setSpeakingWord(false);
    u.onerror = () => setSpeakingWord(false);
    speechSynthesis.speak(u);
  }

  const currentCard = cards[currentIdx];

  const handleAnswer = useCallback(async (difficulty: Difficulty) => {
    if (!currentCard || !userId) return;

    const isCorrect = difficulty !== 'hard';
    const { intervalHours, newMastery } = getNextInterval(currentCard.mastery_level, difficulty);
    const nextReview = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    // XP: hard=2, good=5, easy=10
    const xpMap: Record<Difficulty, number> = { hard: 2, good: 5, easy: 10 };

    await supabase.from('vocabulary').update({
      times_reviewed: currentCard.times_reviewed + 1,
      times_correct: currentCard.times_correct + (isCorrect ? 1 : 0),
      mastery_level: newMastery,
      next_review_at: nextReview.toISOString(),
    }).eq('id', currentCard.id);

    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      total: prev.total + 1,
    }));

    if (currentIdx + 1 < cards.length) {
      setFlipAnim(true);
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
        setCardState('question');
        setFlipAnim(false);
      }, 200);
    } else {
      await finishSession(isCorrect, xpMap[difficulty]);
    }
  }, [currentCard, currentIdx, cards.length, userId, supabase]);

  async function finishSession(lastCorrect: boolean, lastXp: number) {
    const finalStats = {
      correct: sessionStats.correct + (lastCorrect ? 1 : 0),
      incorrect: sessionStats.incorrect + (lastCorrect ? 0 : 1),
      total: sessionStats.total + 1,
    };
    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    const xp = finalStats.correct * 8 + finalStats.total * 2;

    await supabase.from('study_sessions').insert({
      user_id: userId,
      session_type: mode,
      words_studied: finalStats.total,
      words_correct: finalStats.correct,
      xp_earned: xp,
      duration_seconds: duration,
    });

    // Update streak + XP
    const today = new Date().toISOString().split('T')[0];
    const { data: lp } = await supabase
      .from('learning_profiles')
      .select('last_study_date, streak_days, total_xp')
      .eq('user_id', userId)
      .single();

    let newStreak = (lp?.streak_days || 0);
    let bonusXp = 0;
    if (lp?.last_study_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = lp?.last_study_date === yesterday ? newStreak + 1 : 1;
      // 7-day streak bonus
      if (newStreak > 0 && newStreak % 7 === 0) bonusXp = 100;
    }

    await supabase.from('learning_profiles').update({
      last_study_date: today,
      streak_days: newStreak,
      total_xp: (lp?.total_xp || 0) + xp + bonusXp,
    }).eq('user_id', userId);

    setSessionStats(finalStats);
    setFinished(true);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <span className="text-5xl">🎉</span>
        <h2 className="mt-4 text-lg font-bold text-[var(--text-1)]">
          {mode === 'review' ? 'All caught up!' : 'No words yet'}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-4)] text-center">
          {mode === 'review'
            ? 'No words due for review right now. Come back later!'
            : 'Translate messages or scan documents to build your vocabulary.'}
        </p>
        <button onClick={() => router.push('/learn')} className="mt-6 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white">
          ← Back to Learn
        </button>
      </div>
    );
  }

  // ─── Finished ──────────────────────────────────────────────────────────────
  if (finished) {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    const xp = sessionStats.correct * 8 + sessionStats.total * 2;
    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="text-6xl mb-2">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2 className="text-xl font-bold text-[var(--text-1)]">Session Complete!</h2>
        <p className="text-xs text-[var(--text-4)] mt-1">{mins}m {secs}s</p>

        <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="rounded-2xl bg-[#D1FAE5] p-3 text-center">
            <p className="text-2xl font-bold text-[#065F46]">{sessionStats.correct}</p>
            <p className="text-[10px] text-[#065F46]/60">Correct</p>
          </div>
          <div className="rounded-2xl bg-[#FEE2E2] p-3 text-center">
            <p className="text-2xl font-bold text-[#991B1B]">{sessionStats.incorrect}</p>
            <p className="text-[10px] text-[#991B1B]/60">Missed</p>
          </div>
          <div className="rounded-2xl bg-[#EEF2FF] p-3 text-center">
            <p className="text-2xl font-bold text-[#4F46E5]">{pct}%</p>
            <p className="text-[10px] text-[#4F46E5]/60">Accuracy</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-[#4F46E5]/10 px-4 py-2">
          <span className="text-sm">⭐</span>
          <span className="text-sm font-bold text-[#4F46E5]">+{xp} XP earned</span>
        </div>

        <div className="mt-6 flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/learn')} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-[var(--text-2)]">
            Done
          </button>
          <button
            onClick={() => { setCurrentIdx(0); setCardState('question'); setFinished(false); setSessionStats({ correct: 0, incorrect: 0, total: 0 }); loadCards(); }}
            className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white"
          >
            Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Active Card ───────────────────────────────────────────────────────────
  const progress = (currentIdx + 1) / cards.length;
  const masteryLabels = ['New', 'Learning', 'Familiar', 'Mastered'];
  const masteryColors = ['bg-slate-700 text-slate-300', 'bg-[#FEF3C7] text-[#92400E]', 'bg-[#DBEAFE] text-[#1E40AF]', 'bg-[#D1FAE5] text-[#065F46]'];
  const contextLabel = currentCard.context?.replace(/_/g, ' ').replace(/^topic /, '') || '';
  const sourceLabel = currentCard.context
    ? (currentCard.context.startsWith('topic_') ? 'topic lesson' :
       currentCard.context === 'chat' ? 'your chats' :
       currentCard.context === 'document_scan' ? 'document scan' :
       currentCard.context)
    : '';

  return (
    <div className={`flex min-h-[80vh] flex-col px-4 pt-4 transition-opacity duration-200 ${flipAnim ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/learn')} className="text-[var(--text-4)] hover:text-[var(--text-2)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 h-2.5 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-[var(--text-3)] tabular-nums">
          {currentIdx + 1}/{cards.length}
        </span>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="w-full max-w-sm rounded-3xl border-2 border-slate-700 bg-slate-800 shadow-lg text-center cursor-pointer transition-all hover:shadow-xl overflow-hidden"
          onClick={() => { if (cardState === 'question') { setCardState('answer'); speak(currentCard.word); } }}
        >
          {/* Context ribbon */}
          {sourceLabel && (
            <div className="bg-[var(--bg-2)] px-4 py-1.5 text-[10px] font-medium text-[var(--text-4)]">
              from your {sourceLabel}
            </div>
          )}

          <div className="p-8">
            {/* Mastery badge */}
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${masteryColors[currentCard.mastery_level]}`}>
              {masteryLabels[currentCard.mastery_level]}
            </span>

            {/* Word */}
            <div className="mt-5">
              <p className="text-[42px] font-bold text-[var(--text-1)] leading-tight">{currentCard.word}</p>
              {currentCard.reading && (
                <p className="mt-2 text-lg text-[var(--text-3)]">({currentCard.reading})</p>
              )}
            </div>

            {/* Speak button */}
            <button
              onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
              className={`mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                speakingWord ? 'bg-[#4F46E5] text-white scale-110' : 'bg-[var(--bg-2)] text-[var(--text-3)]'
              }`}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>

            {/* Revealed answer */}
            {cardState === 'answer' && (
              <div className="mt-6 border-t border-slate-700 pt-5">
                <p className="text-xl font-bold text-[#4F46E5]">{currentCard.meaning}</p>

                {currentCard.example_sentence && (
                  <div className="mt-4 rounded-xl bg-[var(--bg-2)] p-3 text-left">
                    <p className="text-[13px] text-[var(--text-1)] leading-relaxed">{currentCard.example_sentence}</p>
                    {currentCard.example_translation && (
                      <p className="text-xs text-[var(--text-4)] mt-1.5 italic">{currentCard.example_translation}</p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); speak(currentCard.example_sentence!); }}
                      className="mt-2 flex items-center gap-1 text-[10px] text-[#4F46E5] font-medium"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                      Listen to example
                    </button>
                  </div>
                )}
              </div>
            )}

            {cardState === 'question' && (
              <p className="mt-6 text-xs text-[var(--text-4)]">Tap to reveal meaning</p>
            )}
          </div>
        </div>

        {/* 3-tier answer buttons */}
        {cardState === 'answer' && (
          <div className="mt-5 flex gap-2 w-full max-w-sm">
            <button
              onClick={() => handleAnswer('hard')}
              className="flex-1 rounded-2xl border-2 border-[#DC2626]/15 bg-[#DC2626]/5 py-3 text-center transition-all hover:bg-[#DC2626]/10 active:scale-95"
            >
              <span className="text-lg">😟</span>
              <p className="text-xs font-bold text-[#DC2626] mt-0.5">Hard</p>
              <p className="text-[9px] text-[#DC2626]/50">{formatNextReview(SM2_INTERVALS.hard[Math.min(currentCard.mastery_level, 4)])}</p>
            </button>
            <button
              onClick={() => handleAnswer('good')}
              className="flex-1 rounded-2xl border-2 border-[#4F46E5]/15 bg-[#4F46E5]/5 py-3 text-center transition-all hover:bg-[#4F46E5]/10 active:scale-95"
            >
              <span className="text-lg">🤔</span>
              <p className="text-xs font-bold text-[#4F46E5] mt-0.5">Good</p>
              <p className="text-[9px] text-[#4F46E5]/50">{formatNextReview(SM2_INTERVALS.good[Math.min(currentCard.mastery_level, 4)])}</p>
            </button>
            <button
              onClick={() => handleAnswer('easy')}
              className="flex-1 rounded-2xl border-2 border-[#16A34A]/15 bg-[#16A34A]/5 py-3 text-center transition-all hover:bg-[#16A34A]/10 active:scale-95"
            >
              <span className="text-lg">😊</span>
              <p className="text-xs font-bold text-[#16A34A] mt-0.5">Easy</p>
              <p className="text-[9px] text-[#16A34A]/50">{formatNextReview(SM2_INTERVALS.easy[Math.min(currentCard.mastery_level, 4)])}</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
