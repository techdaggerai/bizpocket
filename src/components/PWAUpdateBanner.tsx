'use client';

import { useState, useEffect, useCallback } from 'react';

// How often to check for updates (60 seconds)
const POLL_INTERVAL = 60_000;

export default function PWAUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swWaiting, setSwWaiting] = useState<ServiceWorker | null>(null);

  // ── 1. Service Worker update detection ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register the service worker
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // If there's already a waiting worker, an update is available
      if (registration.waiting) {
        setSwWaiting(registration.waiting);
        setUpdateAvailable(true);
      }

      // Listen for new service worker installing
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed but waiting — update available
            setSwWaiting(newWorker);
            setUpdateAvailable(true);
          }
        });
      });

      // Periodically check for SW updates
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, POLL_INTERVAL);

      return () => clearInterval(interval);
    }).catch(() => {
      // SW registration failed — fall back to version polling only
    });

    // When the controlling SW changes (after skipWaiting), reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  // ── 2. Version API polling (catches deploys even without SW changes) ──
  useEffect(() => {
    let currentVersion: string | null = null;

    async function checkVersion() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();

        if (currentVersion === null) {
          // First check — just record the version
          currentVersion = version;
        } else if (version !== currentVersion) {
          // Version changed — new deploy detected
          setUpdateAvailable(true);
        }
      } catch {
        // Network error — ignore
      }
    }

    // Initial check after 5 seconds (don't block page load)
    const initial = setTimeout(checkVersion, 5000);
    // Then poll every interval
    const interval = setInterval(checkVersion, POLL_INTERVAL);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  // ── 3. Handle refresh ──
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (swWaiting) {
      // Tell the waiting SW to activate
      swWaiting.postMessage('SKIP_WAITING');
      // controllerchange listener above will reload the page
      // Fallback: if controllerchange doesn't fire within 3s, force reload
      setTimeout(() => window.location.reload(), 3000);
    } else {
      // No SW waiting — just hard reload
      window.location.reload();
    }
  }, [swWaiting]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-slide-down">
      <div className="flex items-center gap-3 rounded-xl bg-[#4F46E5] pl-4 pr-2 py-2.5 shadow-lg shadow-indigo-500/25 border border-indigo-400/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{refreshing ? '⏳' : '✨'}</span>
          <span className="text-[13px] font-medium text-white whitespace-nowrap">
            {refreshing ? 'Updating...' : 'New update available'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-[#4F46E5] hover:bg-indigo-50 transition-colors disabled:opacity-70 flex items-center gap-1.5"
        >
          {refreshing ? (
            <>
              <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              Updating
            </>
          ) : (
            'Refresh'
          )}
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="shrink-0 p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
