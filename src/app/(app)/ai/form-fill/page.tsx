'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, MessageCircle } from 'lucide-react';

/* ---------- Types ---------- */

interface FormField {
  number: number;
  japaneseLabel: string;
  englishLabel: string;
  guidance: string;
  example: string;
  required: boolean;
  type: string;
}

interface GuideResult {
  formTitle: string;
  formTitleTranslated: string;
  fields: FormField[];
}

type Screen = 'select' | 'camera' | 'processing' | 'results';

/* ---------- Form types ---------- */

const FORM_TYPES = [
  { id: 'juminhyo', emoji: '\uD83C\uDFE2', title: 'Residence Certificate', subtitle: '\u4F4F\u6C11\u7968 \u30FB Juuminhyo' },
  { id: 'tennin', emoji: '\uD83D\uDCE6', title: 'Move-In Notice', subtitle: '\u8EE2\u5165\u5C4A \u30FB Tennin-todoke' },
  { id: 'bank', emoji: '\uD83C\uDFE6', title: 'Bank Account', subtitle: 'Account opening form' },
  { id: 'phone', emoji: '\uD83D\uDCF1', title: 'Phone Contract', subtitle: 'Mobile carrier forms' },
  { id: 'apartment', emoji: '\uD83C\uDFE0', title: 'Apartment Lease', subtitle: 'Rental agreement' },
  { id: 'hospital', emoji: '\uD83C\uDFE5', title: 'Hospital Intake', subtitle: 'Medical questionnaire' },
  { id: 'school', emoji: '\uD83C\uDFEB', title: 'School Enrollment', subtitle: 'Registration forms' },
  { id: 'custom', emoji: '\uD83D\uDCCB', title: 'Any Form', subtitle: 'Scan any Japanese form' },
];

/* ---------- Component ---------- */

