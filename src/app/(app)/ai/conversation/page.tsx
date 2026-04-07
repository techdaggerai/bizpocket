'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, Volume2, ArrowUpDown, Settings, X, Download } from 'lucide-react';
import { LANGUAGES } from '@/lib/translate';

// BCP 47 codes for Web Speech API
const SPEECH_CODES: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
  es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ar: 'ar-SA',
  hi: 'hi-IN', ur: 'ur-PK', bn: 'bn-BD', th: 'th-TH',
  vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', nl: 'nl-NL',
  fil: 'fil-PH', fa: 'fa-IR', ps: 'ps-AF', ne: 'ne-NP',
  si: 'si-LK',
};

type Mode = 'setup' | 'conversation';
type ActiveSide = 'person1' | 'person2';
type Status = 'ready' | 'listening' | 'translating';

interface Exchange {
  id: string;
  speaker: ActiveSide;
  original: string;
  translated: string;
  fromLang: string;
  toLang: string;
}

const LANG_KEYS = Object.keys(LANGUAGES);

// Simple CJK detection for auto-detect
function detectLangFromText(text: string, lang1: string, lang2: string): ActiveSide | null {
  const cjkRegex = /[\u3000-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff]/;
  const arabicRegex = /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;
  const devanagariRegex = /[\u0900-\u097f]/;
  const hangulRegex = /[\uac00-\ud7af\u1100-\u11ff]/;

  const hasCJK = cjkRegex.test(text);
  const hasArabic = arabicRegex.test(text);
  const hasDevanagari = devanagariRegex.test(text);
  const hasHangul = hangulRegex.test(text);

  const cjkLangs = ['ja', 'zh'];
  const arabicLangs = ['ar', 'ur', 'fa', 'ps'];
  const devanagariLangs = ['hi', 'ne'];

  if (hasCJK) {
    if (cjkLangs.includes(lang1)) return 'person1';
    if (cjkLangs.includes(lang2)) return 'person2';
  }
  if (hasHangul) {
    if (lang1 === 'ko') return 'person1';
    if (lang2 === 'ko') return 'person2';
  }
  if (hasArabic) {
    if (arabicLangs.includes(lang1)) return 'person1';
    if (arabicLangs.includes(lang2)) return 'person2';
  }
  if (hasDevanagari) {
    if (devanagariLangs.includes(lang1)) return 'person1';
    if (devanagariLangs.includes(lang2)) return 'person2';
  }

  // Latin text — assign to whichever side uses Latin-script language
  const latinLangs = ['en', 'es', 'fr', 'pt', 'tr', 'nl', 'vi', 'id', 'fil'];
  if (!hasCJK && !hasArabic && !hasDevanagari && !hasHangul) {
    if (latinLangs.includes(lang1)) return 'person1';
    if (latinLangs.includes(lang2)) return 'person2';
  }

  return null;
}

