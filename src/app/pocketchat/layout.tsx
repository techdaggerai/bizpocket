import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PocketChat — Break every language barrier',
  description: 'Real-time translation chat for business. Text, voice, video calls — in 21 languages. Free forever.',
  icons: { icon: '/favicon-pocketchat.svg' },
};

export default function PocketChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
