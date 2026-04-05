'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface LearningProfile {
  id: string;
  target_language: string;
  native_language: string;
  level: string;
  daily_goal: number;
  streak_days: number;
  total_words_learned: number;
  total_xp: number;
  last_study_date: string | null;
}

interface VocabWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  context: string | null;
  source: string | null;
  mastery_level: number;
  next_review_at: string;
  difficulty: number;
}

interface Topic {
  id: string;
  slug: string;
  title_en: string;
  title_target: string;
  description: string;
  icon: string;
  category: string;
  difficulty: string;
  word_count: number;
  is_premium: boolean;
  progress?: { words_completed: number };
}

interface TodayStats {
  wordsToday: number;
  reviewDue: number;
}

const LANG_FLAGS: Record<string, string> = {
  ja: '🇯🇵', en: '🇺🇸', ur: '🇵🇰', ar: '🇸🇦', ko: '🇰🇷',
  zh: '🇨🇳', fr: '🇫🇷', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳',
};

const LANG_NAMES: Record<string, string> = {
  ja: 'Japanese', en: 'English', ur: 'Urdu', ar: 'Arabic', ko: 'Korean',
  zh: 'Chinese', fr: 'French', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi',
};

const SOURCE_LABELS: Record<string, { icon: string; label: string }> = {
  camera_scan: { icon: '📸', label: 'Camera scans' },
  chat_translation: { icon: '💬', label: 'Chat translations' },
  document_scan: { icon: '📄', label: 'Document scans' },
  translation: { icon: '🌐', label: 'Translations' },
  lesson: { icon: '📖', label: 'Topic lessons' },
};

