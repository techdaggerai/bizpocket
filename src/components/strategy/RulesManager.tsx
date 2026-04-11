'use client';

import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';

export interface Rule {
  id: string;
  category: string;
  rule: string;
  weight: number;
}

const CATEGORIES = ['entry', 'exit', 'risk', 'psychology', 'custom'] as const;
const CATEGORY_TABS = ['all', ...CATEGORIES] as const;

const CATEGORY_COLORS: Record<string, string> = {
  entry: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  exit: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  risk: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  psychology: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  custom: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface RulesManagerProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
}

function getNextId(rules: Rule[]): string {
  const nums = rules.map((r) => {
    const m = r.id.match(/^r(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `r${max + 1}`;
}

export default function RulesManager({ rules, onRulesChange }: RulesManagerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<string>('entry');
  const [formRule, setFormRule] = useState('');
  const [formWeight, setFormWeight] = useState(5);

  const filtered = activeTab === 'all' ? rules : rules.filter((r) => r.category === activeTab);

  function addRule() {
    if (!formRule.trim()) return;
    const newRule: Rule = {
      id: getNextId(rules),
      category: formCategory,
      rule: formRule.trim(),
      weight: formWeight,
    };
    onRulesChange([...rules, newRule]);
    resetForm();
  }

  function saveEdit() {
    if (!formRule.trim() || !editingId) return;
    onRulesChange(
      rules.map((r) =>
        r.id === editingId ? { ...r, category: formCategory, rule: formRule.trim(), weight: formWeight } : r
      )
    );
    resetForm();
  }

  function startEdit(r: Rule) {
    setEditingId(r.id);
    setFormCategory(r.category);
    setFormRule(r.rule);
    setFormWeight(r.weight);
    setShowForm(true);
  }

  function deleteRule(id: string) {
    onRulesChange(rules.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormCategory('entry');
    setFormRule('');
    setFormWeight(5);
  }

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--pm-text-primary)] uppercase tracking-wide">
          Trading Rules
        </h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#AB7B5A]/20 text-[#AB7B5A] text-xs font-semibold hover:bg-[#AB7B5A]/30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Rule
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-[#AB7B5A] text-white'
                : 'bg-[var(--bg)] text-[var(--pm-text-tertiary)] hover:text-[var(--pm-text-secondary)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Inline add/edit form */}
      {showForm && (
        <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
          <div className="flex gap-2">
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="h-9 px-2 rounded-lg bg-[var(--pm-surface-1)] border border-[var(--border)] text-xs text-[var(--pm-text-primary)] outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <input
              value={formRule}
              onChange={(e) => setFormRule(e.target.value)}
              placeholder="Describe your rule..."
              className="flex-1 h-9 px-3 rounded-lg bg-[var(--pm-surface-1)] border border-[var(--border)] text-sm text-[var(--pm-text-primary)] placeholder:text-[var(--pm-text-tertiary)] outline-none focus:border-[#AB7B5A] transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter') editingId ? saveEdit() : addRule(); }}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-[var(--pm-text-tertiary)] font-medium shrink-0">Weight: {formWeight}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formWeight}
              onChange={(e) => setFormWeight(parseInt(e.target.value))}
              className="flex-1 accent-[#AB7B5A]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => (editingId ? saveEdit() : addRule())}
                disabled={!formRule.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#AB7B5A] text-white text-xs font-semibold disabled:opacity-40 hover:bg-[#AB7B5A]/80 transition-colors"
              >
                {editingId ? 'Save' : 'Add'}
              </button>
              <button
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg text-[var(--pm-text-tertiary)] text-xs hover:text-[var(--pm-text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules list */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--pm-text-tertiary)]">
            {rules.length === 0
              ? 'No rules yet. Add your first trading rule to start building your edge.'
              : `No ${activeTab} rules. Switch tabs or add a new rule.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] group hover:border-[#AB7B5A]/30 transition-colors"
            >
              {/* Drag handle */}
              <svg className="w-4 h-4 text-[var(--pm-text-tertiary)] shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>

              {/* Category pill */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.custom}`}>
                {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
              </span>

              {/* Rule text */}
              <p className="flex-1 text-sm text-[var(--pm-text-primary)] leading-snug">{r.rule}</p>

              {/* Weight badge */}
              <span className="text-[11px] font-bold text-[#AB7B5A] bg-[#AB7B5A]/10 px-2 py-0.5 rounded-full shrink-0">
                {r.weight}/10
              </span>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(r)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--pm-surface-2)] transition-colors"
                  aria-label="Edit rule"
                >
                  <svg className="w-3.5 h-3.5 text-[var(--pm-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteRule(r.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-colors"
                  aria-label="Delete rule"
                >
                  <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
