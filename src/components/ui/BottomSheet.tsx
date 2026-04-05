'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[];
  defaultSnap?: number;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5],
  defaultSnap,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; currentY: number; sheetH: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Open animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else if (visible) {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, visible]);

  // Lock body scroll when open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    dragRef.current = {
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      sheetH: sheet.offsetHeight,
    };
    sheet.style.transition = 'none';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current || !sheetRef.current) return;
    dragRef.current.currentY = e.touches[0].clientY;
    const dy = Math.max(0, dragRef.current.currentY - dragRef.current.startY);
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current || !sheetRef.current) return;
    const dy = dragRef.current.currentY - dragRef.current.startY;
    const threshold = dragRef.current.sheetH * 0.4;
    sheetRef.current.style.transition = '';
    sheetRef.current.style.transform = '';
    dragRef.current = null;

    if (dy > threshold) {
      onClose();
    }
  }, [onClose]);

  if (!visible) return null;

  const snap = defaultSnap ?? snapPoints[0] ?? 0.5;
  const maxH = `${snap * 100}vh`;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          animating ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-label="Close sheet"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={[
          'absolute bottom-0 left-0 right-0',
          'rounded-t-[24px] overflow-hidden',
          'bg-slate-900/80 backdrop-blur-[20px]',
          'border-t border-white/10',
          'flex flex-col',
          'transition-transform duration-300 [transition-timing-function:var(--ease-out)]',
          animating ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{ maxHeight: maxH, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 pb-3">
            <h2 className="text-lg font-semibold text-[var(--pm-text-primary)]">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
