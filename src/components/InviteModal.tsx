'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { organization } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSendInvite() {
    if (!name.trim() || (!email.trim() && !phone.trim())) return;
    setSending(true);

    // Copy a personalized invite message to clipboard — backend email/SMS API coming soon
    const personalMsg = `Hey ${name.trim()}! ${organization.name} invited you to BizPocket — the AI business autopilot. Sign up here: ${inviteLink}`;
    try {
      await navigator.clipboard.writeText(personalMsg);
    } catch {}

    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setPhone('');
    }, 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Join ${organization.name} on BizPocket`,
        text: `${organization.name} invited you to BizPocket — the AI business autopilot.`,
        url: inviteLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Invite to Evrywher</h2>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick share link */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Share invite link</p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-[10px] border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-[#6B7280] truncate">
                {inviteLink}
              </div>
              <button
                onClick={handleCopyLink}
                className={`rounded-[10px] px-4 py-2.5 text-xs font-semibold transition-colors ${
                  copied
                    ? 'bg-[#16A34A] text-white'
                    : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E5E5E5]" />
            <span className="text-[10px] text-[#A3A3A3] uppercase">or send directly</span>
            <div className="flex-1 h-px bg-[#E5E5E5]" />
          </div>

          {/* Send invite form */}
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-sm text-white placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-sm text-white placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-sm text-white placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 rounded-[10px] border border-slate-700 py-2.5 text-xs font-medium text-[#6B7280] hover:bg-slate-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
              Share
            </button>
            <button
              onClick={handleSendInvite}
              disabled={!name.trim() || (!email.trim() && !phone.trim()) || sending}
              className={`flex-1 rounded-[10px] py-2.5 text-xs font-semibold transition-colors ${
                sent
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-40'
              }`}
            >
              {sent ? 'Copied to clipboard!' : sending ? 'Preparing...' : 'Copy Invite Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
