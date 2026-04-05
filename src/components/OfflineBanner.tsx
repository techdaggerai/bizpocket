'use client';

import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function goOffline() { setOffline(true); }
    function goOnline() { setOffline(false); }
    if (typeof window !== 'undefined' && !navigator.onLine) setOffline(true);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#F59E0B] px-4 py-2 text-center text-sm font-medium text-slate-50">
      You&apos;re offline. Messages will send when you reconnect.
    </div>
  );
}
