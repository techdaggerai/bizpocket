'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, MessageCircle } from 'lucide-react';
import { FORM_TEMPLATES, type FormTemplate, type FormTemplateField } from '@/lib/form-templates';

/* ---------- Types ---------- */

interface FormField {
  number: number;
  japaneseLabel?: string;
  englishLabel?: string;
  label_jp?: string;
  label_en?: string;
  guidance?: string;
  explanation?: string;
  example: string;
  required?: boolean;
  type?: string;
  format?: string | null;
  cultural_note?: string | null;
}

interface GuideResult {
  formTitle: string;
  formTitleTranslated: string;
  fields: FormField[];
}

type Screen = 'select' | 'camera' | 'processing' | 'results' | 'template';

/* ---------- Form types for camera scan ---------- */

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
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);

    canvas.toBlob(async (blob) => {
      if (!blob) { setError('Failed to capture photo'); return; }
      await analyzeForm(blob);
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setCapturedImage(reader.result as string);
    reader.readAsDataURL(file);

    await analyzeForm(file);
  }, []);

  /* ── Analyze ── */

  const analyzeForm = async (imageData: Blob | File) => {
    setScreen('processing');
    setError('');
    setResult(null);

    try {
      // Convert to base64 for the authenticated route
      const arrayBuffer = await (imageData instanceof File ? imageData.arrayBuffer() : imageData.arrayBuffer());
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch('/api/evryai/form-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, formType }),
      });

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

  /* ── Template view ── */

  const openTemplate = (template: FormTemplate) => {
    setActiveTemplate(template);
    setScreen('template');
  };

  /* ── Helper: normalize field for display ── */

  function fieldLabel(f: FormField): { jp: string; en: string } {
    return {
      jp: f.label_jp || f.japaneseLabel || '',
      en: f.label_en || f.englishLabel || '',
    };
  }

  function fieldExplanation(f: FormField): string {
    return f.explanation || f.guidance || '';
  }

  /* ── Render field card (shared between results and template) ── */

  function renderFieldCard(field: FormField | FormTemplateField, idx: number, tappable: boolean) {
    const jp = 'label_jp' in field ? field.label_jp : (field as FormField).japaneseLabel || '';
    const en = 'label_en' in field ? field.label_en : (field as FormField).englishLabel || '';
    const expl = 'explanation' in field ? field.explanation : (field as FormField).guidance || '';
    const fmt = field.format;
    const note = field.cultural_note;

    return (
      <div
        key={idx}
        className={`bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700 ${tappable ? 'active:bg-slate-800/80' : ''}`}
        onClick={tappable ? () => { setAskingField(field as FormField); setQuestion(''); setAnswer(''); } : undefined}
      >
        {/* Number badge + labels */}
        <div className="flex items-start gap-3">
          <span className="bg-indigo-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            {field.number}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-slate-200">{jp}</p>
            <p className="text-[13px] text-slate-400">{en}</p>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-[13px] text-slate-300 mt-2 leading-relaxed">{expl}</p>

        {/* Example box */}
        {field.example && (
          <div className="mt-2 bg-slate-900 rounded-lg px-3 py-2">
            <span className="text-[11px] text-slate-500 uppercase font-medium">Example: </span>
            <span className="text-[13px] text-slate-200 font-mono">{field.example}</span>
          </div>
        )}

        {/* Format badge */}
        {fmt && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
              Format: {fmt}
            </span>
          </div>
        )}

        {/* Cultural note */}
        {note && (
          <div className="mt-2 rounded-lg border-l-[3px] border-indigo-500 px-3 py-2" style={{ backgroundColor: 'rgba(99,102,241,0.08)' }}>
            <div className="flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
              <p className="text-[12px] text-indigo-300 leading-relaxed">{note}</p>
            </div>
          </div>
        )}

        {tappable && <p className="text-indigo-400/50 text-[10px] mt-2">Tap to ask a question</p>}
      </div>
    );
  }

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
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Form Fill Guide</h1>
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
            <p className="text-slate-400 text-sm mt-1">Scan a form or browse common templates</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Offline templates section */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Common Form Guides (Offline)</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {FORM_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => openTemplate(t)}
                className="flex-shrink-0 w-[140px] snap-center bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-left active:scale-95 transition-transform"
              >
                <span className="text-2xl">{t.icon}</span>
                <p className="text-white font-medium text-xs mt-2 line-clamp-1">{t.title_en}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{t.title_jp}</p>
              </button>
            ))}
          </div>

          {/* Scan form section */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6">Scan Your Form</p>
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

  /* ── Template view (offline) ── */

  if (screen === 'template' && activeTemplate) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 pt-3 pb-2">
            <button onClick={() => { setActiveTemplate(null); setScreen('select'); }} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{activeTemplate.title_en}</p>
              <p className="text-slate-400 text-xs truncate">{activeTemplate.title_jp}</p>
            </div>
            <span className="text-[10px] text-green-400 bg-green-400/10 rounded-full px-2 py-0.5 font-medium shrink-0">Offline</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          {activeTemplate.fields.map((field, i) => renderFieldCard(field, i, false))}
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-3 py-3">
            <button
              onClick={() => { setActiveTemplate(null); setScreen('select'); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium active:bg-slate-700"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => { setActiveTemplate(null); startCamera(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium active:bg-indigo-700"
            >
              Scan This Form
            </button>
          </div>
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
          <button onClick={() => { setResult(null); setCapturedImage(null); setScreen('select'); }} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{result?.formTitleTranslated || 'Form Guide'}</p>
            <p className="text-slate-400 text-xs truncate">{result?.formTitle}</p>
          </div>
          <span className="text-xs text-slate-500 shrink-0">{result?.fields.length} fields</span>
        </div>
      </div>

      {/* Captured image preview */}
      {capturedImage && (
        <div className="shrink-0 bg-black" style={{ maxHeight: '35vh' }}>
          <img src={capturedImage} alt="Captured form" className="w-full h-full object-contain" style={{ maxHeight: '35vh' }} />
        </div>
      )}

      {/* Field cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {result?.fields.map((field, i) => renderFieldCard(field, i, true))}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-3 py-3">
          <button
            onClick={() => { setResult(null); setCapturedImage(null); startCamera(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium active:bg-slate-700"
          >
            <RotateCcw size={16} />
            Scan Another
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
              {fieldLabel(askingField).en} ({fieldLabel(askingField).jp})
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
