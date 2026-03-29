'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BusinessSetupPage() {
  const { organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    address_line2: '',
    phone: '',
    tax_number: '',
    bank_name: '',
    bank_branch: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_account_type: 'futsu',
    logo_url: '',
  });

  // Pre-fill from organization data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    if (organization) {
      setForm((prev) => ({
        ...prev,
        name: (organization as any).name as string || '',
        address: (organization as any).address as string || '',
        address_line2: (organization as any).address_line2 as string || '',
        phone: (organization as any).phone as string || '',
        tax_number: (organization as any).tax_number as string || '',
        bank_name: (organization as any).bank_name as string || '',
        bank_branch: (organization as any).bank_branch as string || '',
        bank_account_name: (organization as any).bank_account_name as string || '',
        bank_account_number: (organization as any).bank_account_number as string || '',
        bank_account_type: (organization as any).bank_account_type as string || 'futsu',
        logo_url: (organization as any).logo_url as string || '',
      }));
    }
  }, [organization]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('organizations')
      .update({
        name: form.name,
        address: form.address,
        address_line2: form.address_line2 || null,
        phone: form.phone,
        tax_number: form.tax_number,
        bank_name: form.bank_name,
        bank_branch: form.bank_branch,
        bank_account_name: form.bank_account_name,
        bank_account_number: form.bank_account_number,
        bank_account_type: form.bank_account_type,
        logo_url: form.logo_url || null,
      })
      .eq('id', organization.id);

    setSaving(false);

    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Business profile saved', 'success');
      router.push('/settings');
    }
  }

  const inputClass =
    'w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]';
  const labelClass = 'text-sm font-medium text-[var(--text-2)] mb-1.5 block';
  const sectionHeader =
    'text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3] mb-3';

  return (
    <div className="space-y-6 p-4">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Settings
      </Link>

      <h1 className="text-xl font-semibold text-[var(--text-1)]">Business Profile Setup</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Info */}
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className={sectionHeader}>Company Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className={labelClass}>Business Legal Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="MS Dynamics LLC"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="address" className={labelClass}>Address Line 1</label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={form.address}
                onChange={handleChange}
                placeholder="1-2-3 Shibuya, Shibuya-ku"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="address_line2" className={labelClass}>
                Address Line 2 <span className="text-[var(--text-4)] font-normal">(optional)</span>
              </label>
              <input
                id="address_line2"
                name="address_line2"
                type="text"
                value={form.address_line2}
                onChange={handleChange}
                placeholder="Building name, floor, etc."
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="03-1234-5678"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="tax_number" className={labelClass}>
                Tax Registration Number / 登録番号
              </label>
              <input
                id="tax_number"
                name="tax_number"
                type="text"
                value={form.tax_number}
                onChange={handleChange}
                placeholder="T1234567890123"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className={sectionHeader}>Bank Details</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="bank_name" className={labelClass}>Bank Name</label>
              <input
                id="bank_name"
                name="bank_name"
                type="text"
                value={form.bank_name}
                onChange={handleChange}
                placeholder="Mitsubishi UFJ Bank"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bank_branch" className={labelClass}>Bank Branch</label>
              <input
                id="bank_branch"
                name="bank_branch"
                type="text"
                value={form.bank_branch}
                onChange={handleChange}
                placeholder="Shibuya Branch"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bank_account_name" className={labelClass}>Account Name</label>
              <input
                id="bank_account_name"
                name="bank_account_name"
                type="text"
                value={form.bank_account_name}
                onChange={handleChange}
                placeholder="MS Dynamics LLC"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bank_account_number" className={labelClass}>Account Number</label>
              <input
                id="bank_account_number"
                name="bank_account_number"
                type="text"
                value={form.bank_account_number}
                onChange={handleChange}
                placeholder="1234567"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bank_account_type" className={labelClass}>Account Type</label>
              <select
                id="bank_account_type"
                name="bank_account_type"
                value={form.bank_account_type}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="futsu">普通 (Futsu / Savings)</option>
                <option value="touza">当座 (Touza / Checking)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="rounded-card border border-[#E5E5E5] bg-white p-4">
          <h2 className={sectionHeader}>Branding</h2>
          <div>
            <label htmlFor="logo_url" className={labelClass}>
              Business Logo URL <span className="text-[var(--text-4)] font-normal">(optional)</span>
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="text"
              value={form.logo_url}
              onChange={handleChange}
              placeholder="Logo upload coming soon"
              className={inputClass}
            />
          </div>
        </section>

        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-btn bg-[#4F46E5] py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Business Profile'}
        </button>
      </form>
    </div>
  );
}
