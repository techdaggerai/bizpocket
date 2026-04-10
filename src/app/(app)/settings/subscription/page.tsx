'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const PLANS = [
  {
    key: 'free' as const,
    name: 'Free',
    price: '$0',
    period: '/forever',
    features: [
      '10 AI translations/day',
      'Unlimited contacts',
      'Camera translation',
      'Emergency Card',
      '1 topic pack',
    ],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$6.99',
    period: '/mo',
    badge: 'Most Popular',
    features: [
      'Unlimited translations',
      'Voice-to-voice',
      'AI conversation practice',
      'All 30 topic packs',
      'Cultural Coach',
      'Business Card Scanner',
      'Includes BizPocket Pro',
    ],
  },
  {
    key: 'business' as const,
    name: 'Business',
    price: '$19.99',
    period: '/mo',
    features: [
      'Everything in Pro',
      'Team vocabulary sharing',
      'Up to 5 team members',
      'Priority support',
      'Custom AI bot',
      'Includes BizPocket Business',
    ],
  },
];

export default function SubscriptionPage() {
  const { organization, profile } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;
  const currentPlan: string = org.plan || 'free';
  const isPaid = currentPlan === 'pro' || currentPlan === 'business';

  // Success animation
  useEffect(() => {
    if (success === 'true') {
      setShowSuccess(true);
      runConfetti();
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  function runConfetti() {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = [];
    const colors = ['#4F46E5', '#F59E0B', '#16A34A', '#EC4899', '#8B5CF6', '#06B6D4'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 1) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 2,
        life: 1,
      });
    }

    let frame = 0;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.012;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      frame++;
      if (alive && frame < 300) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  async function handleCheckout(tier: 'pro' | 'business') {
    setLoading(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <PageHeader title="Subscription" />

      {/* Confetti canvas */}
      <canvas
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-50"
        style={{ display: showSuccess ? 'block' : 'none' }}
      />

      <div className="px-4 py-6 space-y-6 pb-32">
        {/* Current Plan Badge */}
        <div className="flex items-center justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            isPaid
              ? 'bg-[#4F46E5]/10 text-[#818CF8] border border-[#4F46E5]/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-[#4F46E5]' : 'bg-slate-500'}`} />
            Current plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </div>
        </div>

        {/* Success Banner */}
        {showSuccess && (
          <div className="rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/10 p-5 text-center">
            <div className="text-3xl mb-2">&#127881;</div>
            <p className="text-lg font-bold text-[#16A34A]">
              Welcome to {currentPlan === 'business' ? 'Business' : 'Pro'}!
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Your plan has been upgraded successfully.
            </p>
          </div>
        )}

        {/* Canceled Banner */}
        {canceled === 'true' && (
          <div className="rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 p-4">
            <p className="text-sm font-medium text-[#DC2626] text-center">
              Checkout canceled. No charges were made.
            </p>
          </div>
        )}

        {/* Plan Cards — horizontal scroll on mobile */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isPro = plan.key === 'pro';
            const isBusiness = plan.key === 'business';

            return (
              <div
                key={plan.key}
                className={`flex-shrink-0 w-[280px] snap-center rounded-2xl border-2 p-5 flex flex-col ${
                  isPro
                    ? 'border-[#4F46E5] bg-gradient-to-b from-[rgba(79,70,229,0.08)] to-slate-800'
                    : isBusiness
                    ? 'border-[#F59E0B]/40 bg-gradient-to-b from-[rgba(245,158,11,0.06)] to-slate-800'
                    : 'border-slate-700 bg-slate-800'
                }`}
                style={{ minHeight: 380 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  {plan.badge && (
                    <span className="rounded-full bg-[#4F46E5] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-0.5 mb-5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px] text-slate-300">
                      <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <div className="mt-5">
                  {isCurrent ? (
                    isPaid ? (
                      <button
                        onClick={handlePortal}
                        disabled={loading === 'portal'}
                        className="w-full rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/10 py-3 text-sm font-semibold text-[#818CF8] transition-colors hover:bg-[#4F46E5]/20 disabled:opacity-50"
                      >
                        {loading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full rounded-xl bg-slate-700 py-3 text-sm font-medium text-slate-400 cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    )
                  ) : plan.key === 'free' ? null : (
                    <button
                      onClick={() => handleCheckout(plan.key as 'pro' | 'business')}
                      disabled={loading === plan.key || profile.role !== 'owner'}
                      className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                        isBusiness
                          ? 'bg-[#F59E0B] hover:bg-[#D97706]'
                          : 'bg-[#4F46E5] hover:bg-[#4338CA]'
                      }`}
                    >
                      {loading === plan.key
                        ? 'Redirecting...'
                        : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center">
          <h3 className="text-base font-bold text-white">Enterprise</h3>
          <p className="mt-1 text-sm text-slate-400">
            Custom limits, API access, dedicated support
          </p>
          <a
            href="mailto:hello@bizpocket.io"
            className="mt-3 inline-block rounded-xl border border-[#4F46E5]/30 px-5 py-2 text-sm font-semibold text-[#818CF8] transition-colors hover:bg-[#4F46E5]/10"
          >
            Contact Sales
          </a>
        </div>

        {profile.role !== 'owner' && (
          <p className="text-center text-xs text-slate-500">
            Only the account owner can manage subscriptions.
          </p>
        )}
      </div>
    </div>
  );
}
