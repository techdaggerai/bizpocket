'use client';

import { useState, useEffect, useCallback } from 'react';
import { EMERGENCY_PHRASES, EMERGENCY_NUMBERS, CATEGORY_INFO } from '@/lib/emergency-phrases';

const STORAGE_KEY = 'emergency_info';

interface EmergencyInfo {
  bloodType: string;
  allergies: string;
  contactName: string;
  contactPhone: string;
  address: string;
}

const DEFAULT_INFO: EmergencyInfo = {
  bloodType: '', allergies: '', contactName: '', contactPhone: '', address: '',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function EmergencyPage() {
  const [info, setInfo] = useState<EmergencyInfo>(DEFAULT_INFO);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activePhrase, setActivePhrase] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [hasTTS, setHasTTS] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setInfo(JSON.parse(saved));
    } catch { /* offline-safe */ }
    setHasTTS(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  function saveInfo() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    setEditing(false);
  }

  const speakPhrase = useCallback((text: string, idx: number) => {
    if (navigator.vibrate) navigator.vibrate(100);
    setActivePhrase(idx);
    setSpeaking(true);

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    utterance.volume = 1.0;
    utterance.onend = () => { setSpeaking(false); setActivePhrase(null); };
    utterance.onerror = () => { setSpeaking(false); setActivePhrase(null); };
    speechSynthesis.speak(utterance);
  }, []);

  function copyText(text: string, idx: number) {
    if (navigator.vibrate) navigator.vibrate(30);
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  }

  const categories = ['medical', 'police', 'disaster', 'daily'] as const;

  return (
    <div className="min-h-screen bg-[#0f172a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center h-14 px-2 bg-[#0f172a] border-b border-slate-700">
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-white ml-1">Emergency Card</h1>
        <span className="ml-2 bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SOS</span>
      </div>

      {/* Content — padded for fixed bottom bar */}
      <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* Phrase sections */}
        {categories.map(cat => {
          const catInfo = CATEGORY_INFO[cat];
          const phrases = EMERGENCY_PHRASES.filter(p => p.category === cat);
          return (
            <div key={cat} className="px-4 mt-5">
              {/* Group header with colored left border */}
              <div className="flex items-center gap-2.5 mb-2.5 pl-3 border-l-[3px]" style={{ borderColor: catInfo.color }}>
                <span className="text-base">{catInfo.icon}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: catInfo.color }}>{catInfo.label}</h3>
              </div>

              <div className="space-y-2">
                {phrases.map((phrase, i) => {
                  const globalIdx = EMERGENCY_PHRASES.indexOf(phrase);
                  const isActive = activePhrase === globalIdx;
                  const isCopied = copied === globalIdx;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl px-3 py-3 transition-all ${
                        isActive
                          ? 'bg-[#DC2626] scale-[1.01] shadow-lg shadow-red-900/30'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Speaker button */}
                        <button
                          onClick={() => hasTTS ? speakPhrase(phrase.ja, globalIdx) : null}
                          disabled={speaking && !isActive}
                          className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? 'bg-white/20' : 'bg-slate-700 active:bg-slate-600'
                          }`}
                          aria-label={`Speak: ${phrase.en}`}
                        >
                          {isActive ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                          )}
                        </button>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[15px] font-medium ${isActive ? 'text-white' : 'text-slate-200'}`}>{phrase.en}</p>
                          <p className={`text-[13px] mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'} ${!hasTTS ? 'text-[28px] font-bold' : ''}`}>{phrase.ja}</p>
                          <p className={`text-[11px] italic mt-0.5 ${isActive ? 'text-white/50' : 'text-slate-500'}`}>{phrase.romaji}</p>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => copyText(phrase.ja, globalIdx)}
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isCopied ? 'bg-green-600/20' : isActive ? 'bg-white/10 active:bg-white/20' : 'bg-slate-700 active:bg-slate-600'
                          }`}
                          aria-label={`Copy: ${phrase.ja}`}
                        >
                          {isCopied ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* My Information — collapsible */}
        <div className="px-4 mt-6">
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🆔</span>
              <span className="text-sm font-semibold text-slate-200">My Information</span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${infoOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {infoOpen && (
            <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4">
              {editing ? (
                <div className="space-y-3">
                  {/* Blood type dropdown */}
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Blood Type</label>
                    <select
                      value={info.bloodType}
                      onChange={(e) => setInfo(prev => ({ ...prev, bloodType: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select...</option>
                      {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Allergies</label>
                    <input
                      type="text"
                      value={info.allergies}
                      onChange={(e) => setInfo(prev => ({ ...prev, allergies: e.target.value }))}
                      placeholder="Penicillin, shellfish..."
                      className="w-full mt-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={info.contactName}
                      onChange={(e) => setInfo(prev => ({ ...prev, contactName: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full mt-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={info.contactPhone}
                      onChange={(e) => setInfo(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+81-90-xxxx-xxxx"
                      className="w-full mt-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase">Address in Japan</label>
                    <input
                      type="text"
                      value={info.address}
                      onChange={(e) => setInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Tokyo, Shibuya-ku..."
                      className="w-full mt-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={saveInfo}
                    className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white active:bg-[#4338CA]"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div>
                  <div className="space-y-1.5">
                    {info.bloodType && <p className="text-sm text-slate-300"><span className="font-medium text-slate-400">Blood Type:</span> {info.bloodType}</p>}
                    {info.allergies && <p className="text-sm text-slate-300"><span className="font-medium text-slate-400">Allergies:</span> {info.allergies}</p>}
                    {info.contactName && <p className="text-sm text-slate-300"><span className="font-medium text-slate-400">Contact:</span> {info.contactName}</p>}
                    {info.contactPhone && (
                      <p className="text-sm text-slate-300">
                        <span className="font-medium text-slate-400">Phone:</span>{' '}
                        <a href={`tel:${info.contactPhone}`} className="text-indigo-400 underline">{info.contactPhone}</a>
                      </p>
                    )}
                    {info.address && <p className="text-sm text-slate-300"><span className="font-medium text-slate-400">Address:</span> {info.address}</p>}
                    {!info.bloodType && !info.allergies && !info.contactName && (
                      <p className="text-xs text-slate-500 italic">No information saved yet</p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 w-full rounded-lg border border-slate-600 py-2 text-sm font-medium text-slate-300 active:bg-slate-700"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Offline indicator */}
        <div className="px-4 mt-4 mb-4">
          <div className="rounded-lg bg-green-950/20 border border-green-900/30 px-3 py-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            <p className="text-[11px] text-green-400">Works offline — no internet needed</p>
          </div>
        </div>
      </div>

      {/* Fixed emergency numbers bar at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a] border-t border-slate-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex gap-2 px-3 py-2">
          {EMERGENCY_NUMBERS.map(num => (
            <a
              key={num.number}
              href={`tel:${num.number}`}
              className="flex-1 flex flex-col items-center justify-center rounded-xl py-3 active:opacity-80 transition-opacity"
              style={{ backgroundColor: num.color, minHeight: 60 }}
            >
              <span className="text-[24px] font-bold text-white leading-none">{num.number}</span>
              <span className="text-[10px] text-white/70 mt-0.5">{num.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
