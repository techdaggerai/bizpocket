'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'trust' | 'tier' | 'match';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  points?: number;
  duration: number;
  phase: 'enter' | 'visible' | 'exit';
}

interface ToastOptions {
  type?: ToastType;
  title?: string;
  description?: string;
  points?: number;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let nextId = 0;

const BG: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  trust: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  tier: 'bg-gradient-to-r from-indigo-500 to-blue-500',
  match: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
};

function ToastCard({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    if (item.type === 'trust' && item.points) {
      const t = setTimeout(() => setShowPoints(true), 300);
      return () => clearTimeout(t);
    }
  }, [item.type, item.points]);

  return (
    <div
      className={[
        'relative max-w-sm w-full mx-auto rounded-2xl px-5 py-3.5 shadow-xl text-white',
        BG[item.type],
        item.phase === 'enter' ? 'animate-[cardSlideDown_300ms_var(--ease-out)_both]' : '',
        item.phase === 'exit' ? 'animate-[cardSlideUp_300ms_var(--ease-in)_both]' : '',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{item.title}</p>
          {item.description && (
            <p className="text-xs text-white/80 mt-0.5">{item.description}</p>
          )}
        </div>

        {/* Trust points fly-up */}
        {item.type === 'trust' && item.points && showPoints && (
          <span
            className="text-sm font-bold text-white animate-[pointFlyUp_800ms_ease-out_forwards]"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            +{item.points}
          </span>
        )}

        <button
          onClick={() => onDone(item.id)}
          className="shrink-0 text-white/60 hover:text-white text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          {'\u00D7'}
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, phase: 'exit' as const } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    const opts: ToastOptions = typeof typeOrOptions === 'string'
      ? { type: typeOrOptions }
      : typeOrOptions ?? {};

    const id = nextId++;
    const duration = opts.duration ?? 4000;

    const item: ToastItem = {
      id,
      type: opts.type ?? 'info',
      title: opts.title ?? message,
      description: opts.description,
      points: opts.points,
      duration,
      phase: 'enter',
    };

    setToasts((prev) => [...prev, item]);

    // Transition to visible after enter animation
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, phase: 'visible' as const } : t));
    }, 300);

    // Auto dismiss
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onDone={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
