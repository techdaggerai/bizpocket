'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SwipeBackGesture() {
  const router = useRouter();
  const startXRef = useRef(0);

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      if (e.touches[0].clientX < 25) {
        startXRef.current = e.touches[0].clientX;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (startXRef.current > 0 && startXRef.current < 25) {
        const deltaX = e.changedTouches[0].clientX - startXRef.current;
        if (deltaX > 80) {
          router.back();
        }
      }
      startXRef.current = 0;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router]);

  return null;
}
