'use client';

import { useState, useEffect, useCallback } from 'react';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';

const STORAGE_KEY = 'evrywher-chat-lock-pin';
const COOLDOWN_KEY = 'evrywher-chat-lock-cooldown';
const COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 3;

// Simple hash: SHA-256 via Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin + 'evrywher-salt'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useChatLock() {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setEnabled(true);
      setLocked(true);
    }
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  const enableLock = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    localStorage.setItem(STORAGE_KEY, hash);
    setEnabled(true);
    setLocked(false);
  }, []);

  const disableLock = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COOLDOWN_KEY);
    setEnabled(false);
    setLocked(false);
  }, []);

  return { enabled, locked, unlock, enableLock, disableLock };
}

interface Props {
  onUnlock: () => void;
}

export default function ChatLockScreen({ onUnlock }: Props) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [error, setError] = useState('');
  const maxDigits = 6;

  // Restore cooldown on mount
  useEffect(() => {
    const cooldownEnd = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownEnd) {
      const remaining = Math.ceil((Number(cooldownEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownLeft(remaining);
      } else {
        localStorage.removeItem(COOLDOWN_KEY);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => {
      setCooldownLeft(n => {
        if (n <= 1) {
          localStorage.removeItem(COOLDOWN_KEY);
          setAttempts(0);
          setError('');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  // Auto-submit when pin reaches min length (4) and user hits enter, or max (6)
  useEffect(() => {
    if (digits.length === maxDigits) {
      verifyPin(digits.join(''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  async function verifyPin(pin: string) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) { onUnlock(); return; }
    const hash = await hashPin(pin);
    if (hash === stored) {
      setAttempts(0);
      setError('');
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShake(true);
      setTimeout(() => { setShake(false); setDigits([]); }, 500);
      if (newAttempts >= MAX_ATTEMPTS) {
        const cooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem(COOLDOWN_KEY, String(cooldownEnd));
        setCooldownLeft(COOLDOWN_SECONDS);
        setError(`Too many attempts. Wait ${COOLDOWN_SECONDS}s.`);
      } else {
        setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} left.`);
      }
    }
  }

  function pressDigit(d: string) {
    if (cooldownLeft > 0) return;
    if (digits.length >= maxDigits) return;
    setDigits(prev => [...prev, d]);
  }

  function backspace() {
    if (cooldownLeft > 0) return;
    setDigits(prev => prev.slice(0, -1));
  }

  function submitPin() {
    if (cooldownLeft > 0 || digits.length < 4) return;
    verifyPin(digits.join(''));
  }

  const PAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F46E5] select-none">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div style={{ overflow: 'visible' }}>
          <AnimatedPocketChatLogo size={64} isTranslating={false} />
        </div>
        <p className="text-white text-[15px] font-semibold tracking-wide">Evrywher</p>
      </div>

      {/* PIN dots */}
      <div
        className="flex items-center gap-3 mb-2"
        style={{
          animation: shake ? 'lock-shake 0.4s ease' : undefined,
        }}
      >
        {Array.from({ length: maxDigits }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-150 ${
              i < digits.length
                ? 'bg-slate-800 w-4 h-4'
                : 'bg-slate-800/30 w-3 h-3'
            }`}
          />
        ))}
      </div>

      {/* Error / cooldown */}
      <p className="text-white/80 text-[13px] mb-6 h-5 text-center">
        {cooldownLeft > 0 ? `Try again in ${cooldownLeft}s` : error}
      </p>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3">
        {PAD.flat().map((key, idx) => {
          if (key === '') return <div key={idx} />;
          const isBack = key === '⌫';
          return (
            <button
              key={key + idx}
              onClick={() => isBack ? backspace() : pressDigit(key)}
              disabled={cooldownLeft > 0}
              className={`
                w-[72px] h-[72px] rounded-full text-white text-xl font-semibold
                flex items-center justify-center transition-all active:scale-95
                ${cooldownLeft > 0 ? 'opacity-40 cursor-not-allowed' : 'bg-slate-800/20 hover:bg-slate-800/30 active:bg-slate-800/40'}
              `}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Submit if 4-5 digits (6 auto-submits) */}
      {digits.length >= 4 && digits.length < maxDigits && (
        <button
          onClick={submitPin}
          className="mt-6 rounded-full bg-slate-800 text-indigo-400 px-8 py-2.5 text-[15px] font-semibold hover:bg-slate-800/90 transition-colors"
        >
          Unlock
        </button>
      )}

      <style>{`
        @keyframes lock-shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-10px); }
          40%  { transform: translateX(10px); }
          60%  { transform: translateX(-8px); }
          80%  { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────
// PIN Setup modal (used in Settings)
// ────────────────────────────────────────────────────
interface SetupProps {
  onSave: (pin: string) => void;
  onCancel: () => void;
}

export function ChatLockSetupModal({ onSave, onCancel }: SetupProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState<string[]>([]);
  const [second, setSecond] = useState<string[]>([]);
  const [error, setError] = useState('');
  const maxDigits = 6;

  const digits = step === 'enter' ? first : second;
  const setDigits = step === 'enter' ? setFirst : setSecond;

  useEffect(() => {
    if (step === 'enter' && first.length === maxDigits) {
      setStep('confirm');
    }
    if (step === 'confirm' && second.length === maxDigits) {
      if (second.join('') === first.join('')) {
        onSave(first.join(''));
      } else {
        setError('PINs do not match. Try again.');
        setFirst([]);
        setSecond([]);
        setStep('enter');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, second]);

  function pressDigit(d: string) {
    if (digits.length >= maxDigits) return;
    setDigits(prev => [...prev, d]);
  }

  function backspace() {
    setDigits(prev => prev.slice(0, -1));
  }

  const PAD = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-xs mx-auto p-6 flex flex-col items-center">
        <h2 className="text-[16px] font-bold text-white mb-1">
          {step === 'enter' ? 'Set Chat Lock PIN' : 'Confirm PIN'}
        </h2>
        <p className="text-[13px] text-[#9CA3AF] mb-5">
          {step === 'enter' ? 'Choose a 4–6 digit PIN' : 'Enter your PIN again'}
        </p>

        {error ? (
          <p className="text-[12px] text-[#DC2626] mb-3 text-center">{error}</p>
        ) : null}

        {/* Dots */}
        <div className="flex items-center gap-3 mb-6">
          {Array.from({ length: maxDigits }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-150 ${
                i < digits.length
                  ? 'bg-[#4F46E5] w-4 h-4'
                  : 'bg-[#E5E7EB] w-3 h-3'
              }`}
            />
          ))}
        </div>

        {/* Pad */}
        <div className="grid grid-cols-3 gap-3">
          {PAD.flat().map((key, idx) => {
            if (key === '') return <div key={idx} />;
            const isBack = key === '⌫';
            return (
              <button
                key={key + idx}
                onClick={() => isBack ? backspace() : pressDigit(key)}
                className="w-[64px] h-[64px] rounded-full text-white text-xl font-semibold bg-slate-700 hover:bg-[#E5E7EB] active:scale-95 flex items-center justify-center transition-all"
              >
                {key}
              </button>
            );
          })}
        </div>

        <button onClick={onCancel} className="mt-5 text-[13px] text-[#9CA3AF] hover:text-[#6B7280]">
          Cancel
        </button>
      </div>
    </div>
  );
}
