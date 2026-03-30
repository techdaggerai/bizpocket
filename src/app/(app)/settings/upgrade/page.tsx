'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const PLANS = [
  {
    key: 'free' as const,
    name: 'Starter',
    price: '¥0',
    period: '',
    features: [
      '5 invoices/month',
      'PocketChat (2 contacts)',
      '1 language',
      'Basic cash flow',
    ],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '¥2,980',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_1TGXQoKiugpuK1mjtDYwA15I',
    features: [
      'Unlimited invoices',
      'PocketChat unlimited',
      '5 languages',
      'AI Morning Briefing',
      'Accountant Portal',
    ],
  },
  {
    key: 'business' as const,
    name: 'Business',
    price: '¥5,980',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || 'price_1TGXRfKiugpuK1mjK5oI8CsA',
    features: [
      'Everything in Pro',
      'Voice translation',
      '13 languages',
      'Document scan AI',
      'Priority support',
    ],
  },
];

export default function UpgradePage() {
  const { organization, profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const currentPlan = organization.plan || 'free';

  async function handleCheckout(priceId: string, planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          organizationId: organization.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
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
        body: JSON.stringify({ organizationId: organization.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-[var(--text-3)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-[var(--text-1)]">Upgrade Plan</h1>
      </div>

      {/* Success/Cancel Banners */}
      {success && (
        <div className="rounded-card border border-[#16A34A]/20 bg-[#16A34A]/5 p-4">
          <p className="text-sm font-medium text-[#16A34A]">
            Subscription activated! Your plan has been upgraded.
          </p>
        </div>
      )}
      {cancelled && (
        <div className="rounded-card border border-[#DC2626]/20 bg-[#DC2626]/5 p-4">
          <p className="text-sm font-medium text-[#DC2626]">
            Checkout cancelled. No charges were made.
          </p>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isDowngrade = (currentPlan === 'business' && plan.key === 'pro') ||
                              (currentPlan !== 'free' && plan.key === 'free');

          return (
            <div
              key={plan.key}
              className={`rounded-card border-2 p-5 transition-all ${
                isCurrent
                  ? 'border-[#4F46E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)]'
                  : 'border-[#E5E5E5] bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-1)]">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-[var(--text-1)]">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-[var(--text-3)]">{plan.period}</span>
                    )}
                  </div>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-[#4F46E5] px-3 py-1 text-xs font-semibold text-white">
                    Current
                  </span>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                    <svg className="h-4 w-4 flex-shrink-0 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <div className="mt-5">
                {isCurrent ? (
                  currentPlan !== 'free' ? (
                    <button
                      onClick={handlePortal}
                      disabled={loading === 'portal'}
                      className="w-full rounded-btn border border-[#4F46E5]/20 bg-[rgba(79,70,229,0.08)] py-3 text-sm font-semibold text-[#4F46E5] transition-colors hover:bg-[rgba(79,70,229,0.12)] disabled:opacity-50"
                    >
                      {loading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                    </button>
                  ) : (
                    <div className="py-3 text-center text-sm text-[var(--text-3)]">
                      Your current plan
                    </div>
                  )
                ) : plan.key === 'free' ? null : isDowngrade ? (
                  <button
                    onClick={handlePortal}
                    disabled={loading === 'portal'}
                    className="w-full rounded-btn border border-[#E5E5E5] py-3 text-sm font-medium text-[var(--text-3)] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                  >
                    {loading === 'portal' ? 'Loading...' : 'Change Plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.priceId!, plan.key)}
                    disabled={loading === plan.key || profile.role !== 'owner'}
                    className="w-full rounded-btn bg-[#4F46E5] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
                  >
                    {loading === plan.key ? 'Redirecting...' : `Go ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="rounded-card border border-[#E5E5E5] bg-white p-5 text-center">
        <h3 className="text-lg font-bold text-[var(--text-1)]">Enterprise</h3>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Multiple orgs, API access, white label, dedicated support
        </p>
        <a
          href="mailto:hello@bizpocket.jp"
          className="mt-4 inline-block rounded-btn border border-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-[#4F46E5] transition-colors hover:bg-[rgba(79,70,229,0.08)]"
        >
          Contact Sales
        </a>
      </div>

      {profile.role !== 'owner' && (
        <p className="text-center text-xs text-[var(--text-4)]">
          Only the account owner can manage subscriptions.
        </p>
      )}
    </div>
  );
}
