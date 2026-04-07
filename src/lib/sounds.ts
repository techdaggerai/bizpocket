/**
 * Evrywher Sound System
 * Generates notification sounds using Web Audio API — no external files.
 *
 * Usage:
 *   import { playSound, getSoundPrefs } from '@/lib/sounds';
 *   playSound('message');  // plays incoming message sound
 *   playSound('send');     // plays sent message sound
 */

export type SoundType = 'message' | 'send' | 'call' | 'notification';
export type MessageSoundStyle = 'chime' | 'bubble' | 'melody' | 'silent';

export interface SoundPrefs {
  messageEnabled: boolean;
  messageStyle: MessageSoundStyle;
  sendEnabled: boolean;
  callEnabled: boolean;
}

const PREFS_KEY = 'evrywher_sounds';

const DEFAULT_PREFS: SoundPrefs = {
  messageEnabled: true,
  messageStyle: 'chime',
  sendEnabled: true,
  callEnabled: true,
};

// ─── Preferences ───

export function getSoundPrefs(): SoundPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch { /* empty */ }
  return DEFAULT_PREFS;
}

export function saveSoundPrefs(prefs: Partial<SoundPrefs>): void {
  if (typeof window === 'undefined') return;
  const current = getSoundPrefs();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

// ─── Audio Context ───

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  } catch { return null; }
}

function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  delay: number,
  type: OscillatorType = 'sine',
  peak = 0.3,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function sweepTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  duration: number,
  delay: number,
  peak = 0.25,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  const t = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration * 0.7);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

// ─── Message Sound Styles ───

function playMessageChime(ctx: AudioContext) {
  // Gentle two-tone chime: A5 → C#6
  tone(ctx, 880, 0.15, 0, 'sine', 0.25);
  tone(ctx, 1108, 0.2, 0.12, 'sine', 0.22);
}

function playMessageBubble(ctx: AudioContext) {
  // Bubbly pop: rising sweep
  sweepTone(ctx, 400, 600, 0.12, 0);
  sweepTone(ctx, 500, 800, 0.15, 0.1, 0.2);
}

function playMessageMelody(ctx: AudioContext) {
  // Three-note ascending: C5 → E5 → G5
  tone(ctx, 523.25, 0.2, 0, 'sine', 0.22);
  tone(ctx, 659.25, 0.2, 0.15, 'sine', 0.2);
  tone(ctx, 783.99, 0.25, 0.3, 'sine', 0.18);
}

// ─── Sound Players ───

function playMessageSound(ctx: AudioContext, style: MessageSoundStyle) {
  switch (style) {
    case 'chime': playMessageChime(ctx); break;
    case 'bubble': playMessageBubble(ctx); break;
    case 'melody': playMessageMelody(ctx); break;
    case 'silent': break; // vibrate only
  }
}

function playSendSound(ctx: AudioContext) {
  // Quick subtle pop
  tone(ctx, 600, 0.06, 0, 'sine', 0.15);
  tone(ctx, 800, 0.06, 0.06, 'sine', 0.12);
}

function playCallSound(ctx: AudioContext) {
  // Repeating ring pattern
  for (let i = 0; i < 3; i++) {
    tone(ctx, 740, 0.18, i * 0.5, 'sine', 0.28);
    tone(ctx, 587, 0.18, i * 0.5 + 0.18, 'sine', 0.25);
  }
}

function playNotificationSound(ctx: AudioContext) {
  // Soft ding
  tone(ctx, 1200, 0.1, 0, 'sine', 0.2);
  tone(ctx, 1500, 0.15, 0.1, 'sine', 0.18);
}

// ─── Vibration ───

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// ─── Public API ───

export async function playSound(type: SoundType): Promise<void> {
  const prefs = getSoundPrefs();

  switch (type) {
    case 'message': {
      if (!prefs.messageEnabled) return;
      vibrate(100);
      if (prefs.messageStyle === 'silent') return;
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      playMessageSound(ctx, prefs.messageStyle);
      break;
    }
    case 'send': {
      if (!prefs.sendEnabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      playSendSound(ctx);
      break;
    }
    case 'call': {
      if (!prefs.callEnabled) return;
      vibrate([200, 100, 200, 100, 200]);
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      playCallSound(ctx);
      break;
    }
    case 'notification': {
      vibrate(100);
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      playNotificationSound(ctx);
      break;
    }
  }
}

/** Play a specific message style for preview (ignores prefs) */
export async function previewMessageSound(style: MessageSoundStyle): Promise<void> {
  if (style === 'silent') {
    vibrate(200);
    return;
  }
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume();
  playMessageSound(ctx, style);
}
