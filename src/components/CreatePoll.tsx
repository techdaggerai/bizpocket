'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (poll: { question: string; options: string[]; allowMultiple: boolean; anonymous: boolean }) => void;
}

export default function CreatePoll({ onClose, onSubmit }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  function addOption() {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  }

  function updateOption(idx: number, value: string) {
    setOptions(options.map((o, i) => i === idx ? value : o));
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    const q = question.trim();
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    onSubmit({ question: q, options: opts, allowMultiple, anonymous });
  }

  const valid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md sm:mx-4 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
          <button onClick={onClose} className="text-sm text-[#9CA3AF] font-medium">Cancel</button>
          <p className="text-[15px] font-bold text-[#0A0A0A] dark:text-white">📊 Create Poll</p>
          <button onClick={handleSubmit} disabled={!valid} className="text-sm text-[#4F46E5] font-bold disabled:opacity-30">Create</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Question */}
          <div>
            <label className="text-sm font-medium text-[#374151] dark:text-gray-300 block mb-1.5">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-[15px] text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none"
              autoFocus
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-sm font-medium text-[#374151] dark:text-gray-300 block mb-1.5">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#9CA3AF] w-5 text-center shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-xl border border-[#E5E5E5] dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="p-1 text-[#9CA3AF] hover:text-[#DC2626]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button onClick={addOption} className="mt-2 text-[13px] text-[#4F46E5] font-medium flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Option
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2 border-t border-[#F0F0F0] dark:border-gray-700">
            <label className="flex items-center justify-between">
              <span className="text-sm text-[#374151] dark:text-gray-300">Allow multiple answers</span>
              <button
                onClick={() => setAllowMultiple(!allowMultiple)}
                className="relative w-10 h-[22px] rounded-full transition-colors"
                style={{ backgroundColor: allowMultiple ? '#4F46E5' : '#D1D5DB' }}
              >
                <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform" style={{ left: allowMultiple ? 20 : 2 }} />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-[#374151] dark:text-gray-300">Anonymous votes</span>
              <button
                onClick={() => setAnonymous(!anonymous)}
                className="relative w-10 h-[22px] rounded-full transition-colors"
                style={{ backgroundColor: anonymous ? '#4F46E5' : '#D1D5DB' }}
              >
                <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform" style={{ left: anonymous ? 20 : 2 }} />
              </button>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
