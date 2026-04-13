'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PocketChatMark } from '@/components/Logo';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">About</h1>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-20">
        {/* Logo */}
        <PocketChatMark size={60} />

        {/* Wordmark */}
        <h2 className="text-2xl font-bold mt-4">
          <span style={{ color: '#818CF8' }}>Evry</span>
          <span style={{ color: '#F59E0B' }}>wher</span>
        </h2>

        {/* Version */}
        <p className="text-slate-400 text-sm mt-1 font-mono">Version 1.0.0</p>

        {/* Tagline */}
        <p className="text-slate-300 text-sm mt-4 text-center">Chat with anyone, in any language</p>

        {/* Separator */}
        <div className="w-16 h-px bg-slate-700 my-6" />

        {/* Company info */}
        <p className="text-slate-400 text-sm">Built by TechDagger Studio</p>
        <p className="text-slate-500 text-xs mt-1">MS Dynamics LLC, Miami FL</p>
        <p className="text-slate-500 text-xs mt-1">Made with love in Japan</p>

        {/* Links */}
        <div className="flex gap-4 mt-8">
          <Link href="/privacy" className="text-xs text-indigo-400 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-xs text-indigo-400 hover:underline">Terms of Service</Link>
          <a href="mailto:hello@evrywher.io" className="text-xs text-indigo-400 hover:underline">Contact</a>
        </div>
      </div>
    </div>
  );
}
