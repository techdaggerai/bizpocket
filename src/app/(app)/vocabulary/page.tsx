'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';

interface SavedWord {
  word: string;
  reading: string;
  meaning: string;
  example?: string;
  times_seen: number;
  saved_at: string;
}

const STORAGE_KEY = 'learned_words';

export default function VocabularyPage() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [filter, setFilter] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWords(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

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

  function deleteWord(idx: number) {
    const updated = words.filter((_, i) => i !== idx);
    setWords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const filtered = filter
    ? words.filter(w => w.word.includes(filter) || w.reading.includes(filter) || w.meaning.toLowerCase().includes(filter.toLowerCase()))
    : words;

  return (
    <div className="pb-20">
      <PageHeader title="My Vocabulary" backPath="/settings" />

      <div className="px-4 pt-4 space-y-3">
        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-[#EEF2FF] p-3 text-center">
            <p className="text-xl font-bold text-indigo-400">{words.length}</p>
            <p className="text-[10px] text-[#6B7280]">Words Saved</p>
          </div>
          <div className="flex-1 rounded-xl bg-[#FEF3C7] p-3 text-center">
            <p className="text-xl font-bold text-[#92400E]">{words.reduce((s, w) => s + w.times_seen, 0)}</p>
            <p className="text-[10px] text-[#6B7280]">Total Encounters</p>
          </div>
        </div>

        {/* Search */}
        {words.length > 0 && (
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search words..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none"
          />
        )}

        {/* Word list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm font-medium text-[#374151]">
              {words.length === 0 ? 'No words saved yet' : 'No matches'}
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              {words.length === 0 ? 'Turn on Language Learning in Settings, then save words from translated messages' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((w, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-white">{w.word}</span>
                      {w.reading && <span className="text-[12px] text-[#6B7280]">({w.reading})</span>}
                    </div>
                    <p className="text-[13px] text-[#374151] mt-0.5">{w.meaning}</p>
                    {w.example && <p className="text-[11px] text-[#9CA3AF] italic mt-0.5">{w.example}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-[#9CA3AF] bg-slate-700 px-1.5 py-0.5 rounded">{w.times_seen}x</span>
                    <button
                      onClick={() => speak(w.word, i)}
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${speakingIdx === i ? 'bg-[#4F46E5] text-white' : 'bg-slate-700 text-[#9CA3AF]'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                    </button>
                    <button onClick={() => deleteWord(i)} className="h-8 w-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#DC2626]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
