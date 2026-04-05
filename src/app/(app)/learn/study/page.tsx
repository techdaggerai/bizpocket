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

type CardState = 'question' | 'answer';

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
      // Shuffle for variety
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

  const handleAnswer = useCallback(async (correct: boolean) => {
    if (!currentCard || !userId) return;

    const newTimesReviewed = currentCard.times_reviewed + 1;
    const newTimesCorrect = currentCard.times_correct + (correct ? 1 : 0);

    // Spaced repetition: calculate next review
    let newMastery = currentCard.mastery_level;
    let intervalHours: number;

    if (correct) {
      newMastery = Math.min(3, currentCard.mastery_level + 1);
      // Intervals: 4h → 1d → 3d → 7d
      const intervals = [4, 24, 72, 168];
      intervalHours = intervals[newMastery] || 168;
    } else {
      newMastery = Math.max(0, currentCard.mastery_level - 1);
      intervalHours = 1; // Review again in 1 hour
    }

    const nextReview = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    await supabase.from('vocabulary').update({
      times_reviewed: newTimesReviewed,
      times_correct: newTimesCorrect,
      mastery_level: newMastery,
      next_review_at: nextReview.toISOString(),
    }).eq('id', currentCard.id);

    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
      total: prev.total + 1,
    }));

    // Next card or finish
    if (currentIdx + 1 < cards.length) {
      setCurrentIdx(prev => prev + 1);
      setCardState('question');
    } else {
      await finishSession(correct);
    }
  }, [currentCard, currentIdx, cards.length, userId, supabase]);

  async function finishSession(lastCorrect: boolean) {
    const finalStats = {
      correct: sessionStats.correct + (lastCorrect ? 1 : 0),
      incorrect: sessionStats.incorrect + (lastCorrect ? 0 : 1),
      total: sessionStats.total + 1,
    };
    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    const xp = finalStats.correct * 10 + finalStats.total * 2;

    // Save study session
    await supabase.from('study_sessions').insert({
      user_id: userId,
      session_type: mode,
      words_studied: finalStats.total,
      words_correct: finalStats.correct,
      xp_earned: xp,
      duration_seconds: duration,
    });

    // Update learning profile
    const today = new Date().toISOString().split('T')[0];
    const { data: lp } = await supabase
      .from('learning_profiles')
      .select('last_study_date, streak_days, total_xp')
      .eq('user_id', userId)
      .single();

    let newStreak = (lp?.streak_days || 0);
    if (lp?.last_study_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = lp?.last_study_date === yesterday ? newStreak + 1 : 1;
    }

    await supabase.from('learning_profiles').update({
      last_study_date: today,
      streak_days: newStreak,
      total_xp: (lp?.total_xp || 0) + xp,
    }).eq('user_id', userId);

    setSessionStats(finalStats);
    setFinished(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

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
        <button
          onClick={() => router.push('/learn')}
          className="mt-6 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white"
        >
          ← Back to Learn
        </button>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const pct = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    const xp = sessionStats.correct * 10 + sessionStats.total * 2;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <span className="text-5xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</span>
        <h2 className="mt-4 text-xl font-bold text-[var(--text-1)]">Session Complete!</h2>

        <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#16A34A]">{sessionStats.correct}</p>
            <p className="text-[10px] text-[var(--text-4)]">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#DC2626]">{sessionStats.incorrect}</p>
            <p className="text-[10px] text-[var(--text-4)]">Missed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#4F46E5]">{pct}%</p>
            <p className="text-[10px] text-[var(--text-4)]">Accuracy</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-[#4F46E5]/10 px-4 py-2">
          <span className="text-sm">⭐</span>
          <span className="text-sm font-bold text-[#4F46E5]">+{xp} XP</span>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/learn')}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-[var(--text-2)]"
          >
            Done
          </button>
          <button
            onClick={() => { setCurrentIdx(0); setCardState('question'); setFinished(false); setSessionStats({ correct: 0, incorrect: 0, total: 0 }); loadCards(); }}
            className="rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Study Again
          </button>
        </div>
      </div>
    );
  }

  // Active study card
  const progress = (currentIdx + 1) / cards.length;
  const masteryLabels = ['New', 'Learning', 'Familiar', 'Mastered'];
  const masteryColors = ['bg-gray-200 text-gray-600', 'bg-[#FEF3C7] text-[#92400E]', 'bg-[#DBEAFE] text-[#1E40AF]', 'bg-[#D1FAE5] text-[#065F46]'];

  return (
    <div className="flex min-h-[80vh] flex-col px-4 pt-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/learn')} className="text-[var(--text-4)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-[#4F46E5] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-[var(--text-4)]">
          {currentIdx + 1}/{cards.length}
        </span>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="w-full max-w-sm rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-lg text-center cursor-pointer transition-all hover:shadow-xl"
          onClick={() => { if (cardState === 'question') setCardState('answer'); }}
        >
          {/* Mastery badge */}
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${masteryColors[currentCard.mastery_level]}`}>
            {masteryLabels[currentCard.mastery_level]}
          </span>

          {/* Word */}
          <div className="mt-6">
            <p className="text-4xl font-bold text-[var(--text-1)]">{currentCard.word}</p>
            {currentCard.reading && (
              <p className="mt-2 text-lg text-[var(--text-3)]">{currentCard.reading}</p>
            )}
          </div>

          {/* Speak button */}
          <button
            onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
            className={`mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              speakingWord ? 'bg-[#4F46E5] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'
            }`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          </button>

          {cardState === 'answer' && (
            <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-xl font-semibold text-[#4F46E5]">{currentCard.meaning}</p>

              {currentCard.example_sentence && (
                <div className="mt-4 rounded-xl bg-[var(--bg-2)] p-3 text-left">
                  <p className="text-sm text-[var(--text-1)]">{currentCard.example_sentence}</p>
                  {currentCard.example_translation && (
                    <p className="text-xs text-[var(--text-4)] mt-1">{currentCard.example_translation}</p>
                  )}
                </div>
              )}

              {currentCard.context && (
                <p className="mt-2 text-[10px] text-[var(--text-4)]">
                  Context: {currentCard.context.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          )}

          {cardState === 'question' && (
            <p className="mt-6 text-xs text-[var(--text-4)]">Tap to reveal meaning</p>
          )}
        </div>

        {/* Answer buttons */}
        {cardState === 'answer' && (
          <div className="mt-6 flex gap-3 w-full max-w-sm">
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 rounded-xl border-2 border-[#DC2626]/20 bg-[#DC2626]/5 py-3.5 text-sm font-bold text-[#DC2626] transition-colors hover:bg-[#DC2626]/10"
            >
              ❌ Didn&apos;t Know
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 rounded-xl border-2 border-[#16A34A]/20 bg-[#16A34A]/5 py-3.5 text-sm font-bold text-[#16A34A] transition-colors hover:bg-[#16A34A]/10"
            >
              ✅ Got It
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
