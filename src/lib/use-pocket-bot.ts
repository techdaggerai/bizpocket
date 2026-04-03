'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';

interface BotConfig {
  bot_name: string;
  bot_icon: string;
  bot_personality: string;
  is_setup_complete: boolean;
}

const BOT_ICON_MAP: Record<string, string> = {
  professional: '👔',
  friendly: '😊',
  robot: '🤖',
  star: '⭐',
  rocket: '🚀',
  crown: '👑',
  fire: '🔥',
  globe: '🌍',
  brain: '🧠',
  bolt: '⚡',
  shield: '🛡️',
  gem: '💎',
  crystal: '🔮',
};

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
      .select('bot_name, bot_icon, bot_personality, is_setup_complete, updated_at')
      .eq('organization_id', organization.id)
      .limit(1)
      .single();

    if (data) {
      setBotConfig(data as BotConfig);
    }
    setBotConfigLoaded(true);
    return data;
  }, [organization?.id]);

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
          sender_name: botConfig?.bot_name || 'Pocket',
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
          sender_name: botConfig?.bot_name || 'Pocket',
          message: errorMsg,
          message_type: 'text',
        });
        onBotReply(errorMsg);
      }

      setBotLoading(false);
    },
    [organization?.id, profile, botConfig]
  );

  const botEmoji = botConfig ? BOT_ICON_MAP[botConfig.bot_icon] || '🚀' : '🚀';
  const botName = botConfig?.bot_name || 'Pocket';
  const isSetupComplete = botConfig?.is_setup_complete ?? false;

  return {
    botConfig,
    botName,
    botEmoji,
    botLoading,
    botConfigLoaded,
    isSetupComplete,
    fetchBotConfig,
    sendBotMessage,
    updateBotLocally,
    BOT_ICON_MAP,
  };
}
