'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';

const BUSINESS_TYPES = [
  { value: 'car_dealer', label: 'Car Dealer / Auto' },
  { value: 'parts', label: 'Parts & Export' },
  { value: 'restaurant', label: 'Restaurant / Food' },
  { value: 'bakery', label: 'Bakery / Cakes' },
  { value: 'retail', label: 'Retail / Shop' },
  { value: 'construction', label: 'Construction' },
  { value: 'consulting', label: 'Consulting / Services' },
  { value: 'beauty', label: 'Beauty / Salon' },
  { value: 'freelance', label: 'Freelance / Creative' },
  { value: 'ecommerce', label: 'E-Commerce / Online' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'transport', label: 'Transport / Logistics' },
  { value: 'education', label: 'Education / Tutoring' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'ur', label: 'اردو (Urdu)' },
];

const CURRENCIES = [
  { value: 'JPY', label: '¥ JPY — Japanese Yen' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'GBP', label: '£ GBP — British Pound' },
  { value: 'PKR', label: '₨ PKR — Pakistani Rupee' },
  { value: 'AED', label: 'د.إ AED — UAE Dirham' },
  { value: 'SAR', label: '﷼ SAR — Saudi Riyal' },
  { value: 'BDT', label: '৳ BDT — Bangladeshi Taka' },
  { value: 'PHP', label: '₱ PHP — Philippine Peso' },
  { value: 'VND', label: '₫ VND — Vietnamese Dong' },
  { value: 'TRY', label: '₺ TRY — Turkish Lira' },
  { value: 'CNY', label: '¥ CNY — Chinese Yuan' },
  { value: 'BRL', label: 'R$ BRL — Brazilian Real' },
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'CAD', label: '$ CAD — Canadian Dollar' },
  { value: 'AUD', label: '$ AUD — Australian Dollar' },
];

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'free';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    business_name: '',
    business_types: [] as string[],
    language: 'en',
    currency: 'JPY',
    accountant_email: '',
  });

  async function handleFinish(skip = false) {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired — please log in again.');
      setLoading(false);
      return;
    }

    // Check if user already has a profile+org (prevent duplicate creation)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile?.organization_id) {
      // Already onboarded — just redirect
      if (selectedPlan === 'pro' || selectedPlan === 'business') {
        router.push(`/settings/upgrade?plan=${selectedPlan}&auto=1`);
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // Create organization with 14-day trial
    const slug = form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50) || 'my-business';
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: form.business_name,
        slug,
        business_type: form.business_types.join(',') || 'other',
        language: form.language,
        currency: form.currency,
        created_by: user.id,
        plan: 'free',
        trial_ends_at: trialEnd,
      })
      .select()
      .single();

    if (orgError || !org) {
      setError(orgError?.message || 'Failed to create organization.');
      setLoading(false);
      return;
    }

    // Create owner profile
    await supabase.from('profiles').insert({
      user_id: user.id,
      organization_id: org.id,
      role: 'owner',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
      email: user.email!,
      language: form.language,
    });

    // If accountant email provided (and not skipping), create invite placeholder
    if (!skip && form.accountant_email) {
      await supabase.from('profiles').insert({
        user_id: user.id, // placeholder — will be updated on accountant signup
        organization_id: org.id,
        role: 'accountant',
        name: 'Accountant (Invited)',
        email: form.accountant_email,
        language: form.language,
      });
    }

    if (selectedPlan === 'pro' || selectedPlan === 'business') {
      router.push(`/settings/upgrade?plan=${selectedPlan}&auto=1`);
    } else {
      router.push('/dashboard');
    }
  }

  const totalSteps = 4;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-3)]">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E5E5E5]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#4F46E5] transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Business Name + Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-1)]">What&apos;s your business called?</h2>
              <p className="mt-1 text-sm text-[var(--text-3)]">We&apos;ll use this on invoices and documents</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none"
                placeholder="e.g., Tokyo Auto Export"
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-2)]">Business type</label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map((bt) => {
                    const selected = form.business_types.includes(bt.value);
                    return (
                      <button
                        key={bt.value}
                        onClick={() =>
                          setForm({
                            ...form,
                            business_types: selected
                              ? form.business_types.filter((t) => t !== bt.value)
                              : [...form.business_types, bt.value],
                          })
                        }
                        className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          selected
                            ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]'
                            : 'border-[#E5E5E5] text-[var(--text-2)] hover:border-[#C5C5C5]'
                        }`}
                      >
                        {bt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Language */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-1)]">Choose your language</h2>
              <p className="mt-1 text-sm text-[var(--text-3)]">You can change this anytime in settings</p>
            </div>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full rounded-input border border-[#E5E5E5] bg-white px-3 py-2.5 text-base text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]"
            >
              <option value="en">🌐 English</option>
              <option value="ja">🌐 日本語</option>
              <option value="ur">🌐 اردو</option>
              <option value="ar">🌐 العربية</option>
              <option value="bn">🌐 বাংলা</option>
              <option value="pt">🌐 Português</option>
              <option value="tl">🌐 Filipino</option>
              <option value="vi">🌐 Tiếng Việt</option>
              <option value="tr">🌐 Türkçe</option>
              <option value="zh">🌐 中文</option>
              <option value="fr">🌐 Français</option>
              <option value="nl">🌐 Nederlands</option>
              <option value="es">🌐 Español</option>
            </select>
          </div>
        )}

        {/* Step 3: Currency */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-1)]">Default currency</h2>
              <p className="mt-1 text-sm text-[var(--text-3)]">Used for invoices and cash flow tracking</p>
            </div>
            <div className="space-y-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, currency: c.value })}
                  className={`w-full rounded-lg border px-4 py-3.5 text-left text-sm transition-colors ${
                    form.currency === c.value
                      ? 'border-[#4F46E5] bg-[rgba(79,70,229,0.08)] text-[#4F46E5]'
                      : 'border-[#E5E5E5] text-[var(--text-2)] hover:border-[#C5C5C5]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Invite Accountant */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-1)]">Invite your accountant</h2>
              <p className="mt-1 text-sm text-[var(--text-3)]">They&apos;ll get read-only access to everything. You can skip this.</p>
            </div>
            <input
              type="email"
              value={form.accountant_email}
              onChange={(e) => setForm({ ...form, accountant_email: e.target.value })}
              className="w-full rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none"
              placeholder="accountant@example.com"
            />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-lg border border-[#E5E5E5] py-2.5 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[#C5C5C5]"
            >
              Back
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!form.business_name || form.business_types.length === 0)}
              className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => handleFinish(false)}
              disabled={loading}
              className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Get Started'}
            </button>
          )}
        </div>

        {step === 4 && (
          <button
            onClick={() => handleFinish(true)}
            disabled={loading}
            className="mt-3 w-full py-2 text-center text-sm text-[var(--text-4)] hover:text-[var(--text-2)]"
          >
            Skip for now
          </button>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
