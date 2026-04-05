'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';

interface Topic {
  id: string;
  slug: string;
  title_en: string;
  title_target: string;
  description: string;
  icon: string;
  word_count: number;
  difficulty: string;
}

interface GeneratedWord {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  example_translation: string;
  difficulty: number;
}

export default function TopicPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const userId = profile?.id;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [words, setWords] = useState<GeneratedWord[]>([]);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  useEffect(() => {
    loadTopic();
  }, [slug, userId]);

  async function loadTopic() {
    const { data: t } = await supabase
      .from('learning_topics')
      .select('*')
      .eq('slug', slug)
      .single();

    if (t) {
      setTopic(t);
      // Check which words user already has from this topic
      const { data: existing } = await supabase
        .from('vocabulary')
        .select('word')
        .eq('user_id', userId)
        .eq('context', `topic_${slug}`);
      if (existing) setSavedWords(new Set(existing.map(e => e.word)));

      await generateWords(t);
    }
    setLoading(false);
  }

  async function generateWords(t: Topic) {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/topic-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: t.title_en,
          topicTarget: t.title_target,
          description: t.description,
          difficulty: t.difficulty,
          count: t.word_count,
        }),
      });
      const data = await res.json();
      if (data.words) setWords(data.words);
    } catch {
      // Fallback: no words generated
    }
    setGenerating(false);
  }

  function speak(text: string, idx: number) {
    setSpeakingIdx(idx);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.8;
    u.onend = () => setSpeakingIdx(null);
    u.onerror = () => setSpeakingIdx(null);
    speechSynthesis.speak(u);
  }

  async function saveWord(w: GeneratedWord) {
    if (!userId || savedWords.has(w.word)) return;
    await supabase.from('vocabulary').insert({
      user_id: userId,
      word: w.word,
      reading: w.reading,
      meaning: w.meaning,
      example_sentence: w.example,
      example_translation: w.example_translation,
      difficulty: w.difficulty,
      context: `topic_${slug}`,
      source: 'lesson',
      next_review_at: new Date().toISOString(),
      mastery_level: 0,
    });
    setSavedWords(prev => new Set([...prev, w.word]));

    // Update topic progress
    await supabase.from('topic_progress').upsert({
      user_id: userId,
      topic_id: topic!.id,
      words_completed: savedWords.size + 1,
      words_total: topic!.word_count,
    }, { onConflict: 'user_id,topic_id' });
  }

  async function saveAllAndPractice() {
    if (!userId) return;
    const newWords = words.filter(w => !savedWords.has(w.word));
    if (newWords.length > 0) {
      const rows = newWords.map(w => ({
        user_id: userId,
        word: w.word,
        reading: w.reading,
        meaning: w.meaning,
        example_sentence: w.example,
        example_translation: w.example_translation,
        difficulty: w.difficulty,
        context: `topic_${slug}`,
        source: 'lesson',
        next_review_at: new Date().toISOString(),
        mastery_level: 0,
      }));
      await supabase.from('vocabulary').insert(rows);

      await supabase.from('topic_progress').upsert({
        user_id: userId,
        topic_id: topic!.id,
        words_completed: savedWords.size + newWords.length,
        words_total: topic!.word_count,
      }, { onConflict: 'user_id,topic_id' });
    }
    router.push(`/learn/study?mode=review&source=lesson`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-sm text-[var(--text-4)]">Topic not found</p>
        <button onClick={() => router.push('/learn')} className="mt-4 text-sm text-[#4F46E5]">← Back</button>
      </div>
    );
  }

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-[#D1FAE5] text-[#065F46]',
    intermediate: 'bg-[#FEF3C7] text-[#92400E]',
    advanced: 'bg-[#FEE2E2] text-[#991B1B]',
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => router.push('/learn')} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
          <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-[var(--text-1)]">{topic.icon} {topic.title_en}</h1>
          <p className="text-[10px] text-[var(--text-4)]">{topic.title_target} · {topic.word_count} words</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyColors[topic.difficulty] || ''}`}>
          {topic.difficulty}
        </span>
      </div>

      <div className="px-4 pt-4">
        <p className="text-sm text-[var(--text-2)] mb-4">{topic.description}</p>

        {generating ? (
          <div className="flex flex-col items-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-4)]">Generating vocabulary for this topic...</p>
          </div>
        ) : (
          <>
            {/* Word list */}
            <div className="space-y-2">
              {words.map((w, i) => {
                const isSaved = savedWords.has(w.word);
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSaved
                        ? 'border-[#16A34A]/20 bg-[#16A34A]/[0.02]'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[var(--text-1)]">{w.word}</span>
                          <span className="text-sm text-[var(--text-3)]">{w.reading}</span>
                          <button
                            onClick={() => speak(w.word, i)}
                            className={`h-6 w-6 rounded-full flex items-center justify-center ${
                              speakingIdx === i ? 'bg-[#4F46E5] text-white' : 'bg-[var(--bg-2)] text-[var(--text-4)]'
                            }`}
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-[#4F46E5] font-medium mt-0.5">{w.meaning}</p>
                        {w.example && (
                          <div className="mt-2 rounded-lg bg-[var(--bg-2)] p-2">
                            <p className="text-xs text-[var(--text-1)]">{w.example}</p>
                            {w.example_translation && (
                              <p className="text-[10px] text-[var(--text-4)] mt-0.5">{w.example_translation}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => saveWord(w)}
                        disabled={isSaved}
                        className={`ml-2 shrink-0 rounded-full h-8 w-8 flex items-center justify-center transition-colors ${
                          isSaved
                            ? 'bg-[#16A34A]/10 text-[#16A34A]'
                            : 'bg-[var(--bg-2)] text-[var(--text-4)] hover:bg-[#4F46E5]/10 hover:text-[#4F46E5]'
                        }`}
                      >
                        {isSaved ? (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Practice CTA */}
            {words.length > 0 && (
              <button
                onClick={saveAllAndPractice}
                className="mt-6 w-full rounded-xl bg-[#4F46E5] py-3.5 text-sm font-bold text-white hover:bg-[#4338CA] transition-colors"
              >
                Save All & Practice 🎯
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
