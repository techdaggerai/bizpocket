'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Step = 'camera' | 'loading' | 'result';

interface CardData {
  name_japanese: string;
  name_romaji: string;
  company_japanese: string;
  company_english: string;
  title_japanese: string;
  title_english: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  address_japanese: string;
  address_english: string;
  website: string;
  department: string;
  language: string;
}

interface Props {
  onClose: () => void;
  onSave: (data: { name: string; company: string; phone: string; email: string; language: string; notes: string }) => void;
}

const EMPTY_CARD: CardData = {
  name_japanese: '', name_romaji: '', company_japanese: '', company_english: '',
  title_japanese: '', title_english: '', email: '', phone: '', mobile: '', fax: '',
  address_japanese: '', address_english: '', website: '', department: '', language: 'ja',
};

export default function BusinessCardScanner({ onClose, onSave }: Props) {
  const [step, setStep] = useState<Step>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [card, setCard] = useState<CardData>(EMPTY_CARD);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraReady(true); setError(''); }
    } catch { setError('Camera access denied.'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraReady(false);
  }, []);

  useEffect(() => { if (step === 'camera') startCamera(); return () => stopCamera(); }, [step, startCamera, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    scan(dataUrl);
  }, [stopCamera]);

  const handleGallery = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result as string; setCapturedImage(url); stopCamera(); scan(url); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  async function scan(imageData: string) {
    setStep('loading');
    setError('');
    try {
      const res = await fetch('/api/ai/scan-business-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (!data.has_card && data.has_card !== undefined) {
        setError('No business card detected. Please try again with a clearer photo.');
        setStep('camera');
        return;
      }
      setCard({ ...EMPTY_CARD, ...data });
      setStep('result');
    } catch {
      setError('Scan failed. Please try again.');
      setStep('camera');
    }
  }

  function handleSaveContact() {
    const name = card.name_romaji || card.name_japanese || 'Unknown';
    const company = card.company_english || card.company_japanese || '';
    const phone = card.mobile || card.phone || '';
    const notes = [
      card.title_english && `Title: ${card.title_english}`,
      card.title_japanese && `役職: ${card.title_japanese}`,
      card.department && `Dept: ${card.department}`,
      card.address_english && `Address: ${card.address_english}`,
      card.website && `Web: ${card.website}`,
      card.fax && `Fax: ${card.fax}`,
    ].filter(Boolean).join('\n');

    onSave({ name, company, phone, email: card.email || '', language: card.language || 'ja', notes });
  }

  function updateField(key: keyof CardData, value: string) {
    setCard(prev => ({ ...prev, [key]: value }));
  }

  const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none";

  // ─── Camera ───
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col">
        <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={onClose} className="text-white text-sm font-medium">Cancel</button>
          <p className="text-white/80 text-xs font-medium">📇 Scan Business Card</p>
          <div className="w-12" />
        </div>
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[88%] max-w-[360px] aspect-[9/5] border-2 border-white/50 rounded-xl" />
          </div>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
              <div className="bg-slate-800 rounded-2xl p-6 text-center max-w-sm">
                <p className="text-sm text-[#DC2626] font-medium mb-3">{error}</p>
                <button onClick={onClose} className="text-sm text-[#4F46E5] font-medium">Go Back</button>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 flex items-center justify-around px-6 py-5 bg-gradient-to-t from-black/80 to-transparent">
          <button onClick={onClose} className="text-white/60 text-xs">Cancel</button>
          <button onClick={capture} disabled={!cameraReady} className="h-[68px] w-[68px] rounded-full border-[3px] border-white flex items-center justify-center disabled:opacity-40">
            <div className="h-[56px] w-[56px] rounded-full bg-slate-800" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-white/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGallery} />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ─── Loading ───
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 animate-pulse" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-[#4F46E5] animate-spin" />
          <p className="text-white text-sm font-medium">Reading business card...</p>
        </div>
      </div>
    );
  }

  // ─── Result ───
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-sm text-[#9CA3AF] font-medium">Cancel</button>
        <p className="text-sm font-bold text-slate-50">📇 Business Card</p>
        <button onClick={handleSaveContact} className="text-sm text-[#4F46E5] font-bold">Save</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Card" className="w-full max-h-[160px] object-contain rounded-xl bg-slate-700" />
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Name (Romaji)</label>
              <input value={card.name_romaji} onChange={e => updateField('name_romaji', e.target.value)} placeholder="Tanaka Taro" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Name (Japanese)</label>
              <input value={card.name_japanese} onChange={e => updateField('name_japanese', e.target.value)} placeholder="田中太郎" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Company</label>
              <input value={card.company_english || card.company_japanese} onChange={e => updateField('company_english', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Title</label>
              <input value={card.title_english || card.title_japanese} onChange={e => updateField('title_english', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Email</label>
            <input value={card.email} onChange={e => updateField('email', e.target.value)} type="email" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Phone</label>
              <input value={card.phone} onChange={e => updateField('phone', e.target.value)} type="tel" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Mobile</label>
              <input value={card.mobile} onChange={e => updateField('mobile', e.target.value)} type="tel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Website</label>
            <input value={card.website} onChange={e => updateField('website', e.target.value)} type="url" className={inputCls} />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">Address</label>
            <input value={card.address_english || card.address_japanese} onChange={e => updateField('address_english', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-700 px-4 py-3 flex gap-2">
        <button onClick={() => { setStep('camera'); setCapturedImage(null); setCard(EMPTY_CARD); }} className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300">
          Scan Again
        </button>
        <button onClick={handleSaveContact} className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white">
          Save as Contact
        </button>
      </div>
    </div>
  );
}
