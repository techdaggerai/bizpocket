'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { getBrandModeClient } from '@/lib/brand';

interface BotConfig {
  bot_name: string;
  bot_icon: string;
  bot_personality: string;
  is_setup_complete: boolean;
  avatar_url?: string | null;
}

export const BOT_GRADIENTS = [
  { id: '1', from: '#4F46E5', to: '#7C3AED', label: 'Indigo' },
  { id: '2', from: '#F59E0B', to: '#EA580C', label: 'Amber' },
  { id: '3', from: '#10B981', to: '#14B8A6', label: 'Emerald' },
  { id: '4', from: '#F43F5E', to: '#EC4899', label: 'Rose' },
  { id: '5', from: '#3B82F6', to: '#06B6D4', label: 'Blue' },
  { id: '6', from: '#475569', to: '#64748B', label: 'Slate' },
];

export function getBotGradient(iconId: string) {
  return BOT_GRADIENTS.find(g => g.id === iconId) || BOT_GRADIENTS[0];
}

export function usePocketBot() {
  const { organization, profile } = useAuth();
  const supabaseRef = useRef(createClient());
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [botConfigLoaded, setBotConfigLoaded] = useState(false);
  const fetchCountRef = useRef(0);

  const fetchBotConfig = useCallback(async () => {
    if (!organization?.id) return null;
    fetchCountRef.current += 1;
    const { data } = await supabaseRef.current
      .from('pocket_bot_config')
      .select('bot_name, bot_icon, bot_personality, is_setup_complete, avatar_url, updated_at')
      .eq('organization_id', organization.id)
      .limit(1)
      .single();

    if (data) {
      setBotConfig(data as BotConfig);
    }
    setBotConfigLoaded(true);
    return data;
  }, [organization?.id]);

  // Reset when org changes so a fresh fetch is triggered
  useEffect(() => {
    setBotConfig(null);
    setBotConfigLoaded(false);
  }, [organization?.id]);

  // Auto-fetch bot config on mount / org change so it survives page refresh
  useEffect(() => {
    if (organization?.id && !botConfigLoaded) {
      fetchBotConfig();
    }
  }, [organization?.id, botConfigLoaded, fetchBotConfig]);

  const updateBotLocally = useCallback((name: string, icon: string) => {
    setBotConfig(prev => prev ? { ...prev, bot_name: name, bot_icon: icon } : { bot_name: name, bot_icon: icon, bot_personality: 'professional', is_setup_complete: true });
  }, []);

  const sendBotMessage = useCallback(
    async (
      message: string,
      conversationId: string,
      onBotReply: (reply: string) => void
    ) => {
      if (!organization?.id) return;
      setBotLoading(true);

      // Save user message
      await supabaseRef.current.from('messages').insert({
        conversation_id: conversationId,
        organization_id: organization.id,
        sender_type: 'owner',
        sender_name: profile?.full_name || profile?.name || 'You',
        message,
        message_type: 'text',
        original_language: profile?.language || 'en',
      });

      // Update conversation
      await supabaseRef.current
        .from('conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Call bot API
      try {
        const res = await fetch('/api/chat/bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            conversationId,
            organizationId: organization.id,
            language: profile?.language || 'en',
          }),
        });

        const data = await res.json();
        const botReply = data.message || 'I could not process that. Try again?';

        // Save bot reply
        await supabaseRef.current.from('messages').insert({
          conversation_id: conversationId,
          organization_id: organization.id,
          sender_type: 'bot',
          sender_name: botConfig?.bot_name || 'Evrywher AI',
          message: botReply,
          message_type: 'text',
        });

        // Update conversation
        await supabaseRef.current
          .from('conversations')
          .update({
            last_message: botReply,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        onBotReply(botReply);
      } catch {
        const errorMsg = 'Sorry, I had trouble responding. Please try again.';
        await supabaseRef.current.from('messages').insert({
          conversation_id: conversationId,
          organization_id: organization.id,
          sender_type: 'bot',
          sender_name: botConfig?.bot_name || 'Evrywher AI',
          message: errorMsg,
          message_type: 'text',
        });
        onBotReply(errorMsg);
      }

      setBotLoading(false);
    },
    [organization?.id, profile, botConfig]
  );

  const botGradient = getBotGradient(botConfig?.bot_icon || '1');
  const botName = botConfig?.bot_name || 'Evrywher AI';

  // Evrywher users: if botConfig exists, treat as setup complete regardless of DB value
  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';
  const isSetupComplete = (isPocketChatMode && botConfig) ? true : (botConfig?.is_setup_complete ?? false);

  return {
    botConfig,
    botName,
    botGradient,
    botLoading,
    botConfigLoaded,
    isSetupComplete,
    fetchBotConfig,
    sendBotMessage,
    updateBotLocally,
    BOT_GRADIENTS,
  };
}
