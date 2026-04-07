'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, Volume2, ArrowUpDown, RotateCcw, Trash2 } from 'lucide-react';
import { LANGUAGES } from '@/lib/translate';

// BCP 47 codes for Web Speech API
const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
  es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ar: 'ar-SA',
  hi: 'hi-IN', ur: 'ur-PK', bn: 'bn-BD', th: 'th-TH',
  vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', nl: 'nl-NL',
  fil: 'fil-PH', fa: 'fa-IR', ps: 'ps-AF', ne: 'ne-NP',
  si: 'si-LK',
};

type RecordingState = 'idle' | 'recording' | 'processing';

interface HistoryItem {
  id: string;
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: number;
}

const LANG_KEYS = Object.keys(LANGUAGES);
const HISTORY_KEY = 'evryai-voice-history';

export default function VoiceTranslatePage() {
  const router = useRouter();

  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('ja');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fromLangRef = useRef(fromLang);
  const toLangRef = useRef(toLang);
  fromLangRef.current = fromLang;
  toLangRef.current = toLang;

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  // ─── Translation ───
  const translate = useCallback(async (text: string) => {
    setRecordingState('processing');
    setError('');

    try {
      const res = await fetch('/api/ai/voice-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          fromLang: fromLangRef.current,
          toLang: toLangRef.current,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Translation failed');
      }

      const data = await res.json();
      setTranslatedText(data.translated_text);
      setRecordingState('idle');

      // Auto-speak the translation
      speakText(data.translated_text, toLangRef.current);

      // Save to history
      const item: HistoryItem = {
        id: Date.now().toString(),
        originalText: text,
        translatedText: data.translated_text,
        fromLang: fromLangRef.current,
        toLang: toLangRef.current,
        timestamp: Date.now(),
      };
      setHistory(prev => {
        const updated = [item, ...prev].slice(0, 5);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setRecordingState('idle');
    }
  }, [speakText]);

  // ─── TTS ───
  const speakText = useCallback((text: string, lang: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG_MAP[lang] || lang;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, []);

  // ─── Speech Recognition ───
  const startRecording = useCallback(() => {
    setError('');
    setInterimText('');
    setFinalText('');
    setTranslatedText('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[fromLangRef.current] || fromLangRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setFinalText(final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      setRecordingState(prev => {
        // If still recording, it ended naturally — get final text and translate
        if (prev === 'recording') {
          // Use a small delay to ensure finalText state is updated
          setTimeout(() => {
            const textEl = document.getElementById('voice-final-text');
            const text = textEl?.dataset.value || '';
            if (text.trim()) {
              translate(text.trim());
            } else {
              setError('No speech detected. Please try again.');
              setRecordingState('idle');
            }
          }, 100);
          return 'processing';
        }
        return prev;
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Tap the mic and speak clearly.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setRecordingState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecordingState('recording');
  }, [translate]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle') {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // ─── Swap Languages ───
  const swapLanguages = useCallback(() => {
    setFromLang(toLang);
    setToLang(fromLang);
    setFinalText('');
    setTranslatedText('');
    setInterimText('');
    setError('');
  }, [fromLang, toLang]);

  // ─── Replay History ───
  const replayItem = useCallback((item: HistoryItem) => {
    setFromLang(item.fromLang);
    setToLang(item.toLang);
    setFinalText(item.originalText);
    setTranslatedText(item.translatedText);
    speakText(item.translatedText, item.toLang);
  }, [speakText]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const displayText = finalText || interimText;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
        <div className="pt-3 pb-3">
          <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
        </div>
        <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Voice Translate</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {/* Source language card */}
        <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 mb-3">
          <button
            onClick={() => setShowFromPicker(!showFromPicker)}
            className="bg-indigo-600/20 text-indigo-400 rounded-full px-3 py-1 text-xs font-medium active:bg-indigo-600/30 mb-3"
          >
            {LANGUAGES[fromLang]?.flag} {LANGUAGES[fromLang]?.name || fromLang} ▼
          </button>

          {showFromPicker && (
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-32 overflow-y-auto">
              {LANG_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => { setFromLang(key); setShowFromPicker(false); }}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    key === fromLang
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 active:bg-slate-700'
                  }`}
                >
                  {LANGUAGES[key]?.flag} {LANGUAGES[key]?.name}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-[80px] flex items-start">
            {displayText ? (
              <p className="text-slate-300 text-xl leading-relaxed whitespace-pre-wrap">
                {displayText}
                {recordingState === 'recording' && interimText && (
                  <span className="text-slate-500">|</span>
                )}
              </p>
            ) : (
              <p className="text-slate-600 text-lg">
                {recordingState === 'recording' ? 'Listening...' : 'Tap the mic and speak'}
              </p>
            )}
          </div>
        </div>

        {/* Hidden element to pass finalText to onend callback */}
        <div id="voice-final-text" data-value={finalText} className="hidden" />

        {/* Swap button */}
        <div className="flex justify-center -my-1.5 relative z-10">
          <button
            onClick={swapLanguages}
            className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center active:bg-slate-600 shadow-lg"
          >
            <ArrowUpDown size={18} className="text-white" />
          </button>
        </div>

        {/* Translation card */}
        <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 mt-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowToPicker(!showToPicker)}
              className="bg-indigo-600/20 text-indigo-400 rounded-full px-3 py-1 text-xs font-medium active:bg-indigo-600/30"
            >
              {LANGUAGES[toLang]?.flag} {LANGUAGES[toLang]?.name || toLang} ▼
            </button>

            {translatedText && (
              <button
                onClick={() => speakText(translatedText, toLang)}
                className="p-2 active:opacity-60"
              >
                <Volume2 size={20} className={isSpeaking ? 'text-indigo-400 animate-pulse' : 'text-slate-400'} />
              </button>
            )}
          </div>

          {showToPicker && (
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-32 overflow-y-auto">
              {LANG_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => { setToLang(key); setShowToPicker(false); }}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    key === toLang
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 active:bg-slate-700'
                  }`}
                >
                  {LANGUAGES[key]?.flag} {LANGUAGES[key]?.name}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-[80px] flex items-start">
            {translatedText ? (
              <p className="text-white text-xl font-semibold leading-relaxed whitespace-pre-wrap">
                {translatedText}
              </p>
            ) : recordingState === 'processing' ? (
              <p className="text-indigo-400 text-lg">Translating...</p>
            ) : (
              <p className="text-slate-600 text-lg">Translation will appear here</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Mic button */}
        <div className="flex flex-col items-center mt-8 mb-6">
          <button
            onClick={toggleRecording}
            disabled={recordingState === 'processing'}
            className="relative"
          >
            {/* Expanding ring animation when recording */}
            {recordingState === 'recording' && (
              <>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute -inset-2 rounded-full border-2 border-red-500/40 animate-pulse" />
              </>
            )}

            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              recordingState === 'recording'
                ? 'bg-red-500 shadow-lg shadow-red-500/30'
                : recordingState === 'processing'
                  ? 'bg-indigo-600'
                  : 'bg-slate-800 border-2 border-indigo-500'
            }`}>
              {recordingState === 'processing' ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mic size={32} className="text-white" />
              )}
            </div>
          </button>

          <p className={`mt-3 text-xs font-medium ${
            recordingState === 'recording' ? 'text-red-400' :
            recordingState === 'processing' ? 'text-indigo-400' : 'text-slate-500'
          }`}>
            {recordingState === 'recording' ? 'Listening...' :
             recordingState === 'processing' ? 'Translating...' : 'Tap to speak'}
          </p>
        </div>

        {/* Recent translations */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent</h3>
              <button onClick={clearHistory} className="p-1 text-slate-600 active:text-slate-400">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() => replayItem(item)}
                  className="w-full text-left bg-slate-800/40 rounded-xl px-4 py-3 active:bg-slate-800/60 border border-slate-700/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500">
                      {LANGUAGES[item.fromLang]?.flag} → {LANGUAGES[item.toLang]?.flag}
                    </span>
                    <RotateCcw size={10} className="text-slate-600 ml-auto" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.originalText}</p>
                  <p className="text-sm text-white truncate">{item.translatedText}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
