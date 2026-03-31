'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const STYLES = [
  { key: 'modern', label: 'Modern', desc: 'Clean lines, bold typography', color: '#4F46E5' },
  { key: 'elegant', label: 'Elegant', desc: 'Refined, luxury feel', color: '#0F172A' },
  { key: 'vibrant', label: 'Vibrant', desc: 'Colorful, energetic', color: '#EC4899' },
  { key: 'minimal', label: 'Minimal', desc: 'Less is more', color: '#16A34A' },
  { key: 'warm', label: 'Warm', desc: 'Friendly, approachable', color: '#F59E0B' },
  { key: 'dark', label: 'Dark', desc: 'Sleek dark theme', color: '#1E293B' },
];

const BRAND_COLORS = [
  '#4F46E5', '#0EA5E9', '#16A34A', '#DC2626', '#F59E0B', '#EC4899',
  '#7C3AED', '#0F172A', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4',
];

export default function WebsiteBuilderPage() {
  const { organization, profile, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;

  const [form, setForm] = useState({
    businessName: organization.name || '',
    businessType: organization.business_type || '',
    tagline: '',
    services: '',
    phone: org.phone || '',
    email: profile.email || '',
    address: org.address || '',
    language: profile.language || 'en',
    brandColor: '#4F46E5',
    style: 'modern',
  });

  const [generating, setGenerating] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'preview'>('form');

  async function generateWebsite() {
    if (!form.businessName.trim()) {
      toast('Enter your business name', 'error');
      return;
    }
    setGenerating(true);

    try {
      const res = await fetch('/api/ai/website-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.html) {
        setGeneratedHTML(data.html);
        setStep('preview');
      } else {
        toast(data.error || 'Failed to generate', 'error');
      }
    } catch {
      toast('Failed to generate website', 'error');
    }
    setGenerating(false);
  }

  async function downloadHTML() {
    if (!generatedHTML) return;
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.businessName.replace(/\s+/g, '-').toLowerCase()}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Website downloaded!', 'success');
  }

  async function copyHTML() {
    if (!generatedHTML) return;
    await navigator.clipboard.writeText(generatedHTML);
    toast('HTML copied to clipboard!', 'success');
  }

  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  async function publishWebsite() {
    if (!generatedHTML) return;
    setPublishing(true);

    const slug = form.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const { data: existing } = await supabase
      .from('published_websites')
      .select('id')
      .eq('organization_id', organization.id)
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing
      const res = await supabase
        .from('published_websites')
        .update({
          slug,
          business_name: form.businessName,
          html: generatedHTML,
          style: form.style,
          brand_color: form.brandColor,
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      error = res.error;
    } else {
      // Create new
      const res = await supabase
        .from('published_websites')
        .insert({
          organization_id: organization.id,
          slug,
          business_name: form.businessName,
          html: generatedHTML,
          style: form.style,
          brand_color: form.brandColor,
          created_by: user.id,
        });
      error = res.error;
    }

    if (error) {
      toast('Failed to publish: ' + error.message, 'error');
    } else {
      const url = `${window.location.origin}/site/${slug}`;
      setPublishedUrl(url);
      toast('Website is LIVE!', 'success');
    }
    setPublishing(false);
  }

  const inputClass = 'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]';

  if (step === 'preview' && generatedHTML) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Preview Header */}
        <div className="border-b border-[#E5E5E5] bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('form')} className="text-[var(--text-3)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-1)]">Website Preview</h1>
              <p className="text-[10px] text-[var(--text-3)]">{form.businessName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStep('form'); setGeneratedHTML(null); setPublishedUrl(null); }}
              className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-medium text-[var(--text-3)] hover:bg-[var(--bg-2)] transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={downloadHTML}
              className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)] transition-colors"
            >
              Download
            </button>
            <button
              onClick={publishWebsite}
              disabled={publishing}
              className="rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#15803D] transition-colors disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : publishedUrl ? 'Update' : 'Publish Live'}
            </button>
          </div>
        </div>

        {/* Published URL Banner */}
        {publishedUrl && (
          <div className="mx-4 mt-2 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#16A34A]">Your website is LIVE!</p>
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#16A34A] underline break-all">{publishedUrl}</a>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(publishedUrl);
                toast('URL copied!', 'success');
              }}
              className="shrink-0 rounded-md bg-[#16A34A] px-2.5 py-1.5 text-[10px] font-semibold text-white"
            >
              Copy URL
            </button>
          </div>
        )}

        {/* Website Preview */}
        <div className="flex-1 bg-[#F0F0F0] p-4 overflow-hidden">
          <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden border border-[#E5E5E5]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 bg-[#F5F5F5] px-3 py-2 border-b border-[#E5E5E5]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 text-center">
                <div className="inline-flex items-center gap-1 bg-white rounded px-3 py-1 text-[10px] text-[#999]">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75" />
                  </svg>
                  {form.businessName.replace(/\s+/g, '-').toLowerCase()}.bizpocket.io
                </div>
              </div>
            </div>
            {/* Iframe */}
            <iframe
              ref={iframeRef}
              srcDoc={generatedHTML}
              className="w-full h-[calc(100%-36px)]"
              sandbox="allow-scripts"
              title="Website Preview"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-[var(--text-3)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">AI Website Builder</h1>
          <p className="text-xs text-[var(--text-3)]">Generate a professional website for your business in 60 seconds</p>
        </div>
      </div>

      {/* Business Info */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)]">Your Business</h2>
        <input
          type="text"
          placeholder="Business Name *"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Business Type (e.g., Car Dealer, Bakery, IT Consulting)"
          value={form.businessType}
          onChange={(e) => setForm({ ...form, businessType: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Tagline (e.g., 'Quality Cars, Fair Prices')"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          className={inputClass}
        />
        <textarea
          placeholder="Services or Products (one per line)"
          value={form.services}
          onChange={(e) => setForm({ ...form, services: e.target.value })}
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Contact Info */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)]">Contact Details</h2>
        <input
          type="tel"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Style Selection */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">Website Style</h2>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.key}
              onClick={() => setForm({ ...form, style: s.key })}
              className={`rounded-lg p-3 text-left transition-all ${
                form.style === s.key
                  ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/5'
                  : 'border border-[#E5E5E5] hover:bg-[var(--bg-2)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold text-[var(--text-1)]">{s.label}</span>
              </div>
              <p className="text-[9px] text-[var(--text-3)]">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Color */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">Brand Color</h2>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm({ ...form, brandColor: c })}
              className={`w-9 h-9 rounded-lg transition-all ${
                form.brandColor === c ? 'ring-2 ring-offset-2 ring-[#4F46E5] scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateWebsite}
        disabled={generating || !form.businessName.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] py-4 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            AI is building your website...
          </span>
        ) : (
          'Generate My Website'
        )}
      </button>
    </div>
  );
}
