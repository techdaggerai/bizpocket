export interface Wallpaper {
  id: string;
  name: string;
  emoji: string;
  /** CSS applied to the messages scroll container */
  style: React.CSSProperties;
  /** Small preview background for settings thumbnails */
  previewStyle: React.CSSProperties;
}

// Sakura SVG petals (5% opacity pink on transparent)
const sakuraSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cg opacity='0.05' fill='%23EC4899'%3E%3Cpath d='M40 60c-5-8 0-18 8-15s5 15-2 18-6-3-6-3z'/%3E%3Cpath d='M150 30c-4-7 1-16 7-13s4 13-2 16-5-3-5-3z'/%3E%3Cpath d='M250 80c-5-8 0-18 8-15s5 15-2 18-6-3-6-3z'/%3E%3Cpath d='M80 180c-4-7 1-16 7-13s4 13-2 16-5-3-5-3z'/%3E%3Cpath d='M200 200c-5-8 0-18 8-15s5 15-2 18-6-3-6-3z'/%3E%3Cpath d='M120 120c-3-6 1-14 6-11s3 11-2 14-4-3-4-3z'/%3E%3Cpath d='M270 160c-4-7 1-16 7-13s4 13-2 16-5-3-5-3z'/%3E%3Cpath d='M30 250c-5-8 0-18 8-15s5 15-2 18-6-3-6-3z'/%3E%3Cpath d='M180 270c-3-6 1-14 6-11s3 11-2 14-4-3-4-3z'/%3E%3C/g%3E%3C/svg%3E")`;

// Seigaiha (Japanese wave) pattern (6% opacity)
const seigaihaSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cg opacity='0.06' fill='none' stroke='%2394A3B8' stroke-width='0.8'%3E%3Cpath d='M0 20a20 20 0 0 1 40 0a20 20 0 0 1 40 0'/%3E%3Cpath d='M-10 20a30 30 0 0 1 30-30'/%3E%3Cpath d='M10 20a10 10 0 0 1 20 0'/%3E%3Cpath d='M30 20a10 10 0 0 1 20 0'/%3E%3Cpath d='M50 20a30 30 0 0 1 30-30'/%3E%3C/g%3E%3C/svg%3E")`;

// Tokyo skyline (6% opacity) — simple buildings at bottom
const tokyoSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'%3E%3Cg opacity='0.06' fill='%2364748B'%3E%3Crect x='10' y='50' width='25' height='70'/%3E%3Crect x='40' y='30' width='20' height='90'/%3E%3Crect x='65' y='60' width='30' height='60'/%3E%3Crect x='100' y='20' width='15' height='100'/%3E%3Crect x='120' y='45' width='35' height='75'/%3E%3Crect x='160' y='10' width='12' height='110'/%3E%3Crect x='175' y='55' width='28' height='65'/%3E%3Crect x='210' y='35' width='22' height='85'/%3E%3Crect x='240' y='65' width='30' height='55'/%3E%3Crect x='275' y='25' width='18' height='95'/%3E%3Crect x='300' y='50' width='25' height='70'/%3E%3Crect x='330' y='15' width='14' height='105'/%3E%3Crect x='350' y='40' width='30' height='80'/%3E%3Crect x='385' y='55' width='15' height='65'/%3E%3C/g%3E%3C/svg%3E")`;

