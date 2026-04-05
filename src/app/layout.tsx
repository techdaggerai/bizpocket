import type { Viewport } from 'next';
import { headers } from 'next/headers';
import { Outfit, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import SplashScreen from '@/components/SplashScreen';
import OfflineBanner from '@/components/OfflineBanner';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { getBrandFromHost } from '@/lib/brand';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const brand = getBrandFromHost(host);

  return {
    title: brand === 'evrywher' ? 'Evrywher' : 'BizPocket — Your business in your pocket',
    description: brand === 'evrywher'
      ? 'Chat in any language. AI-powered translation messenger.'
      : 'Mobile-first business toolkit for foreigners running businesses in Japan. Invoices, cash flow, expenses, accountant sharing.',
    icons: {
      icon: brand === 'evrywher' ? '/favicon-pocketchat.svg' : '/favicon.svg',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <meta name="theme-color" content="#0F172A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Evrywher" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600&family=Noto+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&family=Noto+Sans+Bengali:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Sinhala:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${outfit.variable} ${dmSans.variable} ${dmMono.variable} font-sans bg-[var(--bg)] text-[var(--text-1)] antialiased`}>
        <ToastProvider>
          <OfflineBanner />
          <SplashScreen>
            {children}
          </SplashScreen>
          <PWAInstallBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
