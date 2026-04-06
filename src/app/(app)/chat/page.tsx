'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { getDisplayText } from '@/lib/translate';
import { getBrandModeClient } from '@/lib/brand';
import BotOnboarding from '@/components/BotOnboarding';
import InviteModal from '@/components/InviteModal';
import QuickReplies from '@/components/QuickReplies';
import VoiceMessagePlayer from '@/components/VoiceMessagePlayer';
import EmojiMartPicker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import LinkPreview from '@/components/LinkPreview';
import EvryWherMark from '@/components/EvryWherMark';
import ChatLabels from '@/components/ChatLabels';
import CameraTranslate from '@/components/CameraTranslate';
import MessageActionSheet from '@/components/MessageActionSheet';
import VoiceTranslator from '@/components/VoiceTranslator';
import PhotoEditor from '@/components/PhotoEditor';
import CreatePoll from '@/components/CreatePoll';
import PollBubble from '@/components/PollBubble';
import ScheduleMessageModal from '@/components/ScheduleMessageModal';
import LearnFromMessage from '@/components/LearnFromMessage';
import { usePocketBot } from '@/lib/use-pocket-bot';
import BusinessCardMessage from '@/components/chat/BusinessCardMessage';
import BizCardGate from '@/components/profile/BizCardGate';
import { canShareBizCard } from '@/lib/tier-system';
import { PocketMark, PocketChatMark } from '@/components/Logo';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PocketChatTypingIndicator from '@/components/PocketChatTypingIndicator';
import PocketSendIcon from '@/components/PocketSendIcon';
import OutlinePillButton from '@/components/OutlinePillButton';
import PocketAvatar from '@/components/PocketAvatar';
import TierBadge from '@/components/profile/TierBadge';
import CorridorBadge from '@/components/profile/CorridorBadge';
import BottomSheet from '@/components/ui/BottomSheet';
import type { Tier } from '@/lib/tier-system';

/* ---------- Types ---------- */

interface Contact {
  id: string;
  organization_id: string;
  name: string;
  display_name?: string;
  full_name?: string;
  company: string;
  phone: string;
  email: string;
  language?: string;
  contact_type: 'customer' | 'supplier' | 'accountant' | 'partner';
}

interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string | null;
  invoice_id: string | null;
  title: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  is_bot_chat?: boolean;
  is_group?: boolean;
  group_name?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  is_archived?: boolean;
  folder?: string | null;
  muted_until?: string | null;
  disappearing_timer?: string;
  label?: string | null;
  label_color?: string | null;
  contact?: Contact | null;
}

interface Message {
  id: string;
  conversation_id: string;
  organization_id: string;
  sender_type: 'owner' | 'customer' | 'bot';
  sender_name: string;
  message: string;
  message_type: 'text' | 'invoice' | 'document' | 'image' | 'voice' | 'payment_confirmed';
  attachment_url: string | null;
  invoice_id: string | null;
  read_at: string | null;
  delivered_at?: string | null;
  original_text: string | null;
  original_language: string | null;
  translations: Record<string, string> | null;
  deleted_at?: string | null;
  reactions?: Record<string, string[]> | null;
  is_starred?: boolean;
  reply_to_id?: string | null;
  edited_at?: string | null;
  is_forwarded?: boolean;
  forward_count?: number;
  created_at: string;
}

const LANG_FLAGS: Record<string, string> = {
  en: '🇺🇸', ja: '🇯🇵', ur: '🇵🇰', ar: '🇦🇪', tl: '🇵🇭', pt: '🇧🇷', bn: '🇧🇩',
  vi: '🇻🇳', tr: '🇹🇷', zh: '🇨🇳', fr: '🇫🇷', nl: '🇳🇱', es: '🇪🇸',
  fil: '🇵🇭', ps: '🇦🇫', fa: '🇮🇷', hi: '🇮🇳', ko: '🇰🇷', th: '🇹🇭', id: '🇮🇩', ne: '🇳🇵', si: '🇱🇰',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', tl: 'Tagalog', pt: 'Portuguese', bn: 'Bengali',
  vi: 'Vietnamese', tr: 'Turkish', zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
  fil: 'Filipino', ps: 'Pashto', fa: 'Persian', hi: 'Hindi', ko: 'Korean', th: 'Thai', id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
};

type FilterType = 'all' | 'customer' | 'supplier' | 'invoice';

/* ---------- Helpers ---------- */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function onlineStatus(lastSeen: string | null): { online: boolean; text: string } {
  if (!lastSeen) return { online: false, text: '' };
  const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (diff < 120) return { online: true, text: 'Online' };
  if (diff < 3600) return { online: false, text: `Last seen ${Math.floor(diff / 60)}m ago` };
  if (diff < 86400) return { online: false, text: `Last seen ${Math.floor(diff / 3600)}h ago` };
  return { online: false, text: `Last seen ${Math.floor(diff / 86400)}d ago` };
}

