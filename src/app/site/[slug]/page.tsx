'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PublicSitePage() {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadSite() {
      if (!slug) return;

      const { data, error } = await supabase
        .from('published_websites')
        .select('html, business_name')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Increment view count
      await supabase.rpc('increment_website_views', { site_slug: slug }).catch(() => {});

      setHtml(data.html);
      setLoading(false);
    }
    loadSite();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
          <p className="mt-3 text-sm text-[#999]">Loading website...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold text-[#0A0A0A] mb-2">404</h1>
          <p className="text-sm text-[#666] mb-4">This website doesn&apos;t exist or has been unpublished.</p>
          <a href="https://www.bizpocket.io" className="text-sm text-indigo-400 font-medium hover:underline">
            Create your own website with BizPocket →
          </a>
        </div>
      </div>
    );
  }

  if (html) {
    return (
      <div className="flex flex-col min-h-screen">
        <iframe
          srcDoc={html}
          className="w-full flex-1 border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Published Website"
        />
        <div className="text-center py-3 border-t border-[#f3f4f6] bg-white">
          <a href="https://www.bizpocket.io?ref=site" target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#9ca3af] no-underline">
            Built with <span className="text-indigo-400 font-semibold">BizPocket</span> — AI Business Autopilot
          </a>
        </div>
      </div>
    );
  }

  return null;
}
