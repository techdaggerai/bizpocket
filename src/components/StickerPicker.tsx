'use client';

/**
 * StickerPicker.tsx
 * 3 sticker packs with SVG stickers in Evrywher brand style.
 * Usage (Zarrar integrates into chat):
 *   <StickerPicker isOpen={showStickers} onSelect={(url) => sendSticker(url)} onClose={() => setShowStickers(false)} />
 * onSelect returns a data: URI string of the SVG (or treat as sticker key).
 */

import { useState } from 'react';

// ─── SVG Sticker definitions ──────────────────────────────────────────────────

const PACKS = [
  {
    id: 'greetings',
    label: 'Greetings',
    emoji: '👋',
    stickers: [
      {
        id: 'hello',
        label: 'Hello',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#4F46E5"/>
  <text x="32" y="22" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="9" font-weight="700">Hello</text>
  <text x="32" y="34" text-anchor="middle" fill="#FCD34D" font-family="DM Sans,system-ui,sans-serif" font-size="8" font-weight="600">こんにちは</text>
  <path d="M18 42 Q22 36 27 40 Q30 34 35 38 Q38 32 44 36" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'thankyou',
        label: 'Thank you',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#F59E0B"/>
  <text x="32" y="20" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="8" font-weight="700">Thank you!</text>
  <text x="32" y="31" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="8">ありがとう</text>
  <path d="M26 40 C26 35 38 35 38 40 L38 46 L32 50 L26 46 Z" fill="white" opacity="0.9"/>
  <circle cx="29" cy="38" r="2" fill="#F59E0B"/>
  <circle cx="35" cy="38" r="2" fill="#F59E0B"/>
</svg>`,
      },
      {
        id: 'sorry',
        label: 'Sorry',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#6366F1"/>
  <circle cx="32" cy="27" r="11" fill="white" opacity="0.95"/>
  <circle cx="28" cy="25" r="1.5" fill="#6366F1"/>
  <circle cx="36" cy="25" r="1.5" fill="#6366F1"/>
  <path d="M27 30 Q32 28 37 30" stroke="#6366F1" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="26" cy="29" r="1" fill="#93C5FD"/>
  <text x="32" y="46" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="9" font-weight="700">Sorry 🙏</text>
</svg>`,
      },
      {
        id: 'goodbye',
        label: 'Goodbye',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#10B981"/>
  <text x="32" y="20" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="9" font-weight="700">Goodbye!</text>
  <text x="32" y="31" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="8">またね</text>
  <path d="M22 45 L28 39 M28 39 L28 45 M28 39 L34 45" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36 36 Q40 33 44 36 Q42 40 36 36" fill="white" opacity="0.8"/>
</svg>`,
      },
      {
        id: 'please',
        label: 'Please',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#8B5CF6"/>
  <path d="M20 32 C20 24 44 24 44 32 C44 40 20 40 20 32 Z" fill="white" opacity="0.95"/>
  <circle cx="27" cy="30" r="2" fill="#8B5CF6"/>
  <circle cx="37" cy="30" r="2" fill="#8B5CF6"/>
  <path d="M27 35 Q32 38 37 35" stroke="#8B5CF6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <text x="32" y="50" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="9" font-weight="700">Please 🙏</text>
</svg>`,
      },
      {
        id: 'yes',
        label: 'Yes!',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#16A34A"/>
  <circle cx="32" cy="28" r="13" fill="white" opacity="0.95"/>
  <path d="M23 28 L29 34 L41 22" stroke="#16A34A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="32" y="50" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="11" font-weight="800">YES! ✓</text>
</svg>`,
      },
      {
        id: 'no',
        label: 'No',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#DC2626"/>
  <circle cx="32" cy="28" r="13" fill="white" opacity="0.95"/>
  <path d="M25 21 L39 35 M39 21 L25 35" stroke="#DC2626" stroke-width="3" fill="none" stroke-linecap="round"/>
  <text x="32" y="50" text-anchor="middle" fill="white" font-family="DM Sans,system-ui,sans-serif" font-size="11" font-weight="800">NO ✗</text>
</svg>`,
      },
    ],
  },
  {
    id: 'emotions',
    label: 'Emotions',
    emoji: '😊',
    stickers: [
      {
        id: 'happy',
        label: 'Happy',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FEF3C7"/>
  <circle cx="32" cy="30" r="18" fill="#F59E0B"/>
  <circle cx="26" cy="27" r="2.5" fill="#78350F"/>
  <circle cx="38" cy="27" r="2.5" fill="#78350F"/>
  <path d="M24 34 Q32 41 40 34" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#F87171" opacity="0.7"/>
  <circle cx="40" cy="34" r="1.5" fill="#F87171" opacity="0.7"/>
</svg>`,
      },
      {
        id: 'sad',
        label: 'Sad',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#EFF6FF"/>
  <circle cx="32" cy="30" r="18" fill="#93C5FD"/>
  <circle cx="26" cy="27" r="2.5" fill="#1E40AF"/>
  <circle cx="38" cy="27" r="2.5" fill="#1E40AF"/>
  <path d="M24 37 Q32 32 40 37" stroke="#1E40AF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M24 23 Q26 20 28 23" stroke="#1E40AF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M36 23 Q38 20 40 23" stroke="#1E40AF" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <circle cx="26" cy="36" r="1.5" fill="#60A5FA" opacity="0.8"/>
</svg>`,
      },
      {
        id: 'angry',
        label: 'Angry',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FEF2F2"/>
  <circle cx="32" cy="30" r="18" fill="#EF4444"/>
  <circle cx="26" cy="28" r="2.5" fill="#7F1D1D"/>
  <circle cx="38" cy="28" r="2.5" fill="#7F1D1D"/>
  <path d="M24 36 Q32 31 40 36" stroke="#7F1D1D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M22 22 Q26 25 30 22" stroke="#7F1D1D" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M34 22 Q38 25 42 22" stroke="#7F1D1D" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M28 14 L30 18 M36 14 L34 18" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'surprised',
        label: 'Surprised',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#F5F3FF"/>
  <circle cx="32" cy="30" r="18" fill="#A78BFA"/>
  <circle cx="26" cy="27" r="3.5" fill="#4C1D95"/>
  <circle cx="38" cy="27" r="3.5" fill="#4C1D95"/>
  <circle cx="27" cy="26" r="1" fill="white"/>
  <circle cx="39" cy="26" r="1" fill="white"/>
  <ellipse cx="32" cy="37" rx="5" ry="4" fill="#4C1D95"/>
  <path d="M26 20 Q28 17 30 20" stroke="#4C1D95" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M34 20 Q36 17 38 20" stroke="#4C1D95" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'love',
        label: 'Love',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FDF2F8"/>
  <circle cx="32" cy="30" r="18" fill="#F9A8D4"/>
  <circle cx="26" cy="28" r="2.5" fill="#9D174D"/>
  <circle cx="38" cy="28" r="2.5" fill="#9D174D"/>
  <path d="M24 34 Q32 40 40 34" stroke="#9D174D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M27 20 C25 17 21 18 21 21 C21 24 27 27 27 27 C27 27 33 24 33 21 C33 18 29 17 27 20Z" fill="#EC4899" transform="translate(5, 2) scale(0.7)"/>
  <path d="M27 20 C25 17 21 18 21 21 C21 24 27 27 27 27 C27 27 33 24 33 21 C33 18 29 17 27 20Z" fill="#EC4899" transform="translate(26, -2) scale(0.5)"/>
</svg>`,
      },
      {
        id: 'confused',
        label: 'Confused',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#ECFDF5"/>
  <circle cx="32" cy="30" r="18" fill="#6EE7B7"/>
  <circle cx="26" cy="28" r="2.5" fill="#064E3B"/>
  <circle cx="38" cy="28" r="2.5" fill="#064E3B"/>
  <path d="M26 36 Q29 34 32 36 Q35 38 38 36" stroke="#064E3B" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M36 19 Q38 15 42 16 Q43 20 40 21 L39 24" stroke="#064E3B" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="39" cy="26" r="1.5" fill="#064E3B"/>
</svg>`,
      },
      {
        id: 'tired',
        label: 'Tired',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#F8FAFC"/>
  <circle cx="32" cy="30" r="18" fill="#94A3B8"/>
  <path d="M23 27 Q26 27 26 30" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M38 27 Q38 27 41 27" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M26 36 Q32 34 38 36" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M14 26 L18 27 M46 27 L50 26" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  <path d="M15 30 L19 30 M45 30 L49 30" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,
      },
    ],
  },
  {
    id: 'daily',
    label: 'Daily',
    emoji: '☕',
    stickers: [
      {
        id: 'coffee',
        label: 'Coffee',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FEF3C7"/>
  <rect x="18" y="28" width="22" height="18" rx="4" fill="#92400E"/>
  <path d="M40 32 Q46 32 46 37 Q46 42 40 42" stroke="#92400E" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="22" y="44" width="18" height="3" rx="1.5" fill="#78350F"/>
  <path d="M24 25 Q24 21 27 21" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M29 23 Q29 19 32 19" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M34 25 Q34 21 37 21" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'food',
        label: 'Food',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FFF7ED"/>
  <ellipse cx="32" cy="38" rx="18" ry="6" fill="#FED7AA"/>
  <ellipse cx="32" cy="35" rx="15" ry="8" fill="#FDBA74"/>
  <circle cx="24" cy="30" r="5" fill="#EF4444"/>
  <circle cx="32" cy="27" r="5" fill="#F59E0B"/>
  <circle cx="40" cy="30" r="5" fill="#22C55E"/>
  <path d="M22 44 L42 44" stroke="#92400E" stroke-width="2" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'work',
        label: 'Work',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#EFF6FF"/>
  <rect x="16" y="26" width="32" height="22" rx="3" fill="#3B82F6"/>
  <rect x="24" y="20" width="16" height="8" rx="2" fill="#1D4ED8"/>
  <rect x="20" y="30" width="10" height="8" rx="1.5" fill="white" opacity="0.9"/>
  <rect x="34" y="30" width="10" height="8" rx="1.5" fill="white" opacity="0.9"/>
  <rect x="20" y="40" width="24" height="5" rx="1" fill="white" opacity="0.7"/>
</svg>`,
      },
      {
        id: 'sleep',
        label: 'Sleep',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#1E1B4B"/>
  <circle cx="32" cy="32" r="16" fill="#312E81"/>
  <path d="M36 20 Q44 24 44 32 Q44 40 36 44 Q44 40 44 32 Q44 24 36 20Z" fill="#FCD34D" opacity="0.9"/>
  <text x="20" y="26" fill="#FCD34D" font-family="DM Sans,system-ui" font-size="9" font-weight="700">Z</text>
  <text x="28" y="20" fill="#FCD34D" font-family="DM Sans,system-ui" font-size="11" font-weight="700">Z</text>
  <text x="38" y="16" fill="#FCD34D" font-family="DM Sans,system-ui" font-size="13" font-weight="700">Z</text>
</svg>`,
      },
      {
        id: 'travel',
        label: 'Travel',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#E0F2FE"/>
  <path d="M10 42 Q20 20 32 22 Q44 24 54 42" fill="#7DD3FC" opacity="0.6"/>
  <path d="M16 38 Q32 10 48 38" fill="none" stroke="#0369A1" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>
  <circle cx="16" cy="39" r="4" fill="#4F46E5"/>
  <path d="M44 28 L52 24 L48 36 L44 28 Z" fill="#F59E0B"/>
  <circle cx="52" cy="44" r="3" fill="#EF4444"/>
  <path d="M52 41 L52 37" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
</svg>`,
      },
      {
        id: 'shopping',
        label: 'Shopping',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FDF2F8"/>
  <path d="M20 28 L22 44 Q22 46 24 46 L40 46 Q42 46 42 44 L44 28 Z" fill="#EC4899"/>
  <path d="M26 28 Q26 20 32 20 Q38 20 38 28" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <circle cx="27" cy="34" r="2" fill="white"/>
  <circle cx="37" cy="34" r="2" fill="white"/>
  <rect x="28" y="37" width="8" height="1.5" rx="0.75" fill="white"/>
</svg>`,
      },
      {
        id: 'celebration',
        label: 'Celebrate',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="30" fill="#FEF9C3"/>
  <path d="M16 48 L28 24 L36 40 L40 32 L48 48 Z" fill="#F59E0B" opacity="0.8"/>
  <circle cx="28" cy="20" r="3" fill="#EF4444"/>
  <circle cx="40" cy="16" r="2.5" fill="#4F46E5"/>
  <circle cx="20" cy="24" r="2" fill="#10B981"/>
  <circle cx="44" cy="22" r="2" fill="#F43F5E"/>
  <path d="M22 16 L24 10 M30 14 L32 8 M38 18 L42 12" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
  <text x="32" y="56" text-anchor="middle" fill="#92400E" font-family="DM Sans,system-ui" font-size="7" font-weight="700">🎉 Congrats!</text>
</svg>`,
      },
    ],
  },
];

// Convert SVG string to data URI for img src
function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Returns a data: URI string of the selected SVG sticker */
  onSelect: (dataUri: string, label: string, packId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StickerPicker({ isOpen, onClose, onSelect }: StickerPickerProps) {
  const [activePack, setActivePack] = useState(0);

  if (!isOpen) return null;

  const pack = PACKS[activePack];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel — bottom sheet */}
      <div className="fixed bottom-16 left-0 right-0 z-50 mx-auto max-w-md">
        <div className="mx-3 rounded-2xl bg-slate-800 shadow-2xl border border-slate-700 overflow-hidden">

          {/* Pack tabs */}
          <div className="flex border-b border-[var(--border)] bg-slate-800">
            {PACKS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePack(i)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                  activePack === i
                    ? 'border-b-2 border-indigo-400 bg-slate-800 text-indigo-400'
                    : 'text-[#9CA3AF] hover:text-[#6B7280]'
                }`}
              >
                <span className="text-xl leading-none">{p.emoji}</span>
                <span className="text-[10px] font-semibold">{p.label}</span>
              </button>
            ))}
            <button
              onClick={onClose}
              className="px-3 text-[#9CA3AF] hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Sticker grid */}
          <div className="grid grid-cols-4 gap-2 p-3">
            {pack.stickers.map((sticker) => {
              const uri = svgToDataUri(sticker.svg);
              return (
                <button
                  key={sticker.id}
                  onClick={() => {
                    onSelect(uri, sticker.label, pack.id);
                    onClose();
                  }}
                  className="group flex flex-col items-center gap-1 rounded-xl p-2 hover:bg-[#EEF2FF] active:scale-95 transition-all"
                  title={sticker.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uri}
                    alt={sticker.label}
                    width={52}
                    height={52}
                    className="h-13 w-13 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-[10px] text-[#9CA3AF] group-hover:text-indigo-400 font-medium leading-tight text-center">
                    {sticker.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="border-t border-[var(--border)] px-4 py-2 text-center">
            <p className="text-[10px] text-[#C4C4C4]">Tap a sticker to send</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Exports for Zarrar's integration ────────────────────────────────────────

export { PACKS, svgToDataUri };
export type { StickerPickerProps };
