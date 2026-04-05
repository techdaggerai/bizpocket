'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

interface NewWord {
  word: string;
  reading: string;
  meaning: string;
  difficulty: number;
}

interface Scene {
  scene_number: number;
  title: string;
  setting: string;
  dialogue: { speaker: string; japanese: string; reading: string; translation: string };
  new_words: NewWord[];
  practice_prompt: string;
  practice_answer: { japanese: string; reading: string; translation: string };
  cultural_note?: string;
}

interface QuizItem {
  question: string;
  answer: string;
  reading: string;
  hint?: string;
}

interface Lesson {
  title: string;
  title_ja: string;
  introduction: string;
  scenes: Scene[];
  quiz: QuizItem[];
}

export default function ScenarioPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = profile?.id;

  const topic = searchParams.get('topic') || '';
  const topicTarget = searchParams.get('topicTarget') || '';

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScene, setCurrentScene] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [phase, setPhase] = useState<'scenes' | 'quiz' | 'done'>('scenes');
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [level, setLevel] = useState('beginner');

  useEffect(() => {
    if (!userId) return;
    supabase.from('learning_profiles').select('level, native_language').eq('user_id', userId).single()
      .then(({ data }) => { if (data?.level) setLevel(data.level); });
    generateLesson();
  }, [userId]);

  async function generateLesson() {
    const res = await fetch('/api/ai/scenario-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, topicTarget, level }),
    });
    const data = await res.json();
    if (data.lesson) setLesson(data.lesson);
    setLoading(false);
  }

  function speak(text: string) {
    setSpeakingWord(text);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.75;
    u.onend = () => setSpeakingWord(null);
    u.onerror = () => setSpeakingWord(null);
    speechSynthesis.speak(u);
  }

  function checkPracticeAnswer() {
    setAnswered(true);
    setShowAnswer(true);
  }

  function nextScene() {
    if (lesson && currentScene + 1 < lesson.scenes.length) {
      setCurrentScene(prev => prev + 1);
      setShowAnswer(false);
      setUserAnswer('');
      setAnswered(false);
    } else {
      setPhase('quiz');
    }
  }

  function checkQuizAnswer() {
    const scene = lesson!;
    const correct = scene.quiz[quizIdx];
    const isMatch = quizAnswer.trim() === correct.answer || quizAnswer.trim() === correct.reading;
    if (isMatch) setQuizScore(prev => prev + 1);
    setQuizRevealed(true);
  }

  function nextQuiz() {
    if (lesson && quizIdx + 1 < lesson.quiz.length) {
      setQuizIdx(prev => prev + 1);
      setQuizAnswer('');
      setQuizRevealed(false);
    } else {
      finishLesson();
    }
  }

  async function finishLesson() {
    // Save all words from the lesson
    if (lesson && userId) {
      const allWords = lesson.scenes.flatMap(s => s.new_words);
      const rows = allWords.map(w => ({
        user_id: userId,
        word: w.word,
        reading: w.reading,
        meaning: w.meaning,
        difficulty: w.difficulty,
        context: `scenario_${topic.toLowerCase().replace(/\s/g, '_')}`,
        source: 'lesson',
        next_review_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        mastery_level: 0,
      }));

      // Dedupe
      const { data: existing } = await supabase.from('vocabulary').select('word').eq('user_id', userId)
        .in('word', allWords.map(w => w.word));
      const existingSet = new Set(existing?.map(e => e.word) || []);
      const newRows = rows.filter(r => !existingSet.has(r.word));
      if (newRows.length > 0) await supabase.from('vocabulary').insert(newRows);

      // XP
      const xp = lesson.scenes.length * 15 + quizScore * 10;
      await supabase.from('study_sessions').insert({
        user_id: userId, session_type: 'scenario', words_studied: allWords.length,
        words_correct: quizScore, xp_earned: xp, duration_seconds: 0,
      });
      const today = new Date().toISOString().split('T')[0];
      const { data: lp } = await supabase.from('learning_profiles')
        .select('last_study_date, streak_days, total_xp').eq('user_id', userId).single();
      let newStreak = lp?.streak_days || 0;
      if (lp?.last_study_date !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        newStreak = lp?.last_study_date === yesterday ? newStreak + 1 : 1;
      }
      await supabase.from('learning_profiles').update({
        last_study_date: today, streak_days: newStreak,
        total_xp: (lp?.total_xp || 0) + xp,
      }).eq('user_id', userId);
    }
    setPhase('done');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        <p className="mt-3 text-sm text-[var(--text-4)]">Creating your lesson...</p>
        <p className="text-[10px] text-[var(--text-4)] mt-1">AI is building a real-world scenario</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <p className="text-sm text-[var(--text-2)]">Failed to generate lesson</p>
        <button onClick={() => router.push('/learn')} className="mt-4 text-sm text-indigo-400">← Back</button>
      </div>
    );
  }

  // ─── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const totalWords = lesson.scenes.flatMap(s => s.new_words).length;
    const xp = lesson.scenes.length * 15 + quizScore * 10;
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <span className="text-5xl">🏆</span>
        <h2 className="mt-4 text-xl font-bold text-[var(--text-1)]">Lesson Complete!</h2>
        <p className="mt-1 text-sm text-[var(--text-4)]">{lesson.title}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-xs">
          <div className="rounded-2xl bg-[#EEF2FF] p-3 text-center">
            <p className="text-xl font-bold text-indigo-400">{lesson.scenes.length}</p>
            <p className="text-[10px] text-[var(--text-4)]">Scenes</p>
          </div>
          <div className="rounded-2xl bg-[#D1FAE5] p-3 text-center">
            <p className="text-xl font-bold text-[#065F46]">{totalWords}</p>
            <p className="text-[10px] text-[var(--text-4)]">Words</p>
          </div>
          <div className="rounded-2xl bg-[#FEF3C7] p-3 text-center">
            <p className="text-xl font-bold text-[#92400E]">{quizScore}/{lesson.quiz.length}</p>
            <p className="text-[10px] text-[var(--text-4)]">Quiz</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-[#4F46E5]/10 px-4 py-2">
          <span className="text-sm">⭐</span>
          <span className="text-sm font-bold text-indigo-400">+{xp} XP</span>
        </div>

        <button onClick={() => router.push('/learn')} className="mt-6 rounded-xl bg-[#4F46E5] px-8 py-3 text-sm font-bold text-white">
          Continue Learning
        </button>
      </div>
    );
  }

  // ─── Quiz phase ────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = lesson.quiz[quizIdx];
    if (!q) { finishLesson(); return null; }
    const isCorrect = quizRevealed && (quizAnswer.trim() === q.answer || quizAnswer.trim() === q.reading);

    return (
      <div className="flex min-h-[80vh] flex-col px-4 pt-4">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-bold text-indigo-400">QUIZ</span>
          <div className="flex-1 h-2 rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-[#4F46E5] transition-all" style={{ width: `${((quizIdx + 1) / lesson.quiz.length) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-[var(--text-4)]">{quizIdx + 1}/{lesson.quiz.length}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-700 bg-slate-800 p-8 text-center">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">Type the answer</p>
            <p className="text-base font-medium text-[var(--text-1)]">{q.question}</p>
            {q.hint && <p className="mt-2 text-xs text-[var(--text-4)] italic">Hint: {q.hint}</p>}

            <input
              type="text"
              value={quizAnswer}
              onChange={e => setQuizAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !quizRevealed) checkQuizAnswer(); }}
              placeholder="Type in Japanese..."
              disabled={quizRevealed}
              className="mt-4 w-full rounded-xl border border-slate-700 bg-[var(--bg-1)] px-4 py-3 text-center text-lg font-medium text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none disabled:opacity-70"
              autoFocus
            />

            {quizRevealed && (
              <div className={`mt-4 rounded-xl p-3 ${isCorrect ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'}`}>
                <p className={`text-sm font-bold ${isCorrect ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                  {isCorrect ? '✅ Correct!' : '❌ Not quite'}
                </p>
                <p className="text-base font-bold text-[var(--text-1)] mt-1">{q.answer}</p>
                <p className="text-xs text-[var(--text-3)]">({q.reading})</p>
              </div>
            )}
          </div>

          {!quizRevealed ? (
            <button onClick={checkQuizAnswer} disabled={!quizAnswer.trim()} className="mt-5 w-full max-w-sm rounded-xl bg-[#4F46E5] py-3 text-sm font-bold text-white disabled:opacity-40">
              Check
            </button>
          ) : (
            <button onClick={nextQuiz} className="mt-5 w-full max-w-sm rounded-xl bg-[#4F46E5] py-3 text-sm font-bold text-white">
              {quizIdx + 1 < lesson.quiz.length ? 'Next Question →' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Scene phase ───────────────────────────────────────────────────────────
  const scene = lesson.scenes[currentScene];
  if (!scene) { setPhase('quiz'); return null; }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/learn')} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
            <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-bold text-[var(--text-1)]">{lesson.title}</p>
            <p className="text-[10px] text-[var(--text-4)]">Scene {currentScene + 1} of {lesson.scenes.length}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {lesson.scenes.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full ${i <= currentScene ? 'bg-[#4F46E5]' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Scene title + setting */}
        <div className="rounded-2xl bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5 p-4">
          <h2 className="text-base font-bold text-[var(--text-1)]">Scene {scene.scene_number}: {scene.title}</h2>
          <p className="mt-1 text-xs text-[var(--text-2)] italic">{scene.setting}</p>
        </div>

        {/* Dialogue */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-wider mb-2">{scene.dialogue.speaker}</p>
          <p className="text-lg font-medium text-[var(--text-1)] leading-relaxed">{scene.dialogue.japanese}</p>
          <p className="text-xs text-[var(--text-3)] mt-1">{scene.dialogue.reading}</p>
          <p className="text-sm text-[var(--text-2)] mt-2 italic">{scene.dialogue.translation}</p>
          <button
            onClick={() => speak(scene.dialogue.japanese)}
            className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              speakingWord === scene.dialogue.japanese ? 'bg-[#4F46E5] text-white' : 'bg-[var(--bg-2)] text-[var(--text-3)]'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            Listen
          </button>
        </div>

        {/* New words */}
        <div>
          <h3 className="text-[11px] font-bold tracking-wider text-[var(--text-4)] uppercase mb-2">New Words</h3>
          <div className="flex flex-wrap gap-2">
            {scene.new_words.map((w, i) => (
              <button
                key={i}
                onClick={() => speak(w.word)}
                className="flex items-center gap-2 rounded-xl border border-[#4F46E5]/10 bg-[#4F46E5]/[0.02] px-3 py-2"
              >
                <span className="text-base font-bold text-[var(--text-1)]">{w.word}</span>
                <span className="text-xs text-[var(--text-3)]">({w.reading})</span>
                <span className="text-xs text-indigo-400 font-medium">{w.meaning}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cultural note */}
        {scene.cultural_note && (
          <div className="rounded-xl bg-[#FEF3C7] border border-[#FDE68A]/50 p-3">
            <p className="text-xs font-bold text-[#92400E] mb-1">🎌 Cultural Note</p>
            <p className="text-xs text-[#92400E]/80">{scene.cultural_note}</p>
          </div>
        )}

        {/* Practice prompt */}
        <div className="rounded-2xl border-2 border-[#4F46E5]/20 bg-slate-800 p-4">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Your Turn</p>
          <p className="text-sm font-medium text-[var(--text-1)]">{scene.practice_prompt}</p>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !answered) checkPracticeAnswer(); }}
              placeholder="Type in Japanese..."
              disabled={answered}
              className="flex-1 rounded-xl border border-slate-700 bg-[var(--bg-1)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none disabled:opacity-60"
            />
            {!answered && (
              <button onClick={checkPracticeAnswer} disabled={!userAnswer.trim()} className="rounded-xl bg-[#4F46E5] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">
                Check
              </button>
            )}
          </div>

          {showAnswer && (
            <div className="mt-3 rounded-xl bg-[#D1FAE5] p-3">
              <p className="text-xs font-bold text-[#065F46] mb-1">Model answer:</p>
              <p className="text-base font-bold text-[var(--text-1)]">{scene.practice_answer.japanese}</p>
              <p className="text-xs text-[var(--text-3)]">{scene.practice_answer.reading}</p>
              <p className="text-xs text-[var(--text-2)] mt-1 italic">{scene.practice_answer.translation}</p>
              <button onClick={() => speak(scene.practice_answer.japanese)} className="mt-2 text-[10px] text-indigo-400 font-medium">
                🔊 Listen
              </button>
            </div>
          )}
        </div>

        {/* Next button */}
        {answered && (
          <button onClick={nextScene} className="w-full rounded-xl bg-[#4F46E5] py-3 text-sm font-bold text-white">
            {currentScene + 1 < lesson.scenes.length ? 'Next Scene →' : 'Start Quiz →'}
          </button>
        )}
      </div>
    </div>
  );
}