function avatarColor(name: string): string {
  const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ---------- Component ---------- */

export default function PocketChatPage() {
  const { user, organization, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';

  useEffect(() => { document.title = 'Evrywher — Chat'; }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [chatLang, setChatLang] = useState(profile?.language || 'en');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [recording, setRecording] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [convoActionId, setConvoActionId] = useState<string | null>(null);
  const [chatWallpaper, setChatWallpaper] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('chat_wallpaper') || '' : '');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [translationsUsed, setTranslationsUsed] = useState(0);
  const [botMessagesUsed, setBotMessagesUsed] = useState(0);
  const isFreePlan = (organization?.plan || 'free') === 'free';
  const [contactLastSeen, setContactLastSeen] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; sender: string; text: string } | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'stickers' | 'gifs'>('emoji');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [matchPillDismissed, setMatchPillDismissed] = useState(false);
  const [bizCardTipDismissed, setBizCardTipDismissed] = useState(() => { try { return localStorage.getItem('tipDismissed_bizcard') === '1'; } catch { return false; } });
  const [showBizCardGateSheet, setShowBizCardGateSheet] = useState(false);
  const [showCameraTranslate, setShowCameraTranslate] = useState(false);
  const [showVoiceTranslator, setShowVoiceTranslator] = useState(false);
  const [showBizCardGate, setShowBizCardGate] = useState(false);
  const [bizCardGateData, setBizCardGateData] = useState<any>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchIdx, setChatSearchIdx] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [convoSummary, setConvoSummary] = useState<{ summary: string; relationship_context: string; key_topics: string[]; formality_level: string } | null>(null);
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const summaryCheckRef = useRef<number>(0);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [chatFolder, setChatFolder] = useState('all');
  const [learningMode] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('language_learning') === 'on' : false);
  const [photoEditorFile, setPhotoEditorFile] = useState<{ url: string; file: File } | null>(null);
  const [culturalCoach, setCulturalCoach] = useState<{
    tip: string; suggested_revision: string; cultural_note: string;
    severity: 'suggestion' | 'warning'; originalText: string;
  } | null>(null);
  const [culturalCoachEnabled] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('cultural_coach') !== 'off' : true);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [broadcastContacts, setBroadcastContacts] = useState<string[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [actionMenu, setActionMenu] = useState<{ msgId: string; x: number; y: number; isOwner: boolean; text: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Smart reply suggestions ──────────────────────────────────────────────
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const smartRepliesConvoRef = useRef<string | null>(null);

  // ── On-demand message translation ────────────────────────────────────────
  const [msgTranslations, setMsgTranslations] = useState<Record<string, { text: string; toLang: string }>>({});
  const [translatePickerMsgId, setTranslatePickerMsgId] = useState<string | null>(null);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);

  // ── Conversation summary ──────────────────────────────────────────────────
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const {
    botConfig, botName, botLoading,
    botConfigLoaded, isSetupComplete,
    fetchBotConfig, sendBotMessage, updateBotLocally
  } = usePocketBot();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConvoId) ?? null;

  /* ---------- Fetch conversations ---------- */

  const fetchConversations = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const [convResult] = await Promise.all([
      supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .eq('organization_id', organization.id)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      fetchBotConfig(),
    ]);

    if (convResult.error) {
      toast('Failed to load conversations', 'error');
    } else {
      setConversations((convResult.data as Conversation[]) ?? []);
    }
    setLoading(false);
  }, [organization?.id, fetchBotConfig]);

  /* ---------- Fetch messages ---------- */

  const fetchMessages = useCallback(
    async (convoId: string) => {
      if (!organization?.id) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convoId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true });

      if (error) {
        toast('Failed to load messages', 'error');
      } else {
        setMessages((data as Message[]) ?? []);
        summaryCheckRef.current = (data as Message[])?.length || 0;

        // Fetch existing conversation summary
        fetch(`/api/ai/conversation-summary?conversationId=${convoId}`)
          .then(r => r.json())
          .then(d => { if (d?.summary) setConvoSummary(d); else setConvoSummary(null); })
          .catch(() => setConvoSummary(null));

        // Auto-generate summary if enough messages (every 20)
        const msgCount = (data as Message[])?.length || 0;
        if (msgCount >= 20 && msgCount % 20 < 5) {
          const recent = ((data as Message[]) ?? []).slice(-20);
          fetch('/api/ai/conversation-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convoId,
              orgId: organization.id,
              messages: recent.map(m => ({ sender_name: m.sender_name, message: m.message })),
            }),
          }).then(r => r.json()).then(d => { if (d?.summary) setConvoSummary(d); }).catch(() => {});
        }
      }

      // Mark incoming messages as delivered + read
      const incomingIds = ((data as Message[]) ?? [])
        .filter(m => m.sender_type !== 'owner' && !m.delivered_at)
        .map(m => m.id);
      if (incomingIds.length > 0) {
        fetch('/api/messages/delivered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: incomingIds }),
        }).catch(() => {});
      }

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convoId)
        .eq('organization_id', organization.id)
        .is('read_at', null)
        .neq('sender_type', 'owner');

      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, unread_count: 0 } : c))
      );
    },
    [organization?.id]
  );

  /* ---------- Fetch contacts (for new chat) ---------- */

  const fetchContacts = useCallback(async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organization.id)
      .order('name');
    setContacts((data as Contact[]) ?? []);
  }, [organization?.id]);

  /* ---------- Effects ---------- */

  useEffect(() => {
    // Check if bot config was just updated (from bot-setup page)
    const raw = sessionStorage.getItem('bot_config_updated');
    if (raw) {
      sessionStorage.removeItem('bot_config_updated');
      try {
        const { bot_name, bot_icon } = JSON.parse(raw);
        if (bot_name) updateBotLocally(bot_name, bot_icon || '');
      } catch { /* ignore parse errors */ }
      // Also refetch from DB in background for full sync
      fetchConversations();
    } else {
      fetchConversations();
    }
  }, [fetchConversations, updateBotLocally]);

  // Refetch bot config when user returns from bot-setup
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchBotConfig();
    };
    const handleFocus = () => { fetchBotConfig(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBotConfig]);

  useEffect(() => {
    if (activeConvoId) {
      fetchMessages(activeConvoId);
      // Fetch contact's last_seen for online status
      const convo = conversations.find(c => c.id === activeConvoId);
      if (convo?.contact_id && !convo.is_bot_chat) {
        supabase.from('profiles').select('last_seen').eq('user_id', convo.contact_id).single().then(({ data }) => {
          setContactLastSeen(data?.last_seen || null);
        });
      } else {
        setContactLastSeen(null);
      }
    } else {
      setMessages([]);
      setContactLastSeen(null);
    }
    // Clear smart replies and on-demand translations when switching conversations
    setSmartReplies([]);
    setSmartRepliesLoading(false);
    setMsgTranslations({});
    setTranslatePickerMsgId(null);
  }, [activeConvoId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when entering a conversation
  useEffect(() => {
    if (activeConvoId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeConvoId]);

  /* ---------- Mobile keyboard: keep input visible ---------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const onResize = () => {
      const keyboardHeight = window.innerHeight - viewport.height;
      document.documentElement.style.setProperty('--keyboard-height', keyboardHeight + 'px');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', onResize);
    return () => {
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', onResize);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);

  /* ---------- Realtime subscription ---------- */

  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('pocket-chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          console.log('[Realtime] message event:', payload.eventType, 'convo:', (payload.new as any)?.conversation_id, 'sender:', (payload.new as any)?.sender_type, 'activeConvo:', activeConvoId);
          if (payload.eventType === 'UPDATE') {
            // Merge updated fields: translations, delivered_at, read_at
            const updated = payload.new as Message;
            if (updated.conversation_id === activeConvoId) {
              setMessages((prev) =>
                prev.map((m) => m.id === updated.id ? {
                  ...m,
                  translations: updated.translations ?? m.translations,
                  delivered_at: updated.delivered_at ?? m.delivered_at,
                  read_at: updated.read_at ?? m.read_at,
                } : m)
              );
            }
            return;
          }

          const newMsg = payload.new as Message;

          // If message is for active conversation, append it
          if (newMsg.conversation_id === activeConvoId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // Remove optimistic temp messages that match the real one
              const filtered = prev.filter((m) => {
                if (!m.id.startsWith('temp-') && !m.id.startsWith('bot-')) return true;
                // Match by sender_type + message content (within 5s)
                return !(m.sender_type === newMsg.sender_type && m.message === newMsg.message);
              });
              return [...filtered, newMsg];
            });
            // Smart replies: generate suggestions for incoming contact/bot messages
            if (newMsg.sender_type !== 'owner' && newMsg.message_type === 'text' && newMsg.message?.trim()) {
              fetchSmartReplies(newMsg.message, newMsg.sender_name || '', newMsg.conversation_id);
            }
          }

          // Update conversation list
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                return {
                  ...c,
                  last_message: newMsg.message,
                  last_message_at: newMsg.created_at,
                  unread_count:
                    newMsg.conversation_id === activeConvoId
                      ? c.unread_count
                      : c.unread_count + 1,
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] subscription status:', status, err ? `error: ${err.message}` : '', 'org:', organization?.id);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, activeConvoId]);

  /* ---------- Typing indicator ---------- */
  useEffect(() => {
    if (!activeConvoId) return;
    const ch = supabase.channel(`typing:${activeConvoId}`);
    typingChannelRef.current = ch;
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.user_id !== user?.id) {
        setTypingUser(payload.name);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 3000);
      }
    }).subscribe();
    return () => { ch.unsubscribe(); if (typingTimeout.current) clearTimeout(typingTimeout.current); setTypingUser(null); };
  }, [activeConvoId, user?.id]); // eslint-disable-line

  const broadcastTyping = useCallback(() => {
    typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: user?.id, name: profile?.full_name || profile?.name || 'Someone' } });
  }, [user?.id, profile?.name]);

  /* ---------- Message actions ---------- */

  function openActionMenu(msgId: string, x: number, y: number, isOwner: boolean, text: string) {
    setActionMenu({ msgId, x: Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 375) - 180), y, isOwner, text });
  }

  function handleLongPressStart(e: React.TouchEvent, msgId: string, isOwner: boolean, text: string) {
    longPressTimer.current = setTimeout(() => {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      openActionMenu(msgId, 0, 0, isOwner, text);
    }, 500);
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  // Swipe-to-reply state
  const swipeRef = useRef<{ msgId: string; startX: number; isOwner: boolean; text: string; senderName: string } | null>(null);
  const [swipeDelta, setSwipeDelta] = useState<{ msgId: string; dx: number } | null>(null);

  function handleSwipeStart(e: React.TouchEvent, msgId: string, isOwner: boolean, text: string, senderName: string) {
    swipeRef.current = { msgId, startX: e.touches[0].clientX, isOwner, text, senderName };
  }

  function handleSwipeMove(e: React.TouchEvent) {
    if (!swipeRef.current) return;
    const dx = Math.max(0, e.touches[0].clientX - swipeRef.current.startX);
    if (dx > 10) setSwipeDelta({ msgId: swipeRef.current.msgId, dx: Math.min(dx, 80) });
  }

  function handleSwipeEnd() {
    if (!swipeRef.current) return;
    const dx = swipeDelta?.msgId === swipeRef.current.msgId ? swipeDelta.dx : 0;
    if (dx > 60) {
      // Trigger reply
      if (navigator.vibrate) navigator.vibrate(30);
      setReplyTo({
        id: swipeRef.current.msgId,
        sender: swipeRef.current.senderName,
        text: swipeRef.current.text.slice(0, 100),
      });
      inputRef.current?.focus();
    }
    swipeRef.current = null;
    setSwipeDelta(null);
  }

  async function handleCopyText() {
    if (!actionMenu) return;
    await navigator.clipboard.writeText(actionMenu.text);
    toast('Copied', 'success');
    setActionMenu(null);
  }

  async function handleReaction(emoji: string) {
    if (!reactionMsgId) return;
    const msg = messages.find(m => m.id === reactionMsgId);
    const userId = user?.id || 'me';
    const current = (msg?.reactions || {}) as Record<string, string[]>;
    const users = current[emoji] || [];
    const updated = users.includes(userId)
      ? { ...current, [emoji]: users.filter(u => u !== userId) }
      : { ...current, [emoji]: [...users, userId] };
    // Remove empty arrays
    Object.keys(updated).forEach(k => { if (updated[k].length === 0) delete updated[k]; });
    await supabase.from('messages').update({ reactions: updated }).eq('id', reactionMsgId);
    setMessages(prev => prev.map(m => m.id === reactionMsgId ? { ...m, reactions: updated } : m));
    setReactionMsgId(null);
  }

  async function handleStarMessage() {
    if (!actionMenu) return;
    const msg = messages.find(m => m.id === actionMenu.msgId);
    const newVal = !msg?.is_starred;
    await supabase.from('messages').update({ is_starred: newVal }).eq('id', actionMenu.msgId);
    setMessages(prev => prev.map(m => m.id === actionMenu.msgId ? { ...m, is_starred: newVal } : m));
    toast(newVal ? 'Message starred' : 'Star removed', 'success');
    setActionMenu(null);
  }

  async function handleDeleteMessage() {
    if (!actionMenu) return;
    await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', actionMenu.msgId);
    setMessages(prev => prev.map(m => m.id === actionMenu.msgId ? { ...m, deleted_at: new Date().toISOString() } : m));
    setActionMenu(null);
  }

  // ── Smart reply: fetch suggestions after incoming message ──────────────
  const fetchSmartReplies = useCallback(async (message: string, senderName: string, convoId: string) => {
    if (!message.trim() || !activeConvoId) return;
    smartRepliesConvoRef.current = convoId;
    setSmartRepliesLoading(true);
    setSmartReplies([]);
    try {
      const isPro = ['pro', 'business', 'enterprise'].includes(organization?.plan || '');
      const contactLang = activeConvo?.contact?.language || 'en';
      const res = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          senderName,
          userLanguage: profile?.language || 'en',
          recipientLanguage: contactLang,
          isPro,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      // Only update if still in same conversation
      if (smartRepliesConvoRef.current === convoId && data.suggestions?.length) {
        setSmartReplies(data.suggestions);
      }
    } catch (err) {
      console.error('[smart-replies]', err);
    } finally {
      setSmartRepliesLoading(false);
    }
  }, [activeConvoId, activeConvo, organization?.plan, profile?.language]);

  // ── On-demand translate: translate a specific message ──────────────────
  async function handleTranslateMessage(msgId: string, text: string, toLang: string) {
    setTranslatingMsgId(msgId);
    setTranslatePickerMsgId(null);
    setActionMenu(null);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fromLanguage: 'auto', toLanguage: toLang }),
      });
      if (!res.ok) { toast('Translation failed', 'error'); return; }
      const data = await res.json();
      const translated = data.translation || data.translatedText || data.text || text;
      setMsgTranslations(prev => ({ ...prev, [msgId]: { text: translated, toLang } }));
    } catch (err) {
      console.error('[on-demand-translate]', err);
      toast('Translation failed', 'error');
    } finally {
      setTranslatingMsgId(null);
    }
  }

  // ── Conversation summary ────────────────────────────────────────────────
  async function handleSummarize() {
    if (!messages.length) { toast('No messages to summarize', 'info'); return; }
    setShowSummary(true);
    setSummaryLoading(true);
    setSummaryText('');
    setShowChatMenu(false);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-50),
          contactName: activeConvo?.contact?.name || activeConvo?.title || 'Contact',
          userLanguage: profile?.language || 'en',
        }),
      });
      if (!res.ok) { setSummaryText('Could not summarize this conversation.'); return; }
      const data = await res.json();
      setSummaryText(data.summary || 'Nothing to summarize.');
    } catch (err) {
      console.error('[summarize]', err);
      setSummaryText('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  }

  function handleReplyTo() {
    if (!actionMenu) return;
    setReplyTo({ id: actionMenu.msgId, sender: messages.find(m => m.id === actionMenu.msgId)?.sender_name || '', text: actionMenu.text.slice(0, 100) });
    setActionMenu(null);
    inputRef.current?.focus();
  }

  function handleEditMsg() {
    if (!actionMenu) return;
    setEditingMsg({ id: actionMenu.msgId, text: actionMenu.text });
    setNewMessage(actionMenu.text);
    setActionMenu(null);
    inputRef.current?.focus();
  }

  async function saveEditedMsg() {
    if (!editingMsg || !newMessage.trim()) return;
    await supabase.from('messages').update({ message: newMessage.trim(), edited_at: new Date().toISOString() }).eq('id', editingMsg.id);
    setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, message: newMessage.trim(), edited_at: new Date().toISOString() } : m));
    setEditingMsg(null);
    setNewMessage('');
  }

  async function shareLocation() {
    if (!activeConvoId || !organization?.id) return;
    if (!navigator.geolocation) { toast('Location not supported', 'error'); return; }
    toast('Getting location...', 'info');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      await supabase.from('messages').insert({
        conversation_id: activeConvoId, organization_id: organization.id,
        sender_type: 'owner', sender_name: profile?.full_name || profile?.name || 'You',
        message: `📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        message_type: 'text', original_text: mapUrl,
      });
      await supabase.from('conversations').update({ last_message: '📍 Shared location', last_message_at: new Date().toISOString() }).eq('id', activeConvoId);
      toast('Location shared', 'success');
    }, () => { toast('Location access denied', 'error'); });
    setShowAttachMenu(false);
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim() || broadcastContacts.length === 0 || !organization?.id) return;
    setSending(true);
    for (const contactId of broadcastContacts) {
      // Find or create conversation with each contact
      const { data: existing } = await supabase.from('conversations').select('id').eq('organization_id', organization.id).eq('contact_id', contactId).single();
      const convoId = existing?.id;
      let targetConvoId = convoId;
      if (!targetConvoId) {
        const contact = contacts.find(c => c.id === contactId);
        const { data: newConvo } = await supabase.from('conversations').insert({ organization_id: organization.id, contact_id: contactId, title: contact?.name || 'Contact', unread_count: 0 }).select('id').single();
        targetConvoId = newConvo?.id;
      }
      if (targetConvoId) {
        await supabase.from('messages').insert({
          conversation_id: targetConvoId, organization_id: organization.id,
          sender_type: 'owner', sender_name: profile?.full_name || profile?.name || 'You',
          message: broadcastMsg.trim(), message_type: 'text',
          original_text: broadcastMsg.trim(), original_language: profile?.language || 'en',
        });
        await supabase.from('conversations').update({ last_message: broadcastMsg.trim(), last_message_at: new Date().toISOString() }).eq('id', targetConvoId);
      }
    }
    toast(`Broadcast sent to ${broadcastContacts.length} contacts`, 'success');
    setShowBroadcast(false);
    setBroadcastMsg('');
    setBroadcastContacts([]);
    setSending(false);
    fetchConversations();
  }

  function exportChat() {
    if (!messages.length) { toast('No messages to export', 'info'); return; }
    const lines = messages.map(m => {
      const date = new Date(m.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const text = m.deleted_at ? 'Message deleted' : m.message;
      return `[${dateStr}, ${timeStr}] ${m.sender_name}: ${text}`;
    });
    const header = `Evrywher Chat Export\n${activeConvo?.title || 'Chat'}\nExported: ${new Date().toLocaleString()}\n${'─'.repeat(40)}\n\n`;
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evrywher-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Chat exported', 'success');
  }

  async function handleMuteConvo(duration: string) {
    const convoId = convoActionId;
    if (!convoId) return;
    let mutedUntil: string | null = null;
    if (duration === '8h') mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    else if (duration === '1w') mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    else if (duration === 'always') mutedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('conversations').update({ muted_until: mutedUntil }).eq('id', convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, muted_until: mutedUntil } : c));
    toast(mutedUntil ? 'Muted' : 'Unmuted', 'success');
    setConvoActionId(null);
  }

  async function handlePinConvo(convoId: string) {
    const convo = conversations.find(c => c.id === convoId);
    const pinned = conversations.filter(c => c.is_pinned).length;
    if (!convo?.is_pinned && pinned >= 3) { toast('Max 3 pinned conversations', 'info'); setConvoActionId(null); return; }
    const newVal = !convo?.is_pinned;
    await supabase.from('conversations').update({ is_pinned: newVal, pinned_at: newVal ? new Date().toISOString() : null }).eq('id', convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, is_pinned: newVal, pinned_at: newVal ? new Date().toISOString() : null } : c));
    toast(newVal ? 'Pinned' : 'Unpinned', 'success');
    setConvoActionId(null);
  }

  async function handleArchiveConvo(convoId: string) {
    await supabase.from('conversations').update({ is_archived: true }).eq('id', convoId);
    setConversations(prev => prev.filter(c => c.id !== convoId));
    toast('Conversation archived', 'success');
    setConvoActionId(null);
    if (activeConvoId === convoId) setActiveConvoId(null);
  }

  /* ---------- Voice recording ---------- */

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return; // too short, ignore

        await sendVoiceNote(blob, mimeType);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 120) { // 2 min max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast('Microphone access denied', 'error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const sendVoiceNote = useCallback(async (blob: Blob, mimeType: string) => {
    if (!activeConvoId || !organization?.id) return;
    setUploading(true);

    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const path = `messages/${organization.id}/${activeConvoId}/voice/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, blob);

    if (uploadError) {
      toast(`Upload failed: ${uploadError.message}`, 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const duration = recordingDuration || 1;

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvoId,
      organization_id: organization.id,
      sender_type: 'owner',
      sender_name: profile?.name || 'You',
      message: `Voice note (${formatDuration(duration)})`,
      message_type: 'voice',
      attachment_url: urlData.publicUrl,
      original_language: chatLang,
    });

    if (error) toast('Failed to send voice note', 'error');
    else {
      await supabase
        .from('conversations')
        .update({ last_message: `🎤 Voice note (${formatDuration(duration)})`, last_message_at: new Date().toISOString() })
        .eq('id', activeConvoId);
    }
    setUploading(false);
  }, [activeConvoId, organization?.id, chatLang, recordingDuration]);

  /* ---------- File upload ---------- */

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvoId || !organization?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast('File too large (max 10MB)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const allowedDocTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedImageTypes.includes(file.type) && !allowedDocTypes.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast('Unsupported file type', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Images: open photo editor. Videos: simple confirm.
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoEditorFile({ url: previewUrl, file });
      setShowPhotoEditor(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setPendingFile({ file, previewUrl });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Documents: send immediately
    await uploadAndSendFile(file);
  }, [activeConvoId, organization?.id]);

  const uploadAndSendFile = useCallback(async (file: File) => {
    if (!activeConvoId || !organization?.id) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'bin';
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const folder = isImage ? 'images' : isVideo ? 'videos' : 'documents';
    const path = `messages/${organization.id}/${activeConvoId}/${folder}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file);

    if (uploadError) {
      toast(`Upload failed: ${uploadError.message}`, 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

    const msgType = isImage || isVideo ? 'image' : 'document';
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvoId,
      organization_id: organization.id,
      sender_type: 'owner',
      sender_name: profile?.name || 'You',
      message: file.name,
      message_type: msgType,
      attachment_url: urlData.publicUrl,
      original_language: chatLang,
    });

    if (error) toast('Failed to send', 'error');
    else {
      await supabase
        .from('conversations')
        .update({ last_message: `📎 ${file.name}`, last_message_at: new Date().toISOString() })
        .eq('id', activeConvoId);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeConvoId, organization?.id, chatLang]);

  function confirmPendingFile() {
    if (!pendingFile) return;
    URL.revokeObjectURL(pendingFile.previewUrl);
    uploadAndSendFile(pendingFile.file);
    setPendingFile(null);
  }

  function cancelPendingFile() {
    if (pendingFile) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /* ---------- Translate message ---------- */

  const translateMessage = useCallback(async (messageId: string, targetLang: string) => {
    try {
      const res = await fetch('/api/chat/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, targetLanguage: targetLang }),
      });
      const data = await res.json();
      if (data.translation) {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? {
                ...m,
                original_language: data.originalLanguage || m.original_language,
                translations: { ...(m.translations || {}), [targetLang]: data.translation },
              }
            : m
        ));
      }
    } catch {
      toast('Translation failed', 'error');
    }
  }, []);

  /* ---------- Send message ---------- */

  const sendMessage = useCallback(async () => {
    // If this is a bot conversation, use bot handler
    if (activeConvo?.is_bot_chat) {
      if (!newMessage.trim() || sending) return;
      const msg = newMessage.trim();
      setNewMessage('');
      setSending(true);

      // Optimistically add user message to UI
      const tempUserMsg = {
        id: 'temp-' + Date.now(),
        conversation_id: activeConvoId!,
        organization_id: organization!.id,
        sender_type: 'owner' as const,
        sender_name: profile?.full_name || profile?.name || 'You',
        message: msg,
        message_type: 'text' as const,
        attachment_url: null,
        invoice_id: null,
        read_at: null,
        original_text: null,
        original_language: chatLang,
        translations: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMsg]);

      await sendBotMessage(msg, activeConvoId!, (botReply) => {
        const tempBotMsg = {
          id: 'bot-' + Date.now(),
          conversation_id: activeConvoId!,
          organization_id: organization!.id,
          sender_type: 'bot' as const,
          sender_name: botName,
          message: botReply,
          message_type: 'text' as const,
          attachment_url: null,
          invoice_id: null,
          read_at: null,
          original_text: null,
          original_language: null,
          translations: null,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempBotMsg]);
      });

      setSending(false);
      return;
    }

    if (!newMessage.trim() || !activeConvoId || !organization?.id || sending) return;
    if (newMessage.trim().length > 5000) { toast('Message too long (max 5000 characters)', 'error'); return; }
    // Handle edit mode
    if (editingMsg) { await saveEditedMsg(); setSending(false); return; }
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    try {
      // INSTANT SEND — save message immediately, translate in background
      const senderLang = chatLang || profile?.language || 'en';
      const recipientLang = activeConvo?.contact?.language || 'ja';

      const { data: msg, error } = await supabase.from('messages').insert({
        conversation_id: activeConvoId,
        organization_id: organization.id,
        sender_type: 'owner',
        sender_name: profile?.full_name || profile?.name || 'You',
        message: text,
        message_type: 'text',
        original_text: text,
        original_language: senderLang,
        translations: { [senderLang]: text },
        ...(replyTo && { reply_to_id: replyTo.id }),
      }).select().single();
      setReplyTo(null);

      console.log('[SendMessage] insert result:', { msgId: msg?.id, convoId: activeConvoId, orgId: organization.id, senderType: 'owner', error: error?.message || null });

      if (error) {
        toast('Failed to send message', 'error');
        setNewMessage(text);
      } else {
        supabase.from('conversations').update({ last_message: text, last_message_at: new Date().toISOString() }).eq('id', activeConvoId);

        // Background translation — don't block UI
        if (msg && recipientLang !== senderLang) {
          fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              fromLanguage: senderLang,
              toLanguage: recipientLang,
              ...(convoSummary ? { context: `Relationship: ${convoSummary.relationship_context}. ${convoSummary.summary}` } : {}),
            }),
          }).then(r => r.json()).then(data => {
            if (data.translatedText) {
              supabase.from('messages').update({
                translations: { [senderLang]: text, [recipientLang]: data.translatedText },
              }).eq('id', msg.id);
            }
          }).catch(() => {});
        }
      }
    } catch {
      toast('Failed to send message', 'error');
      setNewMessage(text);
    }
    setSending(false);
  }, [newMessage, activeConvoId, organization?.id, sending, activeConvo, sendBotMessage, botName, chatLang, profile]);

  /* ---------- Cultural Coach intercept ---------- */
  const trySendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    // Skip cultural coach for: bot chats, short messages, same-language, disabled, editing
    const senderLang = chatLang || profile?.language || 'en';
    const recipientLang = activeConvo?.contact?.language || 'ja';
    const wordCount = text.split(/\s+/).length;

    if (
      activeConvo?.is_bot_chat ||
      editingMsg ||
      !culturalCoachEnabled ||
      wordCount <= 10 ||
      senderLang === recipientLang
    ) {
      sendMessage();
      return;
    }

    // Quick AI check
    try {
      const res = await fetch('/api/ai/cultural-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          senderLanguage: senderLang,
          contactLanguage: recipientLang,
          context: messages.slice(-3).map(m => `${m.sender_name}: ${m.message}`).join('\n'),
        }),
      });
      const data = await res.json();

      if (data.severity === 'suggestion' || data.severity === 'warning') {
        setCulturalCoach({
          tip: data.tip || '',
          suggested_revision: data.suggested_revision || '',
          cultural_note: data.cultural_note || '',
          severity: data.severity,
          originalText: text,
        });
        return; // Don't send yet — show the coach card
      }
    } catch {
      // On error, send normally
    }

    sendMessage();
  }, [newMessage, sending, chatLang, profile?.language, activeConvo, editingMsg, culturalCoachEnabled, sendMessage, messages]);

  // Forward message to another conversation
  async function handleForwardMessage() {
    if (!actionMenu) return;
    const msg = messages.find(m => m.id === actionMenu.msgId);
    if (!msg) return;
    // Copy message text to clipboard and show toast for now
    // Full forward-to-conversation picker is a future enhancement
    await navigator.clipboard.writeText(actionMenu.text);
    toast('Message copied — paste in another chat to forward', 'success');
    setActionMenu(null);
  }

  // In-chat search matches
  const chatSearchMatches = chatSearch.trim()
    ? messages.filter(m => m.message?.toLowerCase().includes(chatSearch.toLowerCase()) && !m.deleted_at)
    : [];

  // Fetch shared media when contact info opens
  function openContactInfo() {
    setShowContactInfo(true);
    const media = messages.filter(m => (m.message_type === 'image' || m.message_type === 'document') && m.attachment_url);
    setSharedMedia(media);
  }

  // Save learned words
  function saveLearnedWords(words: { word: string; reading: string; meaning: string; example?: string }[]) {
    try {
      const stored = JSON.parse(localStorage.getItem('learned_words') || '[]');
      for (const w of words) {
        const existing = stored.find((s: { word: string }) => s.word === w.word);
        if (existing) {
          existing.times_seen = (existing.times_seen || 1) + 1;
          existing.saved_at = new Date().toISOString();
        } else {
          stored.push({ ...w, times_seen: 1, saved_at: new Date().toISOString() });
        }
      }
      localStorage.setItem('learned_words', JSON.stringify(stored));
    } catch { /* ignore */ }
  }

  // Schedule message
  async function handleScheduleMessage(sendAt: Date) {
    if (!newMessage.trim() || !activeConvoId || !organization?.id) return;
    setShowScheduleModal(false);
    const text = newMessage.trim();
    await supabase.from('scheduled_messages').insert({
      conversation_id: activeConvoId,
      org_id: organization.id,
      user_id: user?.id,
      sender_name: profile?.full_name || profile?.name || 'You',
      content: text,
      language: chatLang,
      send_at: sendAt.toISOString(),
      status: 'pending',
    });
    setNewMessage('');
    toast(`Message scheduled for ${sendAt.toLocaleString()}`, 'success');
  }

  // Photo editor send
  async function handlePhotoEditorSend(blob: Blob, caption: string) {
    setShowPhotoEditor(false);
    if (photoEditorFile) URL.revokeObjectURL(photoEditorFile.url);
    setPhotoEditorFile(null);
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    if (caption) setNewMessage(caption);
    await uploadAndSendFile(file);
  }

  function handlePhotoEditorCancel() {
    setShowPhotoEditor(false);
    if (photoEditorFile) URL.revokeObjectURL(photoEditorFile.url);
    setPhotoEditorFile(null);
  }

  // Create poll
  async function handleCreatePoll(poll: { question: string; options: string[]; allowMultiple: boolean; anonymous: boolean }) {
    if (!activeConvoId || !organization?.id) return;
    setShowCreatePoll(false);
    const pollData = { ...poll, votes: {} as Record<number, string[]> };
    await supabase.from('messages').insert({
      conversation_id: activeConvoId,
      organization_id: organization.id,
      sender_type: 'owner',
      sender_name: profile?.full_name || profile?.name || 'You',
      message: JSON.stringify(pollData),
      message_type: 'poll' as 'text',
      original_language: chatLang,
    });
    await supabase.from('conversations').update({
      last_message: `📊 ${poll.question}`,
      last_message_at: new Date().toISOString(),
    }).eq('id', activeConvoId);
  }

  // Vote on poll
  async function handlePollVote(msgId: string, optionIndex: number) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    try {
      const pollData = JSON.parse(msg.message);
      const votes = pollData.votes || {};
      const current = votes[optionIndex] || [];
      if (current.includes(user?.id || '')) return;
      votes[optionIndex] = [...current, user?.id || ''];
      pollData.votes = votes;
      await supabase.from('messages').update({ message: JSON.stringify(pollData) }).eq('id', msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, message: JSON.stringify(pollData) } : m));
    } catch { /* ignore parse errors */ }
  }

  function handleCoachSendOriginal() {
    setCulturalCoach(null);
    sendMessage();
  }

  function handleCoachUseSuggestion() {
    if (culturalCoach?.suggested_revision) {
      setNewMessage(culturalCoach.suggested_revision);
    }
    setCulturalCoach(null);
    // Don't auto-send — let user review the suggestion first
  }

  /* ---------- Create new conversation ---------- */

  const createConversation = useCallback(
    async (contact: Contact) => {
      if (!organization?.id) return;

      // Check if conversation with this contact already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('contact_id', contact.id)
        .limit(1)
        .single();

      if (existing) {
        setActiveConvoId(existing.id);
        setShowNewChat(false);
        setContactSearch('');
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          organization_id: organization.id,
          contact_id: contact.id,
          title: contact.name,
          unread_count: 0,
        })
        .select('*, contact:contacts(*)')
        .single();

      if (error) {
        toast('Failed to create conversation', 'error');
      } else {
        setConversations((prev) => [data as Conversation, ...prev]);
        setActiveConvoId((data as Conversation).id);
        setShowNewChat(false);
        setContactSearch('');
      }
    },
    [organization?.id]
  );

  const createGroupConversation = useCallback(async () => {
    if (!organization?.id || !groupName.trim() || selectedContacts.length < 2) return;
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        organization_id: organization.id,
        title: groupName.trim(),
        group_name: groupName.trim(),
        is_group: true,
        unread_count: 0,
      })
      .select()
      .single();

    if (error) {
      toast('Failed to create group', 'error');
    } else {
      // Add selected contacts as a note in the first message
      const memberNames = contacts.filter(c => selectedContacts.includes(c.id)).map(c => c.name).join(', ');
      await supabase.from('messages').insert({
        conversation_id: data.id,
        organization_id: organization.id,
        sender_type: 'owner',
        sender_name: profile?.full_name || profile?.name || 'You',
        message: `Group "${groupName.trim()}" created with ${memberNames}`,
        message_type: 'text',
      });
      setConversations(prev => [data as Conversation, ...prev]);
      setActiveConvoId(data.id);
      setShowGroupCreate(false);
      setShowNewChat(false);
      setGroupName('');
      setSelectedContacts([]);
    }
  }, [organization?.id, groupName, selectedContacts, contacts, profile]);

  /* ---------- Filter & search ---------- */

  const filteredConversations = conversations.filter((c) => {
    // Filter
    if (filter === 'customer' && c.contact?.contact_type !== 'customer') return false;
    if (filter === 'supplier' && c.contact?.contact_type !== 'supplier') return false;
    if (filter === 'invoice' && !c.invoice_id) return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      const name = (c.contact?.name ?? c.title ?? '').toLowerCase();
      const company = (c.contact?.company ?? '').toLowerCase();
      const msg = (c.last_message ?? '').toLowerCase();
      if (!name.includes(q) && !company.includes(q) && !msg.includes(q)) return false;
    }

    return true;
  });

  const folderFiltered = chatFolder === 'all'
    ? filteredConversations
    : chatFolder === 'groups'
      ? filteredConversations.filter(c => c.is_group)
      : filteredConversations.filter(c => (c.folder || 'personal') === chatFolder);

  const sortedConversations = [...folderFiltered]
    .filter(c => !c.is_archived)
    .sort((a, b) => {
      // Pinned first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Bot chat next
      if (a.is_bot_chat && !b.is_bot_chat) return -1;
      if (!a.is_bot_chat && b.is_bot_chat) return 1;
      return 0;
    });

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q);
  });

  // Auto-create bot for Evrywher users — skip onboarding entirely
  const [autoCreating, setAutoCreating] = useState(false);
  const [botActivated, setBotActivated] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('bot_activated') === '1';
    return false;
  });

  useEffect(() => {
    if (!organization?.id || !isPocketChatMode || !botConfigLoaded || isSetupComplete) return;

    let cancelled = false;
    setAutoCreating(true);

    const autoCreateBot = async () => {
      try {
        const { data: existing } = await supabase
          .from('pocket_bot_config')
          .select('id')
          .eq('organization_id', organization.id)
          .maybeSingle();

        if (existing) {
          if (!cancelled) { fetchBotConfig(); setAutoCreating(false); }
          return;
        }

        const botGreeting = "Hi! I'm your Evrywher assistant. I can help you communicate in 21 languages!";
        const { error } = await supabase
          .from('pocket_bot_config')
          .upsert({
            organization_id: organization.id,
            bot_name: 'Evrywher AI',
            bot_icon: '1',
            greeting_message: botGreeting,
            bot_personality: 'friendly',
            language: 'en',
            is_setup_complete: true,
            auto_reply_enabled: true,
          }, { onConflict: 'organization_id' });

        if (error) {
          if (!cancelled) setAutoCreating(false);
          return;
        }

        const { data: existingConvo } = await supabase
          .from('conversations')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('is_bot_chat', true)
          .maybeSingle();

        if (!existingConvo) {
          const { data: newConvo } = await supabase
            .from('conversations')
            .insert({
              organization_id: organization.id,
              is_bot_chat: true,
              title: 'Evrywher AI',
              last_message: botGreeting,
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (newConvo) {
            await supabase.from('messages').insert({
              conversation_id: newConvo.id,
              organization_id: organization.id,
              sender_type: 'bot',
              sender_name: 'Evrywher AI',
              message: botGreeting,
              message_type: 'text',
            });
          }
        }

        if (!cancelled) {
          await fetchBotConfig();
          await fetchConversations();
          setAutoCreating(false);
        }
      } catch (err) {
        if (!cancelled) setAutoCreating(false);
      }
    };

    autoCreateBot();
    return () => { cancelled = true; };
  }, [organization?.id, isPocketChatMode, botConfigLoaded, isSetupComplete]);

  // One-time cleanup: fix old bot messages that still say "PocketChat" or "Speko"
  useEffect(() => {
    if (!organization?.id) return;
    const key = `brand_cleanup_${organization.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return;
    (async () => {
      await supabase.from('messages')
        .update({ message: "Hi! I'm your Evrywher assistant. I can help you communicate in 21 languages!" })
        .eq('organization_id', organization.id)
        .eq('sender_type', 'bot')
        .or('message.ilike.%PocketChat%,message.ilike.%Speko%');
      await supabase.from('conversations')
        .update({ title: botName || 'Evrywher AI' })
        .eq('organization_id', organization.id)
        .eq('is_bot_chat', true)
        .or('title.ilike.%Speko%,title.ilike.%PocketChat%');
      if (typeof window !== 'undefined') sessionStorage.setItem(key, '1');
    })();
  }, [organization?.id, botName]);

  // Fetch AI usage for free tier indicator
  useEffect(() => {
    if (!isFreePlan || !organization?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('usage_tracking').select('usage_type, count').eq('org_id', organization.id).eq('usage_date', today).then(({ data }) => {
      if (data) {
        for (const row of data) {
          if (row.usage_type === 'translation') setTranslationsUsed(row.count);
          if (row.usage_type === 'bot_chat') setBotMessagesUsed(row.count);
        }
      }
    });
  }, [isFreePlan, organization?.id, sending]);

  // Update last_seen for online status
  useEffect(() => {
    if (!user?.id) return;
    const updateLastSeen = () => supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', user.id);
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000); // every 60s
    return () => clearInterval(interval);
  }, [user?.id]);

  // Evrywher users: NEVER block with setup screen — go straight to chat UI.
  // Bot auto-creates in background via useEffect above.

  // Show bot onboarding if not set up (BizPocket users only — never PocketChat)
  if (botConfigLoaded && !isSetupComplete && !isPocketChatMode && !botActivated) {
    return (
      <div className="chat-fullbleed h-[100dvh] lg:h-[calc(100vh-80px)] bg-slate-800">
        <BotOnboarding
          onComplete={(name, icon) => {
            setBotActivated(true);
            localStorage.setItem('bot_activated', '1');
            fetchBotConfig();
            fetchConversations();
          }}
        />
      </div>
    );
  }

  /* ---------- Render: Active Conversation ---------- */

  if (activeConvoId && activeConvo) {
    const contactName = activeConvo.is_bot_chat
      ? botName
      : activeConvo.is_group
        ? (activeConvo.group_name || activeConvo.title || 'Group')
        : (activeConvo.contact?.name || activeConvo.contact?.display_name || activeConvo.contact?.full_name || activeConvo.title || 'Chat');
    const contactType = activeConvo.contact?.contact_type;
    const isGroup = activeConvo.is_group;

    // Debug: log contact object to verify name fields (remove after confirming)
    if (typeof window !== 'undefined' && activeConvo.contact) {
      console.log('[ChatHeader] contact:', JSON.stringify(activeConvo.contact));
      console.log('[ChatHeader] contactName resolved:', contactName);
    }

    return (
      <div className="chat-fullbleed h-[100dvh] lg:h-[calc(100vh-80px)] flex flex-col bg-slate-900" style={{ paddingBottom: 'var(--keyboard-height, 0px)' }}>
        {/* Header — clean mobile layout: back+avatar | name centered | phone+video */}
        <div className="px-2 py-2.5 border-b border-slate-700 flex items-center gap-2 shrink-0">
          {/* Left: back + avatar */}
          <button
            onClick={() => setActiveConvoId(null)}
            className="min-w-[40px] min-h-[40px] p-2 -ml-1 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            aria-label="Back"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="shrink-0">
            {activeConvo.is_bot_chat ? (
              botConfig?.avatar_url ? (
                <img src={botConfig.avatar_url} alt={botName} className="h-9 w-9 rounded-full object-cover" />
              ) : <AnimatedPocketChatLogo size={36} />
            ) : isGroup ? (
              <div className="h-9 w-9 rounded-full bg-[#4F46E5]/10 flex items-center justify-center cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            ) : (
              <div className="relative">
                <PocketAvatar name={contactName} size={36} />
                {(() => { const s = onlineStatus(contactLastSeen); return s.online ? <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22C55E] border-2 border-slate-900" /> : null; })()}
              </div>
            )}
          </div>

          {/* Center: name — takes all available space */}
          <div className="flex-1 min-w-0 text-center px-1">
            <p className="text-base font-semibold text-white truncate cursor-pointer leading-tight" onClick={() => isGroup ? setShowGroupInfo(true) : !activeConvo.is_bot_chat && openContactInfo()}>
              {contactName}
            </p>
            {activeConvo.is_bot_chat && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F43F5E]/10 text-[#F43F5E]">AI Assistant</span>
            )}
            {isGroup && !activeConvo.is_bot_chat && (
              <button onClick={() => setShowGroupInfo(true)} className="text-[11px] text-indigo-400 hover:underline">Tap for group info</button>
            )}
          </div>

          {/* Right: phone + video ONLY (search + labels + memory moved to ⋮ menu) */}
          <div className="flex items-center shrink-0">
            {activeConvo.is_bot_chat ? (
              <button
                onClick={() => setShowCameraTranslate(true)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-amber-400 shrink-0 transition-colors hover:bg-[#F59E0B]/10"
                style={{ border: '1.5px solid #F59E0B' }}
                title="Scan & Translate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="hidden sm:inline">Scan</span>
              </button>
            ) : (
              <>
                <button onClick={() => router.push(`/chat/call/${activeConvoId}`)} className="min-w-[40px] min-h-[40px] p-2 rounded-full flex items-center justify-center shrink-0 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors" title="Voice call">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>
                <button onClick={() => router.push(`/chat/call/${activeConvoId}`)} className="min-w-[40px] min-h-[40px] p-2 rounded-full flex items-center justify-center shrink-0 text-indigo-400 hover:bg-indigo-400/10 transition-colors" title="Video call">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
              </>
            )}

          </div>{/* close right buttons */}
        </div>{/* close header */}
        {/* ChatLabels overlay — triggered from ⋮ menu */}
        {!activeConvo.is_bot_chat && (
          <ChatLabels
            conversationId={activeConvo.id}
            currentLabel={activeConvo.label || null}
            currentColor={activeConvo.label_color || null}
            onUpdate={(label, color) => {
              setConversations(prev => prev.map(c => c.id === activeConvo.id ? { ...c, label, label_color: color } : c));
              setShowLabels(false);
            }}
            isOpen={showLabels}
            onClose={() => setShowLabels(false)}
          />
        )}

        {/* Summary popup */}
        {showSummaryPopup && convoSummary && (
          <div className="px-3 py-2.5 border-b border-amber-800/30 bg-amber-950/20 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">🧠</span>
                <span className="text-[11px] font-semibold text-[#FDE68A] uppercase tracking-wider">AI Context</span>
                {convoSummary.relationship_context && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-[#FDE68A] font-medium capitalize">{convoSummary.relationship_context}</span>
                )}
              </div>
              <button onClick={() => setShowSummaryPopup(false)} className="text-slate-400 p-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed">{convoSummary.summary}</p>
            {convoSummary.key_topics?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {convoSummary.key_topics.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* In-chat search bar */}
        {showChatSearch && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => { setChatSearch(e.target.value); setChatSearchIdx(0); }}
              placeholder="Search in chat..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              autoFocus
            />
            {chatSearchMatches.length > 0 && (
              <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                {chatSearchIdx + 1} of {chatSearchMatches.length}
              </span>
            )}
            {chatSearchMatches.length > 1 && (
              <div className="flex items-center shrink-0">
                <button onClick={() => setChatSearchIdx(i => Math.max(0, i - 1))} className="p-1 text-slate-400 hover:text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button onClick={() => setChatSearchIdx(i => Math.min(chatSearchMatches.length - 1, i + 1))} className="p-1 text-slate-400 hover:text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>
            )}
            <button onClick={() => { setShowChatSearch(false); setChatSearch(''); }} className="p-1 text-slate-400 hover:text-slate-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {/* Messages — flex-col-reverse keeps content anchored to bottom so keyboard doesn't push messages too far up */}
        <div
          ref={chatScrollRef}
          className={`flex-1 overflow-y-auto relative ${!chatWallpaper ? 'chat-bg-pattern' : ''}`}
          style={chatWallpaper ? { backgroundColor: chatWallpaper.startsWith('#') ? chatWallpaper : undefined, backgroundImage: !chatWallpaper.startsWith('#') ? chatWallpaper : undefined } : undefined}
          onScroll={() => {
            const el = chatScrollRef.current;
            if (el) setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
          }}
        >
          <div className="flex flex-col justify-end min-h-full p-4 space-y-3">
          {/* Match Origin Pill */}
          {activeConvo.contact?.corridor_tag && !matchPillDismissed && (
            <div className="flex justify-center mb-2">
              <button
                onClick={() => setMatchPillDismissed(true)}
                className="inline-flex items-center gap-2 bg-slate-800/80 backdrop-blur-[12px] border border-white/[0.06] rounded-full px-4 py-2 text-xs text-[var(--pm-text-secondary)] shadow-sm"
              >
                {'\u{1F91D}'} AI Matched you! {'\u00B7'} {activeConvo.contact.corridor_tag}
                <span className="text-[10px] text-[var(--pm-text-tertiary)] ml-1">{'\u2715'}</span>
              </button>
            </div>
          )}

          {/* Biz Card Tip */}
          {activeConvo.contact?.corridor_tag && !bizCardTipDismissed && messages.length > 0 && (
            <div className="flex justify-center mb-2">
              <button
                onClick={() => { setBizCardTipDismissed(true); try { localStorage.setItem('tipDismissed_bizcard', '1'); } catch {} }}
                className="inline-flex items-center gap-2 bg-emerald-950/30 backdrop-blur-[12px] border border-emerald-800/30 rounded-full px-4 py-2 text-xs text-emerald-300"
              >
                {'\u{1F4A1}'} Share your Business Card to build trust faster
                <span className="text-[10px] opacity-50 ml-1">{'\u2715'}</span>
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">👋</div>
              <p className="text-sm font-medium text-slate-300">Say hello!</p>
              <p className="text-xs text-slate-400 mt-1">Messages are translated in real-time</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isOwner = msg.sender_type === 'owner';
            const isBot = msg.sender_type === 'bot';
            // Date separator check
            const msgDate = new Date(msg.created_at).toDateString();
            const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at).toDateString() : null;
            const showDateSep = idx === 0 || msgDate !== prevDate;
            // Payment confirmed
            if (msg.message_type === 'payment_confirmed') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[#059669] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    Payment Confirmed ✓
                  </div>
                  <div className="text-[10px] text-slate-400 text-center mt-1">
                    {formatTimestamp(msg.created_at)}
                  </div>
                </div>
              );
            }

            // Image message
            if (msg.message_type === 'image' && msg.attachment_url) {
              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {!isOwner && <p className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender_name}</p>}
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-[12px] overflow-hidden border border-slate-700">
                      <img src={msg.attachment_url} alt={msg.message} className="max-h-[240px] w-full object-cover" loading="lazy" />
                    </a>
                    <p className={`text-[10px] text-slate-400 mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTimestamp(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

            // Document message
            if (msg.message_type === 'document' && msg.attachment_url) {
              const fileName = msg.message || '';
              const ext = fileName.split('.').pop()?.toLowerCase() || '';
              const isPdf = ext === 'pdf';
              const isDoc = ['doc', 'docx'].includes(ext);
              const isXls = ['xls', 'xlsx', 'csv'].includes(ext);
              const iconColor = isPdf ? '#DC2626' : isDoc ? '#2563EB' : isXls ? '#16A34A' : '#6B7280';
              const iconBg = isPdf ? '#DC2626' : isDoc ? '#2563EB' : isXls ? '#16A34A' : '#6B7280';

              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    {!isOwner && <p className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender_name}</p>}
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[12px] border border-slate-700 bg-slate-800 px-3.5 py-2.5 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${iconBg}15` }}>
                        <svg className="h-5 w-5" style={{ color: iconColor }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{fileName}</p>
                        <p className="text-[10px] text-slate-400">{ext.toUpperCase()} — Tap to download</p>
                      </div>
                    </a>
                    <p className={`text-[10px] text-slate-400 mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTimestamp(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

            // Voice message
            if (msg.message_type === 'voice' && msg.attachment_url) {
              const langFlag = msg.original_language ? LANG_FLAGS[msg.original_language] || '' : '';
              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    {!isOwner && <p className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender_name}</p>}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 min-w-[200px] ${
                        isOwner ? 'bg-[#4F46E5]' : 'bg-slate-800/80 backdrop-blur-[12px] border border-white/[0.06]'
                      }`}
                    >
                      <VoiceMessagePlayer
                        url={msg.attachment_url!}
                        duration={msg.message.match(/\d+:\d+/)?.[0] || '0:00'}
                        isOwner={isOwner}
                      />
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? 'justify-end mr-1' : 'ml-1'}`}>
                      {langFlag && <span className="text-[10px]">{langFlag}</span>}
                      <span className="text-[10px] text-slate-400">{formatTimestamp(msg.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // Poll message
            if ((msg.message_type as string) === 'poll') {
              let pollData;
              try { pollData = JSON.parse(msg.message); } catch { pollData = null; }
              if (pollData) {
                return (
                  <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      {!isOwner && <p className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender_name}</p>}
                      <PollBubble
                        pollData={pollData}
                        userId={user?.id || ''}
                        onVote={(idx) => handlePollVote(msg.id, idx)}
                        isOwner={isOwner}
                      />
                      <p className={`text-[10px] text-slate-400 mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTimestamp(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              }
            }

            // Business Card message
            if ((msg.message_type as string) === 'business_card') {
              const cardData = (() => {
                try { return JSON.parse(msg.message); } catch { return null; }
              })();
              if (cardData) {
                return (
                  <div key={msg.id}>
                    {showDateSep && <div className="text-center text-[10px] text-slate-400 my-3">{msgDate}</div>}
                    <BusinessCardMessage
                      cardData={{
                        ...cardData,
                        sender_name: msg.sender_name,
                        onQuoteRequest: (text: string) => {
                          if (activeConvoId) {
                            supabase.from('messages').insert({
                              conversation_id: activeConvoId,
                              organization_id: organization.id,
                              sender_type: 'owner',
                              sender_name: profile?.full_name || profile?.name || 'You',
                              message: `\u{1F4CB} Quote Request: ${text}`,
                              message_type: 'text',
                              original_text: `Quote Request: ${text}`,
                              original_language: profile?.language || 'en',
                            });
                          }
                        },
                      }}
                      isOwner={isOwner}
                      timestamp={formatTimestamp(msg.created_at)}
                    />
                  </div>
                );
              }
            }

            // Invoice message
            if (msg.message_type === 'invoice') {
              const invoiceData = (() => {
                try {
                  return JSON.parse(msg.message);
                } catch {
                  return null;
                }
              })();

              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    {!isOwner && (
                      <p className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender_name}</p>
                    )}
                    <div className="bg-slate-800 border border-slate-700 rounded-[12px] px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#4F46E5" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-indigo-400">Invoice</span>
                      </div>
                      {invoiceData && (
                        <>
                          <p className="text-sm font-semibold text-white">
                            {invoiceData.invoice_number ?? 'Invoice'}
                          </p>
                          <p className="text-sm font-bold text-white font-mono">
                            {formatCurrency(invoiceData.amount ?? 0)}
                          </p>
                          <span
                            className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 font-semibold ${
                              invoiceData.status === 'paid'
                                ? 'bg-[#D1FAE5] text-[#059669]'
                                : invoiceData.status === 'overdue'
                                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                                  : 'bg-[#FEF3C7] text-[#D97706]'
                            }`}
                          >
                            {(invoiceData.status ?? 'pending').toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                    <p className={`text-[10px] text-slate-400 mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTimestamp(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

            // Deleted message
            if (msg.deleted_at) {
              return (
                <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-[12px] px-3.5 py-2.5 ${isOwner ? 'bg-slate-700/50' : 'bg-slate-700/50'}`}>
                    <p className="text-[13px] italic text-slate-400">Message deleted</p>
                  </div>
                </div>
              );
            }

            // Regular text message with translation
            const userLang = profile?.language || 'en';
            const display = getDisplayText({
              message: msg.message,
              original_text: msg.original_text,
              original_language: msg.original_language,
              translations: msg.translations,
            }, userLang);
            const origLang = display.originalLanguage;
            const hasTranslation = msg.translations && msg.translations[userLang];
            const showTranslated = display.isTranslated;
            const displayText = showTranslated && !showOriginal[msg.id]
              ? display.text
              : showOriginal[msg.id] ? (msg.original_text || msg.message) : display.text;
            const langFlag = origLang ? LANG_FLAGS[origLang] || '' : '';

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">{(() => { const d = new Date(msg.created_at); const t = new Date().toDateString(); const y = new Date(Date.now()-86400000).toDateString(); if (msgDate===t) return 'Today'; if (msgDate===y) return 'Yesterday'; return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); })()}</span>
                    <div className="flex-1 h-px bg-slate-700" />
                  </div>
                )}
                <div
                  className={`flex ${isOwner ? 'justify-end' : 'justify-start'} ${isBot || (isGroup && !isOwner) ? 'gap-2' : ''} relative`}
                  style={swipeDelta?.msgId === msg.id ? { transform: `translateX(${swipeDelta.dx}px)`, transition: 'none' } : { transition: 'transform 0.2s ease' }}
                  onTouchStart={(e) => handleSwipeStart(e, msg.id, isOwner, displayText, msg.sender_name || '')}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={handleSwipeEnd}
                >
                {/* Swipe reply indicator */}
                {swipeDelta?.msgId === msg.id && swipeDelta.dx > 20 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pl-2" style={{ opacity: Math.min(1, swipeDelta.dx / 60) }}>
                    <div className="h-8 w-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><path d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                    </div>
                  </div>
                )}
                {isBot && (
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                    {botConfig?.avatar_url ? (
                      <img src={botConfig.avatar_url} alt={botName} className="h-8 w-8 rounded-full object-cover" />
                    ) : <AnimatedPocketChatLogo size={32} />}
                  </div>
                )}
                {isGroup && !isOwner && !isBot && (
                  <div className="h-8 w-8 shrink-0 mt-5">
                    <PocketAvatar name={msg.sender_name || 'U'} size={28} />
                  </div>
                )}
                <div className={`max-w-[75vw] sm:max-w-[80%] min-w-0 ${isOwner ? 'ml-auto' : ''}`}>
                  {!isOwner && !isBot && (
                    <p className="text-[12px] mb-1 ml-1 font-medium" style={{ color: avatarColor(msg.sender_name || '') }}>{msg.sender_name}</p>
                  )}
                  {isBot && (
                    <p className="text-[15px] text-amber-400 mb-1 ml-1 font-semibold">{botName}</p>
                  )}
                  <div
                    onContextMenu={(e) => { e.preventDefault(); openActionMenu(msg.id, e.clientX, e.clientY, isOwner, displayText); }}
                    onTouchStart={(e) => handleLongPressStart(e, msg.id, isOwner, displayText)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchMove={handleLongPressEnd}
                    className={`rounded-2xl px-3.5 py-2.5 select-none ${
                      isOwner
                        ? 'bg-[#4F46E5] text-white'
                        : isBot
                          ? 'bg-indigo-950/30 text-slate-200 backdrop-blur-[12px] border border-white/[0.06]'
                          : 'bg-slate-800/80 text-slate-200 backdrop-blur-[12px] border border-white/[0.06]'
                    }`}
                  >
                    {msg.is_forwarded && (
                      <p className={`text-[11px] italic mb-1 ${isOwner ? 'text-white/50' : 'text-slate-400'}`}>
                        ↪️ Forwarded{(msg.forward_count || 0) > 4 ? ' many times' : ''}
                      </p>
                    )}
                    {msg.reply_to_id && (() => { const orig = messages.find(m => m.id === msg.reply_to_id); return orig ? (
                      <div className={`mb-1.5 border-l-2 pl-2 py-1 text-[12px] rounded ${isOwner ? 'border-white/50 bg-slate-800/10' : 'border-[#4F46E5]/30 bg-[#4F46E5]/5'}`}>
                        <p className={`font-medium ${isOwner ? 'text-white/70' : 'text-indigo-400'}`}>{orig.sender_name}</p>
                        <p className={`truncate ${isOwner ? 'text-white/60' : 'text-slate-300'}`}>{orig.message?.slice(0, 60)}</p>
                      </div>
                    ) : null; })()}
                    <p className="text-[15px] whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere', ...(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(displayText) ? { direction: 'rtl', textAlign: 'right', fontFamily: "'Noto Sans Arabic', 'Noto Sans', sans-serif" } : {}) } as React.CSSProperties}>{displayText}</p>
                    {msg.edited_at && <p className={`text-[10px] mt-0.5 ${isOwner ? 'text-white/40' : 'text-slate-400'}`}>(edited)</p>}
                    {(() => { const urlMatch = displayText.match(/https?:\/\/[^\s]+/); return urlMatch ? <LinkPreview url={urlMatch[0]} /> : null; })()}
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? 'justify-end mr-1' : 'ml-1'}`}>
                    {showTranslated && (
                      <button
                        onClick={() => setShowOriginal(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                        className={`text-[11px] flex items-center gap-1 ${isOwner ? 'text-white/50' : 'text-slate-400'} hover:opacity-70`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
                        {showOriginal[msg.id] ? 'See translation' : `Translated from ${LANG_NAMES[origLang || ''] || origLang || 'unknown'}`}
                      </button>
                    )}
                    {!showTranslated && !hasTranslation && origLang && origLang !== userLang && (
                      <button
                        onClick={() => translateMessage(msg.id, userLang)}
                        className={`text-[11px] flex items-center gap-1 ${isOwner ? 'text-slate-400' : 'text-indigo-400'} hover:opacity-70`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
                        Translate
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {formatTimestamp(msg.created_at)}
                    </span>
                    {isOwner && (
                      <span className="inline-flex ml-0.5">
                        {msg.read_at ? (
                          /* Read: double blue checks */
                          <svg className="h-3 w-[18px]" viewBox="0 0 18 12" fill="none">
                            <path d="M1 6l3.5 4L14 1" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 6l3.5 4L18 1" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : msg.delivered_at ? (
                          /* Delivered: double gray checks */
                          <svg className="h-3 w-[18px]" viewBox="0 0 18 12" fill="none">
                            <path d="M1 6l3.5 4L14 1" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 6l3.5 4L18 1" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          /* Sent: single gray check */
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                            <path d="M1 6l3.5 4L11 1" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwner ? 'justify-end' : ''}`}>
                      {Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, users]) => (
                        <button key={emoji} onClick={() => { setReactionMsgId(msg.id); handleReaction(emoji); }} className="flex items-center gap-0.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-xs hover:bg-slate-600 transition-colors">
                          <span>{emoji}</span>
                          {users.length > 1 && <span className="text-[10px] text-slate-300">{users.length}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.is_starred && (
                    <div className={`mt-0.5 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                      <span className="text-[10px] text-amber-400">★ Starred</span>
                    </div>
                  )}
                  {/* Language Learning card */}
                  {learningMode && !isOwner && msg.translations && (() => {
                    // Parse learning data from translations if available
                    const learningRaw = (msg.translations as Record<string, string>)?.['_learning'];
                    if (!learningRaw) return null;
                    try {
                      const learning = JSON.parse(learningRaw);
                      if (!learning?.key_words?.length) return null;
                      return (
                        <LearnFromMessage
                          learning={learning}
                          onSaveWords={saveLearnedWords}
                          isOwner={isOwner}
                        />
                      );
                    } catch { return null; }
                  })()}
                </div>
              </div>
              </div>
            );
          })}
          {typingUser && (
            <div className="px-3.5">
              <PocketChatTypingIndicator contactName={typingUser} />
            </div>
          )}
          {sending && activeConvo?.is_bot_chat && (
            <div className="px-3.5">
              <PocketChatTypingIndicator contactName={botName} compact={true} size="sm" />
            </div>
          )}
          <div ref={messagesEndRef} />
          </div>
          {/* end justify-end wrapper */}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollBtn(false); }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-medium text-indigo-400 shadow-lg hover:bg-slate-700 transition-colors z-10"
            >
              New messages
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14l-7 7-7-7"/></svg>
            </button>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFileUpload} className="hidden" />

        {/* File preview confirmation */}
        {pendingFile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
            <div className="w-full max-w-sm mx-4 bg-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4">
                <p className="text-sm font-semibold text-white mb-3">Send this {pendingFile.file.type.startsWith('video/') ? 'video' : 'photo'}?</p>
                {pendingFile.file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingFile.previewUrl} alt="Preview" className="w-full max-h-[300px] object-contain rounded-xl bg-slate-700" />
                ) : (
                  <div className="w-full h-[200px] rounded-xl bg-slate-700 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="h-12 w-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                      <p className="text-xs text-slate-400 mt-2">{pendingFile.file.name}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2 truncate">{pendingFile.file.name} · {(pendingFile.file.size / 1024).toFixed(0)} KB</p>
              </div>
              <div className="flex border-t border-slate-700">
                <button onClick={cancelPendingFile} className="flex-1 py-3 text-sm font-medium text-slate-400 hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmPendingFile} disabled={uploading} className="flex-1 py-3 text-sm font-semibold text-indigo-400 hover:bg-[#4F46E5]/5 transition-colors border-l border-slate-700 disabled:opacity-50">
                  {uploading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Message Modal */}
        {showScheduleModal && newMessage.trim() && (
          <ScheduleMessageModal
            message={newMessage.trim()}
            onSchedule={handleScheduleMessage}
            onClose={() => setShowScheduleModal(false)}
          />
        )}

        {/* Photo Editor */}
        {showPhotoEditor && photoEditorFile && (
          <PhotoEditor
            imageUrl={photoEditorFile.url}
            onSend={handlePhotoEditorSend}
            onCancel={handlePhotoEditorCancel}
          />
        )}

        {/* Create Poll */}
        {showCreatePoll && (
          <CreatePoll
            onClose={() => setShowCreatePoll(false)}
            onSubmit={handleCreatePoll}
          />
        )}

        {/* Voice Translator */}
        {showVoiceTranslator && (
          <VoiceTranslator
            userLanguage={profile?.language || 'en'}
            contactLanguage={activeConvo?.contact?.language || 'ja'}
            onClose={() => setShowVoiceTranslator(false)}
            onSendToChat={(text) => {
              setNewMessage(text);
              setShowVoiceTranslator(false);
            }}
          />
        )}

        {/* Camera Translate */}
        {showCameraTranslate && (
          <CameraTranslate
            userLanguage={profile?.language || 'en'}
            userName={profile?.full_name || profile?.name || ''}
            onClose={() => setShowCameraTranslate(false)}
            onSendToChat={(text) => {
              setNewMessage(text);
              setShowCameraTranslate(false);
            }}
          />
        )}

        {/* Business Card Gate — in BottomSheet */}
        <BottomSheet
          isOpen={showBizCardGate && !!bizCardGateData}
          onClose={() => setShowBizCardGate(false)}
          title="Share Business Card"
        >
          {bizCardGateData && (
            <BizCardGate
              currentTrust={bizCardGateData.trustScore}
              tier={bizCardGateData.tier}
              nextActions={bizCardGateData.nextActions}
              onDismiss={() => setShowBizCardGate(false)}
              onSendInvoice={() => router.push('/invoices/new')}
              onShareProfile={() => {
                const shareUrl = bizCardGateData?.shareToken ? `https://evrywher.io/p/${bizCardGateData.shareToken}` : 'https://evrywher.io';
                if (activeConvoId) {
                  supabase.from('messages').insert({
                    conversation_id: activeConvoId,
                    organization_id: organization.id,
                    sender_type: 'owner',
                    sender_name: profile?.full_name || profile?.name || 'You',
                    message: `Check out my profile: ${shareUrl}`,
                    message_type: 'text',
                    original_text: `Check out my profile: ${shareUrl}`,
                    original_language: profile?.language || 'en',
                  });
                }
              }}
            />
          )}
        </BottomSheet>

        {/* Upload progress */}
        {uploading && (
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-[#4F46E5] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <span className="text-[10px] text-slate-400">Uploading...</span>
            </div>
          </div>
        )}

        {/* Toolbar removed — consolidated into main input row */}

        {/* Contact Info modal */}
        {showContactInfo && !activeConvo?.is_bot_chat && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowContactInfo(false)} />
            <div className="relative w-full max-w-md sm:mx-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                <button onClick={() => setShowContactInfo(false)} className="text-sm text-indigo-400 font-medium">Close</button>
                <p className="text-sm font-bold text-white">Contact Info</p>
                <div className="w-10" />
              </div>

              <div className="p-5 space-y-5">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center gap-2">
                  <PocketAvatar name={contactName} size={80} />
                  <p className="text-lg font-bold text-white">{contactName}</p>
                  {contactType && <span className="text-xs px-3 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">{contactType}</span>}
                </div>

                {/* Shared Media */}
                {sharedMedia.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Shared Media ({sharedMedia.length})</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {sharedMedia.slice(0, 4).map(m => (
                        <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-slate-700">
                          {m.message_type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.attachment_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-0.5">
                  <button onClick={() => { setShowContactInfo(false); setShowChatSearch(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors text-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <span className="text-sm text-slate-300">Search in Chat</span>
                  </button>
                  <button onClick={() => { setShowContactInfo(false); exportChat(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors text-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    <span className="text-sm text-slate-300">Export Chat</span>
                  </button>
                </div>

                {/* Danger zone */}
                <div className="space-y-0.5 pt-2 border-t border-slate-700">
                  <button
                    onClick={async () => {
                      if (!confirm(`Block ${contactName}?`)) return;
                      setShowContactInfo(false);
                      toast(`${contactName} blocked`, 'success');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#FEF2F2] transition-colors text-left"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
                    <span className="text-sm text-[#DC2626]">Block</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete this conversation?`)) return;
                      await supabase.from('conversations').delete().eq('id', activeConvoId);
                      setConversations(prev => prev.filter(c => c.id !== activeConvoId));
                      setActiveConvoId(null);
                      setShowContactInfo(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#FEF2F2] transition-colors text-left"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span className="text-sm text-[#DC2626]">Delete Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message action sheet (mobile-native bottom sheet) */}
        <MessageActionSheet
          isOpen={!!actionMenu}
          msgId={actionMenu?.msgId || ''}
          isOwner={actionMenu?.isOwner || false}
          text={actionMenu?.text || ''}
          senderName={(() => { const m = messages.find(m => m.id === actionMenu?.msgId); return m?.sender_name || ''; })()}
          isStarred={(() => { const m = messages.find(m => m.id === actionMenu?.msgId); return !!m?.is_starred; })()}
          onClose={() => { setActionMenu(null); setTranslatePickerMsgId(null); }}
          onReply={handleReplyTo}
          onCopy={handleCopyText}
          onStar={handleStarMessage}
          onEdit={handleEditMsg}
          onDelete={handleDeleteMessage}
          onReact={() => { setReactionMsgId(actionMenu?.msgId || ''); setActionMenu(null); }}
          onTranslate={() => { setTranslatePickerMsgId(actionMenu?.msgId || null); setActionMenu(null); }}
          onForward={handleForwardMessage}
        />

        {/* Reaction picker */}
        {reactionMsgId && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setReactionMsgId(null)} />
            <div className="fixed z-50 left-1/2 -translate-x-1/2 bottom-24 flex gap-2 bg-slate-800 rounded-full px-3 py-2 shadow-lg border border-slate-700">
              {['❤️', '👍', '😂', '😮', '🙏'].map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-transform px-1">{emoji}</button>
              ))}
            </div>
          </>
        )}

        {/* Free tier usage — merged into input bar info line */}

        {/* Cultural Coach card */}
        {culturalCoach && (
          <div className={`px-3 py-3 border-t ${culturalCoach.severity === 'warning' ? 'bg-red-950/30 border-red-900' : 'bg-amber-950/30 border-amber-900'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🌏</span>
                <span className="text-[13px] font-semibold text-white">Cultural Tip</span>
              </div>
              <button onClick={() => setCulturalCoach(null)} className="text-slate-400 hover:text-white p-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-[13px] text-slate-300 leading-relaxed mb-2">{culturalCoach.tip}</p>
            {culturalCoach.cultural_note && (
              <p className="text-[11px] text-slate-400 italic mb-2">{culturalCoach.cultural_note}</p>
            )}
            {culturalCoach.suggested_revision && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2 mb-2 border border-slate-700">
                <p className="text-[11px] text-slate-400 font-medium mb-1">Suggested version</p>
                <p className="text-[13px] text-white leading-relaxed">{culturalCoach.suggested_revision}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleCoachSendOriginal} className="flex-1 rounded-lg border border-slate-600 py-2 text-[12px] font-medium text-slate-300 active:bg-slate-700">
                Send Original
              </button>
              {culturalCoach.suggested_revision && (
                <button onClick={handleCoachUseSuggestion} className="flex-1 rounded-lg bg-[#4F46E5] py-2 text-[12px] font-medium text-white active:bg-[#4338CA]">
                  Use Suggestion
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reply/Edit preview above input */}
        {(replyTo || editingMsg) && (
          <div className="px-3 py-2 border-t border-[var(--border)] bg-slate-800 flex items-center gap-2">
            <div className="flex-1 min-w-0 border-l-2 border-[#4F46E5] pl-2">
              <p className="text-[11px] font-medium text-indigo-400">{editingMsg ? 'Editing message' : `Replying to ${replyTo?.sender}`}</p>
              <p className="text-[12px] text-slate-300 truncate">{editingMsg ? editingMsg.text : replyTo?.text}</p>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMessage(''); }} className="text-slate-400 hover:text-slate-300">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Input area — single consolidated bar */}
        <div className="px-2 py-2 border-t border-slate-700 bg-slate-800">
          <div className="relative">
            <QuickReplies
              isOpen={showQuickReplies}
              onClose={() => setShowQuickReplies(false)}
              onSelect={(msg) => { setNewMessage(msg); setShowQuickReplies(false); }}
              inputValue={newMessage}
            />
          </div>

          {/* Translation info + Send As — compact single line */}
          {!activeConvo?.is_bot_chat && (
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] text-slate-400">
                {isFreePlan ? `${Math.max(0, 10 - translationsUsed)}/10 translations left` : 'Unlimited translations'}
                {' · Send as: '}
                <select
                  value={chatLang}
                  onChange={(e) => setChatLang(e.target.value)}
                  className="bg-transparent text-[11px] text-slate-300 font-medium border-none focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="en">EN</option><option value="ja">JA</option><option value="ur">UR</option>
                  <option value="ar">AR</option><option value="bn">BN</option><option value="pt">PT</option>
                  <option value="tl">TL</option><option value="vi">VI</option><option value="tr">TR</option>
                  <option value="zh">ZH</option><option value="fr">FR</option><option value="nl">NL</option>
                  <option value="es">ES</option><option value="ko">KO</option><option value="hi">HI</option>
                  <option value="th">TH</option><option value="id">ID</option>
                </select>
              </span>
              <span className="text-[10px] text-slate-500">AI translates automatically</span>
            </div>
          )}

          {/* Main input row: emoji + attach | input | mic/send */}
          <div className="flex items-end gap-1.5">
            {recording ? (
              <>
                {/* Recording indicator */}
                <div className="flex items-center gap-2 flex-1 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-[10px] px-3 py-2 min-h-[42px]">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#DC2626] animate-pulse shrink-0" />
                  <div className="flex-1 flex items-center gap-0.5">
                    {Array.from({ length: 16 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[#DC2626]/40"
                        style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-[#DC2626]">{formatDuration(recordingDuration)}</span>
                </div>
                {/* Cancel */}
                <button
                  onClick={cancelRecording}
                  className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-[10px] border border-slate-700 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                  title="Cancel"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* Stop & Send */}
                <button
                  onClick={stopRecording}
                  className="h-[42px] w-[42px] shrink-0 flex items-center justify-center bg-[#DC2626] text-white rounded-[10px] hover:bg-[#B91C1C] transition-colors"
                  title="Send voice note"
                >
                  <PocketSendIcon size={22} />
                </button>
              </>
            ) : (
              <>
                {/* Emoji button — emoji-mart picker */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="h-[42px] w-[42px] flex items-center justify-center rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                    title="Emoji"
                  >
                    <svg className="h-[20px] w-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </button>
                  {showEmoji && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                      <div className="absolute bottom-full mb-2 left-0 z-50">
                        <EmojiMartPicker
                          data={emojiData}
                          theme="dark"
                          onEmojiSelect={(emoji: { native: string }) => { setNewMessage(prev => prev + emoji.native); setShowEmoji(false); }}
                          previewPosition="none"
                          skinTonePosition="search"
                          set="native"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Left: Attachment button */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={uploading}
                    className="h-[42px] w-[36px] flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-40"
                    title="Attach"
                  >
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                  </button>
                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-full mb-2 left-0 z-50 w-44 rounded-xl border border-slate-700 bg-slate-800 shadow-lg py-1">
                        <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
                          Photo
                        </button>
                        <button onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                          Video
                        </button>
                        <button onClick={() => { docInputRef.current?.click(); setShowAttachMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                          Document
                        </button>
                        <button onClick={shareLocation} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                          Location
                        </button>
                        {activeConvo?.is_group && (
                          <button onClick={() => { setShowAttachMenu(false); setShowCreatePoll(true); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                            <span className="h-4 w-4 flex items-center justify-center text-[14px]">📊</span>
                            Poll
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* EvryAI button — Scan, Voice Translate, Business Card, Live Guide */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowAIMenu(!showAIMenu)}
                    className="flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity"
                    title="EvryAI"
                  >
                    <svg width="32" height="32" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="#4F46E5"/>
                      <path d="M9 18 L13 14 L17 18 L21 14 L25 18" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 24 L13 20 L17 24 L21 20 L25 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="30" cy="6" r="4.5" fill="#F59E0B"/>
                      <path d="M28.5 6 L30 4 L31.5 6 L30 8 Z" fill="white"/>
                    </svg>
                    <span className="text-xs font-semibold hidden sm:inline" style={{ fontFamily: 'Outfit' }}>
                      <span style={{ color: '#818CF8' }}>Evry</span>
                      <span style={{ color: '#F59E0B' }}>AI</span>
                    </span>
                  </button>
                  {showAIMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAIMenu(false)} />
                      <div className="absolute bottom-full mb-2 left-0 z-50 w-48 rounded-xl border border-slate-700 bg-slate-800 shadow-lg py-1">
                        <button onClick={() => { setShowAIMenu(false); setShowCameraTranslate(true); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                          Scan & Translate
                        </button>
                        <button onClick={() => { setShowAIMenu(false); setShowVoiceTranslator(true); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                          Voice Translate
                        </button>
                        <button onClick={async () => {
                          setShowAIMenu(false);
                          try {
                            const res = await fetch('/api/profile/me');
                            const d = await res.json();
                            if (!d.profile) { router.push('/profile/build'); return; }
                            const gp = d.profile;
                            const ti = d.tierInfo || {};
                            if (canShareBizCard(gp.tier || 'starter', gp.trust_score || 0, gp.is_published || false)) {
                              const cardData = { display_name: profile?.full_name || profile?.name || '', avatar_url: (profile as any).avatar_url || null, title: gp.title || '', company_name: organization?.name || '', tier: gp.tier, trust_score: gp.trust_score, services: gp.services || [], operating_corridors: gp.operating_corridors || [], badge_tier: gp.badge_tier || 'none', deals: 0, share_token: gp.share_token || '' };
                              const { data: cardRecord } = await supabase.from('business_cards').insert({ user_id: user.id, organization_id: organization.id, card_data: cardData }).select('id').single();
                              if (cardRecord && activeConvoId) {
                                await supabase.from('messages').insert({ conversation_id: activeConvoId, organization_id: organization.id, sender_type: 'owner', sender_name: profile?.full_name || profile?.name || 'You', message: JSON.stringify({ ...cardData, card_id: cardRecord.id }), message_type: 'business_card', original_text: `Business Card: ${cardData.display_name}`, original_language: profile?.language || 'en' });
                              }
                            } else {
                              setBizCardGateData({ trustScore: gp.trust_score || 0, tier: gp.tier || 'starter', isPublished: gp.is_published || false, nextActions: ti.nextActions || [], shareToken: gp.share_token || '' });
                              setShowBizCardGate(true);
                            }
                          } catch { /* ignore */ }
                        }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <span className="h-4 w-4 flex items-center justify-center text-[14px]">{'\u{1F4C7}'}</span>
                          Business Card
                        </button>
                        <button onClick={() => { setShowAIMenu(false); router.push('/chat/live-guide'); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Live Guide
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Quick reply trigger — desktop only */}
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className="hidden md:flex h-[42px] w-[36px] shrink-0 items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors"
                  title="Quick replies"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 21L14.9 3.5h2L9 21H7z"/></svg>
                </button>

                {/* Center: Message input */}
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.startsWith('/')) setShowQuickReplies(true);
                    else setShowQuickReplies(false);
                    broadcastTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setShowQuickReplies(false);
                      trySendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  maxLength={5000}
                  aria-label="Message input"
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  enterKeyHint="send"
                  inputMode="text"
                  data-form-type="other"
                  className="flex-1 min-w-0 bg-slate-700 rounded-[20px] px-3.5 py-2.5 text-[15px] text-white placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:bg-slate-800 chat-input-no-arrows"
                />

                {/* Right: Mic OR Send — mutually exclusive */}
                {newMessage.trim() ? (
                  <button
                    onClick={trySendMessage}
                    onContextMenu={(e) => { e.preventDefault(); setShowScheduleModal(true); }}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(30); setShowScheduleModal(true); }, 600);
                      const cleanup = () => { clearTimeout(timer); e.target.removeEventListener('touchend', cleanup); e.target.removeEventListener('touchmove', cleanup); };
                      e.target.addEventListener('touchend', cleanup, { once: true });
                      e.target.addEventListener('touchmove', cleanup, { once: true });
                    }}
                    disabled={sending}
                    className="shrink-0 evrywher-logo-glow disabled:opacity-60"
                    aria-label="Send (hold to schedule)"
                  >
                    <PocketChatMark size={36} />
                  </button>
                ) : (
                  <button
                    onMouseDown={startRecording}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    disabled={uploading}
                    className="h-[42px] w-[42px] shrink-0 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-40"
                    title="Hold to record"
                  >
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Render: Conversation List ---------- */

  const filters: { key: FilterType; label: string }[] = isPocketChatMode
    ? [{ key: 'all', label: 'All' }]
    : [
        { key: 'all', label: 'All' },
        { key: 'customer', label: 'Customers' },
        { key: 'supplier', label: 'Suppliers' },
        { key: 'invoice', label: 'Invoices' },
      ];

  return (
    <div className="chat-fullbleed h-[100dvh] lg:h-[calc(100vh-80px)] flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700">
        <div>
          <EvryWherMark size="md" />
          <p className="text-[13px] text-slate-500">Chat in 21 languages — AI translates in real-time</p>
        </div>
        {/* Desktop: inline buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <OutlinePillButton
            label="Invite"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
            color="#F59E0B"
            onClick={() => setShowInvite(true)}
          />
          <OutlinePillButton
            label="New chat"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            color="#4F46E5"
            onClick={() => { fetchContacts(); setShowNewChat(true); }}
          />
        </div>
      </div>
      {/* Mobile: action buttons row */}
      <div className="flex sm:hidden gap-2 px-4 py-2 border-b border-[var(--border)]">
        <button onClick={() => setShowInvite(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#F59E0B] py-2 text-[12px] font-medium text-amber-400">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Invite
        </button>
        <button onClick={() => { fetchContacts(); setShowNewChat(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#4F46E5] py-2 text-[12px] font-medium text-indigo-400">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat
        </button>
        <button onClick={() => { fetchContacts(); setShowGroupCreate(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#10B981] py-2 text-[12px] font-medium text-[#10B981]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Group
        </button>
      </div>

      {/* Folder tabs */}
      <div className="px-4 pt-2 pb-0 flex flex-nowrap gap-1.5 overflow-x-auto">
        {[
          { key: 'all', label: 'All' },
          { key: 'personal', label: 'Personal' },
          { key: 'work', label: 'Work' },
          { key: 'groups', label: 'Groups' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setChatFolder(f.key)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
              chatFolder === f.key
                ? 'bg-[#4F46E5] text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-2 pb-0 flex flex-nowrap gap-6 overflow-x-auto border-b border-slate-700">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm font-medium pb-2 whitespace-nowrap flex-shrink-0 transition-colors ${
              filter === f.key
                ? 'text-indigo-400 border-b-2 border-[#4F46E5]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
            {search || filter !== 'all' ? (
              <p className="text-sm text-slate-400">No conversations match your filter.</p>
            ) : (
              <>
                <PocketChatMark size={56} />
                <h3 className="mt-4 text-lg font-bold text-white">Start a conversation in any language</h3>
                <p className="text-sm text-slate-400 mt-2 text-center max-w-xs leading-relaxed">You type English. They read Japanese. Voice notes, photos, documents — all translated instantly.</p>
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">21 languages</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#fef3c7] text-[#92400e] font-medium">Real-time AI</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#f0fdf4] text-[#166534] font-medium">No app for clients</span>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => { const botConvo = conversations.find(c => c.is_bot_chat); if (botConvo) { setFilter('all'); setSearch(''); setActiveConvoId(botConvo.id); } }} className="rounded-lg bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white">Chat with AI</button>
                  <OutlinePillButton
                    label="New chat"
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                    color="#4F46E5"
                    onClick={() => { fetchContacts(); setShowNewChat(true); }}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          sortedConversations.map((convo) => {
            const name = convo.is_bot_chat ? botName : convo.is_group ? (convo.group_name || convo.title) : (convo.contact?.name ?? convo.title ?? 'Unknown');
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                onContextMenu={(e) => { e.preventDefault(); setConvoActionId(convo.id); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700 hover:shadow-sm transition-all border-b border-slate-700 text-left overflow-hidden ${convo.is_bot_chat ? 'border-l-2 border-l-[#F59E0B]' : ''}`}
              >
                {/* Avatar — 52px for visual weight */}
                {convo.is_bot_chat ? (
                  botConfig?.avatar_url ? (
                    <img src={botConfig.avatar_url} alt={botName} className="h-[52px] w-[52px] rounded-2xl object-cover shrink-0" />
                  ) : <AnimatedPocketChatLogo size={52} />
                ) : convo.is_group ? (
                  <div className="h-[52px] w-[52px] rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                ) : (
                  <PocketAvatar name={name} size={52} />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-[15px] text-white truncate ${convo.unread_count > 0 ? 'font-bold' : 'font-semibold'}`}>{name}</p>
                      {convo.is_pinned && <svg className="h-3 w-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>}
                      {convo.muted_until && new Date(convo.muted_until) > new Date() && <svg className="h-3 w-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51" /></svg>}
                      {convo.is_bot_chat && <span className="text-[12px] text-[#F43F5E] font-medium">AI Assistant</span>}
                      {convo.is_group && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#4F46E5]/10 text-indigo-400 font-medium">Group</span>}
                      {convo.label && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: convo.label_color || '#999' }} />}
                    </div>
                    {convo.last_message_at && (
                      <span className="text-xs text-amber-500 flex-shrink-0">
                        {timeAgo(convo.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[13px] text-slate-300 truncate">
                      {convo.last_message ?? 'No messages yet'}
                    </p>
                    {convo.unread_count > 0 && (
                      <span className="bg-[#DC2626] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 px-1">
                        {convo.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Conversation action menu (pin/archive) */}
      {convoActionId && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setConvoActionId(null)} />
          <div className="fixed z-50 bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl shadow-lg border-t border-slate-700 p-4 space-y-1 safe-bottom">
            <button onClick={() => handlePinConvo(convoActionId)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700">
              <svg className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
              {conversations.find(c => c.id === convoActionId)?.is_pinned ? 'Unpin' : 'Pin to top'}
            </button>
            <button onClick={() => handleMuteConvo(conversations.find(c => c.id === convoActionId)?.muted_until ? 'unmute' : '8h')} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700">
              <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
              {conversations.find(c => c.id === convoActionId)?.muted_until ? 'Unmute' : 'Mute (8h)'}
            </button>
            <button onClick={() => handleArchiveConvo(convoActionId)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700">
              <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
              Archive
            </button>
            <button onClick={() => setConvoActionId(null)} className="w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-700">
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMediaGallery(false)} />
          <div className="relative bg-slate-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Media, Links & Docs</h2>
              <button onClick={() => setShowMediaGallery(false)} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {/* Images */}
              {(() => {
                const images = messages.filter(m => m.message_type === 'image' && m.attachment_url);
                const docs = messages.filter(m => m.message_type === 'document' && m.attachment_url);
                const links = messages.filter(m => m.message_type === 'text' && /https?:\/\//.test(m.message));
                return (
                  <div className="space-y-4">
                    {images.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Media ({images.length})</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {images.map(m => (
                            <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-slate-700">
                              <img src={m.attachment_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {docs.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Documents ({docs.length})</p>
                        <div className="space-y-1">
                          {docs.map(m => (
                            <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-700">
                              <svg className="h-5 w-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                              <span className="text-sm text-slate-300 truncate">{m.message}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {links.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Links ({links.length})</p>
                        <div className="space-y-1">
                          {links.slice(0, 20).map(m => {
                            const url = m.message.match(/https?:\/\/[^\s]+/)?.[0];
                            return url ? (
                              <a key={m.id} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-700">
                                <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                                <span className="text-sm text-indigo-400 truncate">{url}</span>
                              </a>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {images.length === 0 && docs.length === 0 && links.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-8">No media, documents, or links shared yet</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowBroadcast(false); setBroadcastContacts([]); setBroadcastMsg(''); }} />
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Broadcast Message</h2>
              <button onClick={() => { setShowBroadcast(false); setBroadcastContacts([]); setBroadcastMsg(''); }} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type your broadcast message..." rows={3} maxLength={5000}
                className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] resize-none" />
              <p className="text-sm font-medium text-slate-300">Select recipients ({broadcastContacts.length})</p>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {contacts.map(c => {
                  const sel = broadcastContacts.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setBroadcastContacts(prev => sel ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${sel ? 'bg-[#4F46E5]/5 border border-[#4F46E5]/20' : 'hover:bg-slate-700 border border-transparent'}`}>
                      <PocketAvatar name={c.name} size={32} />
                      <span className="text-sm font-medium text-white flex-1 truncate">{c.name}</span>
                      {sel && <svg width="16" height="16" viewBox="0 0 24 24" fill="#4F46E5"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
                    </button>
                  );
                })}
              </div>
              <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || broadcastContacts.length === 0 || sending}
                className="w-full rounded-lg bg-[#F59E0B] py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#D97706] transition-colors">
                {sending ? 'Sending...' : `Broadcast to ${broadcastContacts.length} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Create Modal */}
      {showGroupCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowGroupCreate(false); setSelectedContacts([]); setGroupName(''); }} />
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">New Group</h2>
              <button onClick={() => { setShowGroupCreate(false); setSelectedContacts([]); setGroupName(''); }} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Group name</label>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Team Japan, Family" className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Select members ({selectedContacts.length} selected)</label>
                <div className="max-h-[240px] overflow-y-auto space-y-1">
                  {contacts.filter(c => !c.contact_type || c.contact_type !== 'accountant').map(c => {
                    const selected = selectedContacts.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => setSelectedContacts(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${selected ? 'bg-[#4F46E5]/5 border border-[#4F46E5]/20' : 'hover:bg-slate-700 border border-transparent'}`}>
                        <PocketAvatar name={c.name} size={36} />
                        <span className="text-sm font-medium text-white flex-1 truncate">{c.name}</span>
                        {selected && <svg width="18" height="18" viewBox="0 0 24 24" fill="#4F46E5"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={createGroupConversation} disabled={!groupName.trim() || selectedContacts.length < 2}
                className="w-full rounded-lg bg-[#4F46E5] py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#4338CA] transition-colors">
                Create Group ({selectedContacts.length} members)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfo && activeConvo?.is_group && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGroupInfo(false)} />
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Group Info</h2>
              <button onClick={() => setShowGroupInfo(false)} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Group avatar + name */}
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p className="text-lg font-bold text-white">{activeConvo.group_name || activeConvo.title}</p>
                <span className="text-xs text-slate-400">Group · Created {new Date(activeConvo.created_at).toLocaleDateString()}</span>
              </div>

              {/* Members */}
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-3">Members</p>
                <div className="space-y-2">
                  {/* Owner (you) */}
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800">
                    <PocketAvatar name={profile?.full_name || profile?.name || 'You'} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{profile?.full_name || profile?.name || 'You'}</p>
                      <p className="text-xs text-slate-400">You · {profile?.language || 'en'}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4F46E5]/10 text-indigo-400 font-medium">Creator</span>
                  </div>
                  {/* Contact members (from contacts in this org who were selected) */}
                  {contacts.filter(c => selectedContacts.includes(c.id) || true).slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-700">
                      <PocketAvatar name={c.name} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.language || 'en'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <button onClick={() => { fetchContacts(); setShowGroupInfo(false); setShowGroupCreate(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-400 hover:bg-[#4F46E5]/5 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  Add Member
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Leave this group?')) {
                      await supabase.from('conversations').delete().eq('id', activeConvo.id);
                      setConversations(prev => prev.filter(c => c.id !== activeConvo.id));
                      setActiveConvoId(null);
                      setShowGroupInfo(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Leave Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteModal isOpen={showInvite} onClose={() => setShowInvite(false)} />

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowNewChat(false);
              setContactSearch('');
            }}
          />
          {/* Modal */}
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setContactSearch('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New Group + Broadcast buttons */}
            <div className="px-4 pt-3 space-y-2">
              <button
                onClick={() => { setShowGroupCreate(true); setShowNewChat(false); fetchContacts(); }}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-indigo-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">New Group</p>
                  <p className="text-xs text-slate-400">Chat with multiple contacts</p>
                </div>
              </button>
              <button
                onClick={() => { setShowBroadcast(true); setShowNewChat(false); fetchContacts(); }}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-amber-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Broadcast</p>
                  <p className="text-xs text-slate-400">Send to many, delivered as 1:1</p>
                </div>
              </button>
            </div>

            {/* Contact search */}
            <div className="px-4 pb-2">
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                autoFocus
                className="w-full border border-slate-700 rounded-[10px] px-3.5 py-2.5 text-base text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No contacts found.</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => createConversation(contact)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    <PocketAvatar name={contact.name} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
                      <div className="flex items-center gap-2">
                        {contact.company && (
                          <p className="text-xs text-slate-300 truncate">{contact.company}</p>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
                          {contact.contact_type}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
