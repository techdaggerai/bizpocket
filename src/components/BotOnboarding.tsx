'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';

const BOT_ICONS: { key: string; emoji: string; label: string }[] = [
  { key: 'rocket', emoji: '🚀', label: 'Rocket' },
  { key: 'brain', emoji: '🧠', label: 'Brain' },
  { key: 'star', emoji: '⭐', label: 'Star' },
  { key: 'bolt', emoji: '⚡', label: 'Bolt' },
  { key: 'shield', emoji: '🛡️', label: 'Shield' },
  { key: 'gem', emoji: '💎', label: 'Gem' },
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'crystal', emoji: '🔮', label: 'Crystal' },
];

interface BotOnboardingProps {
  onComplete: (botName: string, botIcon: string) => void;
}

export default function BotOnboarding({ onComplete }: BotOnboardingProps) {
  const { organization, user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<'welcome' | 'name' | 'icon'>('welcome');
  const [botName, setBotName] = useState('Pocket');
  const [botIcon, setBotIcon] = useState('rocket');
  const [saving, setSaving] = useState(false);

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('pocketchat'));

  async function handleFinish() {
    setSaving(true);

    // Save bot config
    const { error: configError } = await supabase
      .from('pocket_bot_config')
      .upsert({
        organization_id: organization.id,
        bot_name: botName,
        bot_icon: botIcon,
        is_setup_complete: true,
      }, { onConflict: 'organization_id' });

    if (configError) {
      console.error('Bot config error:', configError);
    }

    // Create bot conversation (check for existing first to prevent duplicates)
    const welcomeMsg = `Hi! I'm ${botName}, your AI business assistant. How can I help?`;

    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('is_bot_chat', true)
      .single();

    const botConvoId = existingConvo?.id;
    let newConvoId: string | null = null;

    if (!botConvoId) {
      const { data: convoData, error: convoError } = await supabase
        .from('conversations')
        .insert({
          organization_id: organization.id,
          title: botName,
          is_bot_chat: true,
          last_message: welcomeMsg,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (convoError) {
        console.error('Bot conversation error:', convoError);
      }
      newConvoId = convoData?.id ?? null;
    }

    // Insert greeting only if conversation has no messages yet
    const convoId = botConvoId || newConvoId;
    if (convoId) {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', convoId)
        .limit(1);

      if (!existingMessages?.length) {
        await supabase.from('messages').insert({
          conversation_id: convoId,
          organization_id: organization.id,
          sender_type: 'bot',
          sender_name: botName,
          message: welcomeMsg,
          message_type: 'text',
        });
      }
    }

    setSaving(false);
    onComplete(botName, botIcon);
  }

  const selectedIcon = BOT_ICONS.find(i => i.key === botIcon);

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        {isPocketChatMode ? (
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] shadow-lg">
            <AnimatedPocketChatLogo size={64} isTranslating={true} />
          </div>
        ) : (
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] shadow-lg">
            <span className="text-5xl">🚀</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-[var(--text-1)] mb-2">Meet your AI Assistant</h1>
        <p className="text-sm text-[var(--text-3)] max-w-sm mb-2">
          {isPocketChatMode
            ? 'Your personal AI lives right here in PocketChat. It speaks every language, translates your conversations, and helps you connect with anyone worldwide.'
            : 'Your personal business AI lives right here in PocketChat. It knows your business, speaks your language, and helps you manage everything through conversation.'}
        </p>
        <p className="text-xs text-[var(--text-4)] max-w-xs mb-8">
          {isPocketChatMode
            ? 'Voice calls, live translation, AI video guide — all by chatting with your assistant.'
            : 'Send invoices, translate documents, check finances — all by messaging your assistant.'}
        </p>
        <button
          onClick={() => setStep('name')}
          className="rounded-xl bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] hover:-translate-y-0.5"
        >
          Set Up My Assistant
        </button>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#4F46E5]/10">
          <span className="text-4xl">{selectedIcon?.emoji || '🚀'}</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">Name your assistant</h2>
        <p className="text-sm text-[var(--text-3)] max-w-sm mb-6">
          Give your AI a name. It&apos;ll appear as your first contact in PocketChat.
        </p>
        <input
          type="text"
          value={botName}
          onChange={(e) => setBotName(e.target.value)}
          placeholder="e.g., Pocket, Atlas, Jarvis"
          maxLength={20}
          className="w-full max-w-xs rounded-xl border-2 border-[#E5E5E5] bg-white px-4 py-3.5 text-center text-lg font-semibold text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none transition-colors"
        />
        <p className="text-[10px] text-[var(--text-4)] mt-2 mb-6">You can change this anytime in settings</p>
        <button
          onClick={() => setStep('icon')}
          disabled={!botName.trim()}
          className="rounded-xl bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
        >
          Next — Choose an Icon
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#4F46E5]/10">
        <span className="text-4xl">{selectedIcon?.emoji || '🚀'}</span>
      </div>
      <h2 className="text-xl font-bold text-[var(--text-1)] mb-1">{botName}</h2>
      <p className="text-sm text-[var(--text-3)] max-w-sm mb-6">Choose an icon for your assistant</p>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {BOT_ICONS.map((icon) => (
          <button
            key={icon.key}
            onClick={() => setBotIcon(icon.key)}
            className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
              botIcon === icon.key
                ? 'bg-[#4F46E5]/10 border-2 border-[#4F46E5] scale-105'
                : 'bg-[var(--bg-2)] border-2 border-transparent hover:bg-[#E5E5E5]'
            }`}
          >
            <span className="text-2xl">{icon.emoji}</span>
            <span className="text-[9px] text-[var(--text-3)]">{icon.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleFinish}
        disabled={saving}
        className="rounded-xl bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
      >
        {saving ? 'Creating...' : `Activate ${botName}`}
      </button>
    </div>
  );
}
