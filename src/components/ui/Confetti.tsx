'use client';

import { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
  colors?: string[];
  duration?: number;
}

const DEFAULT_COLORS = [
  '#4F46E5', '#818CF8', '#F59E0B', '#FCD34D', '#10B981', '#6EE7B7', '#FFFFFF',
];

export default function Confetti({
  active,
  particleCount = 24,
  colors = DEFAULT_COLORS,
  duration = 2000,
}: ConfettiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevActive = useRef(false);

  useEffect(() => {
    if (!active || prevActive.current === active) return;
    prevActive.current = active;

    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const el = document.createElement('div');
      const size = 3 + Math.random() * 7;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * Math.PI * 2;
      const velocity = 120 + Math.random() * 200;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity - 80; // bias upward
      const rot = Math.random() * 720 - 360;
      const animDuration = 1200 + Math.random() * 400;

      el.style.cssText = `
        position: absolute;
        left: 50%;
        top: 40%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        pointer-events: none;
      `;

      container.appendChild(el);
      particles.push(el);

      el.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.3)`, opacity: 0 },
        ],
        {
          duration: animDuration,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );
    }

    const cleanup = setTimeout(() => {
      particles.forEach((p) => p.remove());
    }, duration);

    return () => {
      clearTimeout(cleanup);
      particles.forEach((p) => p.remove());
    };
  }, [active, particleCount, colors, duration]);

  // Reset trigger tracking when deactivated
  useEffect(() => {
    if (!active) prevActive.current = false;
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
}