export default function LiveConversationPage() {
  const router = useRouter();

  // Setup state
  const [mode, setMode] = useState<Mode>('setup');
  const [person1Lang, setPerson1Lang] = useState('en');
  const [person2Lang, setPerson2Lang] = useState('ja');

  // Conversation state
  const [activeSide, setActiveSide] = useState<ActiveSide>('person1');
  const [status, setStatus] = useState<Status>('ready');
  const [isListening, setIsListening] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [showSettings, setShowSettings] = useState(false);

  // Text state
  const [person1Text, setPerson1Text] = useState('');
  const [person2Text, setPerson2Text] = useState('');
  const [person1Translation, setPerson1Translation] = useState('');
  const [person2Translation, setPerson2Translation] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // History
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const person1LangRef = useRef(person1Lang);
  const person2LangRef = useRef(person2Lang);
  const activeSideRef = useRef(activeSide);
  const autoDetectRef = useRef(autoDetect);
  const autoSpeakRef = useRef(autoSpeak);
  const speechRateRef = useRef(speechRate);
  person1LangRef.current = person1Lang;
  person2LangRef.current = person2Lang;
  activeSideRef.current = activeSide;
  autoDetectRef.current = autoDetect;
  autoSpeakRef.current = autoSpeak;
  speechRateRef.current = speechRate;

  // Cleanup on unmount
  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    speechSynthesis.cancel();
  }, []);

  // ─── TTS ───
  const speakText = useCallback((text: string, lang: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_CODES[lang] || lang;
    utterance.rate = speechRateRef.current;
    utterance.volume = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, []);

  // ─── Translation ───
  const translate = useCallback(async (text: string, side: ActiveSide) => {
    setStatus('translating');
    const fromLang = side === 'person1' ? person1LangRef.current : person2LangRef.current;
    const toLang = side === 'person1' ? person2LangRef.current : person1LangRef.current;

    try {
      const res = await fetch('/api/ai/voice-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fromLang, toLang }),
      });

      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      const translated = data.translated_text;

      // Show translation on the OTHER person's side
      if (side === 'person1') {
        setPerson2Translation(translated);
        if (autoSpeakRef.current) speakText(translated, toLang);
      } else {
        setPerson1Translation(translated);
        if (autoSpeakRef.current) speakText(translated, toLang);
      }

      // Add to history
      setExchanges(prev => [{
        id: Date.now().toString(),
        speaker: side,
        original: text,
        translated,
        fromLang,
        toLang,
      }, ...prev].slice(0, 10));

      setStatus('ready');
    } catch {
      setStatus('ready');
    }
  }, [speakText]);

  // ─── Speech Recognition ───
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    const currentSide = activeSideRef.current;
    const lang = currentSide === 'person1' ? person1LangRef.current : person2LangRef.current;
    recognition.lang = SPEECH_CODES[lang] || lang;
    recognition.continuous = true;
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

      const textSoFar = interim || final;

      // Auto-detect which side is speaking
      if (autoDetectRef.current && textSoFar.length > 2) {
        const detected = detectLangFromText(textSoFar, person1LangRef.current, person2LangRef.current);
        if (detected && detected !== activeSideRef.current) {
          activeSideRef.current = detected;
          setActiveSide(detected);
          // Restart recognition with correct language
          const newLang = detected === 'person1' ? person1LangRef.current : person2LangRef.current;
          recognition.lang = SPEECH_CODES[newLang] || newLang;
        }
      }

      const side = activeSideRef.current;
      if (interim) {
        setInterimText(interim);
      }

      if (final) {
        setInterimText('');
        if (side === 'person1') {
          setPerson1Text(final);
        } else {
          setPerson2Text(final);
        }
        translate(final, side);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus('ready');
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          setStatus('ready');
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setStatus('listening');
  }, [translate]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.stop();
    }
    setIsListening(false);
    setStatus('ready');
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ─── Switch active speaker ───
  const switchSide = useCallback(() => {
    const newSide = activeSide === 'person1' ? 'person2' : 'person1';
    setActiveSide(newSide);
    activeSideRef.current = newSide;
    if (isListening) {
      stopListening();
      setTimeout(() => startListening(), 200);
    }
  }, [activeSide, isListening, stopListening, startListening]);

  // ─── Export ───
  const exportConversation = useCallback(() => {
    if (exchanges.length === 0) return;
    const text = exchanges.map(e => {
      const fromName = LANGUAGES[e.fromLang]?.name || e.fromLang;
      return `[${fromName}] ${e.original}\n→ ${e.translated}`;
    }).reverse().join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exchanges]);

  // ─── Start conversation ───
  const startConversation = () => {
    setMode('conversation');
    setPerson1Text('');
    setPerson2Text('');
    setPerson1Translation('');
    setPerson2Translation('');
    setInterimText('');
    setExchanges([]);
  };

  // ═══════════════════════════════════════
  //  SETUP SCREEN
  // ═══════════════════════════════════════
  if (mode === 'setup') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Live Conversation</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Illustration */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-amber-500 flex items-center justify-center mb-6 shadow-lg">
            <Mic size={40} className="text-white" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2 text-center">
            Real-Time Interpreter
          </h2>
          <p className="text-sm text-slate-400 text-center mb-8 max-w-[280px]">
            Place the phone between two people. Each speaks their own language — the phone translates both ways instantly.
          </p>

          {/* Language selectors */}
          <div className="w-full max-w-xs space-y-3 mb-8">
            {/* Person 1 */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-indigo-500/30">
              <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">You speak</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {LANG_KEYS.map(key => (
                  <button
                    key={key}
                    onClick={() => setPerson1Lang(key)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      key === person1Lang
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 active:bg-slate-700'
                    }`}
                  >
                    {LANGUAGES[key]?.flag} {LANGUAGES[key]?.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Swap */}
            <div className="flex justify-center -my-1.5 relative z-10">
              <button
                onClick={() => { setPerson1Lang(person2Lang); setPerson2Lang(person1Lang); }}
                className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center active:bg-slate-600 shadow-lg"
              >
                <ArrowUpDown size={18} className="text-white" />
              </button>
            </div>

            {/* Person 2 */}
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-amber-500/30">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2">They speak</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {LANG_KEYS.map(key => (
                  <button
                    key={key}
                    onClick={() => setPerson2Lang(key)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      key === person2Lang
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700/50 text-slate-400 active:bg-slate-700'
                    }`}
                  >
                    {LANGUAGES[key]?.flag} {LANGUAGES[key]?.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Instruction */}
          <div className="bg-slate-800/40 rounded-xl px-4 py-3 mb-6 max-w-xs w-full">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Place phone flat on the table between you. The top half will be rotated so the other person can read it.
            </p>
          </div>

          <button
            onClick={startConversation}
            disabled={person1Lang === person2Lang}
            className="w-full max-w-xs rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white active:bg-indigo-700 disabled:opacity-40"
          >
            Start Conversation
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  CONVERSATION MODE
  // ═══════════════════════════════════════
  const p1Active = activeSide === 'person1';
  const p2Active = activeSide === 'person2';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col overflow-hidden">
      {/* ─── TOP HALF: Person 2's reading area (rotated 180°) ─── */}
      <div
        className={`flex-1 flex flex-col justify-start p-5 border-b-2 ${
          p2Active
            ? 'border-amber-500/60'
            : 'border-slate-700/50'
        }`}
        style={{ transform: 'rotate(180deg)' }}
      >
        {/* Language label */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-amber-600/20 text-amber-400 text-xs font-medium rounded-full px-3 py-1">
            {LANGUAGES[person2Lang]?.flag} {LANGUAGES[person2Lang]?.native || LANGUAGES[person2Lang]?.name}
          </span>
          {person2Translation && (
            <button
              onClick={() => speakText(person2Translation, person2Lang)}
              className="p-2 active:opacity-60"
            >
              <Volume2 size={18} className={isSpeaking ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
            </button>
          )}
        </div>

        {/* What Person 2 said (their own words) */}
        {person2Text && (
          <p className="text-slate-500 text-xs mb-2 truncate">You said: {person2Text}</p>
        )}

        {/* Translation for Person 2 to read */}
        <div className="flex-1 flex items-center">
          {person2Translation ? (
            <p className="text-white text-2xl font-semibold leading-relaxed break-words w-full">
              {person2Translation}
            </p>
          ) : p1Active && interimText ? (
            <div className="space-y-2 w-full">
              <p className="text-slate-500 text-lg">{interimText}</p>
              {/* Waveform */}
              <div className="flex items-end gap-1 h-6">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-1 bg-indigo-500/60 rounded-full"
                    style={{
                      animation: 'waveBar 0.8s ease-in-out infinite alternate',
                      animationDelay: `${i * 0.1}s`,
                      height: '8px',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-lg">
              {isListening ? 'Waiting for speech...' : 'Tap mic to start'}
            </p>
          )}
        </div>

        {/* Small history for Person 2 */}
        {exchanges.filter(e => e.speaker === 'person1').length > 0 && (
          <div className="mt-2 space-y-1 max-h-16 overflow-y-auto">
            {exchanges.filter(e => e.speaker === 'person1').slice(0, 3).map(e => (
              <p key={e.id} className="text-slate-500 text-xs truncate">{e.translated}</p>
            ))}
          </div>
        )}
      </div>

      {/* ─── CENTER DIVIDER ─── */}
      <div className="relative flex items-center justify-center py-2 px-4">
        <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-indigo-500 via-slate-600 to-amber-500" />

        {/* Status */}
        <div className="relative z-10 bg-slate-900 px-4 flex items-center gap-3">
          <button onClick={switchSide} className="p-1.5 rounded-full bg-slate-800 active:bg-slate-700">
            <ArrowUpDown size={14} className="text-slate-400" />
          </button>
          <span className={`text-xs font-medium ${
            status === 'listening' ? (p1Active ? 'text-indigo-400' : 'text-amber-400') :
            status === 'translating' ? 'text-indigo-400' : 'text-slate-500'
          }`}>
            {status === 'listening' ? 'Listening...' :
             status === 'translating' ? 'Translating...' : 'Ready'}
          </span>
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-full bg-slate-800 active:bg-slate-700">
            <Settings size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ─── BOTTOM HALF: Person 1's reading area ─── */}
      <div
        className={`flex-1 flex flex-col justify-start p-5 ${
          p1Active
            ? 'border-t-2 border-indigo-500/60'
            : 'border-t-2 border-slate-700/50'
        }`}
      >
        {/* Language label */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-indigo-600/20 text-indigo-400 text-xs font-medium rounded-full px-3 py-1">
            {LANGUAGES[person1Lang]?.flag} {LANGUAGES[person1Lang]?.name}
          </span>
          {person1Translation && (
            <button
              onClick={() => speakText(person1Translation, person1Lang)}
              className="p-2 active:opacity-60"
            >
              <Volume2 size={18} className={isSpeaking ? 'text-indigo-400 animate-pulse' : 'text-slate-500'} />
            </button>
          )}
        </div>

        {/* What Person 1 said (their own words) */}
        {person1Text && (
          <p className="text-slate-500 text-xs mb-2 truncate">You said: {person1Text}</p>
        )}

        {/* Translation for Person 1 to read */}
        <div className="flex-1 flex items-center">
          {person1Translation ? (
            <p className="text-white text-2xl font-semibold leading-relaxed break-words w-full">
              {person1Translation}
            </p>
          ) : p2Active && interimText ? (
            <div className="space-y-2 w-full">
              <p className="text-slate-500 text-lg">{interimText}</p>
              {/* Waveform */}
              <div className="flex items-end gap-1 h-6">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-1 bg-amber-500/60 rounded-full"
                    style={{
                      animation: 'waveBar 0.8s ease-in-out infinite alternate',
                      animationDelay: `${i * 0.1}s`,
                      height: '8px',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-lg">
              {isListening ? 'Waiting for speech...' : 'Tap mic to start'}
            </p>
          )}
        </div>

        {/* Small history for Person 1 */}
        {exchanges.filter(e => e.speaker === 'person2').length > 0 && (
          <div className="mt-2 space-y-1 max-h-16 overflow-y-auto">
            {exchanges.filter(e => e.speaker === 'person2').slice(0, 3).map(e => (
              <p key={e.id} className="text-slate-500 text-xs truncate">{e.translated}</p>
            ))}
          </div>
        )}
      </div>

      {/* ─── BOTTOM CONTROLS ─── */}
      <div className="relative z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-4 pt-3 pb-[env(safe-area-inset-bottom)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div className="flex items-center justify-between">
          {/* Back */}
          <button
            onClick={() => { stopListening(); setMode('setup'); }}
            className="p-2.5 text-slate-500 active:text-white"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Mic button */}
          <button onClick={toggleListening} className="relative">
            {isListening && (
              <div className={`absolute -inset-2 rounded-full animate-ping ${
                p1Active ? 'bg-indigo-500/20' : 'bg-amber-500/20'
              }`} />
            )}
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? p1Active
                  ? 'bg-indigo-600 ring-4 ring-indigo-500/50'
                  : 'bg-amber-600 ring-4 ring-amber-500/50'
                : 'bg-slate-800 ring-2 ring-slate-600'
            }`}>
              <Mic size={32} className="text-white" />
            </div>
            {isListening && (
              <div className={`absolute -inset-3 rounded-full border-2 animate-pulse ${
                p1Active ? 'border-indigo-500/40' : 'border-amber-500/40'
              }`} />
            )}
          </button>

          {/* Export */}
          <button
            onClick={exportConversation}
            disabled={exchanges.length === 0}
            className="p-2.5 text-slate-500 active:text-white disabled:opacity-30"
          >
            <Download size={20} />
          </button>
        </div>

        {/* Side indicator + auto-detect toggle */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={switchSide}
            className="text-[10px] font-medium text-slate-500 active:text-white"
          >
            {p1Active
              ? `${LANGUAGES[person1Lang]?.flag} Speaking`
              : `${LANGUAGES[person2Lang]?.flag} Speaking`
            }
          </button>
          <span className="text-slate-700 text-[10px]">|</span>
          <button
            onClick={() => setAutoDetect(v => !v)}
            className={`text-[10px] font-medium ${autoDetect ? 'text-indigo-400' : 'text-slate-600'}`}
          >
            Auto-detect {autoDetect ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* ─── SETTINGS MODAL ─── */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-md bg-slate-800 rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Speech rate */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Speech Rate: {speechRate.toFixed(2)}</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={e => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Auto-speak */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Auto-speak translations</span>
              <button
                onClick={() => setAutoSpeak(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${autoSpeak ? 'bg-indigo-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoSpeak ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>

            {/* Auto-detect */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Auto-detect speaker</span>
              <button
                onClick={() => setAutoDetect(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors ${autoDetect ? 'bg-indigo-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoDetect ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ANIMATIONS ─── */}
      <style jsx>{`
        @keyframes waveBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
}
