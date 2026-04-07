'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface OTPInputProps {
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  error?: string;
  dark?: boolean;
}

export default function OTPInput({ phone, onVerify, onResend, loading, error, dark = true }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(45);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Auto-submit when all 6 digits entered
  const checkComplete = useCallback((newDigits: string[]) => {
    const code = newDigits.join('');
    if (code.length === 6 && newDigits.every(d => d !== '')) {
      onVerify(code);
    }
  }, [onVerify]);

  function handleChange(index: number, value: string) {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }

    checkComplete(newDigits);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
    checkComplete(newDigits);
  }

  function handleResend() {
    setResendCountdown(45);
    setDigits(['', '', '', '', '', '']);
    refs.current[0]?.focus();
    onResend();
  }

  // Mask phone: +81 90 **** 5678
  function maskPhone(p: string): string {
    if (p.length <= 6) return p;
    const last4 = p.slice(-4);
    const prefix = p.slice(0, 4);
    const middle = p.slice(4, -4).replace(/\d/g, '*');
    return `${prefix} ${middle} ${last4}`;
  }
  const masked = maskPhone(phone);

  const bg = dark ? 'bg-slate-800' : 'bg-gray-100';
  const text = dark ? 'text-white' : 'text-[var(--text-1)]';
  const border = dark ? 'border-slate-700' : 'border-gray-300';

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className={`text-xl font-bold ${text}`}>Enter the code</h2>
        <p className={`text-sm mt-1.5 ${dark ? 'text-slate-400' : 'text-[var(--text-3)]'}`}>
          Sent to {masked}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 px-4 py-2 rounded-lg text-center">{error}</p>
      )}

      {/* 6 OTP boxes */}
      <div className="flex gap-3 justify-center" onPaste={handlePaste}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i]}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
            disabled={loading}
            className={`w-12 h-14 text-center text-2xl font-bold ${bg} ${text} rounded-xl border-2 ${border} focus:border-indigo-500 outline-none transition-colors disabled:opacity-50`}
          />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center">
          <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Resend */}
      <div className="text-center">
        {resendCountdown > 0 ? (
          <p className={`text-sm ${dark ? 'text-slate-500' : 'text-[var(--text-4)]'}`}>
            Resend in {resendCountdown}s
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-sm text-indigo-400 font-medium active:opacity-60"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}
