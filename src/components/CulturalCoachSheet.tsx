'use client';

import { useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';

const CONTEXTS = [
  { key: 'boss', label: 'Boss' },
  { key: 'colleague', label: 'Colleague' },
  { key: 'client', label: 'Client' },
  { key: 'friend', label: 'Friend' },
] as const;

interface CoachResult {
  rating: number;
  issues: string[];
  politeVersion: string;
  romanization: string;
  explanation: string;
}

interface CulturalCoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  onSendPolite: (text: string) => void;
  onSendOriginal: () => void;
}

export default function CulturalCoachSheet({ isOpen, onClose, message, onSendPolite, onSendOriginal }: CulturalCoachSheetProps) {
  const [context, setContext] = useState('boss');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/evryai/cultural-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), context, targetLang: 'ja' }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Could not analyze right now.');
    } finally {
      setLoading(false);
    }
  }

  function meterColor(rating: number) {
    if (rating <= 2) return '#10B981';
    if (rating <= 3) return '#F59E0B';
    return '#EF4444';
  }

  function handleClose() {
    setResult(null);
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Cultural Coach" snapPoints={[0.7]} defaultSnap={0.7}>
      {/* User's message */}
      <div className="bg-slate-800 rounded-xl px-3.5 py-2.5 mb-4">
        <p className="text-[11px] text-slate-500 mb-1">Your message</p>
        <p className="text-sm text-white line-clamp-3">{message}</p>
      </div>

      {/* Context pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CONTEXTS.map(c => (
          <button
            key={c.key}
            onClick={() => setContext(c.key)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
              context === c.key
                ? 'bg-[#4F46E5] text-white'
                : 'bg-slate-700 text-slate-300 active:bg-slate-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Check button */}
      {!result && !error && (
        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white disabled:opacity-50 mb-4"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Checking...
            </span>
          ) : 'Check'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-4">
          <p className="text-sm text-amber-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Directness meter */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Directness</span>
            <div className="flex-1 relative h-2.5 rounded-full overflow-hidden bg-slate-700">
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #10B981, #F59E0B, #EF4444)' }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `calc(${((result.rating - 1) / 4) * 100}% - 7px)`,
                  backgroundColor: meterColor(result.rating),
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: meterColor(result.rating) }}>{result.rating}/5</span>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && result.issues.map((issue, i) => (
            <div key={i} className="rounded-lg border-l-[3px] border-[#EF4444] px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <p className="text-xs text-red-300">{issue}</p>
            </div>
          ))}

          {/* Polite version */}
          <div className="rounded-lg border-l-[3px] border-[#6366F1] px-3 py-2.5" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
            <p className="text-[15px] font-medium text-indigo-300">{result.politeVersion}</p>
            <p className="text-[12px] text-slate-400 italic mt-0.5">{result.romanization}</p>
            <p className="text-[11px] text-slate-300 mt-2">{result.explanation}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { onSendOriginal(); handleClose(); }}
              className="flex-1 rounded-xl border border-slate-600 py-2.5 text-[13px] font-medium text-slate-300 active:bg-slate-700"
            >
              Send original
            </button>
            <button
              onClick={() => { onSendPolite(result.politeVersion); handleClose(); }}
              className="flex-1 rounded-xl bg-[#4F46E5] py-2.5 text-[13px] font-semibold text-white active:bg-[#4338CA]"
            >
              Send polite version
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
