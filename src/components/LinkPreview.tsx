'use client';

import { useState, useEffect } from 'react';

interface Props {
  url: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string | null;
  domain: string;
}

export default function LinkPreview({ url }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Extract domain for display
        const domain = new URL(url).hostname.replace('www.', '');
        // Use a simple approach: just show domain + URL
        // Full OG tag fetching requires a server-side proxy to avoid CORS
        if (!cancelled) {
          setData({ title: domain, description: url, image: null, domain });
        }
      } catch {
        // Invalid URL
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading || !data) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 rounded-lg border border-[#E5E5E5] bg-white overflow-hidden hover:bg-[#F9FAFB] transition-colors max-w-[260px]">
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-[#4F46E5] truncate">{data.domain}</p>
        <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{data.description}</p>
      </div>
    </a>
  );
}
