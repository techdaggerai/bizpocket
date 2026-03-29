'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

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
  contact?: Contact | null;
}

interface Message {
  id: string;
  conversation_id: string;
  organization_id: string;
  sender_type: 'owner' | 'customer';
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
  en: '🇺🇸', ja: '🇯🇵', ur: '🇵🇰', ar: '🇸🇦', tl: '🇵🇭', pt: '🇧🇷', bn: '🇧🇩',
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
  const { organization, profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

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
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConvoId) ?? null;

  /* ---------- Fetch conversations ---------- */

  const fetchConversations = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('organization_id', organization.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      toast('Failed to load conversations', 'error');
    } else {
      setConversations((data as Conversation[]) ?? []);
    }
    setLoading(false);
  }, [organization?.id]);

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
    fetchConversations();
  }, [fetchConversations]);

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
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;

          // If message is for active conversation, append it
          if (newMsg.conversation_id === activeConvoId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
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
    if (!newMessage.trim() || !activeConvoId || !organization?.id || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvoId,
      organization_id: organization.id,
      sender_type: 'owner',
      sender_name: profile?.name || 'You',
      message: text,
      message_type: 'text',
      original_text: text,
      original_language: chatLang,
    });

    if (error) {
      toast('Failed to send message', 'error');
      setNewMessage(text);
    } else {
      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq('id', activeConvoId);
    }
    setSending(false);
  }, [newMessage, activeConvoId, organization?.id, sending]);

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

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q);
  });

  /* ---------- Render: Active Conversation ---------- */

  if (activeConvoId && activeConvo) {
    const contactName = activeConvo.contact?.name ?? activeConvo.title ?? 'Chat';
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
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ backgroundColor: avatarColor(contactName) }}
          >
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0A0A0A] truncate">{contactName}</p>
            {contactType && (
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#F3F3F1] text-[#6B7280] capitalize">
                {contactType}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
          {messages.length === 0 && (
            <p className="text-center text-sm text-[#A3A3A3] mt-12">No messages yet. Say hello!</p>
          )}
          {messages.map((msg) => {
            const isOwner = msg.sender_type === 'owner';

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
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DC2626]/10">
                        <svg className="h-5 w-5 text-[#DC2626]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#0A0A0A] truncate">{msg.message}</p>
                        <p className="text-[10px] text-[#A3A3A3]">Tap to download</p>
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
            const origLang = msg.original_language;
            const hasTranslation = msg.translations && msg.translations[userLang];
            const showTranslated = hasTranslation && origLang !== userLang;
            const displayText = showTranslated && !showOriginal[msg.id]
              ? msg.translations![userLang]
              : msg.message;
            const langFlag = origLang ? LANG_FLAGS[origLang] || '' : '';

            return (
              <div key={msg.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isOwner ? 'ml-auto' : ''}`}>
                  {!isOwner && (
                    <p className="text-[10px] text-[#A3A3A3] mb-1 ml-1">{msg.sender_name}</p>
                  )}
                  <div
                    className={`rounded-[12px] px-3.5 py-2.5 ${
                      isOwner
                        ? 'bg-[#4F46E5] text-white'
                        : 'bg-[#F3F3F1] text-[#0A0A0A]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? 'justify-end mr-1' : 'ml-1'}`}>
                    {langFlag && <span className="text-[10px]">{langFlag}</span>}
                    {showTranslated && (
                      <button
                        onClick={() => setShowOriginal(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                        className={`text-[10px] ${isOwner ? 'text-[#A3A3A3]' : 'text-[#4F46E5]'} hover:opacity-70`}
                      >
                        {showOriginal[msg.id] ? 'Translated' : 'Original'}
                      </button>
                    )}
                    {!hasTranslation && origLang && origLang !== userLang && (
                      <button
                        onClick={() => translateMessage(msg.id, userLang)}
                        className={`text-[10px] ${isOwner ? 'text-[#A3A3A3]' : 'text-[#4F46E5]'} hover:opacity-70`}
                      >
                        Translate
                      </button>
                    )}
                    <span className="text-[10px] text-[#A3A3A3]">
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"
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

        {/* Input area */}
        <div className="p-3 border-t border-[#E5E5E5] bg-white">
          <div className="flex items-end gap-2">
            {/* Language selector */}
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
            </select>

            {/* Message input */}
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 border border-[#E5E5E5] rounded-[10px] px-3.5 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] resize-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
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
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
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
                  className="h-[42px] w-[42px] flex items-center justify-center bg-[#4F46E5] text-white rounded-[10px] hover:bg-[#4338CA] transition-colors disabled:opacity-40"
                  aria-label="Send"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
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
    { key: 'invoice', label: 'Invoice Threads' },
  ];

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#E5E5E5]">
        <h1 className="text-lg font-bold text-[#0A0A0A]">PocketChat</h1>
        <button
          onClick={() => {
            fetchContacts();
            setShowNewChat(true);
          }}
          className="bg-[#4F46E5] text-white text-xs font-semibold px-3 py-2 rounded-[10px] hover:bg-[#4338CA] transition-colors"
        >
          + New Chat
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-[#4F46E5] text-white'
                : 'bg-[#F3F3F1] text-[#6B7280] hover:bg-[#E5E5E5]'
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
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-[#A3A3A3]">
              {search || filter !== 'all' ? 'No conversations match your filter.' : 'No conversations yet. Start a new chat!'}
            </p>
          </div>
        ) : (
          filteredConversations.map((convo) => {
            const name = convo.contact?.name ?? convo.title ?? 'Unknown';
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F3F1] text-left"
              >
                {/* Avatar */}
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: avatarColor(name) }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{name}</p>
                    {convo.last_message_at && (
                      <span className="text-[10px] text-[#A3A3A3] flex-shrink-0">
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
