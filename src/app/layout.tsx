import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

export const metadata: Metadata = {
  title: 'BizPocket — Your Business in Your Pocket',
  description: 'Mobile-first business toolkit for foreigners running businesses in Japan. Invoices, cash flow, expenses, accountant sharing.',
};

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
      <body className={`${dmSans.variable} ${dmMono.variable} font-sans bg-[var(--bg)] text-[var(--text-1)] antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
