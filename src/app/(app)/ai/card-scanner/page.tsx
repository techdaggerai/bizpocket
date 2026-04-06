'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScanLine } from 'lucide-react';

export default function CardScannerPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-cyan-600 flex items-center justify-center mb-4">
        <ScanLine size={28} className="text-white" />
      </div>
      <h1 className="text-xl font-bold text-white mb-1">Business Card Scanner</h1>
      <p className="text-sm text-slate-400 text-center mb-6">Scan, translate & save contacts</p>
      <p className="text-xs text-slate-500 text-center mb-8">This feature is being built. Check back soon!</p>
      <button onClick={() => router.push('/ai')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-sm text-slate-300 active:bg-slate-700">
        <ArrowLeft size={16} /> Back to EvryAI
      </button>
    </div>
  );
}
