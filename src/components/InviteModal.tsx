'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { QRCodeCanvas } from 'qrcode.react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { profile } = useAuth();
  const [vanityUrl, setVanityUrl] = useState('');
  const [permanentUrl, setPermanentUrl] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    generateInvite();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateInvite() {
    setLoading(true);
    try {
      const res = await fetch('/api/invites/create', { method: 'POST' });
      const data = await res.json();
      if (data.vanity_url) {
        setVanityUrl(data.vanity_url);
        setPermanentUrl(data.permanent_url);
        setUsername(data.username);
      }
    } catch {
      // Fallback
      setVanityUrl(`${window.location.origin}/signup`);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const shareLink = vanityUrl || permanentUrl;
  const shareMsg = `Chat with me on Evrywher! ${shareLink}`;
  const displayName = profile?.full_name || profile?.name || 'me';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareVia(app: 'whatsapp' | 'line' | 'sms' | 'email') {
    const text = encodeURIComponent(shareMsg);
    const url = encodeURIComponent(shareLink);
    const subject = encodeURIComponent(`Chat with ${displayName} on Evrywher`);

    switch (app) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${text}`, '_blank');
        break;
      case 'line':
        window.open(`https://line.me/R/share?text=${text}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${text}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${subject}&body=${text}`, '_blank');
        break;
    }
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({ title: `Chat with ${displayName}`, text: shareMsg, url: shareLink }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Share Your Link</h2>
            <button onClick={onClose} className="text-slate-400 active:text-white p-1">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-5">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-2">Generating your link...</p>
              </div>
            ) : (
              <>
                {/* QR Code */}
                {shareLink && (
                  <div className="flex flex-col items-center">
                    <button onClick={() => setQrFullscreen(true)} className="bg-white p-3 rounded-xl active:scale-95 transition-transform">
                      <QRCodeCanvas value={shareLink} size={180} level="M" />
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2">Tap to enlarge</p>
                  </div>
                )}

                {/* Vanity link */}
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Your invite link</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white truncate font-mono">
                      evrywher.io/c/{username}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shrink-0 ${
                        copied ? 'bg-[#16A34A] text-white' : 'bg-[#4F46E5] text-white active:bg-[#4338CA]'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Share buttons grid */}
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Share via</p>
                  <div className="grid grid-cols-5 gap-2">
                    {/* WhatsApp */}
                    <button onClick={() => shareVia('whatsapp')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl active:bg-slate-700/50">
                      <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400">WhatsApp</span>
                    </button>

                    {/* LINE */}
                    <button onClick={() => shareVia('line')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl active:bg-slate-700/50">
                      <div className="w-11 h-11 rounded-full bg-[#00B900] flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400">LINE</span>
                    </button>

                    {/* SMS */}
                    <button onClick={() => shareVia('sms')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl active:bg-slate-700/50">
                      <div className="w-11 h-11 rounded-full bg-[#34C759] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400">SMS</span>
                    </button>

                    {/* Email */}
                    <button onClick={() => shareVia('email')} className="flex flex-col items-center gap-1.5 py-2 rounded-xl active:bg-slate-700/50">
                      <div className="w-11 h-11 rounded-full bg-[#6366F1] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400">Email</span>
                    </button>

                    {/* More / Native Share */}
                    <button onClick={handleNativeShare} className="flex flex-col items-center gap-1.5 py-2 rounded-xl active:bg-slate-700/50">
                      <div className="w-11 h-11 rounded-full bg-slate-600 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      </div>
                      <span className="text-[10px] text-slate-400">More</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* QR Fullscreen overlay */}
      {qrFullscreen && shareLink && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center" onClick={() => setQrFullscreen(false)}>
          <QRCodeCanvas value={shareLink} size={280} level="H" />
          <p className="text-sm text-slate-600 mt-4 font-medium">evrywher.io/c/{username}</p>
          <p className="text-xs text-slate-400 mt-1">Scan to chat with {displayName}</p>
          <button className="mt-6 text-sm text-indigo-600 font-semibold active:opacity-60">Tap anywhere to close</button>
        </div>
      )}
    </>
  );
}
