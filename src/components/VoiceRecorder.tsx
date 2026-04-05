'use client';

import { useState, useRef } from 'react';

interface Props {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => { const blob = new Blob(chunks.current, { type: 'audio/webm' }); onRecordingComplete(blob, duration); stream.getTracks().forEach(t => t.stop()); };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { /* mic denied */ }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={() => recording && stopRecording()}
      onTouchStart={startRecording} onTouchEnd={stopRecording} disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-[10px] transition-all ${recording ? 'w-[120px] h-9 bg-[#ef4444]' : 'w-9 h-9 bg-slate-800 hover:bg-[#e5e7eb]'}`}>
      {recording ? (
        <>
          <div className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" />
          <span className="text-xs text-white font-semibold font-mono">{fmt(duration)}</span>
        </>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      )}
    </button>
  );
}
