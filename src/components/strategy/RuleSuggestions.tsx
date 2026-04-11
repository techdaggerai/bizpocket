'use client';

import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import type { Rule } from './RulesManager';

interface Suggestion {
  category: string;
  rule: string;
  weight: number;
  reasoning: string;
}

interface RuleSuggestionsProps {
  existingRules: Rule[];
  onAddRule: (rule: Omit<Rule, 'id'>) => void;
}

export default function RuleSuggestions({ existingRules, onAddRule }: RuleSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAddedIds(new Set());

    try {
      const res = await fetch('/api/ai/suggest-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingRules: existingRules.map((r) => ({ category: r.category, rule: r.rule })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get suggestions');
      }

      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(s: Suggestion, idx: number) {
    onAddRule({ category: s.category, rule: s.rule, weight: Math.max(1, Math.min(10, s.weight || 5)) });
    setAddedIds((prev) => new Set(prev).add(idx));
  }

  return (
    <GlassCard tier="growing" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0099FF]/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0099FF]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">Dagger AI</h3>
          <p className="text-[11px] text-[var(--pm-text-tertiary)]">AI-powered rule suggestions</p>
        </div>
      </div>

      {suggestions.length === 0 && !loading && !error && (
        <button
          onClick={fetchSuggestions}
          className="w-full py-2.5 rounded-xl bg-[#0099FF]/10 text-[#0099FF] text-sm font-semibold hover:bg-[#0099FF]/20 transition-colors"
        >
          Suggest rules based on my trading history
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 border-2 border-[#0099FF]/30 border-t-[#0099FF] rounded-full animate-spin" />
          <span className="text-sm text-[var(--pm-text-tertiary)]">Analyzing your trades...</span>
        </div>
      )}

      {error && (
        <div className="py-3 text-center space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchSuggestions}
            className="text-xs text-[#0099FF] hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-[#0099FF] uppercase">{s.category}</span>
                  <p className="text-sm text-[var(--pm-text-primary)] mt-0.5">{s.rule}</p>
                  <p className="text-[11px] text-[var(--pm-text-tertiary)] mt-1 italic">{s.reasoning}</p>
                </div>
                <button
                  onClick={() => handleAdd(s, i)}
                  disabled={addedIds.has(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    addedIds.has(i)
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : 'bg-[#0099FF]/10 text-[#0099FF] hover:bg-[#0099FF]/20'
                  }`}
                >
                  {addedIds.has(i) ? 'Added' : 'Add to my rules'}
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={fetchSuggestions}
            className="w-full py-2 text-xs text-[var(--pm-text-tertiary)] hover:text-[#0099FF] transition-colors"
          >
            Get more suggestions
          </button>
        </div>
      )}
    </GlassCard>
  );
}
