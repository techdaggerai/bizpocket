'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  showTrust?: boolean;
}

export default function PageHeader({
  title,
  onBack,
  rightAction,
  transparent,
  showTrust,
}: PageHeaderProps) {
  const router = useRouter();
  const touchRef = useRef<{ startX: number; startY: number } | null>(null);

  const goBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= 20) {
      touchRef.current = { startX: touch.clientX, startY: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchRef.current.startX;
    const dy = Math.abs(touch.clientY - touchRef.current.startY);
    touchRef.current = null;
    if (dx > 80 && dy < 60) {
      goBack();
    }
  }, [goBack]);

  return (
    <header
      className={[
        'sticky top-0 z-40 flex items-center h-14 px-2',
        transparent
          ? 'bg-transparent backdrop-blur-[20px]'
          : 'bg-[var(--pm-surface-0)] border-b border-[var(--pm-surface-3)]',
      ].join(' ')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={goBack}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-black/5 active:bg-slate-800/5 transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft size={24} className="text-[var(--pm-text-primary)]" />
      </button>

      <h1 className="text-lg font-semibold text-[var(--pm-text-primary)] ml-1 truncate font-[family-name:var(--font-body)]">
        {title}
      </h1>

      {rightAction && <div className="ml-auto shrink-0">{rightAction}</div>}
    </header>
  );
}
