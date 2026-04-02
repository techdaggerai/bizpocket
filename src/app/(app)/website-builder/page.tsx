'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const STYLES = [
  { key: 'classic', label: 'Classic', desc: 'Clean, professional, trusted', preview: 'bg-white border-t-4 border-[#0A0A0A]' },
  { key: 'modern', label: 'Modern', desc: 'Bold typography, sharp edges', preview: 'bg-white border-t-4 border-[#4F46E5]' },
  { key: 'elegant', label: 'Elegant', desc: 'Refined, luxury, serif fonts', preview: 'bg-[#FAF9F6] border-t-4 border-[#8B7355]' },
  { key: 'bold', label: 'Bold', desc: 'Dark, high contrast, striking', preview: 'bg-[#0A0A0A] border-t-4 border-[#FACC15]' },
  { key: 'warm', label: 'Warm', desc: 'Friendly, approachable, soft', preview: 'bg-[#FFFBF5] border-t-4 border-[#EA580C]' },
  { key: 'minimal', label: 'Minimal', desc: 'Less is more, whitespace', preview: 'bg-white border-t-4 border-[#E5E5E5]' },
];

const SECTIONS = [
  { key: 'hero', label: 'Hero Banner', desc: 'Business name + tagline + CTA', required: true },
  { key: 'about', label: 'About', desc: 'Your story and mission' },
  { key: 'services', label: 'Services / Products', desc: 'What you offer' },
  { key: 'gallery', label: 'Gallery', desc: 'Photo showcase grid' },
  { key: 'testimonials', label: 'Testimonials', desc: 'Customer reviews' },
  { key: 'pricing', label: 'Pricing', desc: 'Plans or menu' },
  { key: 'team', label: 'Team', desc: 'Meet the people' },
  { key: 'contact', label: 'Contact', desc: 'Phone, email, address, map', required: true },
  { key: 'faq', label: 'FAQ', desc: 'Common questions' },
  { key: 'order', label: 'Order Now', desc: 'Link to your BizPocket order page' },
];

interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
}

