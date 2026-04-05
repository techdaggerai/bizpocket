'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react';

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇦🇪' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

interface Props {
  userLanguage: string;
  contactLanguage: string;
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

type Phase = 'idle' | 'recording' | 'processing' | 'result';

export default function VoiceTranslator({ userLanguage, contactLanguage, onClose, onSendToChat }: Props) {
  const [fromLang, setFromLang] = useState(userLanguage || 'en');
  const [toLang, setToLang] = useState(contactLanguage || 'ja');
  const [phase, setPhase] = useState<Phase>('idle');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup audio URL on unmount
  useEffect(() => () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  const swap = useCallback(() => {
    setFromLang(toLang);
    setToLang(fromLang);
    setOriginalText('');
    setTranslatedText('');
    setPhase('idle');
    setError('');
  }, [fromLang, toLang]);

  const startRecording = useCallback(() => {
    setError('');
    setOriginalText('');
    setTranslatedText('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = fromLang === 'zh' ? 'zh-CN' : fromLang === 'pt' ? 'pt-BR' : fromLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setPhase('recording');

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setOriginalText(transcript);
    };

    recognition.onend = () => {
      // If we have text, proceed to translate
      setPhase(prev => prev === 'recording' ? 'processing' : prev);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setPhase('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [fromLang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // When phase changes to 'processing' and we have text, translate
  useEffect(() => {
    if (phase !== 'processing' || !originalText.trim()) {
      if (phase === 'processing' && !originalText.trim()) {
        setError('No speech detected. Please try again.');
        setPhase('idle');
      }
      return;
    }

    let cancelled = false;

    async function translate() {
      try {
        const res = await fetch('/api/ai/voice-live-translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: originalText, fromLang, toLang }),
        });

        if (cancelled) return;

        if (!res.ok) throw new Error('Translation failed');
        const data = await res.json();

        setTranslatedText(data.translatedText || '');
        setPhase('result');

        // Auto-play audio if available
        if (data.audioBase64) {
          const blob = new Blob(
            [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
            { type: 'audio/mpeg' }
          );
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setError('Translation failed. Please try again.');
          setPhase('idle');
        }
      }
    }

    translate();
    return () => { cancelled = true; };
  }, [phase, originalText, fromLang, toLang]);

  const playAgain = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const fromInfo = LANGUAGES.find(l => l.code === fromLang) || LANGUAGES[0];
  const toInfo = LANGUAGES.find(l => l.code === toLang) || LANGUAGES[1];

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-sm text-indigo-400 font-medium">Close</button>
        <p className="text-sm font-bold text-white">Voice Translator</p>
        <div className="w-10" />
      </div>

      {/* Language selector */}
      <div className="flex items-center justify-center gap-4 py-5 shrink-0">
        <div className="relative">
          <button onClick={() => setShowFromPicker(!showFromPicker)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-[13px] font-semibold text-[#818CF8]">
            <span className="text-base">{fromInfo.flag}</span> {fromInfo.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {showFromPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFromPicker(false)} />
              <div className="absolute top-full mt-1 left-0 z-50 w-44 max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-lg py-1">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setFromLang(l.code); setShowFromPicker(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-700 ${fromLang === l.code ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}>
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={swap} className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-[#9CA3AF] hover:text-indigo-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
        </button>

        <div className="relative">
          <button onClick={() => setShowToPicker(!showToPicker)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-[13px] font-semibold text-[#FDE68A]">
            <span className="text-base">{toInfo.flag}</span> {toInfo.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {showToPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowToPicker(false)} />
              <div className="absolute top-full mt-1 right-0 z-50 w-44 max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-lg py-1">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setToLang(l.code); setShowToPicker(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-700 ${toLang === l.code ? 'text-[#F59E0B] font-semibold' : 'text-slate-300'}`}>
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-5 space-y-4">
        {/* Original text */}
        {originalText && (
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{fromInfo.flag} {fromInfo.label}</p>
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">{originalText}</p>
            </div>
          </div>
        )}

        {/* Arrow */}
        {originalText && (
          <div className="flex justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
        )}

        {/* Translated text */}
        {translatedText && (
          <div>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{toInfo.flag} {toInfo.label}</p>
            <div className="bg-indigo-950/30 rounded-xl p-4 border border-[#C7D2FE]/30 border-indigo-800/30">
              <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">{translatedText}</p>
            </div>
          </div>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-10 w-10 rounded-full border-2 border-[#4F46E5]/20 border-t-[#4F46E5] animate-spin" />
            <p className="text-sm text-[#9CA3AF]">Translating...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-950/30 border border-[#FECACA]/50 px-4 py-3">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        {/* Idle hint */}
        {phase === 'idle' && !originalText && !error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
            </div>
            <p className="text-sm font-medium text-slate-300">Hold the button and speak</p>
            <p className="text-xs text-[#9CA3AF]">Your words will be translated and spoken aloud</p>
          </div>
        )}
      </div>

      {/* Result actions */}
      {phase === 'result' && translatedText && (
        <div className="px-5 py-3 flex gap-2 shrink-0">
          <button onClick={playAgain} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white active:bg-[#4338CA]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            Play Again
          </button>
          {onSendToChat && (
            <button
              onClick={() => { onSendToChat(translatedText); onClose(); }}
              className="flex-1 rounded-xl border border-indigo-400 py-3 text-sm font-semibold text-indigo-400 active:bg-[#4F46E5]/5"
            >
              Send to Chat
            </button>
          )}
        </div>
      )}

      {/* Mic button */}
      <div className="px-5 pb-6 pt-2 shrink-0 flex flex-col items-center gap-3">
        {phase === 'recording' ? (
          <button
            onClick={stopRecording}
            className="h-[72px] w-[72px] rounded-full bg-[#DC2626] flex items-center justify-center shadow-lg animate-pulse"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={phase === 'processing'}
            className="h-[72px] w-[72px] rounded-full bg-[#4F46E5] flex items-center justify-center shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
          </button>
        )}
        <p className="text-[11px] text-[#9CA3AF]">
          {phase === 'recording' ? 'Listening... Tap to stop' : phase === 'result' ? 'Tap to translate again' : 'Tap to speak'}
        </p>
      </div>
    </div>
  );
}
