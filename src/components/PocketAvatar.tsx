'use client';

const POCKET_COLORS = [
  '#4F46E5', // indigo
  '#F59E0B', // amber
  '#10B981', // emerald
  '#F43F5E', // rose
  '#3B82F6', // blue
  '#475569', // slate
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return POCKET_COLORS[Math.abs(hash) % POCKET_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

interface PocketAvatarProps {
  name: string;
  size?: number;
}

export default function PocketAvatar({ name, size = 48 }: PocketAvatarProps) {
  const color = getColorFromName(name || 'A');
  const initials = getInitials(name || 'A');

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect x="5" y="5" width="90" height="90" rx="20" fill={color} />
      <path d="M20 40 C20 33 25 28 32 28 L68 28 C75 28 80 33 80 40 L80 72 C80 79 75 84 68 84 L32 84 C25 84 20 79 20 72 Z" fill="rgba(255,255,255,0.2)" />
      <path d="M20 40 C20 33 25 28 32 28 L68 28 C75 28 80 33 80 40 L76 46 C73 50 67 53 60 53 L40 53 C33 53 27 50 24 46 Z" fill="rgba(255,255,255,0.4)" />
      <text x="50" y="75" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="24" fontWeight="500" fontFamily="'DM Sans', system-ui, sans-serif" letterSpacing="1.5">{initials}</text>
    </svg>
  );
}
