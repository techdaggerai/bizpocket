import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evrywher — Chat in 21 languages',
  description: 'Real-time AI translation chat. Type in your language, your contact reads theirs. Text, voice messages, calls — 21 languages, zero friction. Free forever.',
  icons: { icon: '/favicon-pocketchat.svg' },
  keywords: ['translation chat', 'multilingual messenger', 'AI translation', 'language chat app', 'real-time translation', 'chat app Japan', 'multilingual communication'],
  authors: [{ name: 'TechDagger', url: 'https://evrywher.io' }],
  openGraph: {
    title: 'Evrywher — Chat in 21 languages',
    description: 'Type in your language. Your contact reads theirs. AI-powered translation messenger for global teams.',
    url: 'https://evrywher.io',
    siteName: 'Evrywher',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Evrywher — Chat in 21 languages',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Evrywher — Chat in 21 languages',
    description: 'Type in your language. Your contact reads theirs. AI translation messenger — 21 languages, free forever.',
    images: ['/og-image.png'],
    creator: '@TechDagger',
  },
  metadataBase: new URL('https://evrywher.io'),
};

export default function PocketChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