export default function WebsiteBuilderPage() {
  const { organization, profile, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Step 1: Business info
  const [businessName, setBusinessName] = useState(organization.name || '');
  const [businessType, setBusinessType] = useState(organization.business_type || '');
  const [tagline, setTagline] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [services, setServices] = useState('');
  const [phone, setPhone] = useState(org.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [address, setAddress] = useState(org.address || '');

  // Step 2: Style
  const [selectedStyle, setSelectedStyle] = useState('classic');

  // Step 3: Colors (AI-generated)
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<number>(0);
  const [loadingPalettes, setLoadingPalettes] = useState(false);

  // Step 4: Sections
  const [selectedSections, setSelectedSections] = useState<string[]>(['hero', 'about', 'services', 'contact']);

  // Step 5-6: Generate & Preview
  const [generating, setGenerating] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);

  // Step 7: Publish
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const inputClass = 'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] placeholder-[#999] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]';

  // Generate AI color palettes
  async function generatePalettes() {
    setLoadingPalettes(true);
    try {
      const res = await fetch('/api/ai/website-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'palettes',
          businessType,
          style: selectedStyle,
        }),
      });
      const data = await res.json();
      if (data.palettes) {
        setPalettes(data.palettes);
      } else {
        // Fallback palettes
        setPalettes([
          { name: 'Professional', primary: '#0A0A0A', secondary: '#4F46E5', accent: '#4F46E5', bg: '#FFFFFF', text: '#0A0A0A' },
          { name: 'Natural', primary: '#1B4332', secondary: '#2D6A4F', accent: '#40916C', bg: '#F0FFF4', text: '#1B4332' },
          { name: 'Warm', primary: '#7C2D12', secondary: '#C2410C', accent: '#EA580C', bg: '#FFFBF5', text: '#431407' },
        ]);
      }
    } catch {
      setPalettes([
        { name: 'Professional', primary: '#0A0A0A', secondary: '#4F46E5', accent: '#4F46E5', bg: '#FFFFFF', text: '#0A0A0A' },
        { name: 'Natural', primary: '#1B4332', secondary: '#2D6A4F', accent: '#40916C', bg: '#F0FFF4', text: '#1B4332' },
        { name: 'Warm', primary: '#7C2D12', secondary: '#C2410C', accent: '#EA580C', bg: '#FFFBF5', text: '#431407' },
      ]);
    }
    setLoadingPalettes(false);
  }

  // Generate website
  async function generateWebsite() {
    setGenerating(true);
    const palette = palettes[selectedPalette] || palettes[0];
    try {
      const res = await fetch('/api/ai/website-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          organizationId: organization.id,
          businessName,
          businessType,
          tagline,
          aboutText,
          services,
          phone,
          email,
          address,
          language: profile.language || 'en',
          style: selectedStyle,
          palette,
          sections: selectedSections,
        }),
      });
      const data = await res.json();
      if (data.html) {
        setGeneratedHTML(data.html);
        setStep(6);
      } else {
        toast(data.error || 'Failed to generate', 'error');
      }
    } catch {
      toast('Failed to generate website', 'error');
    }
    setGenerating(false);
  }

  // Publish
  async function publishWebsite() {
    if (!generatedHTML) return;
    setPublishing(true);

    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

    const { data: existing } = await supabase
      .from('published_websites')
      .select('id')
      .eq('organization_id', organization.id)
      .limit(1)
      .single();

    const payload = {
      organization_id: organization.id,
      slug,
      business_name: businessName,
      html: generatedHTML,
      style: selectedStyle,
      brand_color: palettes[selectedPalette]?.primary || '#4F46E5',
      is_published: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase.from('published_websites').update(payload).eq('id', existing.id)
      : await supabase.from('published_websites').insert({ ...payload, created_by: user.id });

    if (error) {
      toast('Failed to publish: ' + error.message, 'error');
    } else {
      setPublishedUrl(`${window.location.origin}/site/${slug}`);
      setStep(7);
      toast('Website published!', 'success');
    }
    setPublishing(false);
  }

  // Progress bar
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#999]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[15px] font-semibold text-[#0A0A0A]">Website Builder<span className="ml-2 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">AI</span></h1>
              <p className="text-[10px] text-[#999]">Step {step} of {totalSteps}</p>
            </div>
          </div>
          {step < 6 && step > 1 && (
            <button onClick={() => setStep(step - 1)} className="text-[12px] text-[#4F46E5] font-medium">Back</button>
          )}
        </div>
        <div className="mt-2 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#4F46E5] transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">

        {/* ═══ STEP 1: Business Info ═══ */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Tell us about your business</h2>
              <p className="text-[13px] text-[#666] mt-1">This info shapes your website. You can edit everything later.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Business name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={inputClass} placeholder="Sweet Cakes by Sarah" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">What do you do?</label>
                <input value={businessType} onChange={e => setBusinessType(e.target.value)} className={inputClass} placeholder="Custom cakes & pastries" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Tagline</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} className={inputClass} placeholder="Handcrafted with love since 2020" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">About your business</label>
                <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={3} className={inputClass} placeholder="What makes your business special? Your story..." />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Services / Products</label>
                <textarea value={services} onChange={e => setServices(e.target.value)} rows={2} className={inputClass} placeholder="Wedding cakes, Birthday cakes, Cupcakes, Pastries" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+81..." />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className={inputClass} placeholder="Nagoya, Japan" />
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!businessName.trim()}
              className="w-full rounded-xl bg-[#0A0A0A] py-3 text-[13px] font-medium text-white disabled:opacity-30 hover:bg-[#333] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 2: Style ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Choose a style</h2>
              <p className="text-[13px] text-[#666] mt-1">This sets the overall feel of your website.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STYLES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSelectedStyle(s.key)}
                  className={`rounded-xl overflow-hidden text-left transition-all ${
                    selectedStyle === s.key ? 'ring-2 ring-[#4F46E5] ring-offset-2' : 'border border-[#E5E5E5]'
                  }`}
                >
                  <div className={`h-20 ${s.preview} p-3`}>
                    <div className="h-2 w-16 rounded-full bg-current opacity-20 mb-2" />
                    <div className="h-1.5 w-24 rounded-full bg-current opacity-10" />
                    <div className="h-1.5 w-20 rounded-full bg-current opacity-10 mt-1" />
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">{s.label}</p>
                    <p className="text-[10px] text-[#999]">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStep(3); generatePalettes(); }}
              className="w-full rounded-xl bg-[#0A0A0A] py-3 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 3: Colors ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Pick your colors</h2>
              <p className="text-[13px] text-[#666] mt-1">AI suggested these based on your {businessType} business.</p>
            </div>
            {loadingPalettes ? (
              <div className="flex justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-3">
                {palettes.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPalette(i)}
                    className={`w-full rounded-xl p-4 text-left transition-all ${
                      selectedPalette === i ? 'ring-2 ring-[#4F46E5] ring-offset-2' : 'border border-[#E5E5E5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-medium text-[#0A0A0A]">{p.name}</span>
                      {selectedPalette === i && (
                        <svg className="h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[p.primary, p.secondary, p.accent, p.bg, p.text].map((c, j) => (
                        <div key={j} className="flex-1">
                          <div className="h-8 rounded-md border border-black/5" style={{ backgroundColor: c }} />
                          <p className="text-[8px] text-[#999] mt-1 text-center">{c}</p>
                        </div>
                      ))}
                    </div>
                    {/* Mini preview */}
                    <div className="mt-3 rounded-lg overflow-hidden border border-[#E5E5E5]" style={{ backgroundColor: p.bg }}>
                      <div className="h-1.5" style={{ backgroundColor: p.primary }} />
                      <div className="p-2">
                        <div className="h-2 w-16 rounded-full mb-1" style={{ backgroundColor: p.primary }} />
                        <div className="h-1.5 w-24 rounded-full opacity-30" style={{ backgroundColor: p.text }} />
                        <div className="mt-2 h-5 w-14 rounded text-center text-[7px] leading-5 text-white" style={{ backgroundColor: p.accent }}>
                          Button
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep(4)}
              disabled={palettes.length === 0}
              className="w-full rounded-xl bg-[#0A0A0A] py-3 text-[13px] font-medium text-white disabled:opacity-30 hover:bg-[#333] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 4: Sections ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Choose your sections</h2>
              <p className="text-[13px] text-[#666] mt-1">Select what pages appear on your website.</p>
            </div>
            <div className="space-y-2">
              {SECTIONS.map(s => {
                const isSelected = selectedSections.includes(s.key);
                const isRequired = s.required;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      if (isRequired) return;
                      setSelectedSections(prev =>
                        isSelected ? prev.filter(k => k !== s.key) : [...prev, s.key]
                      );
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left transition-all ${
                      isSelected ? 'bg-[#4F46E5]/5 border border-[#4F46E5]/20' : 'border border-[#E5E5E5] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      isSelected ? 'bg-[#4F46E5]' : 'border border-[#DDD]'
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-[#0A0A0A]">{s.label}</p>
                      <p className="text-[10px] text-[#999]">{s.desc}</p>
                    </div>
                    {isRequired && <span className="text-[9px] text-[#999]">Required</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(5)}
              className="w-full rounded-xl bg-[#0A0A0A] py-3 text-[13px] font-medium text-white hover:bg-[#333] transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 5: Generate ═══ */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Ready to build</h2>
              <p className="text-[13px] text-[#666] mt-1">Review your choices, then let AI create your website.</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] p-4 space-y-3">
              <div className="flex justify-between text-[13px]"><span className="text-[#999]">Business</span><span className="font-medium">{businessName}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[#999]">Type</span><span className="font-medium">{businessType}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[#999]">Style</span><span className="font-medium capitalize">{selectedStyle}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[#999]">Colors</span><span className="font-medium">{palettes[selectedPalette]?.name || 'Default'}</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-[#999]">Sections</span><span className="font-medium">{selectedSections.length} selected</span></div>
            </div>
            <button
              onClick={generateWebsite}
              disabled={generating}
              className="w-full rounded-xl bg-[#4F46E5] py-4 text-[14px] font-semibold text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Building your website...
                </span>
              ) : (
                'Build my website'
              )}
            </button>
          </div>
        )}

        {/* ═══ STEP 6: Preview & Customize ═══ */}
        {step === 6 && generatedHTML && (
          <div className="-mx-4 -mt-4">
            {/* Preview header */}
            <div className="px-4 py-3 bg-white border-b border-[#F0F0F0] flex items-center justify-between">
              <button onClick={() => setStep(5)} className="text-[12px] text-[#999]">Back</button>
              <span className="text-[13px] font-medium text-[#0A0A0A]">Preview</span>
              <div className="flex gap-2">
                <button onClick={() => { setGeneratedHTML(null); setStep(5); }} className="text-[12px] text-[#999]">Regenerate</button>
              </div>
            </div>

            {/* Browser frame */}
            <div className="mx-4 mt-3 rounded-xl border border-[#E5E5E5] overflow-hidden bg-white">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                  <div className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2 h-2 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 text-center text-[10px] text-[#BBB]">
                  {businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.bizpocket.io
                </div>
              </div>
              <iframe
                ref={iframeRef}
                srcDoc={generatedHTML}
                className="w-full h-[400px]"
                sandbox="allow-scripts"
                title="Website Preview"
              />
            </div>

            {/* Action buttons */}
            <div className="px-4 mt-4 space-y-2 pb-4">
              <button
                onClick={publishWebsite}
                disabled={publishing}
                className="w-full rounded-xl bg-[#16A34A] py-3.5 text-[14px] font-semibold text-white disabled:opacity-50 hover:bg-[#15803D] transition-colors"
              >
                {publishing ? 'Publishing...' : 'Publish — Go Live'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!generatedHTML) return;
                    const blob = new Blob([generatedHTML], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast('Downloaded!', 'success');
                  }}
                  className="rounded-xl border border-[#E5E5E5] py-2.5 text-[12px] font-medium text-[#666]"
                >
                  Download HTML
                </button>
                <button
                  onClick={async () => {
                    if (!generatedHTML) return;
                    await navigator.clipboard.writeText(generatedHTML);
                    toast('HTML copied!', 'success');
                  }}
                  className="rounded-xl border border-[#E5E5E5] py-2.5 text-[12px] font-medium text-[#666]"
                >
                  Copy HTML
                </button>
              </div>
              <p className="text-[10px] text-[#999] text-center">You can move this to your own domain anytime</p>
            </div>
          </div>
        )}

        {/* ═══ STEP 7: Published ═══ */}
        {step === 7 && publishedUrl && (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A]/10">
              <svg className="h-8 w-8 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0A0A0A] mb-2">Your website is live!</h2>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#4F46E5] font-medium underline break-all">
              {publishedUrl}
            </a>
            <p className="text-[12px] text-[#999] mt-4">Share this link on Instagram, WhatsApp, or anywhere.</p>

            <div className="mt-6 space-y-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(publishedUrl);
                  toast('URL copied!', 'success');
                }}
                className="w-full rounded-xl bg-[#4F46E5] py-3 text-[13px] font-semibold text-white"
              >
                Copy URL
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: businessName, url: publishedUrl });
                  }
                }}
                className="w-full rounded-xl border border-[#E5E5E5] py-3 text-[13px] font-medium text-[#666]"
              >
                Share
              </button>
              <button
                onClick={() => { setStep(6); }}
                className="w-full py-2 text-[12px] text-[#999]"
              >
                Edit website
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
