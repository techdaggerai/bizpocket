'use client';

import { useState } from 'react';
import { usePlan } from '@/lib/use-plan';
import Link from 'next/link';

interface UpgradeGateProps {
  feature: string;
  requiredPlan: 'pro' | 'business' | 'enterprise';
  children: React.ReactNode;
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  trial: 2, // trial = pro-level access
  pro: 2,
  business: 3,
  enterprise: 4,
};

export default function UpgradeGate({ feature, requiredPlan, children }: UpgradeGateProps) {
  const { plan, isTrial } = usePlan();
  const [showModal, setShowModal] = useState(false);

  const userRank = PLAN_RANK[plan] ?? 0;
  const requiredRank = PLAN_RANK[requiredPlan] ?? 2;

  // Trial users and users at or above required plan see everything
  if (isTrial || userRank >= requiredRank) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Blurred content with lock overlay */}
      <div className="relative">
        <div className="pointer-events-none select-none blur-[6px] opacity-60">
          {children}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/60 rounded-[14px] cursor-pointer transition-all hover:bg-slate-800/70"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4F46E5]/10 mb-2">
            <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">{feature}</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">Upgrade to {requiredPlan} to unlock</p>
        </button>
      </div>

      {/* Upgrade Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-800 rounded-2xl max-w-sm w-full mx-4 p-6 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Unlock {feature}</h3>
            <p className="text-sm text-[#6B7280] mb-6">
              This feature requires the <span className="font-semibold capitalize text-indigo-400">{requiredPlan}</span> plan. Upgrade to access {feature} and more.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-[#6B7280] hover:bg-slate-800 transition-colors"
              >
                Maybe Later
              </button>
              <Link
                href="/settings/upgrade"
                className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors text-center"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
