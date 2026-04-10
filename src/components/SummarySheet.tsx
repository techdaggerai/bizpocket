'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';

interface SummarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  summary: string;
  loading: boolean;
}

export default function SummarySheet({ isOpen, onClose, contactName, summary, loading }: SummarySheetProps) {
  const [copied, setCopied] = useState(false);

  function copySummary() {
    navigator.clipboard.writeText(summary).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareSummary() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Chat Summary — ${contactName}`, text: summary });
        return;
      } catch { /* fall through to copy */ }
    }
    copySummary();
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Conversation Summary" snapPoints={[0.75]} defaultSnap={0.75}>
      {/* Contact name */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧠</span>
        <span className="text-sm font-medium text-slate-300">{contactName}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex gap-1.5 mb-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                style={{ animation: 'summaryBounce 1.4s infinite ease-in-out both', animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-slate-400">Summarizing...</p>
          <style jsx>{`
            @keyframes summaryBounce {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Summary text */}
      {!loading && summary && (
        <div>
          <div className="text-[14px] text-slate-200 leading-[1.7] whitespace-pre-wrap">
            {summary}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={copySummary}
              className="flex-1 rounded-xl border border-slate-600 py-2.5 text-[13px] font-medium text-slate-300 active:bg-slate-700 flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={shareSummary}
              className="flex-1 rounded-xl bg-[#4F46E5] py-2.5 text-[13px] font-semibold text-white active:bg-[#4338CA] flex items-center justify-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
              Share
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
