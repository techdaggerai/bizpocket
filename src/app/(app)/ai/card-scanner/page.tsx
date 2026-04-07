'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Upload, ScanLine, Save, Download, Check, User, Building2, Briefcase, Phone, Mail, MapPin, Globe, MessageCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/lib/auth-context';

type Step = 'capture' | 'scanning' | 'result' | 'saved';

interface CardData {
  name: string;
  name_translated: string;
  company: string;
  company_translated: string;
  title: string;
  title_translated: string;
  phone: string;
  email: string;
  address: string;
  address_translated: string;
  website: string;
  line_id: string;
  detected_language: string;
  has_card: boolean;
}

const EMPTY_CARD: CardData = {
  name: '', name_translated: '', company: '', company_translated: '',
  title: '', title_translated: '', phone: '', email: '',
  address: '', address_translated: '', website: '', line_id: '',
  detected_language: '', has_card: true,
};

function generateVCard(c: CardData): string {
  const fn = c.name_translated || c.name;
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fn}`,
    c.company_translated || c.company ? `ORG:${c.company_translated || c.company}` : '',
    c.title_translated || c.title ? `TITLE:${c.title_translated || c.title}` : '',
    c.phone ? `TEL:${c.phone}` : '',
    c.email ? `EMAIL:${c.email}` : '',
    c.address_translated || c.address ? `ADR:;;${c.address_translated || c.address};;;;` : '',
    c.website ? `URL:${c.website}` : '',
    'NOTE:Scanned by Evrywher',
    'END:VCARD',
  ].filter(Boolean).join('\n');
}

export default function CardScannerPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [step, setStep] = useState<Step>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData>(EMPTY_CARD);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [saving, setSaving] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setCameraError('Camera access denied. Use the upload button instead.');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (step === 'capture' && !capturedImage) startCamera();
    return () => { if (step !== 'capture') stopCamera(); };
  }, [step, startCamera, stopCamera, capturedImage]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Scan ───
  const scanCard = useCallback(async (imageData: string) => {
    setStep('scanning');
    setError('');

    try {
      const res = await fetch('/api/ai/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Scan failed');
      }

      const data = await res.json();
      if (!data.has_card) {
        throw new Error('No business card detected. Please try again with a clearer image.');
      }

      setCardData({ ...EMPTY_CARD, ...data });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setStep('capture');
    }
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setCardData(EMPTY_CARD);
    setError('');
    setStep('capture');
  }, []);

  // ─── Save Contact ───
  const saveContact = useCallback(async () => {
    if (!organization?.id) {
      setError('No organization found');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const contactName = cardData.name_translated || cardData.name;
      if (!contactName.trim()) throw new Error('Name is required');

      const notes = [
        cardData.detected_language ? `Language: ${cardData.detected_language}` : '',
        cardData.name && cardData.name !== contactName ? `Original name: ${cardData.name}` : '',
        cardData.company ? `Company: ${cardData.company}` : '',
        cardData.company_translated && cardData.company_translated !== cardData.company ? `Company (EN): ${cardData.company_translated}` : '',
        cardData.title ? `Title: ${cardData.title}` : '',
        cardData.title_translated && cardData.title_translated !== cardData.title ? `Title (EN): ${cardData.title_translated}` : '',
        cardData.address ? `Address: ${cardData.address}` : '',
        cardData.line_id ? `LINE: ${cardData.line_id}` : '',
      ].filter(Boolean).join('\n');

      const { error: insertError } = await supabase.from('contacts').insert({
        organization_id: organization.id,
        name: contactName,
        email: cardData.email || null,
        phone: cardData.phone || null,
        notes: notes || null,
      });

      if (insertError) throw new Error(insertError.message);
      setStep('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }, [cardData, organization?.id, supabase]);

  // ─── vCard ───
  const shareVCard = useCallback(async () => {
    const vcf = generateVCard(cardData);
    const blob = new Blob([vcf], { type: 'text/vcard' });
    const fileName = `${(cardData.name_translated || cardData.name || 'contact').replace(/\s+/g, '_')}.vcf`;

    if (navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'text/vcard' });
        await navigator.share({ files: [file] });
        return;
      } catch { /* fall through to download */ }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [cardData]);

  // ─── Field Update ───
  const updateField = (key: keyof CardData, value: string) => {
    setCardData(prev => ({ ...prev, [key]: value }));
  };

  // ═══════════════════════════════════════
  //  STEP 1: CAPTURE
  // ═══════════════════════════════════════
  if (step === 'capture') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Business Card Scanner</h1>
          {!capturedImage && (
            <button
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              className="pt-3 pb-3 text-slate-400 active:text-white text-xs"
            >
              Flip
            </button>
          )}
        </div>

        {capturedImage ? (
          /* Preview captured image */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Card" className="max-w-full max-h-full rounded-2xl object-contain" />
            </div>
            {error && (
              <div className="px-4 pb-2">
                <div className="rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3 text-sm text-red-400 text-center">{error}</div>
              </div>
            )}
            <div className="px-4 pb-[env(safe-area-inset-bottom)] space-y-2 pb-6">
              <button
                onClick={() => scanCard(capturedImage)}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white active:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <ScanLine size={18} /> Scan Card
              </button>
              <button
                onClick={retake}
                className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-300 active:bg-slate-700"
              >
                Retake
              </button>
            </div>
          </div>
        ) : (
          /* Camera view */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

              {/* Card outline guide */}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[88%] max-w-[360px] aspect-[9/5] border-2 border-white/30 rounded-xl">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <p className="text-white/50 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                        Align card within frame
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-8">
                  <div className="bg-slate-800 rounded-2xl p-6 text-center max-w-sm">
                    <Camera size={32} className="text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-300 mb-4">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom capture bar */}
            <div className="relative z-10 bg-gradient-to-t from-slate-900/90 to-transparent px-4 pb-[env(safe-area-inset-bottom)] pb-6">
              <div className="flex items-center justify-around py-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 p-3 active:opacity-60"
                >
                  <Upload size={22} className="text-white/60" />
                  <span className="text-[10px] text-white/50">Upload</span>
                </button>

                <button
                  onClick={capture}
                  disabled={!cameraReady}
                  className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center active:bg-indigo-700 disabled:opacity-40 shadow-lg shadow-indigo-600/30"
                >
                  <Camera size={28} className="text-white" />
                </button>

                <div className="w-[56px]" /> {/* spacer */}
              </div>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  SCANNING
  // ═══════════════════════════════════════
  if (step === 'scanning') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center">
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Scanning" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur rounded-2xl px-6 py-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-cyan-500"
                  style={{
                    animation: 'cardBounce 1.4s infinite ease-in-out both',
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-white text-sm font-medium ml-2">Reading card...</span>
          </div>
        </div>
        <style jsx>{`
          @keyframes cardBounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  SAVED CONFIRMATION
  // ═══════════════════════════════════════
  if (step === 'saved') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mb-4">
          <Check size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Contact Saved</h2>
        <p className="text-sm text-slate-400 text-center mb-6">
          {cardData.name_translated || cardData.name} has been added to your contacts.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={retake}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:bg-indigo-700"
          >
            Scan Another Card
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-300 active:bg-slate-700"
          >
            Go to Chats
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  STEP 2 & 3: EXTRACTED INFO + SAVE
  // ═══════════════════════════════════════
  const fields: { key: keyof CardData; translatedKey?: keyof CardData; label: string; icon: React.ReactNode }[] = [
    { key: 'name', translatedKey: 'name_translated', label: 'Name', icon: <User size={16} /> },
    { key: 'company', translatedKey: 'company_translated', label: 'Company', icon: <Building2 size={16} /> },
    { key: 'title', translatedKey: 'title_translated', label: 'Title', icon: <Briefcase size={16} /> },
    { key: 'phone', label: 'Phone', icon: <Phone size={16} /> },
    { key: 'email', label: 'Email', icon: <Mail size={16} /> },
    { key: 'address', translatedKey: 'address_translated', label: 'Address', icon: <MapPin size={16} /> },
    { key: 'website', label: 'Website', icon: <Globe size={16} /> },
    { key: 'line_id', label: 'LINE ID', icon: <MessageCircle size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
        <div className="pt-3 pb-3">
          <button onClick={retake} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
        </div>
        <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Card Details</h1>
        {cardData.detected_language && (
          <span className="bg-amber-600/20 text-amber-400 text-[10px] font-medium rounded-full px-2.5 py-0.5 mt-3 mb-3">
            {cardData.detected_language}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-48">
        {/* Card image preview */}
        {capturedImage && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl overflow-hidden" style={{ maxHeight: '40vh' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Business card" className="w-full object-cover" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 pt-3">
            <div className="rounded-xl bg-red-950/30 border border-red-800/30 px-4 py-3 text-sm text-red-400 text-center">{error}</div>
          </div>
        )}

        {/* Fields */}
        <div className="px-4 pt-4 space-y-3">
          {fields.map(({ key, translatedKey, label, icon }) => {
            const original = cardData[key] as string;
            const translated = translatedKey ? cardData[translatedKey] as string : '';
            const hasTranslation = translatedKey && translated && translated !== original;

            if (!original && !translated) return null;

            return (
              <div key={key} className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-slate-500">{icon}</span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                </div>

                {/* Original text */}
                {original && hasTranslation && (
                  <p className="text-slate-400 text-sm mb-1.5">{original}</p>
                )}

                {/* Editable translated/primary field */}
                <input
                  type="text"
                  value={hasTranslation ? translated : original}
                  onChange={e => updateField(hasTranslation ? translatedKey! : key, e.target.value)}
                  className="w-full bg-transparent text-white text-base outline-none border-b border-transparent focus:border-indigo-500/50 pb-0.5 transition-colors"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-[env(safe-area-inset-bottom)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <button
          onClick={saveContact}
          disabled={saving}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving...' : 'Save to Contacts'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={shareVCard}
            className="flex-1 rounded-xl border border-amber-500/50 py-2.5 text-sm font-medium text-amber-400 active:bg-amber-500/10 flex items-center justify-center gap-2"
          >
            <Download size={14} /> vCard
          </button>
          <button
            onClick={retake}
            className="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-300 active:bg-slate-700 flex items-center justify-center gap-2"
          >
            <Camera size={14} /> Scan Another
          </button>
        </div>
      </div>
    </div>
  );
}
