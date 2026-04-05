'use client';

import { useEffect, useState } from 'react';
import ChatLockScreen, { useChatLock } from '@/components/ChatLockScreen';

export default function ChatLockWrapper({ children }: { children: React.ReactNode }) {
  const { enabled, locked, unlock } = useChatLock();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render lock screen until hydrated (avoid SSR mismatch)
  if (!mounted) return <>{children}</>;

  if (enabled && locked) {
    return <ChatLockScreen onUnlock={unlock} />;
  }

  return <>{children}</>;
}
