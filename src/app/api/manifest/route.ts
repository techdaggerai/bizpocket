import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBrandFromHost } from '@/lib/brand';

export async function GET() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const brand = getBrandFromHost(host);

  const manifest = brand === 'evrywher'
    ? {
        name: 'Evrywher',
        short_name: 'Evrywher',
        description: 'Chat in any language. AI-powered translation messenger.',
        start_url: '/chat',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#0F172A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
    : {
        name: 'BizPocket',
        short_name: 'BizPocket',
        description: 'Your AI Business Autopilot. Invoices, cash flow, expenses.',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#0F172A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
