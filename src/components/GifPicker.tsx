'use client';

/**
 * GifPicker.tsx
 * Giphy API integration — trending GIFs by default, search on input.
 *
 * Zarrar: to integrate into chat, pass a Giphy API key via env var:
 *   NEXT_PUBLIC_GIPHY_API_KEY=your_key
 * Get a free key at https://developers.giphy.com (free tier: 100 req/hr)
 *
 * Usage:
 *   <GifPicker isOpen={showGifs} onSelect={(gif) => sendGif(gif)} onClose={() => setShowGifs(false)} />
 * onSelect returns a GifResult object with url, previewUrl, title.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GifResult {
  id: string;
  title: string;
  /** Full MP4 URL (preferred — smaller, loops) */
  url: string;
  /** Original GIF URL */
  gifUrl: string;
  /** Small preview still */
  previewUrl: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
  /** Giphy API key — defaults to NEXT_PUBLIC_GIPHY_API_KEY env var */
  apiKey?: string;
}

// ─── Giphy API helpers ────────────────────────────────────────────────────────

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function parseGiphyResponse(data: GiphyGif[]): GifResult[] {
  return data.map((g) => ({
    id: g.id,
    title: g.title,
    url: g.images?.original_mp4?.mp4 || g.images?.original?.url || '',
    gifUrl: g.images?.original?.url || '',
    previewUrl: g.images?.fixed_width_still?.url || g.images?.preview?.url || '',
    width: parseInt(g.images?.fixed_width?.width || '200', 10),
    height: parseInt(g.images?.fixed_width?.height || '150', 10),
  }));
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original?: { url: string; width: string; height: string };
    original_mp4?: { mp4: string };
    fixed_width?: { url: string; width: string; height: string };
    fixed_width_still?: { url: string };
    preview?: { url: string };
  };
}

// ─── Staggered column layout (simple masonry) ────────────────────────────────

function GifGrid({ gifs, onSelect }: { gifs: GifResult[]; onSelect: (g: GifResult) => void }) {
  // Split into 2 columns
  const col0 = gifs.filter((_, i) => i % 2 === 0);
  const col1 = gifs.filter((_, i) => i % 2 === 1);

  function GifCard({ gif }: { gif: GifResult }) {
    const [loaded, setLoaded] = useState(false);
    const aspect = gif.height / (gif.width || 1);

    return (
      <button
        onClick={() => onSelect(gif)}
        className="group relative w-full overflow-hidden rounded-lg bg-slate-700 hover:ring-2 hover:ring-[#4F46E5] transition-all active:scale-95"
        style={{ paddingBottom: `${Math.min(Math.max(aspect * 100, 40), 130)}%` }}
        title={gif.title}
      >
        {/* Skeleton */}
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-[#E5E7EB]" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gif.previewUrl}
          alt={gif.title}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#4F46E5]/0 group-hover:bg-[#4F46E5]/10 transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 px-2">
      <div className="flex flex-1 flex-col gap-1.5">
        {col0.map((g) => <GifCard key={g.id} gif={g} />)}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {col1.map((g) => <GifCard key={g.id} gif={g} />)}
      </div>
    </div>
  );
}

// ─── Category pills ───────────────────────────────────────────────────────────

const CATEGORIES = ['trending', 'happy', 'love', 'funny', 'sad', 'wow', 'ok', 'no', 'yes'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GifPicker({ isOpen, onClose, onSelect, apiKey }: GifPickerProps) {
  const key = apiKey || process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('trending');
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGifs = useCallback(async (searchQuery: string, cat: string) => {
    if (!key) {
      setError('No Giphy API key. Set NEXT_PUBLIC_GIPHY_API_KEY.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let url: string;
      if (searchQuery.trim()) {
        url = `${GIPHY_BASE}/search?api_key=${key}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g&lang=en`;
      } else if (cat === 'trending') {
        url = `${GIPHY_BASE}/trending?api_key=${key}&limit=20&rating=g`;
      } else {
        url = `${GIPHY_BASE}/search?api_key=${key}&q=${encodeURIComponent(cat)}&limit=20&rating=g&lang=en`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Giphy error: ${res.status}`);
      const json = await res.json();
      setGifs(parseGiphyResponse(json.data || []));
    } catch (err) {
      console.error('[GifPicker]', err);
      setError('Failed to load GIFs. Check your API key.');
    } finally {
      setLoading(false);
    }
  }, [key]);

  // Load on open or category change
  useEffect(() => {
    if (!isOpen) return;
    fetchGifs(query, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category]);

  // Debounce search
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query, category);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-16 left-0 right-0 z-50 mx-auto max-w-md">
        <div className="mx-3 rounded-2xl bg-slate-800 shadow-2xl border border-slate-700 overflow-hidden flex flex-col" style={{ maxHeight: '60vh' }}>

          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] p-2.5">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-700 px-3 py-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCategory('trending'); }}
                placeholder="Search GIFs…"
                className="flex-1 bg-transparent text-[14px] text-slate-50 placeholder-[#9CA3AF] focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-[#9CA3AF] hover:text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-slate-300 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Category pills */}
          {!query && (
            <div className="flex gap-2 overflow-x-auto px-2.5 py-2 scrollbar-hide border-b border-[var(--border)]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setQuery(''); }}
                  className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold capitalize transition-colors ${
                    category === cat
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-slate-700 text-[#6B7280] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {cat === 'trending' ? '🔥 Trending' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[#9CA3AF]">{error}</p>
                {!key && (
                  <p className="mt-2 text-[11px] text-[#C4C4C4]">
                    Add NEXT_PUBLIC_GIPHY_API_KEY to .env.local
                  </p>
                )}
              </div>
            ) : gifs.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#9CA3AF]">
                No GIFs found
              </div>
            ) : (
              <GifGrid gifs={gifs} onSelect={(gif) => { onSelect(gif); onClose(); }} />
            )}
          </div>

          {/* Giphy attribution (required by Giphy API terms) */}
          <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center justify-end gap-1">
            <span className="text-[9px] text-[#C4C4C4] font-medium">Powered by</span>
            <svg width="36" height="12" viewBox="0 0 70 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text fill="#00FF99" font-family="DM Sans,system-ui,sans-serif" font-size="18" font-weight="900" x="0" y="18">GIPHY</text>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

export type { GifPickerProps };
