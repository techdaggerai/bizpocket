'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CONTEXTS = [
  { key: 'boss', label: 'Boss' },
  { key: 'colleague', label: 'Colleague' },
  { key: 'client', label: 'Client' },
  { key: 'landlord', label: 'Landlord' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'shop', label: 'Shop staff' },
  { key: 'friend', label: 'Friend' },
  { key: 'stranger', label: 'Stranger' },
] as const;

interface CoachResult {
  rating: number;
  issues: string[];
  politeVersion: string;
  romanization: string;
  explanation: string;
}

export default function CulturalCoachPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('boss');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      setError('Could not analyze. Your message may be fine — when in doubt, add すみません at the start.');
    } finally {
      setLoading(false);
    }
  }

  function copyPolite() {
    if (!result) return;
    navigator.clipboard.writeText(result.politeVersion).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function useInChat() {
    if (!result) return;
    navigator.clipboard.writeText(result.politeVersion).catch(() => {});
    // Could use a toast here, but simple alert works for now
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Directness meter color
  function meterColor(rating: number) {
    if (rating <= 2) return '#10B981';
    if (rating <= 3) return '#F59E0B';
    return '#EF4444';
  }

  return (
    <div className="min-h-screen bg-[#0f172a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center h-14 px-2 bg-[#0f172a] border-b border-slate-700">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-white ml-1">Cultural Coach</h1>
        <span className="ml-2 text-lg">💜</span>
      </div>

      <div className="px-4 py-6 space-y-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        {/* Input area */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">What do you want to say?</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type what you want to say..."
            maxLength={2000}
            className="w-full h-[120px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-[15px] text-white placeholder-slate-500 resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/30"
          />
        </div>

        {/* Context selector */}
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">Who are you speaking to?</label>
          <div className="flex flex-wrap gap-2">
            {CONTEXTS.map(c => (
              <button
                key={c.key}
                onClick={() => setContext(c.key)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  context === c.key
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-slate-700 text-slate-300 active:bg-slate-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={!message.trim() || loading}
          className="w-full rounded-xl bg-[#4F46E5] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Analyzing...
            </span>
          ) : 'Check My Message'}
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Directness meter */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Directness Level</span>
                <span className="text-sm font-bold" style={{ color: meterColor(result.rating) }}>{result.rating}/5</span>
              </div>
              <div className="relative h-3 w-full rounded-full overflow-hidden bg-slate-700">
                <div className="absolute inset-0 rounded-full" style={{
                  background: 'linear-gradient(to right, #10B981, #F59E0B, #EF4444)',
                }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all"
                  style={{
                    left: `calc(${((result.rating - 1) / 4) * 100}% - 8px)`,
                    backgroundColor: meterColor(result.rating),
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">Polite</span>
                <span className="text-[10px] text-slate-500">Too direct</span>
              </div>
            </div>

            {/* Cultural issues */}
            {result.issues.length > 0 && (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div key={i} className="rounded-xl border-l-[3px] border-[#EF4444] px-4 py-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                    <p className="text-sm text-red-300">{issue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Polite version */}
            <div className="rounded-xl border-l-[3px] border-[#6366F1] p-4" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
              <p className="text-[10px] font-medium text-indigo-400 uppercase tracking-wide mb-2">Polite Version</p>
              <p className="text-[18px] font-medium text-indigo-300 leading-relaxed">{result.politeVersion}</p>
              <p className="text-[14px] text-slate-400 mt-1 italic">{result.romanization}</p>
              <p className="text-[13px] text-slate-300 mt-3 leading-relaxed">{result.explanation}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={copyPolite}
                className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-200 active:bg-slate-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy polite version'}
              </button>
              <button
                onClick={useInChat}
                className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white active:bg-[#4338CA] transition-colors"
              >
                {copied ? 'Copied!' : 'Use in chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
