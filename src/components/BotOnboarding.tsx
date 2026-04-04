'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import { BOT_GRADIENTS, getBotGradient } from '@/lib/use-pocket-bot';

interface BotOnboardingProps {
  onComplete: (botName: string, botIcon: string) => void;
}

export default function BotOnboarding({ onComplete }: BotOnboardingProps) {
  const { organization, user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<'welcome' | 'name' | 'icon'>('welcome');
  const [botName, setBotName] = useState('Evrywher AI');
  const [botIcon, setBotIcon] = useState('1');
  const [saving, setSaving] = useState(false);

  const isPocketChatMode = organization?.signup_source === 'pocketchat' ||
    (typeof window !== 'undefined' && (window.location.hostname.includes('evrywher') || window.location.hostname.includes('evrywyre') || window.location.hostname.includes('pocketchat') || window.location.hostname.includes('evrywhere')));

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

  const selectedGradient = getBotGradient(botIcon);

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
            ? 'Your personal AI lives right here in Evrywher. It speaks every language, translates your conversations, and helps you connect with anyone worldwide.'
            : 'Your personal business AI lives right here in Evrywher. It knows your business, speaks your language, and helps you manage everything through conversation.'}
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
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full text-white text-3xl font-bold" style={{ background: `linear-gradient(135deg, ${selectedGradient.from}, ${selectedGradient.to})` }}>
          {(botName || 'P').charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">Name your assistant</h2>
        <p className="text-sm text-[var(--text-3)] max-w-sm mb-6">
          Give your AI a name. It&apos;ll appear as your first contact in Evrywher.
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
          Next — Choose a Color
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white text-3xl font-bold" style={{ background: `linear-gradient(135deg, ${selectedGradient.from}, ${selectedGradient.to})` }}>
        {botName.charAt(0).toUpperCase()}
      </div>
      <h2 className="text-xl font-bold text-[var(--text-1)] mb-1">{botName}</h2>
      <p className="text-sm text-[var(--text-3)] max-w-sm mb-6">Choose a color for your assistant</p>

      <div className="flex gap-3 mb-8">
        {BOT_GRADIENTS.map((g) => (
          <button
            key={g.id}
            onClick={() => setBotIcon(g.id)}
            className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-xl font-bold cursor-pointer transition-all ${
              botIcon === g.id
                ? 'ring-2 ring-[#4F46E5] ring-offset-2 scale-110'
                : 'hover:scale-105'
            }`}
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
          >
            {botName.charAt(0).toUpperCase()}
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
