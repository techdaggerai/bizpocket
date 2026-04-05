'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  url: string;
  duration: string;
  isOwner: boolean;
}

export default function VoiceMessagePlayer({ url, duration, isOwner }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      };
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  // Generate static waveform bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 6 + Math.sin(i * 0.7) * 6 + Math.cos(i * 1.3) * 4;
    return Math.max(4, Math.min(18, h));
  });

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={togglePlay}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
          isOwner ? 'bg-slate-800/20 text-white hover:bg-slate-800/30' : 'bg-[#4F46E5]/10 text-[#4F46E5] hover:bg-[#4F46E5]/20'
        }`}
      >
        {playing ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex items-end gap-[2px] h-5">
        {bars.map((h, i) => {
          const filled = progress > 0 && i / bars.length <= progress;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-colors ${
                filled
                  ? (isOwner ? 'bg-slate-800' : 'bg-[#4F46E5]')
                  : (isOwner ? 'bg-slate-800/30' : 'bg-[#0A0A0A]/10')
              }`}
              style={{ height: h }}
            />
          );
        })}
      </div>
      <span className={`text-[11px] font-mono shrink-0 ${isOwner ? 'text-white/70' : 'text-[#A3A3A3]'}`}>
        {duration}
      </span>
    </div>
  );
}
