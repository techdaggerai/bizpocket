'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { getDisplayText } from '@/lib/translate';
import BotOnboarding from '@/components/BotOnboarding';
import InviteModal from '@/components/InviteModal';
import QuickReplies from '@/components/QuickReplies';
import ChatLabels from '@/components/ChatLabels';
import { usePocketBot } from '@/lib/use-pocket-bot';
import { PocketMark, PocketChatMark } from '@/components/Logo';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PocketChatTypingIndicator from '@/components/PocketChatTypingIndicator';
import PocketSendIcon from '@/components/PocketSendIcon';
import OutlinePillButton from '@/components/OutlinePillButton';

/* ---------- Types ---------- */

interface Contact {
  id: string;
  organization_id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
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
  original_text: string | null;
  original_language: string | null;
  translations: Record<string, string> | null;
  created_at: string;
}

const LANG_FLAGS: Record<string, string> = {
  en: '🇺🇸', ja: '🇯🇵', ur: '🇵🇰', ar: '🇦🇪', tl: '🇵🇭', pt: '🇧🇷', bn: '🇧🇩',
  vi: '🇻🇳', tr: '🇹🇷', zh: '🇨🇳', fr: '🇫🇷', nl: '🇳🇱', es: '🇪🇸',
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

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('pocketchat'));

  useEffect(() => { document.title = 'PocketChat'; }, []);

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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    botConfig, botName, botEmoji, botLoading,
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
      }

      // Mark messages as read
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
    } else {
      setMessages([]);
    }
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
          if (payload.eventType === 'UPDATE') {
            // Background translation completed — merge updated fields
            const updated = payload.new as Message;
            if (updated.conversation_id === activeConvoId) {
              setMessages((prev) =>
                prev.map((m) => m.id === updated.id ? { ...m, translations: updated.translations } : m)
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
      .subscribe();

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
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'bin';
    const isImage = file.type.startsWith('image/');
    const folder = isImage ? 'images' : 'documents';
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

    const msgType = isImage ? 'image' : 'document';
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
      }).select().single();

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
            body: JSON.stringify({ text, fromLanguage: senderLang, toLanguage: recipientLang }),
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

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.is_bot_chat && !b.is_bot_chat) return -1;
    if (!a.is_bot_chat && b.is_bot_chat) return 1;
    return 0;
  });

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q);
  });

  // Auto-create bot for PocketChat/Speko users — skip onboarding entirely
  useEffect(() => {
    if (!organization?.id || !isPocketChatMode || !botConfigLoaded || isSetupComplete) return;

    const autoCreateBot = async () => {
      const { data: existing } = await supabase
        .from('pocket_bot_config')
        .select('id')
        .eq('organization_id', organization.id)
        .single();

      if (existing) return;

      const botGreeting = "Hi! I'm your Speko assistant. I can help you communicate in 21 languages!";
      const { error } = await supabase
        .from('pocket_bot_config')
        .upsert({
          organization_id: organization.id,
          bot_name: 'Speko AI',
          bot_icon: 'gem',
          greeting_message: botGreeting,
          bot_personality: 'friendly',
          language: 'en',
          is_setup_complete: true,
          auto_reply_enabled: true,
        }, { onConflict: 'organization_id' });

      if (error) {
        console.error('[AUTO BOT] Failed to create config:', error);
        return;
      }

      // Create bot conversation (check first to avoid duplicates)
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_bot_chat', true)
        .single();

      if (!existingConvo) {
        const { data: newConvo } = await supabase
          .from('conversations')
          .insert({
            organization_id: organization.id,
            is_bot_chat: true,
            title: 'Speko AI',
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
            sender_name: 'Speko AI',
            message: botGreeting,
            message_type: 'text',
          });
        }
      }

      fetchBotConfig();
      fetchConversations();
    };

    autoCreateBot();
  }, [organization?.id, isPocketChatMode, botConfigLoaded, isSetupComplete]);

  // Show bot onboarding if not set up (BizPocket users only — PocketChat auto-creates above)
  if (botConfigLoaded && !isSetupComplete && !isPocketChatMode) {
    return (
      <div className="h-[calc(100vh-80px)] bg-white">
        <BotOnboarding
          onComplete={(name, icon) => {
            fetchBotConfig();
            fetchConversations();
          }}
        />
      </div>
    );
  }

  /* ---------- Render: Active Conversation ---------- */

  if (activeConvoId && activeConvo) {
    const contactName = activeConvo.is_bot_chat ? botName : (activeConvo.contact?.name ?? activeConvo.title ?? 'Chat');
    const contactType = activeConvo.contact?.contact_type;

    return (
      <div className="h-[calc(100vh-80px)] flex flex-col bg-white">
        {/* Header */}
        <div className="p-3 border-b border-[#E5E5E5] flex items-center gap-3">
          <button
            onClick={() => setActiveConvoId(null)}
            className="p-1 hover:bg-[#F3F3F1] rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {activeConvo.is_bot_chat ? (
            botConfig?.bot_icon ? (
              <div className="h-10 w-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-xl shrink-0">{botEmoji}</div>
            ) : isPocketChatMode ? <AnimatedPocketChatLogo size={40} /> : <PocketMark variant="xl" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: avatarColor(contactName) }}
            >
              {contactName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0A0A0A] truncate">{contactName}</p>
            <div className="flex items-center gap-1.5">
              {activeConvo.is_bot_chat ? (
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${isPocketChatMode ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#4F46E5]/10 text-[#4F46E5]'}`}>
                  AI Assistant
                </span>
              ) : contactType ? (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#F3F3F1] text-[#6B7280] capitalize">
                  {contactType}
                </span>
              ) : null}
              {activeConvo.label && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${activeConvo.label_color || '#999'}15`, color: activeConvo.label_color || '#999' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeConvo.label_color || '#999' }} />
                  {activeConvo.label}
                </span>
              )}
            </div>
            {!activeConvo.is_bot_chat && (
              <div className="flex items-center gap-2 mt-1">
                <AnimatedPocketChatLogo size={24} isTranslating={sending} />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#4F46E5]">{(profile?.language || 'en').toUpperCase()}</span>
                <span className="text-[11px] text-[#d1d5db]">⇄</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e]">{(activeConvo.contact?.language || 'ja').toUpperCase()}</span>
                <span className={`text-[11px] ${sending ? 'text-[#F59E0B]' : 'text-[#9ca3af]'}`}>{sending ? 'Translating...' : 'Auto-translating'}</span>
              </div>
            )}
          </div>
          {activeConvo.is_bot_chat ? (
            /* Bot chat: disabled phone + AI Guide pill */
            <>
              <button
                onClick={() => toast('Voice calls coming soon!', 'info')}
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[#D1D5DB] opacity-50 cursor-not-allowed"
                title="Voice calls coming soon"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/chat/live-guide')}
                className="flex items-center gap-1.5 rounded-[20px] px-3.5 py-[7px] text-[13px] font-medium text-[#F59E0B] shrink-0 transition-colors hover:bg-[#F59E0B] hover:text-white"
                style={{ border: '1.5px solid #F59E0B' }}
                title="AI Guide — point camera at any screen"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                AI Guide
              </button>
            </>
          ) : (
            /* Human contact: Phone + Video buttons */
            <>
              <button onClick={() => router.push(`/chat/call/${activeConvoId}`)} className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors" title="Voice call">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
              <button onClick={() => router.push(`/chat/call/${activeConvoId}?video=true`)} className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-colors" title="Video call">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>
            </>
          )}
          {/* Label button */}
          {!activeConvo.is_bot_chat && (
            <div className="relative">
              <button onClick={() => setShowLabels(!showLabels)} className="p-1.5 hover:bg-[#F3F3F1] rounded-lg transition-colors" title="Label">
                <svg className="h-5 w-5 text-[#A3A3A3] hover:text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
              </button>
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
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
          {messages.length === 0 && (
            <p className="text-center text-sm text-[#A3A3A3] mt-12">No messages yet. Say hello!</p>
          )}
          {messages.map((msg) => {
            const isOwner = msg.sender_type === 'owner';
            const isBot = msg.sender_type === 'bot';

            // Payment confirmed
            if (msg.message_type === 'payment_confirmed') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[#059669] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    Payment Confirmed ✓
                  </div>
                  <div className="text-[10px] text-[#A3A3A3] text-center mt-1">
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
                    {!isOwner && <p className="text-[10px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>}
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-[12px] overflow-hidden border border-[#E5E5E5]">
                      <img src={msg.attachment_url} alt={msg.message} className="max-h-[240px] w-full object-cover" loading="lazy" />
                    </a>
                    <p className={`text-[10px] text-[#A3A3A3] mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
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
                    {!isOwner && <p className="text-[10px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>}
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white px-3.5 py-2.5 hover:bg-[#F9F9F8] transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${iconBg}15` }}>
                        <svg className="h-5 w-5" style={{ color: iconColor }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">{fileName}</p>
                        <p className="text-[10px] text-[#A3A3A3]">{ext.toUpperCase()} — Tap to download</p>
                      </div>
                    </a>
                    <p className={`text-[10px] text-[#A3A3A3] mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
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
                    {!isOwner && <p className="text-[10px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>}
                    <div
                      className={`rounded-[12px] px-3.5 py-2.5 ${
                        isOwner ? 'bg-[#4F46E5]' : 'bg-[#F3F3F1]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            const audio = new Audio(msg.attachment_url!);
                            audio.play();
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            isOwner ? 'bg-white/20 text-white' : 'bg-[#4F46E5]/10 text-[#4F46E5]'
                          }`}
                        >
                          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <div className={`h-1 rounded-full ${isOwner ? 'bg-white/30' : 'bg-[#0A0A0A]/10'}`}>
                            <div className={`h-full w-1/3 rounded-full ${isOwner ? 'bg-white' : 'bg-[#4F46E5]'}`} />
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono ${isOwner ? 'text-white/70' : 'text-[#A3A3A3]'}`}>
                          {msg.message.match(/\d+:\d+/)?.[0] || '0:00'}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? 'justify-end mr-1' : 'ml-1'}`}>
                      {langFlag && <span className="text-[10px]">{langFlag}</span>}
                      <span className="text-[10px] text-[#A3A3A3]">{formatTimestamp(msg.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
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
                      <p className="text-[10px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>
                    )}
                    <div className="bg-white border border-[#E5E5E5] rounded-[12px] px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#4F46E5" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-[#4F46E5]">Invoice</span>
                      </div>
                      {invoiceData && (
                        <>
                          <p className="text-sm font-semibold text-[#0A0A0A]">
                            {invoiceData.invoice_number ?? 'Invoice'}
                          </p>
                          <p className="text-sm font-bold text-[#0A0A0A] font-mono">
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
                    <p className={`text-[10px] text-[#A3A3A3] mt-1 ${isOwner ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTimestamp(msg.created_at)}
                    </p>
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
              <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'} ${isBot ? 'gap-2' : ''}`}>
                {isBot && (
                  <div className="h-8 w-8 shrink-0 flex items-center justify-center">
                    {botConfig?.bot_icon ? (
                      <span className="text-lg">{botEmoji}</span>
                    ) : isPocketChatMode ? <AnimatedPocketChatLogo size={32} /> : <PocketMark variant="xl" />}
                  </div>
                )}
                <div className={`max-w-[80%] ${isOwner ? 'ml-auto' : ''}`}>
                  {!isOwner && !isBot && (
                    <p className="text-[12px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>
                  )}
                  {isBot && (
                    <p className="text-[15px] text-[#F59E0B] mb-1 ml-1 font-semibold">{botName}</p>
                  )}
                  <div
                    className={`rounded-[12px] px-3.5 py-2.5 ${
                      isOwner
                        ? 'bg-[#4F46E5] text-white'
                        : isBot
                          ? 'bg-[#F59E0B]/5 text-[#0A0A0A] border border-[#F59E0B]/10'
                          : 'bg-[#F3F3F1] text-[#0A0A0A]'
                    }`}
                  >
                    <p className="text-[15px] whitespace-pre-wrap break-words" style={/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(displayText) ? { direction: 'rtl', textAlign: 'right', fontFamily: "'Noto Sans Arabic', 'Noto Sans', sans-serif" } : undefined}>{displayText}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? 'justify-end mr-1' : 'ml-1'}`}>
                    {showTranslated && (
                      <button
                        onClick={() => setShowOriginal(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                        className={`text-[11px] flex items-center gap-1 ${isOwner ? 'text-white/50' : 'text-[#F59E0B]'} hover:opacity-70`}
                      >
                        {langFlag && <span>{langFlag}</span>}
                        {showOriginal[msg.id] ? 'See translation' : 'Translated · tap for original'}
                      </button>
                    )}
                    {!showTranslated && langFlag && <span className="text-[11px]">{langFlag}</span>}
                    {!hasTranslation && origLang && origLang !== userLang && (
                      <button
                        onClick={() => translateMessage(msg.id, userLang)}
                        className={`text-[11px] ${isOwner ? 'text-[#A3A3A3]' : 'text-[#4F46E5]'} hover:opacity-70`}
                      >
                        Translate
                      </button>
                    )}
                    <span className="text-[11px] text-[#A3A3A3]">
                      {formatTimestamp(msg.created_at)}
                    </span>
                    {isOwner && (
                      <span className="inline-flex ml-0.5">
                        {msg.read_at ? (
                          <svg className="h-3 w-3 text-[#4F46E5]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 7l-1.41-1.41L10 12.17l-3.59-3.58L5 10l5 5L18 7zm-2.41-1.41L9 12.17l-1.59-1.58L6 12l3 3 8-8-1.41-1.41z"/>
                          </svg>
                        ) : (
                          <svg className="h-3 w-3 text-[#CCC]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        )}
                      </span>
                    )}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Upload progress */}
        {uploading && (
          <div className="px-4 py-2 border-t border-[#E5E5E5] bg-[#F9F9F8]">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-[#E5E5E5] overflow-hidden">
                <div className="h-full bg-[#4F46E5] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <span className="text-[10px] text-[#A3A3A3]">Uploading...</span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-t border-[#F0F0F0]">
          <button className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#999]" title="Emoji">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#999]" title="Attach file">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <button className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#999]" title="Photo">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </button>
          <button onClick={startRecording} className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#999]" title="Voice note">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          </button>
          <div className="flex-1" />
          <span className="text-[9px] text-[#CCC]">AI translates automatically</span>
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-[#E5E5E5] bg-white">
          <div className="relative">
            <QuickReplies
              isOpen={showQuickReplies}
              onClose={() => setShowQuickReplies(false)}
              onSelect={(msg) => { setNewMessage(msg); setShowQuickReplies(false); }}
              inputValue={newMessage}
            />
          </div>
          <div className="flex items-end gap-2">
            {/* Language selector — translate outgoing */}
            {!activeConvo?.is_bot_chat && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[8px] text-[#999] font-medium">SEND AS</span>
                <select
                  value={chatLang}
                  onChange={(e) => setChatLang(e.target.value)}
                  className="h-[42px] rounded-[10px] border border-[#E5E5E5] bg-white px-2 text-xs text-[var(--text-2)] focus:border-[#4F46E5] focus:outline-none appearance-none"
                  title="Message language"
                >
                  <option value="en">🇬🇧</option>
                  <option value="ja">🇯🇵</option>
                  <option value="ur">🇵🇰</option>
                  <option value="ar">🇦🇪</option>
                  <option value="bn">🇧🇩</option>
                  <option value="pt">🇧🇷</option>
                  <option value="tl">🇵🇭</option>
                  <option value="vi">🇻🇳</option>
                  <option value="tr">🇹🇷</option>
                  <option value="zh">🇨🇳</option>
                  <option value="fr">🇫🇷</option>
                  <option value="nl">🇳🇱</option>
                  <option value="es">🇪🇸</option>
                  <option value="ps">🇦🇫</option>
                  <option value="fa">🇮🇷</option>
                  <option value="hi">🇮🇳</option>
                  <option value="ko">🇰🇷</option>
                  <option value="th">🇹🇭</option>
                  <option value="id">🇮🇩</option>
                  <option value="ne">🇳🇵</option>
                  <option value="si">🇱🇰</option>
                </select>
              </div>
            )}

            {/* Quick reply trigger */}
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="h-[42px] w-[42px] flex items-center justify-center rounded-[10px] border border-[#E5E5E5] text-[#A3A3A3] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors"
              title="Quick replies"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 21L14.9 3.5h2L9 21H7z"/></svg>
            </button>

            {/* Message input */}
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
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-white border border-[#D1D5DB] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
            />

            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-[42px] w-[42px] flex items-center justify-center rounded-[10px] border border-[#E5E5E5] text-[#A3A3A3] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors disabled:opacity-40"
              title="Attach file"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>

            {/* Voice / Send toggle */}
            {recording ? (
              <>
                {/* Recording indicator */}
                <div className="flex items-center gap-2 flex-1 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-[10px] px-3 py-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#DC2626] animate-pulse" />
                  <div className="flex-1 flex items-center gap-0.5">
                    {Array.from({ length: 20 }, (_, i) => (
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
                  className="h-[42px] w-[42px] flex items-center justify-center rounded-[10px] border border-[#E5E5E5] text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                  title="Cancel"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* Stop & Send */}
                <button
                  onClick={stopRecording}
                  className="h-[42px] w-[42px] flex items-center justify-center bg-[#DC2626] text-white rounded-[10px] hover:bg-[#B91C1C] transition-colors"
                  title="Send voice note"
                >
                  <PocketSendIcon size={22} />
                </button>
              </>
            ) : (
              <>
                {/* Mic button */}
                <button
                  onMouseDown={startRecording}
                  onTouchStart={startRecording}
                  disabled={uploading}
                  className="h-[42px] w-[42px] flex items-center justify-center rounded-[10px] border border-[#E5E5E5] text-[#A3A3A3] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-colors disabled:opacity-40"
                  title="Hold to record"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>

                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="h-[42px] w-[42px] flex items-center justify-center bg-[#4F46E5] text-white rounded-[10px] hover:bg-[#4338CA] transition-colors disabled:bg-[#4F46E5]/60 disabled:text-white/80"
                  aria-label="Send"
                >
                  <PocketSendIcon size={22} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Render: Conversation List ---------- */

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customers' },
    { key: 'supplier', label: 'Suppliers' },
    { key: 'invoice', label: 'Invoices' },
  ];

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-bold text-[#0A0A0A]">PocketChat</h1>
          <p className="text-xs text-[#999]">Chat in 21 languages — AI translates in real-time</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-0 flex flex-nowrap gap-6 overflow-x-auto border-b border-[#F0F0F0]">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm font-medium pb-2 whitespace-nowrap flex-shrink-0 transition-colors ${
              filter === f.key
                ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]'
                : 'text-[#6B7280] hover:text-[#0A0A0A]'
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
          className="w-full border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
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
              <p className="text-sm text-[#A3A3A3]">No conversations match your filter.</p>
            ) : (
              <>
                <PocketChatMark size={56} />
                <h3 className="mt-4 text-lg font-bold text-[#111827]">Start a conversation in any language</h3>
                <p className="text-sm text-[#6b7280] mt-2 text-center max-w-xs leading-relaxed">You type English. They read Japanese. Voice notes, photos, documents — all translated instantly.</p>
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#eef2ff] text-[#4F46E5] font-medium">21 languages</span>
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
            const name = convo.is_bot_chat ? botName : (convo.contact?.name ?? convo.title ?? 'Unknown');
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] hover:shadow-sm transition-all border-b border-[#F3F3F1] text-left ${convo.is_bot_chat ? 'border-l-2 border-l-[#F59E0B]' : ''}`}
              >
                {/* Avatar */}
                {convo.is_bot_chat ? (
                  botConfig?.bot_icon ? (
                    <div className="h-10 w-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-xl shrink-0">{botEmoji}</div>
                  ) : isPocketChatMode ? <AnimatedPocketChatLogo size={40} /> : <PocketMark variant="xl" />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: avatarColor(name) }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{name}</p>
                      {convo.is_bot_chat && <span className="text-[12px] text-[#F59E0B] font-medium">AI Assistant</span>}
                      {convo.label && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: convo.label_color || '#999' }} />}
                    </div>
                    {convo.last_message_at && (
                      <span className="text-xs text-amber-500 flex-shrink-0">
                        {timeAgo(convo.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[#6B7280] truncate">
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
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0A0A0A]">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setContactSearch('');
                }}
                className="text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contact search */}
            <div className="p-4">
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                autoFocus
                className="w-full border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-sm text-[#A3A3A3] py-8">No contacts found.</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => createConversation(contact)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#F9FAFB] rounded-lg transition-colors text-left"
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: avatarColor(contact.name) }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">{contact.name}</p>
                      <div className="flex items-center gap-2">
                        {contact.company && (
                          <p className="text-xs text-[#6B7280] truncate">{contact.company}</p>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F3F1] text-[#6B7280] capitalize">
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
