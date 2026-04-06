'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase-client';
import {
  Camera,
  FolderOpen,
  RotateCw,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Share2,
  Printer,
  Mail,
  Check,
} from 'lucide-react';

/* ---------- Types ---------- */

interface TranslationField {
  label: string;
  original: string;
  translated: string;
}

interface TranslationResult {
  original_text: string;
  translated_text: string;
  detected_language: string;
  document_type: string;
  fields: TranslationField[];
}

/* ---------- Step Indicator ---------- */

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < current
              ? 'w-2 bg-[#22C55E]'
              : i === current
                ? 'w-6 bg-indigo-500'
                : 'w-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- Step Labels ---------- */

const STEP_LABELS = ['Capture', 'Translate', 'Fill', 'Export'];

/* ---------- Main Page ---------- */

export default function DocumentScannerPage() {
  const router = useRouter();
  const { user, organization, profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState('image/jpeg');
  const [rotation, setRotation] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [editedFields, setEditedFields] = useState<TranslationField[]>([]);
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [exporting, setExporting] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    includeScan: true,
    includeTranslation: true,
    includeFilledForm: true,
  });

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Document Scanner — Evrywher';
  }, []);

  const userLang = profile?.language || 'en';
  const isForm = result?.document_type === 'Form';
  const totalSteps = isForm ? 4 : 3;
  const isPro = ['pro', 'business', 'enterprise'].includes(organization?.plan || '');

  /* ---------- Capture ---------- */

  const handleCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setMediaType(file.type || 'image/jpeg');
    setRotation(0);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageData(dataUrl);
      setStep(0); // stay on capture to preview
    };
    reader.readAsDataURL(file);
  }, []);

  /* ---------- Translate ---------- */

  const handleTranslate = useCallback(async () => {
    if (!imageData) return;
    setTranslating(true);
    setStep(1);

    try {
      // Extract base64 from data URL
      const base64 = imageData.split(',')[1];
      const res = await fetch('/api/ai/translate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType,
          targetLanguage: userLang,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Translation failed');
      }

      const data: TranslationResult = await res.json();
      setResult(data);
      setEditedFields(data.fields.map((f) => ({ ...f })));
    } catch (err: any) {
      toast(err.message || 'Translation failed', 'error');
      setStep(0);
    } finally {
      setTranslating(false);
    }
  }, [imageData, mediaType, userLang, toast]);

  /* ---------- Export PDF ---------- */

  const handleExport = useCallback(async () => {
    if (!result) return;
    setExporting(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Build HTML content for PDF
      const sections: string[] = [];

      if (pdfOptions.includeScan && imageData) {
        sections.push(`
          <div style="page-break-after:always;text-align:center;padding:20px;">
            <h2 style="color:#333;margin-bottom:16px;">Original Document</h2>
            <img src="${imageData}" style="max-width:100%;max-height:90vh;border-radius:8px;transform:rotate(${rotation}deg);" />
          </div>
        `);
      }

      if (pdfOptions.includeTranslation) {
        const fieldsHtml = editedFields.length > 0
          ? editedFields.map((f) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;width:30%;">${f.label}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;">${f.original}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;">${f.translated}</td>
              </tr>
            `).join('')
          : '';

        sections.push(`
          <div style="page-break-after:always;padding:20px;">
            <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;">
              <h2 style="color:#333;margin:0;">Translation</h2>
              <span style="background:#EEF2FF;color:#4F46E5;padding:2px 10px;border-radius:12px;font-size:12px;">${result.document_type}</span>
              <span style="background:#F0FDF4;color:#16A34A;padding:2px 10px;border-radius:12px;font-size:12px;">${(result.detected_language || '').toUpperCase()}</span>
            </div>
            ${fieldsHtml ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr style="background:#F8FAFC;">
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Field</th>
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Original</th>
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Translation</th>
                  </tr>
                </thead>
                <tbody>${fieldsHtml}</tbody>
              </table>
            ` : ''}
            <div style="background:#F8FAFC;padding:16px;border-radius:8px;">
              <p style="color:#333;line-height:1.7;white-space:pre-wrap;">${result.translated_text}</p>
            </div>
          </div>
        `);
      }

      if (pdfOptions.includeFilledForm && isForm && Object.keys(fillAnswers).length > 0) {
        const filledHtml = editedFields.map((f, i) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;">${f.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;">${fillAnswers[i] || '—'}</td>
          </tr>
        `).join('');

        sections.push(`
          <div style="padding:20px;">
            <h2 style="color:#333;margin-bottom:16px;">Filled Form</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#F8FAFC;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Field</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;">Your Answer</th>
                </tr>
              </thead>
              <tbody>${filledHtml}</tbody>
            </table>
          </div>
        `);
      }

      const watermark = !isPro
        ? '<div style="text-align:center;padding:16px;border-top:1px solid #eee;margin-top:24px;color:#999;font-size:11px;">Translated by Evrywher — evrywher.io</div>'
        : '';

      const fullHtml = `<div style="font-family:system-ui,sans-serif;color:#111;background:#fff;">${sections.join('')}${watermark}</div>`;

      const container = document.createElement('div');
      container.innerHTML = fullHtml;
      document.body.appendChild(container);

      const pdf = await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `evrywher-scan-${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.92 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(container)
        .outputPdf('blob');

      document.body.removeChild(container);

      // Try native share first
      const pdfFile = new File([pdf], `evrywher-scan-${Date.now()}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: 'Translated Document' });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(pdf);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFile.name;
        a.click();
        URL.revokeObjectURL(url);
        toast('PDF downloaded', 'success');
      }
    } catch (err: any) {
      console.error('[PDF export]', err);
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }, [result, imageData, rotation, editedFields, fillAnswers, pdfOptions, isForm, isPro, toast]);

  /* ---------- Share helpers ---------- */

  const handlePrint = () => window.print();

  /* ---------- Reset ---------- */

  const reset = () => {
    setStep(0);
    setImageData(null);
    setImageFile(null);
    setResult(null);
    setEditedFields([]);
    setFillAnswers({});
    setRotation(0);
  };

  /* ---------- Render ---------- */

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => step > 0 && !translating ? setStep(step === 2 && !isForm ? 0 : step - 1) : router.back()} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Document Scanner</h1>
          <p className="text-xs text-slate-500">{STEP_LABELS[step >= totalSteps ? totalSteps - 1 : step]}</p>
        </div>
        {imageData && (
          <button onClick={reset} className="text-xs text-indigo-400 font-medium">New scan</button>
        )}
      </div>

      <StepDots current={step} total={totalSteps} />

      <div className="flex-1 overflow-y-auto px-4 pb-32">

        {/* ═══ STEP 0: CAPTURE ═══ */}
        {step === 0 && !imageData && (
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => cameraRef.current?.click()}
              className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50 flex items-center gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Camera size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">Scan Document</p>
                <p className="text-slate-400 text-sm">Open camera to capture a document</p>
              </div>
              <ChevronRight size={18} className="text-slate-600 ml-auto shrink-0" />
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50 flex items-center gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-14 h-14 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
                <FolderOpen size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">Upload File</p>
                <p className="text-slate-400 text-sm">Choose an image or PDF from your files</p>
              </div>
              <ChevronRight size={18} className="text-slate-600 ml-auto shrink-0" />
            </button>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleCapture} className="hidden" />
          </div>
        )}

        {/* STEP 0: Image preview */}
        {step === 0 && imageData && (
          <div className="mt-2">
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/50">
              <img
                src={imageData}
                alt="Scanned document"
                className="w-full max-h-[55vh] object-contain"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 text-sm text-slate-300 active:bg-slate-700"
              >
                <RotateCw size={16} /> Rotate
              </button>
              <button
                onClick={() => { setImageData(null); setImageFile(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 text-center active:bg-slate-800"
              >
                Retake
              </button>
            </div>
            <button
              onClick={handleTranslate}
              className="w-full mt-3 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base active:bg-indigo-700 transition-colors"
            >
              Translate Document
            </button>
          </div>
        )}

        {/* ═══ STEP 1: AI TRANSLATE ═══ */}
        {step === 1 && (
          <div className="mt-2">
            {translating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex gap-1.5 mb-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-slate-400 text-sm">AI is reading your document...</p>
                <p className="text-slate-500 text-xs mt-1">This may take a few seconds</p>
              </div>
            ) : result ? (
              <div>
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full">{result.document_type}</span>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">{(result.detected_language || '??').toUpperCase()}</span>
                </div>

                {/* Original image (collapsed) */}
                <details className="mb-4">
                  <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 mb-2">Show original scan</summary>
                  <img src={imageData!} alt="Original" className="w-full rounded-xl border border-slate-700/50" style={{ transform: `rotate(${rotation}deg)` }} />
                </details>

                {/* Fields (editable) */}
                {editedFields.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Extracted Fields</h3>
                    {editedFields.map((f, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1">{f.label}</p>
                        <p className="text-xs text-slate-400 mb-1">{f.original}</p>
                        <input
                          type="text"
                          value={f.translated}
                          onChange={(e) => {
                            const updated = [...editedFields];
                            updated[i] = { ...updated[i], translated: e.target.value };
                            setEditedFields(updated);
                          }}
                          className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm text-white border border-slate-600/50 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Full translation */}
                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Full Translation</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.translated_text}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleTranslate}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-300 text-center active:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} /> Retranslate
                  </button>
                  <button
                    onClick={() => setStep(isForm ? 2 : totalSteps - 1)}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm active:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ═══ STEP 2: FILL (forms only) ═══ */}
        {step === 2 && isForm && result && (
          <div className="mt-2">
            <h3 className="text-base font-semibold text-white mb-1">Fill Out This Form</h3>
            <p className="text-xs text-slate-400 mb-4">Type your answers — they'll be ready to copy onto the form</p>

            <div className="space-y-3">
              {editedFields.map((f, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">{f.label}</p>
                  <p className="text-[11px] text-slate-500 mb-2">{f.original}</p>
                  <input
                    type="text"
                    value={fillAnswers[i] || ''}
                    onChange={(e) => setFillAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    placeholder={f.translated}
                    className="w-full bg-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white border border-slate-600/50 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-500"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(totalSteps - 1)}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm active:bg-indigo-700 flex items-center justify-center gap-2"
            >
              Next: Export <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ═══ STEP 3 (or 2 for non-forms): EXPORT ═══ */}
        {step === totalSteps - 1 && result && (
          <div className="mt-2">
            <h3 className="text-base font-semibold text-white mb-4">Export & Share</h3>

            {/* PDF options */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50 mb-4">
              {[
                { key: 'includeScan' as const, label: 'Include original scan' },
                { key: 'includeTranslation' as const, label: 'Include translation' },
                ...(isForm ? [{ key: 'includeFilledForm' as const, label: 'Include filled form' }] : []),
              ].map((opt) => (
                <label key={opt.key} className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
                  <span className="text-sm text-slate-300">{opt.label}</span>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      pdfOptions[opt.key]
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                    onClick={() => setPdfOptions((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
                  >
                    {pdfOptions[opt.key] && <Check size={14} className="text-white" />}
                  </div>
                </label>
              ))}
            </div>

            {!isPro && (
              <p className="text-[11px] text-slate-500 mb-4 text-center">
                Free plan: PDF includes &quot;Translated by Evrywher&quot; footer.{' '}
                <button onClick={() => router.push('/settings')} className="text-indigo-400 underline">Upgrade to Pro</button> for clean PDFs.
              </p>
            )}

            {/* Share buttons */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-4 pb-1">
              {[
                { label: 'Download', icon: Download, action: handleExport },
                { label: 'Print', icon: Printer, action: handlePrint },
                { label: 'Share', icon: Share2, action: handleExport },
                { label: 'Email', icon: Mail, action: () => {
                  handleExport(); // triggers native share on mobile
                }},
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    disabled={exporting}
                    className="flex flex-col items-center gap-1.5 min-w-[64px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 active:bg-slate-700 border border-slate-700/50">
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{btn.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-base active:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={18} /> Export PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
