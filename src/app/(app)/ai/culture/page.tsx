'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Send, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type Screen = 'scenarios' | 'guide';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string; // thumbnail for user captures
}

const SCENARIOS = [
  { key: 'atm', emoji: '🏧', label: 'ATM / Bank Transfer', desc: 'Deposits, transfers, withdrawals' },
  { key: 'ticket', emoji: '🚃', label: 'Ticket Machine', desc: 'Train, bus, shinkansen tickets' },
  { key: 'restaurant', emoji: '🍜', label: 'Restaurant / Ordering', desc: 'Tablets, ticket machines, menus' },
  { key: 'post', emoji: '📮', label: 'Post Office', desc: 'Forms, packages, services' },
  { key: 'hospital', emoji: '🏥', label: 'Hospital / Clinic', desc: 'Intake forms, insurance' },
  { key: 'government', emoji: '📋', label: 'City Hall / Gov Form', desc: 'Registration, applications' },
  { key: 'realestate', emoji: '🏠', label: 'Real Estate', desc: 'Contracts, listings, terms' },
  { key: 'convenience', emoji: '📦', label: 'Convenience Store', desc: 'Bills, packages, printing' },
  { key: 'custom', emoji: '🎫', label: 'Point at Anything', desc: 'AI guides you through it' },
];

const QUICK_ACTIONS = [
  'What\'s on screen?',
  'What do I press?',
  'Translate everything',
];

export default function LiveGuidePage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [screen, setScreen] = useState<Screen>('scenarios');
  const [scenario, setScenario] = useState('custom');
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showChat, setShowChat] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  const userLang = profile?.language || 'en';

  // ─── Camera ───
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
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setCameraError('Camera access denied. Please allow camera permission.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (screen === 'guide') startCamera();
    return () => { if (screen !== 'guide') stopCamera(); };
  }, [screen, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Capture & Send ───
  const captureAndSend = useCallback(async (question?: string) => {
    if (isProcessing) return;

    let imageData: string | undefined;

    // Capture frame if camera is ready
    if (cameraReady && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        imageData = canvas.toDataURL('image/jpeg', 0.8);
      }
    }

    if (!imageData && !question) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: question || 'What should I do?',
      image: imageData,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setInputText('');

    try {
      // Build conversation history for API (text-only summaries to save tokens)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        text: m.text,
        // Only send images for the last 2 user messages to manage payload size
        image: m.role === 'user' && m.image && messages.indexOf(m) >= messages.length - 2
          ? m.image : undefined,
      }));

      const res = await fetch('/api/ai/live-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          scenario: scenarioRef.current,
          conversationHistory: history,
          question: question || undefined,
          language: userLang,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Guide failed');
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.instruction,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Something went wrong. Try capturing again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cameraReady, messages, userLang]);

  // ─── Send text-only question ───
  const sendQuestion = useCallback(() => {
    const q = inputText.trim();
    if (!q) return;
    captureAndSend(q);
  }, [inputText, captureAndSend]);

  // ─── Select scenario ───
  const selectScenario = (key: string, label: string) => {
    setScenario(key);
    setScenarioLabel(label);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: key === 'custom'
        ? 'Point your camera at anything and tap the capture button. I\'ll tell you what I see and guide you through it.'
        : `Ready to help with ${label}! Point your camera at the screen or form and tap capture. I\'ll guide you step by step.`,
    }]);
    setScreen('guide');
  };

  // ═══════════════════════════════════════
  //  SCENARIO SELECTION
  // ═══════════════════════════════════════
  if (screen === 'scenarios') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Live Guide</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
          {/* Hero */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-3 shadow-lg">
              <Globe size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Live Guide</h2>
            <p className="text-sm text-slate-400 text-center max-w-[260px]">
              AI guides you through anything in Japan — step by step
            </p>
          </div>

          {/* Scenario grid */}
          <div className="grid grid-cols-2 gap-3">
            {SCENARIOS.map(s => (
              <button
                key={s.key}
                onClick={() => selectScenario(s.key, s.label)}
                className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left active:bg-slate-800 active:border-indigo-500/30 transition-colors"
              >
                <span className="text-3xl block mb-2">{s.emoji}</span>
                <p className="text-sm font-semibold text-white mb-0.5">{s.label}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  LIVE CAMERA + AI CHAT
  // ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* ─── CAMERA: top portion ─── */}
      <div className="relative" style={{ height: showChat ? '55%' : '85%', transition: 'height 0.3s' }}>
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/70 to-transparent">
          <div className="pt-3 pb-2">
            <button
              onClick={() => { stopCamera(); setScreen('scenarios'); setMessages([]); }}
              className="p-2 -ml-2 text-white active:opacity-60"
            >
              <ArrowLeft size={22} />
            </button>
          </div>
          <div className="pt-3 pb-2 flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium">{scenarioLabel || 'Live Guide'}</span>
          </div>
          <div className="pt-3 pb-2">
            <button
              onClick={() => setShowChat(v => !v)}
              className="p-2 -mr-2 text-white/70 active:text-white"
            >
              <ChevronDown size={20} className={`transition-transform ${showChat ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Camera feed */}
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8 z-10">
            <div className="bg-slate-800 rounded-2xl p-6 text-center max-w-sm">
              <Camera size={32} className="text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Capture button — centered at bottom of camera area */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
          <button
            onClick={() => captureAndSend()}
            disabled={isProcessing || !cameraReady}
            className="relative"
          >
            {isProcessing && (
              <div className="absolute -inset-2 rounded-full border-2 border-indigo-500/50 animate-ping" />
            )}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isProcessing
                ? 'bg-indigo-600 animate-pulse'
                : 'bg-indigo-600 active:bg-indigo-700'
            } disabled:opacity-40`}>
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={26} className="text-white" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ─── AI CHAT: bottom portion ─── */}
      {showChat && (
        <div className="flex-1 bg-slate-900 rounded-t-2xl -mt-3 relative z-10 flex flex-col overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Globe size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 rounded-2xl rounded-tr-md'
                    : 'bg-slate-800 rounded-2xl rounded-tl-md'
                } p-3`}>
                  {/* User capture thumbnail */}
                  {msg.image && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.image} alt="Capture" className="w-full max-h-24 object-cover" />
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-slate-200'
                  }`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Globe size={14} className="text-white" />
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-md p-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-indigo-500"
                        style={{
                          animation: 'guideBounce 1.4s infinite ease-in-out both',
                          animationDelay: `${i * 0.16}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick actions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa}
                  onClick={() => captureAndSend(qa)}
                  disabled={isProcessing}
                  className="shrink-0 text-xs bg-slate-800 text-slate-400 rounded-full px-3 py-1.5 active:bg-slate-700 disabled:opacity-40"
                >
                  {qa}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 border-t border-slate-800 px-4 py-2 pb-[env(safe-area-inset-bottom)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => captureAndSend()}
                disabled={isProcessing || !cameraReady}
                className="p-2 text-indigo-400 active:text-indigo-300 disabled:opacity-40 shrink-0"
              >
                <Camera size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
                placeholder="Ask a question..."
                className="flex-1 bg-slate-800/60 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-slate-700/50 focus:border-indigo-500/50 placeholder:text-slate-600"
              />
              <button
                onClick={sendQuestion}
                disabled={!inputText.trim() || isProcessing}
                className="p-2 text-indigo-400 active:text-indigo-300 disabled:opacity-30 shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <style jsx>{`
        @keyframes guideBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