// Stars (3% opacity)
const starsSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg opacity='0.03' fill='%23FFFFFF'%3E%3Ccircle cx='20' cy='30' r='1'/%3E%3Ccircle cx='80' cy='15' r='1.5'/%3E%3Ccircle cx='140' cy='45' r='1'/%3E%3Ccircle cx='180' cy='20' r='0.8'/%3E%3Ccircle cx='50' cy='80' r='1.2'/%3E%3Ccircle cx='110' cy='70' r='0.8'/%3E%3Ccircle cx='170' cy='90' r='1.5'/%3E%3Ccircle cx='30' cy='120' r='1'/%3E%3Ccircle cx='90' cy='130' r='1.3'/%3E%3Ccircle cx='150' cy='110' r='0.8'/%3E%3Ccircle cx='190' cy='140' r='1'/%3E%3Ccircle cx='60' cy='160' r='1.5'/%3E%3Ccircle cx='120' cy='170' r='1'/%3E%3Ccircle cx='180' cy='180' r='0.8'/%3E%3Ccircle cx='40' cy='190' r='1.2'/%3E%3Ccircle cx='100' cy='195' r='1'/%3E%3Ccircle cx='160' cy='165' r='1.5'/%3E%3Ccircle cx='15' cy='70' r='0.8'/%3E%3Ccircle cx='75' cy='55' r='1'/%3E%3Ccircle cx='135' cy='155' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`;

// Hexagonal grid (5% opacity)
const hexSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cg opacity='0.05' fill='none' stroke='%2364748B' stroke-width='0.6'%3E%3Cpath d='M28 0L56 15V45L28 60L0 45V15Z'/%3E%3Cpath d='M28 40L56 55V85L28 100L0 85V55Z'/%3E%3C/g%3E%3C/svg%3E")`;

export const wallpapers: Wallpaper[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '🌑',
    style: {}, // Uses the CSS class chat-bg-pattern
    previewStyle: { backgroundColor: '#0F172A' },
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    emoji: '🌌',
    style: { background: 'linear-gradient(to bottom, #020617, #1e1b4b, #020617)' },
    previewStyle: { background: 'linear-gradient(to bottom, #020617, #1e1b4b, #020617)' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    style: { background: 'linear-gradient(to bottom, #0F172A, #172554, #0F172A)' },
    previewStyle: { background: 'linear-gradient(to bottom, #0F172A, #172554, #0F172A)' },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    style: { backgroundColor: '#0F172A', backgroundImage: sakuraSvg, backgroundSize: '300px 300px' },
    previewStyle: { backgroundColor: '#0F172A', backgroundImage: sakuraSvg, backgroundSize: '100px 100px' },
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    emoji: '🏯',
    style: { backgroundColor: '#0F172A', backgroundImage: tokyoSvg, backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom', backgroundSize: '400px 120px' },
    previewStyle: { backgroundColor: '#0F172A', backgroundImage: tokyoSvg, backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom', backgroundSize: '200px 60px' },
  },
  {
    id: 'nihon',
    name: 'Nihon',
    emoji: '🎌',
    style: { backgroundColor: '#0F172A', backgroundImage: seigaihaSvg, backgroundSize: '80px 40px' },
    previewStyle: { backgroundColor: '#0F172A', backgroundImage: seigaihaSvg, backgroundSize: '40px 20px' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '⬛',
    style: { backgroundColor: '#0F172A' },
    previewStyle: { backgroundColor: '#0F172A' },
  },
  {
    id: 'indigo-glow',
    name: 'Indigo Glow',
    emoji: '🟣',
    style: { background: 'radial-gradient(ellipse at center, #1e1b4b, #0F172A 70%)' },
    previewStyle: { background: 'radial-gradient(ellipse at center, #1e1b4b, #0F172A 70%)' },
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    emoji: '🌙',
    style: { backgroundColor: '#0F172A', backgroundImage: starsSvg, backgroundSize: '200px 200px' },
    previewStyle: { backgroundColor: '#0F172A', backgroundImage: starsSvg, backgroundSize: '100px 100px' },
  },
  {
    id: 'geometric',
    name: 'Geometric',
    emoji: '🔷',
    style: { backgroundColor: '#0F172A', backgroundImage: hexSvg, backgroundSize: '56px 100px' },
    previewStyle: { backgroundColor: '#0F172A', backgroundImage: hexSvg, backgroundSize: '28px 50px' },
  },
];

export function getWallpaperById(id: string): Wallpaper {
  return wallpapers.find(w => w.id === id) || wallpapers[0];
}

export function getSavedWallpaperId(): string {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('evrywher_wallpaper') || 'default';
}

export function saveWallpaperId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('evrywher_wallpaper', id);
  }
}
