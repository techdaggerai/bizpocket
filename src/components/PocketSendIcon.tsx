'use client';

import { useState, useEffect } from 'react';

export default function PocketSendIcon({ size = 22 }: { size?: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 2);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M5 8Q12 5 19 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.4"/>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      <path d="M12 16V8" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"
        style={{ opacity: phase === 0 ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}/>
      <path d="M9 11l3-3 3 3" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: phase === 0 ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}/>
      <path d="M12 8V16" stroke="white" strokeWidth="2.5" strokeLinecap="round"
        style={{ opacity: phase === 1 ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}/>
      <path d="M9 13l3 3 3-3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: phase === 1 ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}/>
    </svg>
  );
}
