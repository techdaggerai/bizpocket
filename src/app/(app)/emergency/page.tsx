'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import { EMERGENCY_PHRASES, EMERGENCY_NUMBERS, CATEGORY_INFO } from '@/lib/emergency-phrases';

const STORAGE_KEY = 'emergency_info';

interface EmergencyInfo {
  name: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
  medications: string;
}

const DEFAULT_INFO: EmergencyInfo = {
  name: '', bloodType: '', allergies: '', emergencyContact: '', medications: '',
};

export default function EmergencyPage() {
  const [info, setInfo] = useState<EmergencyInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setInfo(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function saveInfo() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setEditing(false);
  }

  const speakPhrase = useCallback((text: string, idx: number) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(100);
    setActivePhrase(idx);
    setSpeaking(true);

    // Use browser TTS (works offline)
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    utterance.volume = 1.0;
    utterance.onend = () => { setSpeaking(false); setActivePhrase(null); };
    utterance.onerror = () => { setSpeaking(false); setActivePhrase(null); };
    speechSynthesis.speak(utterance);
  }, []);

  const categories = ['medical', 'police', 'general'] as const;

  return (
    <div className="pb-20">
      <PageHeader title="Emergency Card" backPath="/settings" />

      {/* Personal Info */}
      <div className="px-4 pt-4">
        <div className="bg-red-950/20 rounded-2xl p-4 border border-red-900/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🆔</span>
              <h2 className="text-sm font-bold text-red-300">My Emergency Info</h2>
            </div>
            <button
              onClick={() => editing ? saveInfo() : setEditing(true)}
              className="text-xs font-semibold text-red-400"
            >
              {editing ? 'Save' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-2">
              {([
                ['name', 'Full Name', 'Your full name'],
                ['bloodType', 'Blood Type', 'A+, B-, O+, AB+...'],
                ['allergies', 'Allergies', 'Penicillin, shellfish...'],
                ['medications', 'Medications', 'Current medications...'],
                ['emergencyContact', 'Emergency Contact', '+81-90-xxxx-xxxx'],
              ] as const).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="text-[10px] font-medium text-red-400/60 uppercase">{label}</label>
                  <input
                    type="text"
                    value={info[key]}
                    onChange={(e) => setInfo(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full mt-0.5 rounded-lg border border-red-900/30 bg-slate-800 px-3 py-1.5 text-sm text-slate-50 placeholder-[#9CA3AF] focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {info.name && <p className="text-sm text-red-300"><span className="font-semibold">Name:</span> {info.name}</p>}
              {info.bloodType && <p className="text-sm text-red-300"><span className="font-semibold">Blood Type:</span> {info.bloodType}</p>}
              {info.allergies && <p className="text-sm text-red-300"><span className="font-semibold">Allergies:</span> {info.allergies}</p>}
              {info.medications && <p className="text-sm text-red-300"><span className="font-semibold">Medications:</span> {info.medications}</p>}
              {info.emergencyContact && <p className="text-sm text-red-300"><span className="font-semibold">Emergency Contact:</span> {info.emergencyContact}</p>}
              {!info.name && !info.bloodType && !info.allergies && (
                <p className="text-xs text-red-400/50 italic">Tap Edit to add your emergency info</p>
              )}
            </div>
          )}

          {/* Show to helper button */}
          {(info.name || info.bloodType || info.allergies) && !editing && (
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                const text = [
                  info.name && `名前: ${info.name}`,
                  info.bloodType && `血液型: ${info.bloodType}`,
                  info.allergies && `アレルギー: ${info.allergies}`,
                  info.medications && `薬: ${info.medications}`,
                  info.emergencyContact && `緊急連絡先: ${info.emergencyContact}`,
                ].filter(Boolean).join('\n');
                alert(text); // Full-screen display for showing to helper
              }}
              className="mt-3 w-full rounded-lg bg-[#DC2626] py-2.5 text-xs font-bold text-white"
            >
              Show to Helper (日本語)
            </button>
          )}
        </div>
      </div>

      {/* Phrases by category */}
      {categories.map(cat => {
        const catInfo = CATEGORY_INFO[cat];
        const phrases = EMERGENCY_PHRASES.filter(p => p.category === cat);
        return (
          <div key={cat} className="px-4 mt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{catInfo.icon}</span>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: catInfo.color }}>{catInfo.label}</h3>
            </div>
            <div className="space-y-1.5">
              {phrases.map((phrase, i) => {
                const globalIdx = EMERGENCY_PHRASES.indexOf(phrase);
                const isActive = activePhrase === globalIdx;
                return (
                  <button
                    key={i}
                    onClick={() => speakPhrase(phrase.ja, globalIdx)}
                    disabled={speaking && !isActive}
                    className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                      isActive
                        ? 'bg-[#DC2626] text-white scale-[1.02] shadow-lg'
                        : 'bg-slate-800 border border-slate-700 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-slate-800/20' : 'bg-slate-700'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isActive ? 'white' : '#9CA3AF'}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium ${isActive ? 'text-white' : 'text-slate-50'}`}>{phrase.en}</p>
                        <p className={`text-[15px] font-semibold mt-0.5 ${isActive ? 'text-white/90' : 'text-slate-300'}`}>{phrase.ja}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Emergency Numbers */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">📞</span>
          <h3 className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Emergency Numbers</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EMERGENCY_NUMBERS.map(num => (
            <a
              key={num.number}
              href={`tel:${num.number}`}
              className="flex items-center gap-3 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 active:bg-slate-700"
            >
              <span className="text-xl font-bold text-[#DC2626]">{num.number}</span>
              <div>
                <p className="text-[11px] font-medium text-slate-300">{num.label}</p>
                <p className="text-[10px] text-[#9CA3AF]">{num.labelJa}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Offline indicator */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-green-950/20 border border-green-900/30 px-3 py-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <p className="text-[11px] text-green-400">Works offline — no internet needed</p>
        </div>
      </div>
    </div>
  );
}
