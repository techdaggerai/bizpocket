'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';

const LANG_VOICES: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ur: 'ur-PK', ar: 'ar-SA', bn: 'bn-BD', pt: 'pt-BR',
  fil: 'fil-PH', vi: 'vi-VN', tr: 'tr-TR', zh: 'zh-CN', fr: 'fr-FR', nl: 'nl-NL', es: 'es-ES',
};

const LANG_3: Record<string, string> = {
  en: 'ENG', ja: 'JPN', ur: 'URD', ar: 'ARB', hi: 'HIN', bn: 'BEN', ne: 'NEP',
  zh: 'CHN', ko: 'KOR', fr: 'FRA', es: 'ESP', pt: 'POR', vi: 'VIE', fil: 'FIL',
  tr: 'TUR', id: 'IND', th: 'THA', nl: 'NLD', si: 'SIN', tl: 'TGL',
};

export default function VoiceCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = createClient();
  const conversationId = params.conversationId as string;

  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [myText, setMyText] = useState('');
  const [theirText, setTheirText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactLang, setContactLang] = useState('ja');
  const [translationMode, setTranslationMode] = useState<string>('auto');
  const myLang = profile?.language || 'en';
  const effectiveMode = translationMode === 'translate_all' || translationMode === 'direct' || translationMode === 'text_only'
    ? translationMode
    : myLang === contactLang ? 'direct' : 'translate_all';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('conversations').select('title, translation_mode, contact:contacts(name, language)').eq('id', conversationId).single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = data.contact as any;
        setContactName(c?.name || data.title || 'Contact');
        setContactLang(c?.language || 'ja');
        if (data.translation_mode) setTranslationMode(data.translation_mode);
      }
    };
    load();
  }, [conversationId]); // eslint-disable-line

  const speakWithElevenLabs = async (text: string, lang: string, voiceId?: string) => {
    try {
      const res = await fetch('/api/ai/voice-speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang, ...(voiceId && { voiceId }) }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();
      } else {
        throw new Error('ElevenLabs failed');
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_VOICES[lang] || 'en-US';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const ch = supabase.channel(`call:${conversationId}`);
    ch.on('broadcast', { event: 'speech' }, ({ payload }) => {
      if (payload.userId !== user?.id) {
        setTheirText(payload.original);
        if (effectiveMode === 'direct') {
          setTranslatedText(payload.original);
        } else if (effectiveMode === 'text_only') {
          setTranslatedText(payload.translated);
          // Text subtitles only — no spoken TTS
        } else {
          setTranslatedText(payload.translated);
          speakWithElevenLabs(payload.translated, myLang);
        }
      }
    }).subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [conversationId, myLang, user?.id, effectiveMode]);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = LANG_VOICES[myLang] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setMyText(interim || final);
      if (final.trim()) {
        setMyText(final);
        if (effectiveMode === 'direct') {
          // No translation — broadcast raw
          channelRef.current?.send({ type: 'broadcast', event: 'speech', payload: { userId: user?.id, original: final, translated: final, fromLang: myLang, toLang: contactLang } });
        } else {
          try {
            const res = await fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: final, fromLanguage: myLang, toLanguage: contactLang }) });
            if (res.ok) {
              const data = await res.json();
              channelRef.current?.send({ type: 'broadcast', event: 'speech', payload: { userId: user?.id, original: final, translated: data.translatedText, fromLang: myLang, toLang: contactLang } });
            }
          } catch { /* ignore */ }
        }
      }
    };
    recognition.onend = () => { if (callActive) try { recognition.start(); } catch { /* ignore */ } };
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => { recognitionRef.current?.stop(); recognitionRef.current = null; };

  const startCall = () => { setCallActive(true); setCallDuration(0); timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000); startListening(); };
  const endCall = () => { setCallActive(false); stopListening(); if (timerRef.current) clearInterval(timerRef.current); speechSynthesis.cancel(); router.push('/chat'); };
  const toggleMute = () => { if (muted) startListening(); else stopListening(); setMuted(!muted); };
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      {/* Logo */}
      <svg width="48" height="48" viewBox="0 0 88 88" fill="none" className="mb-6">
        <rect width="88" height="88" rx="20" fill="#4F46E5"/><path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/><path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/><text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle">Hi</text><text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle">やあ</text>
      </svg>

      <h2 className="text-[22px] font-bold mb-1">{contactName || 'Calling...'}</h2>
      {effectiveMode !== 'direct' && (
        <span className="bg-indigo-600/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full mb-1">
          {LANG_3[myLang] || myLang.toUpperCase()}⇄{LANG_3[contactLang] || contactLang.toUpperCase()}
        </span>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#4F46E5]/30 text-[#a5b4fc]">{LANG_3[myLang] || myLang.toUpperCase()}</span>
        <span className="text-slate-400">⇄</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F59E0B]/30 text-[#fbbf24]">{LANG_3[contactLang] || contactLang.toUpperCase()}</span>
      </div>

      {callActive && <p className="text-sm text-[#22c55e] font-mono mb-8">{fmt(callDuration)}</p>}

      {/* Live transcription */}
      {callActive && (
        <div className="w-full max-w-[400px] mb-10 space-y-2.5">
          {myText && (
            <div className="bg-[#4F46E5]/20 rounded-xl px-3.5 py-2.5 border-l-[3px] border-[#4F46E5]">
              <p className="text-[11px] text-[#a5b4fc] font-semibold mb-1">You (live)</p>
              <p className="text-sm leading-relaxed">{myText}</p>
            </div>
          )}
          {translatedText && (
            <div className="bg-[#F59E0B]/20 rounded-xl px-3.5 py-2.5 border-l-[3px] border-[#F59E0B]">
              <p className="text-[11px] text-[#fbbf24] font-semibold mb-1">{contactName} (translated)</p>
              <p className="text-sm leading-relaxed">{translatedText}</p>
              <p className="text-[11px] text-slate-400 italic mt-1.5">Original: {theirText}</p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-5 items-center">
        {callActive ? (
          <>
            <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? 'bg-[#ef4444]' : 'bg-slate-800/10'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></> : <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></>}
              </svg>
            </button>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-[#ef4444] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
            </button>
            <button className="w-14 h-14 rounded-full bg-slate-800/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
            </button>
          </>
        ) : (
          <button onClick={startCall} className="w-[72px] h-[72px] rounded-full bg-[#22c55e] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
          </button>
        )}
      </div>

      {!callActive && <p className="text-[13px] text-slate-400 mt-5 text-center max-w-[300px]">You speak {LANG_3[myLang] || myLang.toUpperCase()}. They hear {LANG_3[contactLang] || contactLang.toUpperCase()}. AI translates in real-time.</p>}
    </div>
  );
}
