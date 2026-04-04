'use client';

/**
 * ChatThemePicker.tsx
 * 10 chat themes saved per-conversation to localStorage.
 *
 * Zarrar integration (no chat/page.tsx changes needed for the component itself —
 * Zarrar wires it up. The hook is self-contained):
 *
 *   import { useChatTheme, ChatThemePicker } from '@/components/ChatThemePicker';
 *
 *   // In component:
 *   const { theme, setTheme } = useChatTheme(conversationId);
 *
 *   // Apply theme to message area:
 *   <div style={{ background: theme.bg }}>
 *     // sent bubble: theme.sentBg, theme.sentText
 *     // received bubble: theme.receivedBg, theme.receivedText
 *     // timestamp: theme.timestamp
 *   </div>
 *
 *   // Open picker:
 *   <ChatThemePicker
 *     isOpen={showThemes}
 *     currentThemeId={theme.id}
 *     conversationId={conversationId}
 *     onSelect={(t) => setTheme(t)}
 *     onClose={() => setShowThemes(false)}
 *   />
 */

import { useState, useEffect } from 'react';

// ─── Theme definitions ────────────────────────────────────────────────────────

export interface ChatTheme {
  id: string;
  name: string;
  emoji: string;
  /** Chat area background */
  bg: string;
  /** Sent bubble background */
  sentBg: string;
  /** Sent bubble text */
  sentText: string;
  /** Received bubble background */
  receivedBg: string;
  /** Received bubble text */
  receivedText: string;
  /** Timestamp / meta text */
  timestamp: string;
  /** Input bar background */
  inputBg: string;
  /** Input bar border */
  inputBorder: string;
  /** Header background */
  headerBg: string;
  /** Header text */
  headerText: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '💬',
    bg: '#FAFAFA',
    sentBg: '#4F46E5',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#0A0A0A',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#E5E5E5',
    headerBg: '#FFFFFF',
    headerText: '#0A0A0A',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    bg: '#0D1117',
    sentBg: '#1F6FEB',
    sentText: '#FFFFFF',
    receivedBg: '#161B22',
    receivedText: '#E6EDF3',
    timestamp: '#6E7681',
    inputBg: '#161B22',
    inputBorder: '#30363D',
    headerBg: '#010409',
    headerText: '#E6EDF3',
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    bg: '#F0FDF4',
    sentBg: '#16A34A',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#14532D',
    timestamp: '#6B7280',
    inputBg: '#FFFFFF',
    inputBorder: '#BBF7D0',
    headerBg: '#DCFCE7',
    headerText: '#14532D',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    bg: '#FFF7ED',
    sentBg: '#EA580C',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#431407',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#FED7AA',
    headerBg: '#FFEDD5',
    headerText: '#7C2D12',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    bg: '#EFF6FF',
    sentBg: '#0369A1',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#0C4A6E',
    timestamp: '#6B7280',
    inputBg: '#FFFFFF',
    inputBorder: '#BAE6FD',
    headerBg: '#E0F2FE',
    headerText: '#0C4A6E',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    bg: '#F5F3FF',
    sentBg: '#7C3AED',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#2E1065',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#DDD6FE',
    headerBg: '#EDE9FE',
    headerText: '#2E1065',
  },
  {
    id: 'rose',
    name: 'Rose',
    emoji: '🌸',
    bg: '#FFF1F2',
    sentBg: '#E11D48',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#881337',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#FECDD3',
    headerBg: '#FFE4E6',
    headerText: '#881337',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '⬜',
    bg: '#F9FAFB',
    sentBg: '#374151',
    sentText: '#FFFFFF',
    receivedBg: '#FFFFFF',
    receivedText: '#111827',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#E5E7EB',
    headerBg: '#FFFFFF',
    headerText: '#111827',
  },
  {
    id: 'evrywher',
    name: 'Evrywher',
    emoji: '✨',
    bg: '#FAFAFA',
    sentBg: '#4F46E5',
    sentText: '#FFFFFF',
    receivedBg: '#FEF9C3',
    receivedText: '#713F12',
    timestamp: '#9CA3AF',
    inputBg: '#FFFFFF',
    inputBorder: '#C7D2FE',
    headerBg: '#EEF2FF',
    headerText: '#1E1B4B',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    emoji: '◼',
    bg: '#FFFFFF',
    sentBg: '#000000',
    sentText: '#FFFFFF',
    receivedBg: '#F3F4F6',
    receivedText: '#000000',
    timestamp: '#6B7280',
    inputBg: '#FFFFFF',
    inputBorder: '#000000',
    headerBg: '#000000',
    headerText: '#FFFFFF',
  },
];

