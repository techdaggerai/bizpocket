'use client';

import { useState, useRef, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';

interface PlanHeaderProps {
  name: string;
  isActive: boolean;
  createdAt: string;
  onNameChange: (name: string) => void;
  onActiveToggle: (active: boolean) => void;
}

export default function PlanHeader({ name, isActive, createdAt, onNameChange, onActiveToggle }: PlanHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(name); }, [name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commitName() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onNameChange(trimmed);
    else setDraft(name);
    setEditing(false);
  }

  return (
    <GlassCard className="space-y-3">
      {/* Plan name — inline editable */}
      <div className="flex items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
            className="flex-1 text-xl font-bold bg-transparent border-b border-[#AB7B5A] text-[var(--pm-text-primary)] outline-none py-1"
            maxLength={60}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 group text-left"
          >
            <h1 className="text-xl font-bold text-[var(--pm-text-primary)] group-hover:text-[#AB7B5A] transition-colors">
              {name}
            </h1>
            <svg className="w-4 h-4 text-[var(--pm-text-tertiary)] group-hover:text-[#AB7B5A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Active toggle + meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Toggle switch */}
          <button
            onClick={() => onActiveToggle(!isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-[#AB7B5A]' : 'bg-slate-600'}`}
            aria-label={isActive ? 'Deactivate plan' : 'Activate plan'}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium ${isActive ? 'text-[#AB7B5A]' : 'text-[var(--pm-text-tertiary)]'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="text-xs text-[var(--pm-text-tertiary)]">
          Created {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Note */}
      <p className="text-[11px] text-[var(--pm-text-tertiary)] italic">
        Only one plan can be active at a time
      </p>
    </GlassCard>
  );
}
