import type { Viewport } from 'next';
import { headers } from 'next/headers';
import { DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import SplashScreen from '@/components/SplashScreen';
import OfflineBanner from '@/components/OfflineBanner';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isPocketChat = host.includes('evrywher') || host.includes('evrywyre') || host.includes('pocketchat') || host.includes('evrywhere');

  return {
    title: isPocketChat ? 'Evrywher' : 'BizPocket — Your business in your pocket',
    description: isPocketChat
      ? 'Chat in any language. AI-powered translation messenger.'
      : 'Mobile-first business toolkit for foreigners running businesses in Japan. Invoices, cash flow, expenses, accountant sharing.',
    icons: {
      icon: isPocketChat ? '/favicon-pocketchat.svg' : '/favicon.svg',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Evrywher" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&family=Noto+Sans+Bengali:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Sinhala:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans bg-[var(--bg)] text-[var(--text-1)] antialiased`}>
        {/* Prevent dark mode flash on load */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var m = localStorage.getItem('evrywher-theme') || 'system';
              var dark = m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) document.documentElement.classList.add('dark');
            } catch(e){}
          })();
        `}} />
        <ToastProvider>
          <OfflineBanner />
          <SplashScreen>
            {children}
          </SplashScreen>
        </ToastProvider>
      </body>
    </html>
  );
}
