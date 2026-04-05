'use client';

/**
 * NotificationSoundPicker.tsx
 * 5 notification sound presets generated via Web Audio API — no external files.
 * Saves selection to localStorage under 'evrywher-notif-sound'.
 *
 * Usage (standalone, drop into settings):
 *   import NotificationSoundPicker, { playNotificationSound, getNotificationSound } from '@/components/NotificationSoundPicker';
 *   <NotificationSoundPicker />
 *
 * To play a notification elsewhere in app:
 *   import { playNotificationSound } from '@/components/NotificationSoundPicker';
 *   playNotificationSound(); // plays whichever sound user selected
 */

import { useState, useEffect, useRef } from 'react';

// ─── Sound definitions ────────────────────────────────────────────────────────

export interface NotifSound {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const NOTIF_SOUNDS: NotifSound[] = [
  {
    id: 'chime',
    name: 'Default Chime',
    description: 'Bright and clear',
    emoji: '🔔',
  },
  {
    id: 'ping',
    name: 'Subtle Ping',
    description: 'Soft and minimal',
    emoji: '🔉',
  },
  {
    id: 'bubble',
    name: 'Bubble Pop',
    description: 'Fun and playful',
    emoji: '💬',
  },
  {
    id: 'bell',
    name: 'Soft Bell',
    description: 'Gentle and warm',
    emoji: '🛎️',
  },
  {
    id: 'silent',
    name: 'Silent',
    description: 'Vibrate only',
    emoji: '🔕',
  },
];

export const DEFAULT_SOUND_ID = 'chime';
const STORAGE_KEY = 'evrywher-notif-sound';

// ─── Web Audio tone generators ────────────────────────────────────────────────

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  } catch { return null; }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.3,
  attack = 0.01,
  release = 0.1
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - release);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

async function playSoundById(id: string): Promise<void> {
  if (id === 'silent') return; // vibrate only
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume suspended context (browser autoplay policy)
  if (ctx.state === 'suspended') await ctx.resume();

  const now = ctx.currentTime;

  switch (id) {
    case 'chime': {
      // Three ascending notes: C5, E5, G5
      playTone(ctx, 523.25, now,        0.4, 'sine',     0.28, 0.005, 0.15);
      playTone(ctx, 659.25, now + 0.12, 0.4, 'sine',     0.24, 0.005, 0.15);
      playTone(ctx, 783.99, now + 0.24, 0.5, 'sine',     0.20, 0.005, 0.20);
      break;
    }
    case 'ping': {
      // Single soft high tone with fast decay
      playTone(ctx, 1046.5, now, 0.25, 'sine', 0.18, 0.002, 0.20);
      break;
    }
    case 'bubble': {
      // Two quick rising pops
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(660, now + 0.07);
      g1.gain.setValueAtTime(0.25, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.start(now); osc1.stop(now + 0.13);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(550, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      g2.gain.setValueAtTime(0.22, now + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.start(now + 0.1); osc2.stop(now + 0.26);
      break;
    }
    case 'bell': {
      // Soft bell with harmonics
      playTone(ctx, 493.88, now, 0.8, 'sine',     0.22, 0.005, 0.50);
      playTone(ctx, 987.77, now, 0.8, 'sine',     0.10, 0.005, 0.60);
      playTone(ctx, 1318.5, now, 0.7, 'triangle', 0.06, 0.005, 0.55);
      break;
    }
    default:
      break;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getNotificationSoundId(): string {
  if (typeof window === 'undefined') return DEFAULT_SOUND_ID;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SOUND_ID;
}

export async function playNotificationSound(): Promise<void> {
  const id = getNotificationSoundId();
  await playSoundById(id);
}

export function saveNotificationSound(id: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationSoundPicker() {
  const [selected, setSelected] = useState(DEFAULT_SOUND_ID);
  const [playing, setPlaying] = useState<string | null>(null);
  const playingRef = useRef<string | null>(null);

  useEffect(() => {
    setSelected(getNotificationSoundId());
  }, []);

  async function handleSelect(id: string) {
    setSelected(id);
    saveNotificationSound(id);
    // Play preview
    if (id === 'silent') return;
    if (playingRef.current === id) return;
    playingRef.current = id;
    setPlaying(id);
    try {
      await playSoundById(id);
    } finally {
      setTimeout(() => {
        if (playingRef.current === id) {
          playingRef.current = null;
          setPlaying(null);
        }
      }, 600);
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      {NOTIF_SOUNDS.map((sound, i) => {
        const isSelected = selected === sound.id;
        const isPlaying = playing === sound.id;
        const isFirst = i === 0;
        const isLast = i === NOTIF_SOUNDS.length - 1;
        const radius = isFirst && isLast ? '8px' : isFirst ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0';

        return (
          <button
            key={sound.id}
            onClick={() => handleSelect(sound.id)}
            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
            style={{ borderRadius: radius, marginTop: isFirst ? 0 : 1 }}
          >
            {/* Emoji / playing indicator */}
            <div className="w-8 flex items-center justify-center shrink-0">
              {isPlaying ? (
                <div className="flex gap-0.5 items-end h-5">
                  {[0, 1, 2].map(b => (
                    <div
                      key={b}
                      className="w-1.5 rounded-full bg-[#4F46E5]"
                      style={{
                        height: `${[60, 100, 40][b]}%`,
                        animation: `soundBar 0.6s ease infinite alternate`,
                        animationDelay: `${b * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xl">{sound.emoji}</span>
              )}
            </div>

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <p className={`text-[14px] font-semibold ${isSelected ? 'text-[#4F46E5]' : 'text-[var(--text-1)]'}`}>
                {sound.name}
              </p>
              <p className="text-[12px] text-[var(--text-3)]">{sound.description}</p>
            </div>

            {/* Selected indicator */}
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              isSelected ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-[#475569] bg-slate-800'
            }`}>
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              )}
            </div>
          </button>
        );
      })}

      <style>{`
        @keyframes soundBar {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
