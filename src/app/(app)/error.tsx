'use client';

import { PocketChatMark } from '@/components/Logo';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAI = error.message?.toLowerCase().includes('translat') || error.message?.toLowerCase().includes('ai') || error.message?.toLowerCase().includes('anthropic');
  const isConnection = error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('supabase');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <PocketChatMark size={56} />
      <h2 className="mt-4 text-lg font-bold text-[#0A0A0A]">
        {isAI ? 'Translation temporarily unavailable' : isConnection ? 'Connection lost' : 'Something went wrong'}
      </h2>
      <p className="mt-2 text-sm text-[#6B7280] max-w-sm">
        {isAI
          ? "We're having trouble reaching the translation service. Your messages are safe — try again in a moment."
          : isConnection
            ? "Please check your internet connection. We'll reconnect automatically."
            : 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
