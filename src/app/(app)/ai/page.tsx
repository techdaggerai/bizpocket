'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  Camera,
  Mic,
  MessageCircle,
  Sparkles,
  Globe,
  ScanLine,
  FileText,
  ClipboardList,
  Download,
  GraduationCap,
  Globe2,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'Camera Translate',
    desc: 'Point, snap, translated instantly',
    icon: Camera,
    bg: 'bg-indigo-600',
    route: '/ai/camera',
  },
  {
    title: 'Voice Translate',
    desc: 'Speak and hear translations',
    icon: Mic,
    bg: 'bg-amber-600',
    route: '/ai/voice',
  },
  {
    title: 'Live Conversation',
    desc: 'Two-way real-time translation',
    icon: MessageCircle,
    bg: 'bg-green-600',
    route: '/ai/conversation',
  },
  {
    title: 'EvryAI Chat',
    desc: 'Your AI assistant for everything',
    icon: Sparkles,
    bg: 'bg-indigo-600',
    route: '/ai/chat',
  },
  {
    title: 'Cultural Coach',
    desc: 'Navigate life in Japan with AI',
    icon: Globe,
    bg: 'bg-purple-600',
    route: '/ai/culture',
  },
  {
    title: 'Business Card Scanner',
    desc: 'Scan, translate & save contacts',
    icon: ScanLine,
    bg: 'bg-cyan-600',
    route: '/ai/card-scanner',
  },
  {
    title: 'Document Scanner',
    desc: 'Scan & translate any document',
    icon: FileText,
    bg: 'bg-orange-600',
    route: '/ai/documents',
  },
  {
    title: 'Form Helper',
    desc: 'Fill Japanese forms with confidence',
    icon: ClipboardList,
    bg: 'bg-amber-600',
    route: '/ai/form-fill',
  },
  {
    title: 'PDF Export',
    desc: 'Export chats, invoices & docs',
    icon: Download,
    bg: 'bg-red-600',
    route: '/ai/pdf',
  },
  {
    title: 'Language Learning',
    desc: 'Learn from your real conversations',
    icon: GraduationCap,
    bg: 'bg-emerald-600',
    route: '/ai/learn',
  },
  {
    title: 'Website Builder',
    desc: 'Build your business website',
    icon: Globe2,
    bg: 'bg-slate-600',
    route: null, // coming soon
  },
];

export default function AIPage() {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="min-h-[100dvh] bg-slate-900 pb-24 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        {/* EvryAI branded icon */}
        <div className="relative h-16 w-16 rounded-full flex items-center justify-center bg-indigo-600 shadow-lg shadow-indigo-500/30 mb-4">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ boxShadow: '0 0 20px 6px #818CF8' }} />
          <svg width="32" height="32" viewBox="0 0 36 36">
            <path d="M9 18 L13 14 L17 18 L21 14 L25 18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 24 L13 20 L17 24 L21 20 L25 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            <circle cx="30" cy="6" r="4.5" fill="#F59E0B"/>
            <path d="M28.5 6 L30 4 L31.5 6 L30 8 Z" fill="white"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold">
          <span className="text-indigo-400">Evry</span>
          <span className="text-amber-400">AI</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Your AI-powered toolkit</p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const isComingSoon = f.route === null;

          return (
            <button
              key={f.title}
              onClick={() => {
                if (isComingSoon) {
                  toast('Coming soon!', 'info');
                } else {
                  router.push(f.route!);
                }
              }}
              className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left active:scale-95 transition-transform relative"
            >
              {isComingSoon && (
                <span className="absolute top-2.5 right-2.5 text-[10px] font-medium text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
                  Soon
                </span>
              )}
              <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-white font-semibold text-sm leading-tight">{f.title}</p>
              <p className="text-slate-400 text-xs mt-1 line-clamp-1">{f.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
