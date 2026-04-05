'use client';

import { useState, useRef } from 'react';

interface Props {
  audioUrl: string;
  duration: number;
  originalText?: string;
  translatedText?: string;
  originalLanguage?: string;
  targetLanguage?: string;
  isOwn: boolean;
}

const LANG_MAP: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ur: 'ur-PK', ar: 'ar-SA', bn: 'bn-BD', pt: 'pt-BR',
  fil: 'fil-PH', vi: 'vi-VN', tr: 'tr-TR', zh: 'zh-CN', fr: 'fr-FR', nl: 'nl-NL', es: 'es-ES',
};

export default function VoiceMessageBubble({ audioUrl, duration, originalText, translatedText, originalLanguage, targetLanguage, isOwn }: Props) {
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [playingTTS, setPlayingTTS] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const speakTranslation = () => {
    if (!translatedText || !targetLanguage) return;
    const u = new SpeechSynthesisUtterance(translatedText);
    u.lang = LANG_MAP[targetLanguage] || 'en-US';
    u.rate = 0.9;
    u.onend = () => setPlayingTTS(false);
    speechSynthesis.speak(u);
    setPlayingTTS(true);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`max-w-[80%] px-3.5 py-2.5 ${isOwn ? 'rounded-[14px_14px_4px_14px] bg-[#4F46E5]' : 'rounded-[14px_14px_14px_4px] bg-slate-800'}`}>
      <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
      <div className="flex items-center gap-2.5">
        <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOwn ? 'bg-slate-800/20' : 'bg-[#e5e7eb]'}`}>
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isOwn ? 'white' : '#374151'}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isOwn ? 'white' : '#374151'}><polygon points="5,3 19,12 5,21"/></svg>
          )}
        </button>
        <div className="flex-1 flex items-center gap-[2px] h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-[3px] rounded-sm" style={{ height: Math.random() * 16 + 4, background: isOwn ? `rgba(255,255,255,${playing ? 0.8 : 0.4})` : (playing ? '#4F46E5' : '#d1d5db'), transition: 'all 0.2s' }} />
          ))}
        </div>
        <span className={`text-[11px] font-mono ${isOwn ? 'text-white/60' : 'text-slate-500'}`}>{fmt(duration)}</span>
      </div>

      {translatedText && (
        <div className={`mt-2 pt-2 ${isOwn ? 'border-t border-white/10' : 'border-t border-slate-700'}`}>
          <div className="flex gap-1.5 mb-1.5">
            <button onClick={speakTranslation} className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 ${playingTTS ? 'bg-[#F59E0B] text-white' : isOwn ? 'bg-slate-800/15 text-white' : 'bg-[#fef3c7] text-[#92400e]'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
              {playingTTS ? 'Playing...' : 'Hear translation'}
            </button>
            <button onClick={() => setShowText(!showText)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${isOwn ? 'bg-slate-800/15 text-white/80' : 'bg-slate-800 text-slate-400'}`}>
              {showText ? 'Hide text' : 'Show text'}
            </button>
          </div>
          {showText && (
            <div className="text-xs leading-relaxed">
              {originalText && <p className={`mb-1 ${isOwn ? 'text-white/50' : 'text-slate-500'}`}>Original: {originalText}</p>}
              <p className={isOwn ? 'text-[#F59E0B] font-medium' : 'text-[#4F46E5] font-medium'}>Translation: {translatedText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