export const DEFAULT_THEME = CHAT_THEMES[0];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'evrywher-chat-themes';

function loadThemes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveTheme(conversationId: string, themeId: string) {
  if (typeof window === 'undefined') return;
  const all = loadThemes();
  all[conversationId] = themeId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatTheme(conversationId: string | null) {
  const [theme, setThemeState] = useState<ChatTheme>(DEFAULT_THEME);

  useEffect(() => {
    if (!conversationId) { setThemeState(DEFAULT_THEME); return; }
    const all = loadThemes();
    const id = all[conversationId];
    const found = CHAT_THEMES.find(t => t.id === id);
    setThemeState(found || DEFAULT_THEME);
  }, [conversationId]);

  const setTheme = (t: ChatTheme) => {
    setThemeState(t);
    if (conversationId) saveTheme(conversationId, t.id);
  };

  return { theme, setTheme };
}

// ─── Mini chat preview ────────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: ChatTheme }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#E5E5E5]" style={{ background: theme.bg }}>
      {/* Mini header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ background: theme.headerBg }}>
        <div className="h-4 w-4 rounded-[4px] bg-current opacity-30" style={{ color: theme.headerText }} />
        <div className="h-2 w-14 rounded-full" style={{ background: theme.headerText, opacity: 0.3 }} />
      </div>
      {/* Messages */}
      <div className="flex flex-col gap-1 px-2 py-2">
        {/* Received */}
        <div className="flex">
          <div className="rounded-2xl rounded-bl-sm px-2 py-1" style={{ background: theme.receivedBg, maxWidth: '65%' }}>
            <div className="h-1.5 w-14 rounded-full" style={{ background: theme.receivedText, opacity: 0.4 }} />
          </div>
        </div>
        {/* Sent */}
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-sm px-2 py-1" style={{ background: theme.sentBg, maxWidth: '65%' }}>
            <div className="h-1.5 w-10 rounded-full" style={{ background: theme.sentText, opacity: 0.7 }} />
          </div>
        </div>
        {/* Received 2 */}
        <div className="flex">
          <div className="rounded-2xl rounded-bl-sm px-2 py-1" style={{ background: theme.receivedBg, maxWidth: '65%' }}>
            <div className="h-1.5 w-16 rounded-full" style={{ background: theme.receivedText, opacity: 0.4 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Picker Component ─────────────────────────────────────────────────────────

interface ChatThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  conversationId: string | null;
  onSelect: (theme: ChatTheme) => void;
}

export default function ChatThemePicker({
  isOpen,
  onClose,
  currentThemeId,
  onSelect,
}: ChatThemePickerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md">
        <div className="rounded-t-2xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '80vh' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#F0F0F0]">
            <h3 className="text-[15px] font-bold text-[#0A0A0A]">Chat Theme</h3>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Theme grid */}
          <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
            {CHAT_THEMES.map((theme) => {
              const isActive = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => { onSelect(theme); onClose(); }}
                  className={`relative flex flex-col gap-2 rounded-2xl p-2 text-left transition-all ${
                    isActive
                      ? 'ring-2 ring-[#4F46E5] ring-offset-2'
                      : 'hover:ring-1 hover:ring-[#D1D5DB] hover:ring-offset-1'
                  }`}
                >
                  <ThemePreview theme={theme} />
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-base leading-none">{theme.emoji}</span>
                    <span className="text-[13px] font-semibold text-[#374151] truncate">{theme.name}</span>
                    {isActive && (
                      <span className="ml-auto shrink-0 h-4 w-4 rounded-full bg-[#4F46E5] flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export type { ChatThemePickerProps };
