'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// ─── Scenario data ───

interface ScenarioStep {
  title: string;
  detail: string;
  japanese?: string;
}

interface Scenario {
  id: string;
  label: string;
  icon: string;
  steps: ScenarioStep[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'atm', label: 'Bank ATM', icon: '🏧',
    steps: [
      { title: 'Insert your card', detail: 'Face up, chip or magnetic strip first.', japanese: 'カードを入れてください' },
      { title: 'Press English button', detail: 'Usually in the top-right corner of the screen.', japanese: '英語 (Eigo)' },
      { title: 'Select Withdrawal', detail: 'Look for the button labeled お引き出し.', japanese: 'お引き出し (Ohikidashi)' },
      { title: 'Enter your PIN', detail: 'Use the number pad. Press 確認 (Confirm) when done.', japanese: '暗証番号 (Anshō bangō)' },
      { title: 'Enter the amount', detail: 'Type the amount in yen. Common: ¥10,000, ¥30,000, ¥50,000.', japanese: '金額 (Kingaku)' },
      { title: 'Collect cash and card', detail: 'Take your cash first, then your card. Don\'t forget the receipt.', japanese: '現金をお取りください' },
    ],
  },
  {
    id: 'transfer', label: 'Bank Transfer', icon: '💸',
    steps: [
      { title: 'Select Transfer', detail: 'Look for 振込 button on the main screen.', japanese: '振込 (Furikomi)' },
      { title: 'Choose transfer type', detail: '"From Cash" (現金) or "From Account" (口座).', japanese: '現金 / 口座' },
      { title: 'Enter recipient bank', detail: 'Search by bank name or enter the bank code.', japanese: '銀行名 (Ginkō-mei)' },
      { title: 'Enter branch & account', detail: 'Branch name (支店), account type (普通/当座), account number.', japanese: '支店・口座番号' },
      { title: 'Enter amount', detail: 'Type the transfer amount in yen.', japanese: '振込金額' },
      { title: 'Confirm and complete', detail: 'Review all details and press 確認 (Confirm).', japanese: '確認 (Kakunin)' },
    ],
  },
  {
    id: 'ticket', label: 'Train Ticket', icon: '🚃',
    steps: [
      { title: 'Find English mode', detail: 'Look for "English" button, usually in top-right corner.', japanese: '英語 (Eigo)' },
      { title: 'Check the fare', detail: 'Look at the fare map above the machine for your destination.', japanese: '運賃表 (Unchin-hyō)' },
      { title: 'Select ticket type', detail: 'Adult (大人/Otona) or Child (小人/Kodomo). Select number of tickets.', japanese: '大人 / 小人' },
      { title: 'Insert payment', detail: 'Feed cash into the slot or tap your IC card.', japanese: 'お金を入れてください' },
      { title: 'Collect your ticket', detail: 'Take your ticket and change from the bottom slot.', japanese: 'きっぷをお取りください' },
    ],
  },
  {
    id: 'convenience', label: 'Convenience Store', icon: '🏪',
    steps: [
      { title: 'Approach the counter', detail: 'For bill payment, package pickup, or services — go to the register.', japanese: 'レジ (Reji)' },
      { title: 'Tell clerk what you need', detail: 'For bills: hand the payment slip. For packages: show notification barcode.', japanese: 'お願いします (Onegai shimasu)' },
      { title: 'Use the payment terminal', detail: 'For self-pay: select payment method on the customer-facing screen.', japanese: 'お支払い方法 (Oshiharai hōhō)' },
      { title: 'Bags and receipt', detail: 'Bags cost ¥3-5. Say "Fukuro onegai shimasu" if you need one.', japanese: '袋 (Fukuro)' },
    ],
  },
  {
    id: 'restaurant', label: 'Restaurant Order', icon: '🍱',
    steps: [
      { title: 'Find the ordering method', detail: 'Ticket machine (食券機), tablet on table, or paper menu with call button.', japanese: '食券機 (Shokkenki)' },
      { title: 'Look for English mode', detail: 'Some machines have a language toggle at the top.', japanese: '英語 (Eigo)' },
      { title: 'Select your dish', detail: 'Tap the photo or name. Check for set meals (セット/定食) for better value.', japanese: '定食 (Teishoku) = Set meal' },
      { title: 'Choose size and toppings', detail: 'Large (大盛り), extra (トッピング). Confirm your selection.', japanese: '大盛り (Ōmori) = Large' },
      { title: 'Pay and get ticket', detail: 'Insert cash or tap card. Hand the ticket to staff.', japanese: '食券をスタッフへ' },
    ],
  },
  {
    id: 'hospital', label: 'Hospital / Clinic', icon: '🏥',
    steps: [
      { title: 'Go to reception', detail: 'Look for 受付 (Uketsuke) sign. Take a number if available.', japanese: '受付 (Uketsuke)' },
      { title: 'Show insurance card', detail: 'Hand over your health insurance card (保険証).', japanese: '保険証 (Hokenshō)' },
      { title: 'Fill intake form', detail: 'Name (名前), DOB (生年月日), symptoms (症状), allergies (アレルギー).', japanese: '問診票 (Monshin-hyō)' },
      { title: 'Wait to be called', detail: 'Sit in the waiting area. Listen for your name or number.', japanese: '待合室 (Machiaishitsu)' },
      { title: 'See the doctor', detail: 'When called, proceed to the exam room.', japanese: '診察室 (Shinsatsu-shitsu)' },
    ],
  },
  {
    id: 'post', label: 'Post Office', icon: '📮',
    steps: [
      { title: 'Take a number', detail: 'Get a ticket from the machine near the entrance.', japanese: '番号札 (Bangō-fuda)' },
      { title: 'Choose the right counter', detail: 'Mail/parcels (郵便), savings (貯金), insurance (保険).', japanese: '郵便 (Yūbin)' },
      { title: 'Fill out the form', detail: 'Sender address (差出人), recipient (届け先), contents (内容).', japanese: '差出人 / 届け先' },
      { title: 'Submit and pay', detail: 'Hand the form + package to the clerk. Pay the postage.', japanese: '料金 (Ryōkin) = Fee' },
    ],
  },
  {
    id: 'government', label: 'Government Office', icon: '🏛️',
    steps: [
      { title: 'Go to information desk', detail: 'Ask which form and counter number you need.', japanese: '案内 (Annai) = Information' },
      { title: 'Get the form', detail: 'Common: moving-in (転入届), resident cert (住民票), insurance (国民健康保険).', japanese: '届出 (Todokede) = Registration' },
      { title: 'Fill out the form', detail: 'Address (住所), name (氏名), DOB (生年月日), nationality (国籍).', japanese: '住所 / 氏名 / 生年月日' },
      { title: 'Submit at counter', detail: 'Hand in the form with your ID (passport or residence card).', japanese: '在留カード (Zairyū kādo)' },
      { title: 'Pay and collect', detail: 'Some documents cost ¥300-¥500. Wait for processing.', japanese: '手数料 (Tesūryō) = Fee' },
    ],
  },
  {
    id: 'checkout', label: 'Self-Checkout', icon: '🛒',
    steps: [
      { title: 'Start scanning', detail: 'Tap "Start" on the screen or scan your first item.', japanese: 'スタート / スキャン' },
      { title: 'Scan each barcode', detail: 'Hold the barcode under the scanner. Place item in the bagging area.', japanese: 'バーコードをかざしてください' },
      { title: 'Age-verified items', detail: 'For alcohol/tobacco, press the button and wait for staff approval.', japanese: '年齢確認 (Nenrei kakunin)' },
      { title: 'Select bags', detail: 'Choose "No bag" or buy bags (¥3-5 each).', japanese: 'レジ袋 (Reji-bukuro)' },
      { title: 'Pay', detail: 'Choose cash or card. Feed bills/coins or tap your card.', japanese: 'お支払い (Oshiharai)' },
      { title: 'Take receipt', detail: 'Collect your receipt and bags.', japanese: 'レシート (Reshīto)' },
    ],
  },
];