export default function FormFillGuidePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('select');
  const [formType, setFormType] = useState('custom');
  const [result, setResult] = useState<GuideResult | null>(null);
  const [error, setError] = useState('');
  const [askingField, setAskingField] = useState<FormField | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Camera ── */

  const startCamera = useCallback(async () => {
    setScreen('camera');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError('Camera access denied. Use the file upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) { setError('Failed to capture photo'); return; }
      await analyzeForm(blob);
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await analyzeForm(file);
  }, []);

  /* ── Analyze ── */

  const analyzeForm = async (imageData: Blob | File) => {
    setScreen('processing');
    setError('');
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('action', 'guide');
      fd.append('formType', formType);
      fd.append('file', imageData instanceof File ? imageData : new File([imageData], 'form.jpg', { type: 'image/jpeg' }));

      const res = await fetch('/api/ai/form-fill', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Analysis failed');
      }

      const data: GuideResult = await res.json();
      if (!data.fields?.length) throw new Error('No fields detected. Try a clearer photo.');
      setResult(data);
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setScreen('select');
    }
  };

  /* ── Follow-up question ── */

  const askFollowUp = async () => {
    if (!question.trim() || askLoading) return;
    setAskLoading(true);
    setAnswer('');

    try {
      const fd = new FormData();
      fd.append('action', 'follow-up');
      fd.append('question', question.trim());
      if (askingField) fd.append('field', JSON.stringify(askingField));

      const res = await fetch('/api/ai/form-fill', { method: 'POST', body: fd });
      const data = await res.json();
      setAnswer(data.answer || 'No answer available.');
    } catch {
      setAnswer('Failed to get answer. Please try again.');
    }
    setAskLoading(false);
  };

  /* ── Select form type screen ── */

  if (screen === 'select') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Form Helper</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24">
          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Fill Japanese Forms</h2>
            <p className="text-slate-400 text-sm mt-1">Take a photo and get field-by-field guidance</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What type of form?</p>
          <div className="grid grid-cols-2 gap-3">
            {FORM_TYPES.map(ft => (
              <button
                key={ft.id}
                onClick={() => {
                  setFormType(ft.id);
                  startCamera();
                }}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-left active:scale-95 transition-transform"
              >
                <span className="text-2xl">{ft.emoji}</span>
                <p className="text-white font-medium text-sm mt-2">{ft.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{ft.subtitle}</p>
              </button>
            ))}
          </div>

          {/* File upload fallback */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-6 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium active:bg-slate-800"
          >
            Or upload a photo from gallery
          </button>
        </div>
      </div>
    );
  }

  /* ── Camera screen ── */

  if (screen === 'camera') {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <video ref={videoRef} className="flex-1 object-cover" playsInline autoPlay muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Form outline guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] aspect-[1/1.414] border-2 border-white/30 rounded-lg" />
        </div>
        <p className="absolute top-[env(safe-area-inset-top)] mt-16 left-0 right-0 text-center text-white/70 text-sm font-medium">
          Position form within the frame
        </p>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-8 py-6">
            <button
              onClick={() => { stopCamera(); setScreen('select'); }}
              className="text-white/70 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
            >
              <div className="w-[60px] h-[60px] rounded-full bg-white" />
            </button>
            <button
              onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
              className="text-white/70 text-sm font-medium"
            >
              Gallery
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { stopCamera(); handleFileUpload(e); }} />
      </div>
    );
  }

  /* ── Processing screen ── */

  if (screen === 'processing') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center px-8">
        <div className="relative h-20 w-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
        </div>
        <p className="text-white font-semibold text-lg">Analyzing form...</p>
        <p className="text-slate-400 text-sm mt-2 text-center">Reading every field and translating labels</p>
      </div>
    );
  }

  /* ── Results screen ── */

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Sticky header */}
      <div className="px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 pt-3 pb-2">
          <button onClick={() => { setResult(null); setScreen('select'); }} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{result?.formTitleTranslated || 'Form Guide'}</p>
            <p className="text-slate-400 text-xs truncate">{result?.formTitle}</p>
          </div>
          <span className="text-xs text-slate-500 shrink-0">{result?.fields.length} fields</span>
        </div>
      </div>

      {/* Field cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {result?.fields.map(field => (
          <div
            key={field.number}
            className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700 active:bg-slate-800/80"
            onClick={() => { setAskingField(field); setQuestion(''); setAnswer(''); }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                Field {field.number}
              </span>
              <span className={`text-xs ${field.required ? 'text-amber-400' : 'text-slate-500'}`}>
                {field.required ? 'Required' : 'Optional'}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{field.japaneseLabel}</p>
            <p className="text-white font-medium">{field.englishLabel}</p>
            <p className="text-slate-300 text-sm mt-1">{field.guidance}{field.example ? ` Example: ${field.example}` : ''}</p>
            <p className="text-indigo-400/60 text-[10px] mt-2">Tap to ask a question</p>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-3 py-3">
          <button
            onClick={() => { setResult(null); startCamera(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium active:bg-slate-700"
          >
            <RotateCcw size={16} />
            Retake
          </button>
          <button
            onClick={() => { setAskingField(null); setQuestion(''); setAnswer(''); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium active:bg-indigo-700"
          >
            <MessageCircle size={16} />
            Ask Question
          </button>
        </div>
      </div>

      {/* Follow-up question sheet */}
      {askingField !== null && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAskingField(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl p-5 pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            <h3 className="text-white font-semibold mb-1">Ask about this field</h3>
            <p className="text-slate-400 text-sm mb-4">
              {askingField.englishLabel} ({askingField.japaneseLabel})
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {['What format does this need?', 'Can I write in English?', 'What if I don\'t know this?'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300 active:bg-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askFollowUp()}
                placeholder="Type your question..."
                className="flex-1 bg-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={askFollowUp}
                disabled={!question.trim() || askLoading}
                className="px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 active:bg-indigo-700"
              >
                {askLoading ? '...' : 'Ask'}
              </button>
            </div>

            {answer && (
              <div className="mt-4 bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                <p className="text-slate-200 text-sm leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
