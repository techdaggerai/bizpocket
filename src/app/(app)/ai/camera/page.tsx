'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, ZapOff, Image as ImageIcon, Copy, Volume2, Share2, Camera, RotateCcw, Bookmark, BookmarkCheck } from 'lucide-react';
import { LANGUAGES } from '@/lib/translate';

type Screen = 'camera' | 'processing' | 'result';

interface TranslationResult {
  detected_language: string;
  original_text: string;
  translated_text: string;
  confidence: string;
}

interface HistoryItem {
  id: string;
  image: string;
  result: TranslationResult;
  targetLanguage: string;
  timestamp: number;
}

const LANG_KEYS = ['auto', ...Object.keys(LANGUAGES)];

export default function CameraTranslatePage() {
  const router = useRouter();

  // Camera state
  const [screen, setScreen] = useState<Screen>('camera');
  const [fromLang, setFromLang] = useState('auto');
  const [toLang, setToLang] = useState('en');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Result state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fromLangRef = useRef(fromLang);
  const toLangRef = useRef(toLang);
  fromLangRef.current = fromLang;
  toLangRef.current = toLang;

  // ─── Camera Controls ───
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setCameraError('Camera access denied. Use the gallery button to upload an image instead.');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (screen === 'camera') startCamera();
    return () => { if (screen !== 'camera') stopCamera(); };
  }, [screen, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Torch ───
  const toggleTorch = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const newVal = !torchOn;
    // @ts-expect-error — torch is a valid advanced constraint
    track.applyConstraints({ advanced: [{ torch: newVal }] }).catch(() => {});
    setTorchOn(newVal);
  }, [torchOn]);

  // ─── Process Image ───
  const processImage = useCallback(async (imageData: string) => {
    setScreen('processing');
    setError('');
    setResult(null);
    setSaved(false);

    try {
      const targetLangName = LANGUAGES[toLangRef.current]?.name || 'English';
      const res = await fetch('/api/ai/camera-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          targetLanguage: targetLangName,
          sourceLang: fromLangRef.current === 'auto' ? undefined : fromLangRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Translation failed');
      }

      const data: TranslationResult = await res.json();
      if (!data.original_text || data.original_text.trim() === '') {
        throw new Error('No text detected in image. Try pointing the camera directly at the text.');
      }
      setResult(data);
      setScreen('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setScreen('result');
    }
  }, []);

  // ─── Capture ───
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
    processImage(dataUrl);
  }, [stopCamera, processImage]);

  // ─── Gallery ───
  const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      stopCamera();
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera, processImage]);

  // ─── Actions ───
  const retake = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setError('');
    setSaved(false);
    setScreen('camera');
  }, []);

  const copyTranslation = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.translated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const listenTTS = useCallback(() => {
    if (!result || speaking) return;
    const utterance = new SpeechSynthesisUtterance(result.translated_text);
    utterance.lang = toLang === 'auto' ? 'en' : toLang;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }, [result, toLang, speaking]);

  const shareResult = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.share({
        title: 'Camera Translation',
        text: `Original (${result.detected_language}):\n${result.original_text}\n\nTranslation:\n${result.translated_text}`,
      });
    } catch {
      // user cancelled or share not supported — fall back to copy
      copyTranslation();
    }
  }, [result, copyTranslation]);

  const toggleSave = useCallback(() => {
    if (!result || !capturedImage) return;
    const key = 'evryai-camera-history';
    const existing: HistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');

    if (saved) {
      // Remove most recent matching item
      const idx = existing.findIndex(h => h.result.original_text === result.original_text);
      if (idx !== -1) existing.splice(idx, 1);
      localStorage.setItem(key, JSON.stringify(existing));
      setSaved(false);
    } else {
      const item: HistoryItem = {
        id: Date.now().toString(),
        image: capturedImage,
        result,
        targetLanguage: toLang,
        timestamp: Date.now(),
      };
      existing.unshift(item);
      // Keep last 50
      if (existing.length > 50) existing.length = 50;
      localStorage.setItem(key, JSON.stringify(existing));
      setSaved(true);
    }
  }, [result, capturedImage, saved, toLang]);

  // ─── Language Cycling ───
  const cycleFromLang = () => {
    const idx = LANG_KEYS.indexOf(fromLang);
    setFromLang(LANG_KEYS[(idx + 1) % LANG_KEYS.length]);
  };

  const cycleToLang = () => {
    const keys = Object.keys(LANGUAGES);
    const idx = keys.indexOf(toLang);
    setToLang(keys[(idx + 1) % keys.length]);
  };

  const getFromLabel = () => {
    if (fromLang === 'auto') return 'Auto-detect';
    return LANGUAGES[fromLang]?.name || fromLang;
  };

  // ═══════════════════════════════════════
  //  SCREEN 1: CAMERA VIEW
  // ═══════════════════════════════════════
  if (screen === 'camera') {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/70 to-transparent">
          <div className="pt-3 pb-2">
            <button onClick={() => router.push('/ai')} className="p-2 -ml-2 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold pt-3 pb-2">Camera Translate</h1>
          <div className="pt-3 pb-2">
            <button onClick={toggleTorch} className="p-2 -mr-2 text-white active:opacity-60">
              {torchOn ? <Zap size={20} className="text-yellow-400" /> : <ZapOff size={20} className="text-white/70" />}
            </button>
          </div>
        </div>

        {/* Camera feed */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Hint overlay */}
          {cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-slate-400 text-sm font-medium bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                Point at any text
              </p>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
              <div className="bg-slate-800 rounded-2xl p-6 text-center max-w-sm">
                <Camera size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-300 mb-4">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white active:bg-indigo-700"
                >
                  Upload Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 pb-[env(safe-area-inset-bottom)]">
          {/* Language selector row */}
          <div className="flex items-center justify-center gap-3 py-3">
            <button
              onClick={cycleFromLang}
              className="bg-indigo-600/20 text-indigo-400 rounded-full px-3 py-1 text-xs font-medium active:bg-indigo-600/30 min-w-[90px] text-center"
            >
              {getFromLabel()} ▼
            </button>
            <span className="text-white/50 text-xs">→</span>
            <button
              onClick={cycleToLang}
              className="bg-indigo-600/20 text-indigo-400 rounded-full px-3 py-1 text-xs font-medium active:bg-indigo-600/30 min-w-[90px] text-center"
            >
              {LANGUAGES[toLang]?.name || toLang} ▼
            </button>
          </div>

          {/* Capture row */}
          <div className="flex items-center justify-around pb-4 pt-1">
            {/* Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-white/60 active:text-white"
            >
              <ImageIcon size={24} />
            </button>

            {/* Capture button */}
            <button
              onClick={capture}
              disabled={!cameraReady && !cameraError}
              className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center active:bg-indigo-700 disabled:opacity-40 shadow-lg shadow-indigo-600/30"
            >
              <Camera size={28} className="text-white" />
            </button>

            {/* Flip camera */}
            <button
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              className="p-3 text-white/60 active:text-white"
            >
              <RotateCcw size={22} />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  PROCESSING STATE
  // ═══════════════════════════════════════
  if (screen === 'processing') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center">
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Processing" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Typing indicator style loader */}
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur rounded-2xl px-6 py-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                  style={{
                    animation: 'bounce 1.4s infinite ease-in-out both',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-white text-sm font-medium ml-2">Translating...</span>
          </div>
          <button onClick={retake} className="text-slate-400 text-sm active:text-white">Cancel</button>
        </div>
        <style jsx>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  SCREEN 2: RESULTS
  // ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
        <div className="pt-3 pb-3">
          <button onClick={retake} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
        </div>
        <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Translation Result</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {/* Captured image */}
        {capturedImage && (
          <div className="relative" style={{ height: '40vh', minHeight: '200px', maxHeight: '320px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl bg-red-950/30 border border-red-800/30 px-4 py-4 text-center">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button onClick={retake} className="text-sm text-indigo-400 font-semibold active:opacity-60">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Translation card */}
        {result && (
          <div className="px-4 -mt-4 relative z-10">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 space-y-4">
              {/* Detected language badge */}
              <div className="flex items-center gap-2">
                <span className="bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full px-3 py-1">
                  {result.detected_language}
                </span>
                {result.confidence && (
                  <span className="text-slate-500 text-xs">
                    {result.confidence} confidence
                  </span>
                )}
              </div>

              {/* Original text */}
              <div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.original_text}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700" />

              {/* Translated text */}
              <div>
                <p className="text-white text-lg font-semibold leading-relaxed whitespace-pre-wrap">
                  {result.translated_text}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-around mt-4 bg-slate-800/60 backdrop-blur-sm rounded-2xl py-3">
              <button onClick={copyTranslation} className="flex flex-col items-center gap-1 px-4 py-2 active:opacity-60">
                <Copy size={20} className={copied ? 'text-green-400' : 'text-slate-400'} />
                <span className={`text-[10px] font-medium ${copied ? 'text-green-400' : 'text-slate-400'}`}>
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
              <button onClick={listenTTS} className="flex flex-col items-center gap-1 px-4 py-2 active:opacity-60">
                <Volume2 size={20} className={speaking ? 'text-indigo-400 animate-pulse' : 'text-slate-400'} />
                <span className={`text-[10px] font-medium ${speaking ? 'text-indigo-400' : 'text-slate-400'}`}>Listen</span>
              </button>
              <button onClick={shareResult} className="flex flex-col items-center gap-1 px-4 py-2 active:opacity-60">
                <Share2 size={20} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Share</span>
              </button>
              <button onClick={retake} className="flex flex-col items-center gap-1 px-4 py-2 active:opacity-60">
                <Camera size={20} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Retake</span>
              </button>
            </div>

            {/* Save to history toggle */}
            <button
              onClick={toggleSave}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800/40 active:bg-slate-800/60"
            >
              {saved ? (
                <BookmarkCheck size={18} className="text-indigo-400" />
              ) : (
                <Bookmark size={18} className="text-slate-500" />
              )}
              <span className={`text-sm font-medium ${saved ? 'text-indigo-400' : 'text-slate-500'}`}>
                {saved ? 'Saved to history' : 'Save to history'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
