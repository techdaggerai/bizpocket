'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface QuizWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  context: string | null;
}

export default function QuickQuizPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const userId = profile?.id;

  const [words, setWords] = useState<QuizWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    loadQuizWords();
  }, [userId]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timer === 0 && !revealed && words.length > 0) {
      revealAnswer();
    }
  }, [timer]);

  async function loadQuizWords() {
    // Pull from recently translated words — recent real-world encounters
    const { data } = await supabase
      .from('vocabulary')
      .select('id, word, reading, meaning, context')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length >= 3) {
      // Pick 3 random words
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 3);
      setWords(shuffled);
      setTimerActive(true);
    }
    setLoading(false);
  }

  function revealAnswer() {
    if (revealed) return;
    const word = words[currentIdx];
    const correct = userAnswer.trim().toLowerCase() === word.meaning.toLowerCase() ||
      userAnswer.trim() === word.word ||
      userAnswer.trim() === word.reading;
    if (correct) setScore(prev => prev + 1);
    setRevealed(true);
  }

  function nextWord() {
    if (currentIdx + 1 < words.length) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer('');
      setRevealed(false);
      setTimer(30);
      setTimerActive(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    setTimerActive(false);
    clearInterval(timerRef.current);

    const xp = score * 15 + words.length * 3;
    await supabase.from('study_sessions').insert({
      user_id: userId,
      session_type: 'quick_quiz',
      words_studied: words.length,
      words_correct: score,
      xp_earned: xp,
      duration_seconds: 0,
    });

    // Update streak + XP
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

    setFinished(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (words.length < 3) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <span className="text-4xl">📝</span>
        <h2 className="mt-4 text-lg font-bold text-[var(--text-1)]">Not enough words yet</h2>
        <p className="mt-1 text-sm text-[var(--text-4)] text-center">
          Translate some messages or scan documents to build your vocabulary first.
        </p>
        <button onClick={() => router.push('/learn')} className="mt-6 rounded-xl bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white">
          ← Back to Learn
        </button>
      </div>
    );
  }

  // ─── Finished ──────────────────────────────────────────────────────────────
  if (finished) {
    const isPerfect = score === words.length;
    const xp = score * 15 + words.length * 3;

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <span className="text-6xl">{isPerfect ? '🔥' : score > 0 ? '👍' : '💪'}</span>
        <h2 className="mt-4 text-xl font-bold text-[var(--text-1)]">
          {isPerfect ? 'Perfect!' : 'Quiz Done!'}
        </h2>
        <p className="text-3xl font-bold text-indigo-400 mt-2">{score}/{words.length}</p>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-[#4F46E5]/10 px-4 py-2">
          <span className="text-sm">⭐</span>
          <span className="text-sm font-bold text-indigo-400">+{xp} XP</span>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => router.push('/learn')} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-[var(--text-2)]">
            Done
          </button>
          <button
            onClick={() => { setCurrentIdx(0); setScore(0); setFinished(false); setRevealed(false); setUserAnswer(''); setTimer(30); loadQuizWords(); }}
            className="rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Active quiz ───────────────────────────────────────────────────────────
  const word = words[currentIdx];
  const timerPct = timer / 30;
  const timerColor = timer > 10 ? '#4F46E5' : timer > 5 ? '#F59E0B' : '#DC2626';
  const isCorrect = revealed && (
    userAnswer.trim().toLowerCase() === word.meaning.toLowerCase() ||
    userAnswer.trim() === word.word ||
    userAnswer.trim() === word.reading
  );

  return (
    <div className="flex min-h-[80vh] flex-col px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/learn')} className="text-[var(--text-4)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-3)]">Quick Quiz</span>
          <div className="flex gap-1">
            {words.map((_, i) => (
              <div key={i} className={`h-2 w-8 rounded-full ${i < currentIdx ? 'bg-[#16A34A]' : i === currentIdx ? 'bg-[#4F46E5]' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>
        {/* Timer circle */}
        <div className="relative h-10 w-10">
          <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-800" />
            <circle cx="18" cy="18" r="16" fill="none" stroke={timerColor} strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${timerPct * 100} 100`} className="transition-all duration-1000" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: timerColor }}>
            {timer}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border-2 border-slate-700 bg-gray-900 p-8 text-center shadow-lg">
          <p className="text-[10px] text-[var(--text-4)] mb-1">What does this mean?</p>
          <p className="text-[42px] font-bold text-[var(--text-1)]">{word.word}</p>
          {word.reading && <p className="mt-1 text-sm text-[var(--text-3)]">({word.reading})</p>}

          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (!revealed) revealAnswer(); else nextWord(); } }}
            placeholder="Type the meaning..."
            disabled={revealed}
            className="mt-6 w-full rounded-xl border border-slate-700 bg-[var(--bg-1)] px-4 py-3 text-center text-base font-medium text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none disabled:opacity-70"
            autoFocus
          />

          {revealed && (
            <div className={`mt-4 rounded-xl p-3 ${isCorrect ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'}`}>
              <p className={`text-base font-bold ${isCorrect ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                {isCorrect ? '✅ Correct!' : `❌ It means: ${word.meaning}`}
              </p>
            </div>
          )}
        </div>

        {!revealed ? (
          <button onClick={revealAnswer} disabled={!userAnswer.trim()} className="mt-5 w-full max-w-sm rounded-xl bg-[#4F46E5] py-3.5 text-sm font-bold text-white disabled:opacity-40">
            Check
          </button>
        ) : (
          <button onClick={nextWord} className="mt-5 w-full max-w-sm rounded-xl bg-[#4F46E5] py-3.5 text-sm font-bold text-white">
            {currentIdx + 1 < words.length ? 'Next →' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
}
