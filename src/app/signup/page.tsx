'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UniversalSignup from '@/components/UniversalSignup';
import { getBrandMode } from '@/lib/brand';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isPocketChat = mode === 'pocketchat' || getBrandMode() === 'evrywher';

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center overflow-y-auto"
      style={{
        background: '#0f172a',
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingLeft: 'max(env(safe-area-inset-left), 16px)',
        paddingRight: 'max(env(safe-area-inset-right), 16px)',
      }}
    >
      <div className="w-full max-w-sm py-8">
        <UniversalSignup isPocketChat={isPocketChat} />
      </div>
    </div>
  );
}
