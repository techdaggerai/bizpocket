'use client';

import { useState, useEffect } from 'react';

interface SpotlightConfig {
  id: string;
  title: string;
  description: string;
  targetSelector: string;      // CSS selector for the element to spotlight
  position?: 'top' | 'bottom'; // tooltip position
}

const SPOTLIGHTS: SpotlightConfig[] = [
  {
    id: 'spotlight_camera_translate',
    title: 'New! Camera Translation',
    description: 'Tap here to scan Japanese text with your camera and get instant AI translation.',
    targetSelector: '[data-spotlight="camera-translate"]',
    position: 'bottom',
  },
  {
    id: 'spotlight_update_center',
    title: 'New! Update Center',
    description: 'Check here for new features, tips, and announcements. We push updates constantly!',
    targetSelector: '[data-spotlight="update-bell"]',
    position: 'bottom',
  },
  {
    id: 'spotlight_cultural_coach',
    title: 'New! Cultural Coach',
    description: 'AI now warns you before sending culturally inappropriate messages in Japanese.',
    targetSelector: '[data-spotlight="cultural-coach"]',
    position: 'bottom',
  },
];

export default function FeatureSpotlight() {
  const [active, setActive] = useState<SpotlightConfig | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Find the first spotlight not yet dismissed
    const pending = SPOTLIGHTS.find(s => !localStorage.getItem(s.id + '_seen'));
    if (!pending) return;

    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      const el = document.querySelector(pending.targetSelector);
      if (el) {
        setActive(pending);
        setRect(el.getBoundingClientRect());
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    if (active) {
      localStorage.setItem(active.id + '_seen', 'true');
      setActive(null);
      setRect(null);
    }
  }

  if (!active || !rect) return null;

  const padding = 8;
  const spotlightX = rect.left + rect.width / 2;
  const spotlightY = rect.top + rect.height / 2;
  const spotlightR = Math.max(rect.width, rect.height) / 2 + padding;

  const tooltipTop = active.position === 'top'
    ? rect.top - 120
    : rect.bottom + 16;
  const tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 296));

  return (
    <div className="fixed inset-0 z-[9999]" onClick={dismiss}>
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <circle cx={spotlightX} cy={spotlightY} r={spotlightR} fill="black" />
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#spotlight-mask)"
        />
        {/* Glow ring */}
        <circle
          cx={spotlightX} cy={spotlightY} r={spotlightR + 4}
          fill="none" stroke="rgba(79,70,229,0.5)" strokeWidth="3"
          className="animate-pulse"
        />
      </svg>

      {/* Tooltip */}
      <div
        className="absolute w-[280px] rounded-2xl bg-slate-800 p-4 shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-[#4F46E5]">{active.title}</p>
        <p className="mt-1 text-xs text-[var(--text-2)] leading-relaxed">{active.description}</p>
        <button
          onClick={dismiss}
          className="mt-3 w-full rounded-xl bg-[#4F46E5] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
