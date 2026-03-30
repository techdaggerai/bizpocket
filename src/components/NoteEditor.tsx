'use client';

import { useState } from 'react';

interface NoteEditorProps {
  note: string | null;
  onSave: (note: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function NoteEditor({ note, onSave, onDelete }: NoteEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    await onDelete();
    setSaving(false);
    setValue('');
    setEditing(false);
  }

  if (!editing && !note) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-[var(--text-4)] hover:text-[var(--accent)] transition-colors"
      >
        + Add note
      </button>
    );
  }

  if (!editing && note) {
    return (
      <div className="group">
        <p className="text-xs text-[var(--text-3)] italic">{note}</p>
        <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setValue(note); setEditing(true); }}
            className="text-[10px] text-[var(--text-4)] hover:text-[var(--accent)]"
          >
            Edit
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-[10px] text-[var(--text-4)] hover:text-[var(--red)]"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note..."
        className="flex-1 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
      />
      <button
        onClick={handleSave}
        disabled={saving || !value.trim()}
        className="rounded-btn bg-[var(--accent)] px-2.5 py-1.5 text-xs text-white disabled:opacity-50"
      >
        {saving ? '...' : 'Save'}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded-btn border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-3)]"
      >
        Cancel
      </button>
    </div>
  );
}
