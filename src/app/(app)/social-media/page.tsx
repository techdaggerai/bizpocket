'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'facebook', label: 'Facebook', emoji: '👤' },
  { key: 'tiktok', label: 'TikTok', emoji: '🎵' },
];

const MOODS = [
  { key: 'professional', label: 'Professional' },
  { key: 'fun', label: 'Fun & Playful' },
  { key: 'elegant', label: 'Elegant' },
  { key: 'urgent', label: 'Promotional' },
  { key: 'storytelling', label: 'Storytelling' },
];

interface SocialResult {
  caption: string;
  hashtags: string[];
  alt_captions: string[];
  photo_tips: string;
  best_time: string;
  story_idea: string;
}

export default function SocialMediaPage() {
  const { organization, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [platform, setPlatform] = useState('instagram');
  const [mood, setMood] = useState('professional');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function generate() {
    setGenerating(true);
    setResult(null);

    const formData = new FormData();
    if (image) formData.append('image', image);
    formData.append('businessName', organization.name);
    formData.append('businessType', organization.business_type || '');
    formData.append('platform', platform);
    formData.append('mood', mood);
    formData.append('language', profile.language || 'en');
    formData.append('description', description);

    try {
      const res = await fetch('/api/ai/social-media', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        toast(data.error || 'Failed to generate', 'error');
      }
    } catch {
      toast('Failed to generate content', 'error');
    }
    setGenerating(false);
  }

  async function copyText(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast('Copied!', 'success');
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-[var(--text-3)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Social Media Assistant<span className="ml-2 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">AI</span></h1>
          <p className="text-xs text-[var(--text-3)]">AI creates perfect posts, captions, and hashtags</p>
        </div>
      </div>

      {!result ? (
        <>
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">Upload Photo (optional)</h2>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full rounded-lg object-cover max-h-[300px]" />
                <button onClick={() => { setImage(null); setImagePreview(null); }} className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-[#E5E5E5] py-8 text-center hover:border-[#4F46E5] transition-colors">
                <svg className="h-8 w-8 mx-auto text-[var(--text-4)] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                <p className="text-xs text-[var(--text-3)]">Tap to add a photo</p>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">What is this post about?</h2>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., 'New chocolate cake for wedding season'" rows={2} className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">Platform</h2>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.key} onClick={() => setPlatform(p.key)} className={`flex-1 rounded-lg py-2.5 text-center transition-all ${platform === p.key ? 'bg-[#4F46E5] text-white' : 'border border-[#E5E5E5] text-[var(--text-2)] hover:bg-[var(--bg-2)]'}`}>
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-[10px] font-medium mt-0.5">{p.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-3">Tone</h2>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m.key} onClick={() => setMood(m.key)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${mood === m.key ? 'bg-[#4F46E5] text-white' : 'border border-[#E5E5E5] text-[var(--text-3)] hover:bg-[var(--bg-2)]'}`}>{m.label}</button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={generating || (!image && !description.trim())} className="w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#F97316] py-4 text-sm font-bold text-white transition-all hover:shadow-lg disabled:opacity-50">
            {generating ? (<span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />AI is creating your post...</span>) : 'Generate Social Media Post'}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {imagePreview && <img src={imagePreview} alt="Post" className="w-full rounded-xl object-cover max-h-[250px]" />}

          <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#EC4899]">Caption</h3>
              <button onClick={() => copyText(result.caption + '\n\n' + result.hashtags.map(h => '#' + h).join(' '), 'caption')} className="rounded-md bg-[#4F46E5] px-2.5 py-1 text-[10px] font-semibold text-white">{copiedField === 'caption' ? 'Copied!' : 'Copy All'}</button>
            </div>
            <p className="text-sm text-[var(--text-1)] leading-relaxed whitespace-pre-line">{result.caption}</p>
          </div>

          {result.hashtags?.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">Hashtags</h3>
                <button onClick={() => copyText(result.hashtags.map(h => '#' + h).join(' '), 'hashtags')} className="text-[10px] font-medium text-[#4F46E5]">{copiedField === 'hashtags' ? 'Copied!' : 'Copy'}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((tag, i) => (<span key={i} className="rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-xs text-[#7C3AED]">#{tag}</span>))}
              </div>
            </div>
          )}

          {result.alt_captions?.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-4)] mb-2">Alternative Captions</h3>
              <div className="space-y-2">
                {result.alt_captions.map((alt, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-2)] p-2.5">
                    <p className="text-xs text-[var(--text-2)] flex-1">{alt}</p>
                    <button onClick={() => copyText(alt, `alt${i}`)} className="shrink-0 text-[10px] text-[#4F46E5]">{copiedField === `alt${i}` ? '\u2713' : 'Copy'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.photo_tips && (
            <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
              <h3 className="text-xs font-semibold text-[#92400E] mb-1">📸 Photo Tips</h3>
              <p className="text-xs text-[#92400E]/80">{result.photo_tips}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {result.best_time && (<div className="rounded-xl border border-[#E5E5E5] bg-white p-3"><p className="text-[9px] uppercase text-[var(--text-4)] font-semibold">Best Time to Post</p><p className="text-xs text-[var(--text-1)] mt-1">{result.best_time}</p></div>)}
            {result.story_idea && (<div className="rounded-xl border border-[#E5E5E5] bg-white p-3"><p className="text-[9px] uppercase text-[var(--text-4)] font-semibold">Story Idea</p><p className="text-xs text-[var(--text-1)] mt-1">{result.story_idea}</p></div>)}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setResult(null)} className="flex-1 rounded-xl border border-[#E5E5E5] py-3 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)] transition-colors">Generate Another</button>
            <button onClick={() => { const fullPost = result.caption + '\n\n' + result.hashtags.map(h => '#' + h).join(' '); copyText(fullPost, 'full'); }} className="flex-1 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#F97316] py-3 text-sm font-bold text-white">{copiedField === 'full' ? 'Copied!' : 'Copy Full Post'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
