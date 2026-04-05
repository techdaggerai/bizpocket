export type BrandMode = 'bizpocket' | 'evrywher';

const EVRYWHER_HOSTS = [
  'pocketchat.co',
  'www.pocketchat.co',
  'evrywher.io',
  'www.evrywher.io',
  'evrywher.com',
  'www.evrywher.com',
  'evrywher.co',
  'www.evrywher.co',
  'evrywyre.io',
  'www.evrywyre.io',
  'evrywhere.io',
  'www.evrywhere.io',
  'pocketchats.io',
  'pocketchat.jp',
];

export function getBrandMode(hostname?: string): BrandMode {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  return EVRYWHER_HOSTS.some(h => host.includes(h)) ? 'evrywher' : 'bizpocket';
}

/** Server-side brand detection from Next.js headers */
export function getBrandFromHost(host: string): BrandMode {
  return EVRYWHER_HOSTS.some(h => host.includes(h)) ? 'evrywher' : 'bizpocket';
}

/** Client-side: also check org signup_source */
export function getBrandModeClient(signupSource?: string | null): BrandMode {
  if (signupSource === 'pocketchat') return 'evrywher';
  if (typeof window === 'undefined') return 'bizpocket';
  return getBrandMode(window.location.hostname);
}

export const BRAND = {
  bizpocket: {
    name: 'BizPocket',
    tagline: 'AI Business Autopilot',
    loginTitle: 'Log in to BizPocket',
    homeRoute: '/dashboard',
    logo: {
      prefix: 'Biz',
      suffix: 'Pocket',
      prefixColor: '#FFFFFF',
      suffixColor: '#4F46E5',
    },
  },
  evrywher: {
    name: 'Evrywher',
    tagline: 'Chat in 21 languages',
    loginTitle: 'Log in to Evrywher',
    homeRoute: '/chat',
    logo: {
      prefix: 'Evry',
      suffix: 'wher',
      prefixColor: '#4F46E5',
      suffixColor: '#F59E0B',
    },
  },
} as const;