// ─── Help message type ───
interface HelpMessage {
  role: 'user' | 'assistant';
  text: string;
}

// ─── Component ───

export default function LiveGuidePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const userLang = profile?.language || 'en';

  // Scenario state
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Panel state
  const [panelPct, setPanelPct] = useState(45);
  const dragStartY = useRef(0);
  const dragStartPct = useRef(45);
  const isDragging = useRef(false);

  // Help chat state
  const [showHelp, setShowHelp] = useState(false);
  const [helpInput, setHelpInput] = useState('');
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const helpEndRef = useRef<HTMLDivElement>(null);

  // Conversation history for AI context
  const convoHistory = useRef<{ role: string; text?: string; image?: string }[]>([]);

  // ─── Camera ───

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError('');
        const vTrack = stream.getVideoTracks()[0];
        trackRef.current = vTrack;
      }
    } catch {
      setError('Camera access denied. Please allow camera permission.');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    trackRef.current = null;
    setCameraActive(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!trackRef.current) return;
    try {
      const caps = trackRef.current.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (caps.torch) {
        const next = !flashOn;
        await trackRef.current.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] } as MediaTrackConstraints);
        setFlashOn(next);
      }
    } catch { /* torch not supported */ }
  }, [flashOn]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  // ─── AI calls ───

  const callGuideAPI = useCallback(async (opts: { image?: string; question?: string }) => {
    const res = await fetch('/api/ai/live-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: opts.image || undefined,
        scenario: scenario?.id || 'custom',
        conversationHistory: convoHistory.current.slice(-10),
        question: opts.question || undefined,
        language: userLang,
      }),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.instruction as string;
  }, [scenario, userLang]);

  const translateScreen = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setAnalyzing(true);
    try {
      const instruction = await callGuideAPI({
        image: frame,
        question: 'Translate all Japanese text visible on this screen. Explain what each part means.',
      });
      convoHistory.current.push({ role: 'user', image: frame, text: 'Translate screen' });
      convoHistory.current.push({ role: 'assistant', text: instruction });
      setHelpMessages(prev => [
        ...prev,
        { role: 'user', text: '📷 Translate screen' },
        { role: 'assistant', text: instruction },
      ]);
      setShowHelp(true);
      setPanelPct(70);
    } catch { /* ignore */ }
    setAnalyzing(false);
  }, [captureFrame, callGuideAPI]);

  const sendHelpQuestion = useCallback(async () => {
    const q = helpInput.trim();
    if (!q || helpLoading) return;
    setHelpInput('');
    setHelpMessages(prev => [...prev, { role: 'user', text: q }]);
    setHelpLoading(true);

    try {
      const frame = captureFrame();
      const stepCtx = scenario ? `Current step: ${scenario.steps[currentStep]?.title} — ${scenario.steps[currentStep]?.detail}` : '';
      const instruction = await callGuideAPI({
        image: frame || undefined,
        question: `${stepCtx}\nUser question: ${q}`,
      });
      convoHistory.current.push({ role: 'user', text: q, image: frame || undefined });
      convoHistory.current.push({ role: 'assistant', text: instruction });
      setHelpMessages(prev => [...prev, { role: 'assistant', text: instruction }]);
    } catch {
      setHelpMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t get a response. Try again.' }]);
    }
    setHelpLoading(false);
  }, [helpInput, helpLoading, captureFrame, callGuideAPI, scenario, currentStep]);

  // ─── Panel drag ───

  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragStartPct.current = panelPct;
    isDragging.current = true;
  }, [panelPct]);

  const onDragMove = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    const dy = dragStartY.current - clientY;
    const vh = window.innerHeight;
    const newPct = Math.min(85, Math.max(20, dragStartPct.current + (dy / vh) * 100));
    setPanelPct(newPct);
  }, []);

  const onDragEnd = useCallback(() => {
    isDragging.current = false;
    // Snap
    setPanelPct(prev => {
      if (prev < 30) return 20;
      if (prev < 55) return 45;
      return 70;
    });
  }, []);

  // ─── Lifecycle ───

  useEffect(() => {
    return () => {
      stopCamera();
      speechSynthesis.cancel();
    };
  }, [stopCamera]);

  useEffect(() => {
    helpEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [helpMessages]);

  // ─── Select scenario and start camera ───

  const selectScenario = (s: Scenario) => {
    setScenario(s);
    setCurrentStep(0);
    setHelpMessages([]);
    convoHistory.current = [];
    setShowHelp(false);
    setPanelPct(45);
    // Start camera after a tick so DOM is ready
    setTimeout(startCamera, 100);
  };

  const exitToScenarios = () => {
    stopCamera();
    setScenario(null);
    setCurrentStep(0);
    setHelpMessages([]);
    setShowHelp(false);
    setFlashOn(false);
  };

  // ═══════════════════════════════════════
  // RENDER: Scenario Picker
  // ═══════════════════════════════════════

  if (!scenario) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold">Live Guide</h1>
            <p className="text-xs text-slate-500">Choose a scenario to get AI guidance</p>
          </div>
        </div>

        {/* Scenario Grid */}
        <div className="px-4 pt-5 pb-24">
          <div className="grid grid-cols-3 gap-3">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => selectScenario(s)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 active:bg-indigo-600/20 active:border-indigo-500/30 transition-colors"
              >
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xs font-medium text-slate-300 text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Tip */}
          <div className="mt-6 rounded-xl bg-indigo-600/10 border border-indigo-500/20 p-4">
            <p className="text-sm text-indigo-300 font-medium mb-1">How it works</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a scenario, then point your camera at the screen or machine.
              Follow the step-by-step guide, and tap &quot;I need help&quot; anytime to ask AI for specific guidance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // RENDER: Camera + Guidance Overlay
  // ═══════════════════════════════════════

  const step = scenario.steps[currentStep];
  const totalSteps = scenario.steps.length;
  const isLastStep = currentStep >= totalSteps - 1;

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ─── Top Bar ─── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={exitToScenarios} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{scenario.icon} {scenario.label}</p>
          <p className="text-[10px] text-slate-400">Step {currentStep + 1} of {totalSteps}</p>
        </div>
        <button onClick={toggleFlash} className={`w-10 h-10 flex items-center justify-center rounded-full ${flashOn ? 'bg-yellow-500/20' : 'active:bg-white/10'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={flashOn ? '#facc15' : 'none'} stroke={flashOn ? '#facc15' : 'white'} strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </button>
      </div>

      {/* ─── Camera Feed ─── */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p className="text-slate-500 text-sm text-center">Starting camera...</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={startCamera} className="bg-indigo-600 rounded-xl px-6 py-3 text-sm font-semibold active:bg-indigo-700">
              Start Camera
            </button>
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-black/80 rounded-2xl px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <span className="text-sm">Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Draggable Bottom Panel ─── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 flex flex-col bg-[#111113]/95 backdrop-blur-md rounded-t-2xl border-t border-white/10 overflow-hidden"
        style={{ height: `${panelPct}%`, transition: isDragging.current ? 'none' : 'height 0.3s ease' }}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={e => onDragStart(e.touches[0].clientY)}
          onTouchMove={e => onDragMove(e.touches[0].clientY)}
          onTouchEnd={onDragEnd}
          onMouseDown={e => onDragStart(e.clientY)}
          onMouseMove={e => { if (isDragging.current) onDragMove(e.clientY); }}
          onMouseUp={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Panel content — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">

          {/* ── Current Step ── */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                STEP {currentStep + 1}/{totalSteps}
              </span>
              {step.japanese && (
                <span className="text-[10px] text-amber-400/70 font-mono">{step.japanese}</span>
              )}
            </div>
            <h2 className="text-base font-bold mb-1">{step.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{step.detail}</p>
          </div>

          {/* ── Step nav buttons ── */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium disabled:opacity-20 active:bg-white/5"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              disabled={isLastStep}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold disabled:opacity-30 active:bg-indigo-700"
            >
              Next Step →
            </button>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setShowHelp(h => !h); if (!showHelp) setPanelPct(70); }}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${showHelp ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'border-white/10 text-slate-300 active:bg-white/5'}`}
            >
              💬 I need help
            </button>
            <button
              onClick={translateScreen}
              disabled={analyzing || !cameraActive}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 active:bg-white/5 disabled:opacity-30"
            >
              📷 Translate screen
            </button>
          </div>

          {/* ── Step overview (mini) ── */}
          {!showHelp && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">All steps</p>
              {scenario.steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    i === currentStep ? 'bg-indigo-600/15 border border-indigo-500/30' : 'active:bg-white/5'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i < currentStep ? 'bg-green-500/20 text-green-400' : i === currentStep ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-600'
                  }`}>
                    {i < currentStep ? '✓' : i + 1}
                  </span>
                  <span className={`text-xs ${i === currentStep ? 'text-white font-medium' : i < currentStep ? 'text-slate-500' : 'text-slate-500'}`}>
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Help Chat ── */}
          {showHelp && (
            <div>
              <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">AI Help</p>

              {helpMessages.length === 0 && (
                <p className="text-xs text-slate-600 italic mb-3">Ask anything about what you see — the AI can see your camera.</p>
              )}

              <div className="space-y-2 mb-3">
                {helpMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/[0.06] text-slate-300'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {helpLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2">
                      <div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={helpEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={helpInput}
                  onChange={e => setHelpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendHelpQuestion(); }}
                  placeholder="Ask about what you see..."
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={sendHelpQuestion}
                  disabled={!helpInput.trim() || helpLoading}
                  className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:bg-indigo-700"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
