'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { QRCodeCanvas } from 'qrcode.react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { organization } = useAuth();
  const [inviteUrl, setInviteUrl] = useState('');
  const [permanentUrl, setPermanentUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    generateInvite();
  }, [isOpen]);

  async function generateInvite() {
    setLoading(true);
    try {
      const res = await fetch('/api/invites/create', { method: 'POST' });
      const data = await res.json();
      if (data.invite_url) {
        setInviteUrl(data.invite_url);
        setPermanentUrl(data.permanent_url);
      }
    } catch {
      // Fallback to generic signup link
      setInviteUrl(`${window.location.origin}/signup`);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const shareMsg = `Chat with me on Evrywher — AI translates in real-time! Join here: ${inviteUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Evrywher',
        text: shareMsg,
        url: inviteUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  function handleShareMessage() {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Evrywher',
        text: shareMsg,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareMsg).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Invite to Evrywher</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Generating invite...</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              {permanentUrl && (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeCanvas value={permanentUrl} size={180} level="M" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Scan to connect on Evrywher</p>
                </div>
              )}

              {/* Invite link */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Your invite link</p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-[10px] border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-400 truncate">
                    {inviteUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`rounded-[10px] px-4 py-2.5 text-xs font-semibold transition-colors ${
                      copied ? 'bg-[#16A34A] text-white' : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[10px] border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                  Share Link
                </button>
                <button
                  onClick={handleShareMessage}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#4F46E5] py-3 text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                  Send Message
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
