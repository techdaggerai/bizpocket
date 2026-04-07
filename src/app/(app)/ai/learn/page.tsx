'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Star, Volume2, Send, RotateCcw, Check, X } from 'lucide-react';
import { TOPICS, type Word, type Topic } from '@/lib/learn/topics';

/* ─── Types ─── */

interface VocabEntry {
  word: string;
  reading: string;
  meaning: string;
  topic: string;
  lastSeen: number;
  correctCount: number;
  incorrectCount: number;
  nextReview: number;
  starred: boolean;
}

interface StreakData {
  current: number;
  lastDate: string;
}

interface LearningState {
  vocabulary: VocabEntry[];
  streak: StreakData;
  topicProgress: Record<string, number>;
  dailyGoal: number;
  wordsLearnedToday: number;
  todayDate: string;
}

type Screen = 'main' | 'lesson' | 'quiz' | 'practice';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_KEY = 'evryai-learn-state';

const DEFAULT_STATE: LearningState = {
  vocabulary: [],
  streak: { current: 0, lastDate: '' },
  topicProgress: {},
  dailyGoal: 5,
  wordsLearnedToday: 0,
  todayDate: '',
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getNextReview(correctCount: number): number {
  const days = correctCount <= 0 ? 1 : correctCount === 1 ? 3 : correctCount === 2 ? 7 : 14;
  return Date.now() + days * 86400000;
}

/* ─── Progress Ring ─── */

function ProgressRing({ progress, size = 56 }: { progress: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, progress));
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

/* ─── Main Component ─── */

export default function LanguageLearningPage() {
  const router = useRouter();
  const [state, setState] = useState<LearningState>(DEFAULT_STATE);
  const [screen, setScreen] = useState<Screen>('main');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [lessonWords, setLessonWords] = useState<Word[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);

  // Quiz state
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Practice state
  const [practiceMessages, setPracticeMessages] = useState<ChatMsg[]>([]);
  const [practiceInput, setPracticeInput] = useState('');
  const [practiceLoading, setPracticeLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Your Words from translations
  const [yourWords, setYourWords] = useState<{ word: string; meaning: string }[]>([]);
  const startQuizRef = useRef<() => void>(() => {});

  // Load state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LearningState;
        const today = getToday();
        // Reset daily count if new day
        if (parsed.todayDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          parsed.wordsLearnedToday = 0;
          parsed.todayDate = today;
          if (parsed.streak.lastDate === yesterday) {
            // Streak continues
          } else if (parsed.streak.lastDate !== today) {
            parsed.streak.current = 0;
          }
        }
        setState(parsed);
      } else {
        setState({ ...DEFAULT_STATE, todayDate: getToday() });
      }
    } catch {
      setState({ ...DEFAULT_STATE, todayDate: getToday() });
    }

    // Pull words from translation history
    try {
      const camera = JSON.parse(localStorage.getItem('evryai-camera-history') || '[]');
      const voice = JSON.parse(localStorage.getItem('evryai-voice-history') || '[]');
      const words: { word: string; meaning: string }[] = [];

      camera.forEach((h: { result?: { original_text?: string; translated_text?: string } }) => {
        if (h.result?.original_text && h.result?.translated_text) {
          const origWords = h.result.original_text.split(/[\s、。,.\n]+/).filter((w: string) => w.length >= 2 && w.length <= 10);
          origWords.slice(0, 3).forEach((w: string) => {
            words.push({ word: w, meaning: h.result!.translated_text!.slice(0, 40) });
          });
        }
      });

      voice.forEach((h: { originalText?: string; translatedText?: string }) => {
        if (h.originalText && h.translatedText) {
          words.push({ word: h.originalText.slice(0, 20), meaning: h.translatedText.slice(0, 40) });
        }
      });

      setYourWords(words.slice(0, 20));
    } catch { /* empty */ }
  }, []);

  // Save state
  const save = useCallback((newState: LearningState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [practiceMessages]);

  // ─── Start Lesson ───
  const startLesson = useCallback((topic: Topic) => {
    setActiveTopic(topic);
    const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
    setLessonWords(shuffled.slice(0, Math.min(10, shuffled.length)));
    setCurrentIdx(0);
    setFlipped(false);
    setSlideDir(null);
    setScreen('lesson');
  }, []);

  // ─── Flashcard Actions ───
  const markWord = useCallback((correct: boolean) => {
    const word = lessonWords[currentIdx];
    if (!word) return;

    const newState = { ...state };
    const existing = newState.vocabulary.find(v => v.word === word.word);

    if (existing) {
      if (correct) {
        existing.correctCount++;
      } else {
        existing.incorrectCount++;
        existing.correctCount = Math.max(0, existing.correctCount - 1);
      }
      existing.lastSeen = Date.now();
      existing.nextReview = getNextReview(existing.correctCount);
    } else {
      newState.vocabulary.push({
        word: word.word,
        reading: word.reading,
        meaning: word.meaning,
        topic: activeTopic?.key || '',
        lastSeen: Date.now(),
        correctCount: correct ? 1 : 0,
        incorrectCount: correct ? 0 : 1,
        nextReview: getNextReview(correct ? 1 : 0),
        starred: false,
      });
    }

    if (correct) {
      newState.wordsLearnedToday++;
      if (newState.wordsLearnedToday >= newState.dailyGoal) {
        newState.streak.current++;
        newState.streak.lastDate = getToday();
      }
    }

    // Topic progress
    if (activeTopic) {
      const topicVocab = newState.vocabulary.filter(v => v.topic === activeTopic.key);
      const learned = topicVocab.filter(v => v.correctCount >= 2).length;
      newState.topicProgress[activeTopic.key] = learned / activeTopic.words.length;
    }

    save(newState);

    setSlideDir(correct ? 'right' : 'left');
    setTimeout(() => {
      setSlideDir(null);
      setFlipped(false);
      if (currentIdx < lessonWords.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        // Lesson done — start quiz
        startQuizRef.current();
      }
    }, 300);
  }, [currentIdx, lessonWords, state, activeTopic, save]);

  // ─── Quiz ───
  const startQuiz = useCallback(() => {
    const topic = activeTopic;
    if (!topic) return;
    const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    setQuizWords(selected);
    setQuizIdx(0);
    setQuizScore(0);
    setQuizAnswer(null);
    setQuizDone(false);
    generateQuizOptions(selected[0], topic);
    setScreen('quiz');
  }, [activeTopic]);
  startQuizRef.current = startQuiz;

  const generateQuizOptions = (correct: Word, topic: Topic) => {
    const others = topic.words
      .filter(w => w.word !== correct.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.word);
    const opts = [...others, correct.word].sort(() => Math.random() - 0.5);
    setQuizOptions(opts);
  };

  const answerQuiz = useCallback((answer: string) => {
    if (quizAnswer !== null) return;
    const correct = quizWords[quizIdx];
    const isCorrect = answer === correct.word;
    setQuizAnswer(answer);
    if (isCorrect) setQuizScore(s => s + 1);

    setTimeout(() => {
      setQuizAnswer(null);
      if (quizIdx < quizWords.length - 1) {
        const nextIdx = quizIdx + 1;
        setQuizIdx(nextIdx);
        if (activeTopic) generateQuizOptions(quizWords[nextIdx], activeTopic);
      } else {
        setQuizDone(true);
      }
    }, 1000);
  }, [quizAnswer, quizIdx, quizWords, activeTopic]);

  // ─── AI Practice ───
  const startPractice = useCallback(() => {
    const topic = activeTopic;
    if (!topic) return;
    setPracticeMessages([{
      role: 'assistant',
      text: `Let's practice ${topic.title} vocabulary! I'll speak in simple Japanese. Try to respond. I'll help you along the way.\n\nこんにちは！${topic.title}の練習をしましょう。`,
    }]);
    setPracticeInput('');
    setScreen('practice');
  }, [activeTopic]);

  const sendPractice = useCallback(async () => {
    const text = practiceInput.trim();
    if (!text || practiceLoading) return;

    setPracticeMessages(prev => [...prev, { role: 'user', text }]);
    setPracticeInput('');
    setPracticeLoading(true);

    try {
      const res = await fetch('/api/ai/voice-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Context: Japanese language tutoring about "${activeTopic?.title}". Student said: "${text}". Respond as a tutor: 1) If they wrote Japanese, gently correct any errors. 2) Continue the conversation in simple Japanese about ${activeTopic?.title}. 3) Add English translation in parentheses. Keep response to 2-3 sentences.`,
          fromLang: 'en',
          toLang: 'ja',
        }),
      });

      const data = await res.json();
      setPracticeMessages(prev => [...prev, {
        role: 'assistant',
        text: data.translated_text || 'すみません、もう一度お願いします。(Sorry, please try again.)',
      }]);
    } catch {
      setPracticeMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Connection error. Please try again.',
      }]);
    } finally {
      setPracticeLoading(false);
    }
  }, [practiceInput, practiceLoading, activeTopic]);

  // ─── TTS ───
  const speak = useCallback((text: string, lang = 'ja-JP') => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.8;
    speechSynthesis.speak(u);
  }, []);

  const progress = state.dailyGoal > 0 ? state.wordsLearnedToday / state.dailyGoal : 0;

  // ═══════════════════════════════════════
  //  FLASHCARD LESSON
  // ═══════════════════════════════════════
  if (screen === 'lesson' && lessonWords.length > 0) {
    const word = lessonWords[currentIdx];
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => setScreen('main')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">
            {activeTopic?.emoji} {activeTopic?.title}
          </h1>
          <span className="text-xs text-slate-500 pt-3 pb-3">{currentIdx + 1}/{lessonWords.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((currentIdx + 1) / lessonWords.length) * 100}%` }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Flashcard */}
          <button
            onClick={() => { setFlipped(!flipped); if (!flipped) speak(word.word); }}
            className={`w-full max-w-sm min-h-[220px] rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300 ${
              slideDir === 'right' ? 'translate-x-[120%] opacity-0' :
              slideDir === 'left' ? '-translate-x-[120%] opacity-0' : ''
            } ${flipped ? 'bg-slate-800' : 'bg-slate-800/80 border border-slate-700/50'}`}
          >
            {!flipped ? (
              <>
                <p className="text-3xl font-bold text-white mb-3">{word.word}</p>
                <p className="text-lg text-slate-400">{word.reading}</p>
                <p className="text-xs text-slate-600 mt-4">Tap to reveal</p>
              </>
            ) : (
              <>
                <p className="text-xl text-white font-semibold mb-2">{word.meaning}</p>
                <div className="border-t border-slate-700 w-full my-3" />
                <p className="text-sm text-slate-400">{word.example}</p>
                <p className="text-sm text-slate-500 mt-1">{word.example_en}</p>
                <button onClick={(e) => { e.stopPropagation(); speak(word.example); }} className="mt-3 p-2 text-indigo-400 active:opacity-60">
                  <Volume2 size={18} />
                </button>
              </>
            )}
          </button>

          {/* Action buttons */}
          {flipped && (
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => markWord(false)}
                className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center active:bg-red-500/30"
              >
                <X size={28} className="text-red-400" />
              </button>
              <button
                onClick={() => markWord(true)}
                className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center active:bg-green-500/30"
              >
                <Check size={28} className="text-green-400" />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-600 mt-4">
            {flipped ? '✗ Study again  |  ✓ I know this' : 'Tap card to flip'}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  QUIZ MODE
  // ═══════════════════════════════════════
  if (screen === 'quiz' && quizWords.length > 0) {
    if (quizDone) {
      return (
        <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center px-6">
          <div className="text-5xl mb-4">{quizScore >= 4 ? '🎉' : quizScore >= 2 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{quizScore}/{quizWords.length} Correct</h2>
          <p className="text-sm text-slate-400 mb-8">
            {quizScore >= 4 ? 'Excellent work!' : quizScore >= 2 ? 'Good job! Keep practicing.' : 'Keep going — practice makes perfect!'}
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button onClick={startPractice} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:bg-indigo-700">
              Practice Conversation
            </button>
            <button onClick={() => activeTopic && startLesson(activeTopic)} className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-300 active:bg-slate-700">
              <RotateCcw size={14} className="inline mr-1.5" /> Study Again
            </button>
            <button onClick={() => setScreen('main')} className="w-full rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 active:bg-slate-800">
              Back to Learn
            </button>
          </div>
        </div>
      );
    }

    const qWord = quizWords[quizIdx];
    const isCorrect = quizAnswer === qWord.word;

    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => setScreen('main')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Quiz</h1>
          <span className="text-xs text-slate-500 pt-3 pb-3">{quizIdx + 1}/{quizWords.length}</span>
        </div>

        <div className="h-1 bg-slate-800">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((quizIdx + 1) / quizWords.length) * 100}%` }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-sm text-slate-500 mb-3">What is the Japanese for:</p>
          <p className="text-2xl font-bold text-white mb-8 text-center">{qWord.meaning}</p>

          <div className="w-full max-w-sm space-y-3">
            {quizOptions.map(opt => {
              let bg = 'bg-slate-800 active:bg-indigo-600';
              if (quizAnswer !== null) {
                if (opt === qWord.word) bg = 'bg-green-600';
                else if (opt === quizAnswer && !isCorrect) bg = 'bg-red-600';
                else bg = 'bg-slate-800 opacity-50';
              }
              return (
                <button
                  key={opt}
                  onClick={() => answerQuiz(opt)}
                  disabled={quizAnswer !== null}
                  className={`w-full py-3.5 rounded-xl text-white text-base font-medium transition-colors ${bg}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  AI CONVERSATION PRACTICE
  // ═══════════════════════════════════════
  if (screen === 'practice') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => setScreen('main')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">
            {activeTopic?.emoji} Conversation Practice
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
          {practiceMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600/30 rounded-tr-md'
                  : 'bg-slate-800 rounded-tl-md'
              }`}>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.role === 'assistant' && (
                  <button onClick={() => speak(msg.text)} className="mt-1 p-1 text-indigo-400 active:opacity-60">
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {practiceLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-tl-md p-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="shrink-0 border-t border-slate-800 px-4 py-2 pb-[env(safe-area-inset-bottom)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={practiceInput}
              onChange={e => setPracticeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendPractice(); } }}
              placeholder="Type in Japanese or English..."
              className="flex-1 bg-slate-800/60 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-slate-700/50 focus:border-indigo-500/50 placeholder:text-slate-600"
            />
            <button onClick={sendPractice} disabled={!practiceInput.trim() || practiceLoading} className="p-2 text-indigo-400 disabled:opacity-30">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  MAIN SCREEN
  // ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
        <div className="pt-3 pb-3">
          <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
        </div>
        <div className="flex-1 pt-3 pb-3">
          <h1 className="text-white text-sm font-semibold">Learn</h1>
          <p className="text-[10px] text-slate-500">Learn from your real life in Japan</p>
        </div>
        <GraduationCap size={20} className="text-emerald-500 mt-3 mb-3" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">

        {/* ─── Daily Challenge Card ─── */}
        <button
          onClick={() => {
            // Start lesson with words due for review, or first topic
            const dueWords = state.vocabulary.filter(v => v.nextReview <= Date.now());
            if (dueWords.length >= 5) {
              const topic: Topic = { key: 'review', emoji: '📝', title: 'Daily Review', words: dueWords.map(v => ({
                word: v.word, reading: v.reading, meaning: v.meaning, example: '', example_en: '',
              }))};
              startLesson(topic);
            } else {
              startLesson(TOPICS[0]);
            }
          }}
          className="w-full bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 mb-5 text-left active:opacity-90"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium mb-1">Today&apos;s Goal</p>
              <p className="text-white text-xl font-bold mb-1">{state.wordsLearnedToday}/{state.dailyGoal} words</p>
              <div className="flex items-center gap-2">
                {state.streak.current > 0 && (
                  <span className="text-amber-300 text-sm font-semibold">
                    <span className="animate-bounce inline-block">🔥</span> {state.streak.current} day streak
                  </span>
                )}
              </div>
            </div>
            <ProgressRing progress={progress} />
          </div>
        </button>

        {/* ─── Topic Packs ─── */}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Topic Packs</h3>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 -mx-1 px-1 mb-5">
          {TOPICS.map(topic => {
            const prog = state.topicProgress[topic.key] || 0;
            return (
              <button
                key={topic.key}
                onClick={() => startLesson(topic)}
                className="shrink-0 w-40 bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left active:bg-slate-800 active:border-indigo-500/30"
              >
                <span className="text-2xl block mb-2">{topic.emoji}</span>
                <p className="text-sm font-semibold text-white mb-0.5">{topic.title}</p>
                <p className="text-[10px] text-slate-500 mb-2">{topic.words.length} words</p>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${prog * 100}%` }} />
                </div>
                {prog > 0 && (
                  <p className="text-[9px] text-emerald-400 mt-1">{Math.round(prog * 100)}% complete</p>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Your Words ─── */}
        {yourWords.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Words from Your Translations</h3>
            <div className="space-y-2">
              {yourWords.slice(0, 8).map((w, i) => (
                <button
                  key={i}
                  onClick={() => speak(w.word)}
                  className="w-full text-left bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/30 active:bg-slate-800/60 flex items-center gap-3"
                >
                  <Volume2 size={14} className="text-slate-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{w.word}</p>
                    <p className="text-xs text-slate-500 truncate">{w.meaning}</p>
                  </div>
                  <Star size={14} className="text-slate-700 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no words */}
        {yourWords.length === 0 && state.vocabulary.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm mb-2">Start using Camera Translate or Voice Translate</p>
            <p className="text-slate-600 text-xs">Your real-life words will appear here automatically</p>
          </div>
        )}

        {/* Vocabulary stats */}
        {state.vocabulary.length > 0 && (
          <div className="mt-5 bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/30">
            <p className="text-xs text-slate-500 mb-1">Your Vocabulary</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-lg font-bold text-white">{state.vocabulary.length}</p>
                <p className="text-[10px] text-slate-500">words learned</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{state.vocabulary.filter(v => v.correctCount >= 3).length}</p>
                <p className="text-[10px] text-slate-500">mastered</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{state.vocabulary.filter(v => v.nextReview <= Date.now()).length}</p>
                <p className="text-[10px] text-slate-500">due for review</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
