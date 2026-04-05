'use client';

import { useState, useCallback } from 'react';

interface KeyWord {
  word: string;
  reading: string;
  meaning: string;
  example?: string;
}

interface LearningData {
  key_words: KeyWord[];
  grammar_note?: string;
  difficulty?: string;
}

interface Props {
  learning: LearningData;
  onSaveWords: (words: KeyWord[]) => void;
  isOwner: boolean;
}

export default function LearnFromMessage({ learning, onSaveWords, isOwner }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const speak = useCallback((text: string, idx: number) => {
    setSpeakingIdx(idx);
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.8;
    u.onend = () => setSpeakingIdx(null);
    u.onerror = () => setSpeakingIdx(null);
    speechSynthesis.speak(u);
  }, []);

  if (!learning?.key_words?.length) return null;

  return (
    <div className={`mt-1.5 ${isOwner ? 'ml-auto' : ''}`} style={{ maxWidth: '85%' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/20 text-[11px] font-medium text-[#A5B4FC] hover:bg-[#E0E7FF] transition-colors"
      >
        <span>📚</span>
        Learn from this message
        <svg className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {expanded && (
        <div className="mt-1.5 bg-slate-800 rounded-xl border border-slate-700 p-3 space-y-3 animate-slide-up">
          {/* Key words */}
          <div>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">🔤 Key Words</p>
            <div className="space-y-1.5">
              {learning.key_words.map((w, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-semibold text-slate-50">{w.word}</span>
                    {w.reading && <span className="text-[12px] text-slate-400 ml-1">({w.reading})</span>}
                    <span className="text-[12px] text-[#9CA3AF] ml-1.5">— {w.meaning}</span>
                  </div>
                  <button
                    onClick={() => speak(w.word, i)}
                    className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                      speakingIdx === i ? 'bg-[#4F46E5] text-white' : 'bg-slate-700 text-[#9CA3AF]'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Grammar note */}
          {learning.grammar_note && (
            <div>
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">💡 Grammar Note</p>
              <p className="text-[12px] text-slate-300 leading-relaxed">{learning.grammar_note}</p>
            </div>
          )}

          {/* Difficulty badge */}
          {learning.difficulty && (
            <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
              learning.difficulty === 'beginner' ? 'bg-[#F0FDF4] text-[#166534]' :
              learning.difficulty === 'intermediate' ? 'bg-[#FEF3C7] text-[#92400E]' :
              'bg-[#FEF2F2] text-[#991B1B]'
            }`}>
              {learning.difficulty}
            </span>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {!saved ? (
              <button
                onClick={() => { onSaveWords(learning.key_words); setSaved(true); }}
                className="flex-1 rounded-lg bg-[#4F46E5] py-2 text-[12px] font-semibold text-white"
              >
                Save Words
              </button>
            ) : (
              <span className="flex-1 rounded-lg bg-[#F0FDF4] py-2 text-[12px] font-semibold text-[#166534] text-center">
                ✓ Saved to vocabulary
              </span>
            )}
            <button
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-[12px] text-[#9CA3AF]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
