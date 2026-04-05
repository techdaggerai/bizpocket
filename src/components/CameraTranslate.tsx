'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Step = 'camera' | 'preview' | 'loading' | 'result' | 'fillAssist';

interface TranslationResult {
  extracted_text: string;
  translation: string;
  document_type: string;
  context: string;
  fields: { japanese: string; english: string; instruction: string }[];
  has_text: boolean;
}

interface Props {
  userLanguage: string;
  userName?: string;
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

const LOADING_STEPS = ['Reading text...', 'Translating...', 'Almost done...'];

export default function CameraTranslate({ userLanguage, userName, onClose, onSendToChat }: Props) {
  const [step, setStep] = useState<Step>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_STEPS[0]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fillFieldIdx, setFillFieldIdx] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
        setError('');
      }
    } catch {
      setError('Camera access denied. Please allow camera permission in your browser settings.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (step === 'camera') startCamera();
    return () => { if (step !== 'camera') stopCamera(); };
  }, [step, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Capture from camera
  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep('preview');
  }, [stopCamera]);

  // Pick from gallery
  const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      stopCamera();
      setStep('preview');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  // Retake
  const retake = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setError('');
    setStep('camera');
  }, []);

  // Translate
  const translate = useCallback(async () => {
    if (!capturedImage) return;
    setStep('loading');
    setLoadingMsg(LOADING_STEPS[0]);
    setError('');

    // Cycle loading messages
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_STEPS.length - 1);
      setLoadingMsg(LOADING_STEPS[msgIdx]);
    }, 1500);

    try {
      const res = await fetch('/api/ai/camera-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, userLanguage, userName }),
      });

      clearInterval(msgTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Translation failed');
      }

      const data: TranslationResult = await res.json();

      if (!data.has_text) {
        setError('No text detected. Try pointing the camera directly at the text and make sure it\'s well-lit.');
        setStep('preview');
        return;
      }

      setResult(data);
      setStep('result');
    } catch (err) {
      clearInterval(msgTimer);
      setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
      setStep('preview');
    }
  }, [capturedImage, userLanguage]);

  // Copy
  const copyTranslation = useCallback(() => {
    if (!result) return;
    const text = `📄 ${result.document_type}\n\n${result.translation}${result.fields.length > 0 ? '\n\n--- Fields ---\n' + result.fields.map(f => `${f.japanese} → ${f.english}: ${f.instruction}`).join('\n') : ''}`;
    navigator.clipboard.writeText(text);
  }, [result]);

  // ─── Camera Step ───
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col">
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={onClose} className="text-white text-sm font-medium px-3 py-1.5">Cancel</button>
          <p className="text-white/80 text-xs font-medium">Point camera at text</p>
          <button
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            className="p-2 text-white/70 hover:text-white"
            aria-label="Flip camera"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>

        {/* Camera view */}
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          {/* Viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[85%] max-w-[340px] aspect-[4/3] border-2 border-white/40 rounded-xl">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
          </div>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
              <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
                <p className="text-sm text-[#DC2626] font-medium mb-3">{error}</p>
                <button onClick={onClose} className="text-sm text-[#4F46E5] font-medium">Go Back</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 flex items-center justify-around px-6 py-5 bg-gradient-to-t from-black/80 to-transparent">
          <button onClick={onClose} className="text-white/60 text-xs">Cancel</button>
          <button
            onClick={capture}
            disabled={!cameraReady}
            className="h-[68px] w-[68px] rounded-full border-[3px] border-white flex items-center justify-center disabled:opacity-40"
          >
            <div className="h-[56px] w-[56px] rounded-full bg-white" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-white/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ─── Preview Step ───
  if (step === 'preview') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          {capturedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Captured" className="max-w-full max-h-full rounded-xl object-contain" />
          )}
        </div>
        {error && (
          <div className="px-4 pb-2">
            <div className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 px-4 py-3 text-sm text-[#DC2626]">{error}</div>
          </div>
        )}
        <div className="flex gap-3 px-6 py-5 bg-gradient-to-t from-black/80 to-transparent">
          <button onClick={retake} className="flex-1 rounded-xl bg-white/10 backdrop-blur py-3.5 text-sm font-semibold text-white border border-white/20">
            Retake
          </button>
          <button onClick={translate} className="flex-1 rounded-xl bg-[#4F46E5] py-3.5 text-sm font-semibold text-white">
            Translate
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading Step ───
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Processing" className="absolute inset-0 w-full h-full object-cover opacity-30 animate-pulse" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-3 border-white/20 border-t-[#4F46E5] animate-spin" />
          <p className="text-white text-sm font-medium">{loadingMsg}</p>
        </div>
      </div>
    );
  }

  // ─── Fill Assist Step ───
  if (step === 'fillAssist' && result?.fields && result.fields.length > 0) {
    const field = result.fields[fillFieldIdx];
    const total = result.fields.length;
    const isLast = fillFieldIdx === total - 1;

    return (
      <div className="fixed inset-0 z-[70] bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-gray-800 shrink-0">
          <button onClick={() => setStep('result')} className="text-sm text-[#4F46E5] font-medium">← Back</button>
          <p className="text-sm font-bold text-[#0A0A0A] dark:text-white">📝 Field {fillFieldIdx + 1} of {total}</p>
          <button onClick={() => setStep('result')} className="text-sm text-[#9CA3AF]">Done</button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#F3F4F6] dark:bg-gray-800">
          <div className="h-full bg-[#4F46E5] transition-all duration-300" style={{ width: `${((fillFieldIdx + 1) / total) * 100}%` }} />
        </div>

        {/* Field content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Japanese label */}
          <div className="bg-[#FFFBEB] dark:bg-amber-950/20 rounded-xl p-4 border border-[#FDE68A]/40 dark:border-amber-800/30">
            <p className="text-[11px] font-semibold text-[#92400E] dark:text-[#FDE68A] uppercase tracking-wider mb-1">Japanese Label</p>
            <p className="text-[18px] font-medium text-[#0A0A0A] dark:text-white">{field.japanese}</p>
          </div>

          {/* English meaning */}
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Meaning</p>
            <p className="text-[15px] text-[#374151] dark:text-gray-300 leading-relaxed">{field.english}</p>
          </div>

          {/* What to write */}
          <div className="bg-[#EEF2FF] dark:bg-indigo-950/20 rounded-xl p-4 border border-[#C7D2FE]/40 dark:border-indigo-800/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">💡</span>
              <p className="text-[11px] font-semibold text-[#4338CA] dark:text-[#A5B4FC] uppercase tracking-wider">What to Write</p>
            </div>
            <p className="text-[16px] font-medium text-[#0A0A0A] dark:text-white leading-relaxed">{field.instruction}</p>
          </div>

          {/* Copy button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(field.instruction);
              setCopiedIdx(fillFieldIdx);
              setTimeout(() => setCopiedIdx(null), 2000);
            }}
            className={`w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              copiedIdx === fillFieldIdx
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#F3F4F6] dark:bg-gray-800 text-[#374151] dark:text-gray-300 active:bg-[#E5E7EB]'
            }`}
          >
            {copiedIdx === fillFieldIdx ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy &quot;{field.instruction.slice(0, 30)}{field.instruction.length > 30 ? '…' : ''}&quot;</>
            )}
          </button>

          {/* Write instruction */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#F9FAFB] dark:bg-gray-800 border border-[#E5E5E5]/50 dark:border-gray-700">
            <span className="text-sm">✏️</span>
            <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Write this in the field marked <span className="font-bold text-[#4F46E5]">#{fillFieldIdx + 1}</span> on the form</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="shrink-0 border-t border-[#E5E5E5] dark:border-gray-800 px-4 py-3 flex gap-2">
          <button
            onClick={() => setFillFieldIdx(i => Math.max(0, i - 1))}
            disabled={fillFieldIdx === 0}
            className="flex-1 rounded-xl border border-[#E5E5E5] dark:border-gray-700 py-3 text-sm font-semibold text-[#374151] dark:text-gray-300 disabled:opacity-30"
          >
            ← Previous
          </button>
          {isLast ? (
            <button
              onClick={() => setStep('result')}
              className="flex-1 rounded-xl bg-[#22C55E] py-3 text-sm font-semibold text-white"
            >
              ✓ All Done
            </button>
          ) : (
            <button
              onClick={() => setFillFieldIdx(i => i + 1)}
              className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white"
            >
              Next Field →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Result Step ───
  return (
    <div className="fixed inset-0 z-[70] bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-gray-800 shrink-0">
        <button onClick={onClose} className="text-sm text-[#4F46E5] font-medium">Done</button>
        <p className="text-sm font-bold text-[#0A0A0A] dark:text-white">
          {result?.document_type ? `📄 ${result.document_type}` : 'Translation'}
        </p>
        <button
          onClick={copyTranslation}
          className="text-sm text-[#4F46E5] font-medium"
        >
          Copy
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Thumbnail */}
        {capturedImage && (
          <div className="px-4 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Source" className="w-full max-h-[200px] object-cover rounded-xl" />
          </div>
        )}

        {result && (
          <div className="p-4 space-y-4">
            {/* Translation */}
            <div>
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Translation</h3>
              <div className="bg-[#F3F4F6] dark:bg-gray-800 rounded-xl p-4">
                <p className="text-[15px] text-[#0A0A0A] dark:text-white leading-relaxed whitespace-pre-wrap">{result.translation}</p>
              </div>
            </div>

            {/* Original text (collapsible) */}
            <div>
              <button onClick={() => setShowOriginal(!showOriginal)} className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Original Text
                <svg className={`h-3.5 w-3.5 transition-transform ${showOriginal ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {showOriginal && (
                <div className="mt-2 bg-[#FFFBEB] dark:bg-gray-800 rounded-xl p-4 border border-[#FDE68A]/50 dark:border-gray-700">
                  <p className="text-[14px] text-[#92400E] dark:text-[#FDE68A] leading-relaxed whitespace-pre-wrap">{result.extracted_text}</p>
                </div>
              )}
            </div>

            {/* Field Guide */}
            {result.fields && result.fields.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Field Guide</h3>
                <div className="space-y-2">
                  {result.fields.map((f, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-[#E5E5E5] dark:border-gray-700 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-white">{f.english}</span>
                        <span className="text-[11px] text-[#9CA3AF] shrink-0">{f.japanese}</span>
                      </div>
                      <p className="text-[12px] text-[#4F46E5] leading-relaxed">{f.instruction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context */}
            {result.context && (
              <div>
                <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Context</h3>
                <div className="bg-[#EEF2FF] dark:bg-gray-800 rounded-xl p-4 border border-[#C7D2FE]/50 dark:border-gray-700">
                  <p className="text-[13px] text-[#4338CA] dark:text-[#A5B4FC] leading-relaxed">{result.context}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-[#E5E5E5] dark:border-gray-800 px-4 py-3 space-y-2">
        {/* Show fill assist button when form fields detected */}
        {result && result.fields && result.fields.length > 0 && (
          <button
            onClick={() => { setFillFieldIdx(0); setStep('fillAssist'); }}
            className="w-full rounded-xl bg-[#F59E0B] py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 active:bg-[#D97706]"
          >
            <span>📝</span> Help Me Fill This Out
          </button>
        )}
        <div className="flex gap-2">
          {onSendToChat && result && (
            <button
              onClick={() => onSendToChat(`📄 ${result.document_type}\n\n${result.translation}`)}
              className="flex-1 rounded-xl border border-[#4F46E5] py-2.5 text-sm font-semibold text-[#4F46E5]"
            >
              Send to Chat
            </button>
          )}
          <button onClick={retake} className="flex-1 rounded-xl bg-[#4F46E5] py-2.5 text-sm font-semibold text-white">
            Scan Another
          </button>
        </div>
      </div>
    </div>
  );
}