export default function LearnPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const userId = profile?.id;

  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [realWorldGroups, setRealWorldGroups] = useState<{ source: string; count: number; words: VocabWord[] }[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({ wordsToday: 0, reviewDue: 0 });
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  async function loadData() {
    // Fetch or create learning profile
    let { data: lp } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!lp) {
      const { data: newLp } = await supabase
        .from('learning_profiles')
        .insert({ user_id: userId, target_language: 'ja', native_language: profile?.language || 'en' })
        .select()
        .single();
      lp = newLp;
      setShowSetup(true);
    }
    if (lp) setLearningProfile(lp);

    // Fetch topics with progress
    const { data: allTopics } = await supabase
      .from('learning_topics')
      .select('*')
      .order('sort_order');

    const { data: progress } = await supabase
      .from('topic_progress')
      .select('topic_id, words_completed')
      .eq('user_id', userId);

    const progressMap = new Map(progress?.map(p => [p.topic_id, p]) || []);
    if (allTopics) {
      setTopics(allTopics.map(t => ({ ...t, progress: progressMap.get(t.id) })));
    }

    // Fetch real-world vocabulary grouped by source
    const { data: vocab } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (vocab && vocab.length > 0) {
      const groups = new Map<string, VocabWord[]>();
      for (const w of vocab) {
        const src = w.source || 'translation';
        if (!groups.has(src)) groups.set(src, []);
        groups.get(src)!.push(w);
      }
      setRealWorldGroups(
        Array.from(groups.entries()).map(([source, words]) => ({
          source,
          count: words.filter(w => new Date(w.next_review_at) <= new Date()).length,
          words: words.slice(0, 5),
        })).filter(g => g.words.length > 0)
      );

      // Count today's studied words
      const today = new Date().toISOString().split('T')[0];
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('words_studied')
        .eq('user_id', userId)
        .gte('created_at', today + 'T00:00:00');
      const wordsToday = sessions?.reduce((s, se) => s + (se.words_studied || 0), 0) || 0;

      // Count review-due words
      const reviewDue = vocab.filter(w => new Date(w.next_review_at) <= new Date()).length;
      setTodayStats({ wordsToday, reviewDue });
    }

    // Check streak
    if (lp?.last_study_date) {
      const last = new Date(lp.last_study_date);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1 && lp.streak_days > 0) {
        // Streak broken
        await supabase.from('learning_profiles').update({ streak_days: 0 }).eq('user_id', userId);
        if (learningProfile) setLearningProfile({ ...lp, streak_days: 0 });
      }
    }

    setLoading(false);
  }

  async function saveSetup(targetLang: string, level: string, goal: number) {
    if (!userId) return;
    await supabase.from('learning_profiles').update({
      target_language: targetLang,
      level,
      daily_goal: goal,
    }).eq('user_id', userId);
    setLearningProfile(prev => prev ? { ...prev, target_language: targetLang, level, daily_goal: goal } : prev);
    setShowSetup(false);
  }

  const dailyGoal = learningProfile?.daily_goal || 10;
  const dailyProgress = Math.min(todayStats.wordsToday / dailyGoal, 1);
  const targetLang = learningProfile?.target_language || 'ja';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {LANG_FLAGS[targetLang]} Learn {LANG_NAMES[targetLang] || targetLang}
          </h1>
          <p className="text-xs text-[var(--text-4)] mt-0.5">
            {learningProfile?.total_words_learned || 0} words learned · Level: {learningProfile?.level}
          </p>
        </div>
        {(learningProfile?.streak_days || 0) > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-[#F97316]/10 px-3 py-1.5">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-bold text-[#F97316]">{learningProfile?.streak_days}</span>
          </div>
        )}
      </div>

      {/* Daily Goal Progress */}
      <div className="mx-4 mt-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Daily Goal</span>
          <span className="text-sm font-bold">{todayStats.wordsToday}/{dailyGoal} words</span>
        </div>
        <div className="h-2 rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${dailyProgress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] opacity-80">
            {todayStats.reviewDue > 0 ? `${todayStats.reviewDue} words due for review` : 'All caught up!'}
          </span>
          <span className="text-[10px] opacity-80">
            {learningProfile?.total_xp || 0} XP
          </span>
        </div>
      </div>

      {/* Study Modes */}
      <div className="grid grid-cols-2 gap-2 mx-4 mt-4">
        {todayStats.reviewDue > 0 && (
          <Link href="/learn/study?mode=review" className="flex items-center gap-2 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/20 border border-[#FDE68A]/50 dark:border-amber-800/30 px-3 py-3">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-xs font-bold text-[#92400E] dark:text-amber-300">Flash Review</p>
              <p className="text-[10px] text-[#92400E]/60 dark:text-amber-400/60">{todayStats.reviewDue} due</p>
            </div>
          </Link>
        )}
        <Link href="/learn/practice" className="flex items-center gap-2 rounded-xl bg-[#EDE9FE] dark:bg-purple-950/20 border border-[#DDD6FE]/50 dark:border-purple-800/30 px-3 py-3">
          <span className="text-lg">💬</span>
          <div>
            <p className="text-xs font-bold text-[#7C3AED] dark:text-purple-300">AI Practice</p>
            <p className="text-[10px] text-[#7C3AED]/60 dark:text-purple-400/60">Conversation</p>
          </div>
        </Link>
        <Link href="/learn/quiz" className="flex items-center gap-2 rounded-xl bg-[#FEE2E2] dark:bg-red-950/20 border border-[#FECACA]/50 dark:border-red-800/30 px-3 py-3">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs font-bold text-[#DC2626] dark:text-red-300">Quick Quiz</p>
            <p className="text-[10px] text-[#DC2626]/60 dark:text-red-400/60">30s challenge</p>
          </div>
        </Link>
        <Link href="/learn/study?mode=new" className="flex items-center gap-2 rounded-xl bg-[#EEF2FF] dark:bg-indigo-950/20 border border-[#C7D2FE]/50 dark:border-indigo-800/30 px-3 py-3">
          <span className="text-lg">📖</span>
          <div>
            <p className="text-xs font-bold text-[#4F46E5] dark:text-indigo-300">Learn New</p>
            <p className="text-[10px] text-[#4F46E5]/60 dark:text-indigo-400/60">Pick a topic</p>
          </div>
        </Link>
      </div>

      {/* FROM YOUR REAL LIFE */}
      {realWorldGroups.length > 0 && (
        <div className="mt-6 px-4">
          <h2 className="text-[11px] font-bold tracking-wider text-[var(--text-4)] uppercase mb-3">
            From Your Real Life
          </h2>
          <div className="space-y-2">
            {realWorldGroups.map(group => {
              const info = SOURCE_LABELS[group.source] || { icon: '📝', label: group.source };
              return (
                <Link
                  key={group.source}
                  href={`/learn/study?mode=review&source=${group.source}`}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-colors hover:border-[#4F46E5]/20"
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      Words from your {info.label.toLowerCase()}
                    </p>
                    <p className="text-xs text-[var(--text-4)] mt-0.5">
                      {group.count > 0 ? `${group.count} due for review` : `${group.words.length} words saved`}
                    </p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {group.words.slice(0, 4).map(w => (
                        <span key={w.id} className="rounded-md bg-[var(--bg-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-2)]">
                          {w.word}
                        </span>
                      ))}
                      {group.words.length > 4 && (
                        <span className="text-[10px] text-[var(--text-4)]">+{group.words.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* TOPIC LESSONS */}
      <div className="mt-6 px-4">
        <h2 className="text-[11px] font-bold tracking-wider text-[var(--text-4)] uppercase mb-3">
          Topic Lessons
        </h2>

        {/* Category filter pills */}
        {['daily', 'business', 'travel', 'emergency'].map(cat => {
          const catTopics = topics.filter(t => t.category === cat);
          if (catTopics.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <p className="text-xs font-semibold text-[var(--text-2)] mb-2 capitalize">{cat}</p>
              <div className="grid grid-cols-3 gap-2">
                {catTopics.map(topic => {
                  const completed = topic.progress?.words_completed || 0;
                  const total = topic.word_count;
                  const pct = total > 0 ? completed / total : 0;
                  return (
                    <Link
                      key={topic.id}
                      href={`/learn/topic/${topic.slug}`}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center transition-colors hover:border-[#4F46E5]/20"
                    >
                      <span className="text-2xl">{topic.icon}</span>
                      <p className="text-[11px] font-semibold text-[var(--text-1)] mt-1 leading-tight">
                        {topic.title_en}
                      </p>
                      <p className="text-[9px] text-[var(--text-4)] mt-0.5">
                        {total} words
                      </p>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-[#4F46E5] transition-all"
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                      {topic.is_premium && (
                        <span className="mt-1 inline-block text-[8px] font-bold text-[#F59E0B]">PRO</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* My Vocabulary Link */}
      <div className="mx-4 mt-4">
        <Link
          href="/vocabulary"
          className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📚</span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">My Vocabulary</p>
              <p className="text-xs text-[var(--text-4)]">{learningProfile?.total_words_learned || 0} words total</p>
            </div>
          </div>
          <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <SetupModal
          onSave={saveSetup}
          onClose={() => setShowSetup(false)}
          defaultLang={targetLang}
        />
      )}
    </div>
  );
}

// ─── Setup Modal ─────────────────────────────────────────────────────────────

function SetupModal({ onSave, onClose, defaultLang }: {
  onSave: (lang: string, level: string, goal: number) => void;
  onClose: () => void;
  defaultLang: string;
}) {
  const [lang, setLang] = useState(defaultLang);
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState(10);

  const languages = [
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'fr', name: 'French', flag: '🇫���' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  ];

  const levels = [
    { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
    { value: 'elementary', label: 'Elementary', desc: 'Know basic phrases' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Can have conversations' },
    { value: 'advanced', label: 'Advanced', desc: 'Near fluent' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-900 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[var(--text-1)] text-center">Set Up Learning</h2>
        <p className="text-xs text-[var(--text-4)] text-center mt-1">We&apos;ll personalize lessons for you</p>

        {/* Language */}
        <p className="text-xs font-semibold text-[var(--text-2)] mt-4 mb-2">I want to learn:</p>
        <div className="flex flex-wrap gap-2">
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                lang === l.code ? 'bg-[#4F46E5] text-white' : 'bg-[var(--bg-2)] text-[var(--text-2)]'
              }`}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>

        {/* Level */}
        <p className="text-xs font-semibold text-[var(--text-2)] mt-4 mb-2">My level:</p>
        <div className="grid grid-cols-2 gap-2">
          {levels.map(l => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`rounded-xl p-2.5 text-left transition-colors border ${
                level === l.value
                  ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <p className="text-xs font-semibold text-[var(--text-1)]">{l.label}</p>
              <p className="text-[10px] text-[var(--text-4)]">{l.desc}</p>
            </button>
          ))}
        </div>

        {/* Daily goal */}
        <p className="text-xs font-semibold text-[var(--text-2)] mt-4 mb-2">Daily goal:</p>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map(g => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                goal === g ? 'bg-[#4F46E5] text-white' : 'bg-[var(--bg-2)] text-[var(--text-2)]'
              }`}
            >
              {g} words
            </button>
          ))}
        </div>

        <button
          onClick={() => onSave(lang, level, goal)}
          className="mt-5 w-full rounded-xl bg-[#4F46E5] py-3 text-sm font-bold text-white hover:bg-[#4338CA] transition-colors"
        >
          Start Learning 🚀
        </button>
      </div>
    </div>
  );
}
