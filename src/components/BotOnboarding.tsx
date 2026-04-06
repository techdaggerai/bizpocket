'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { getBrandModeClient } from '@/lib/brand';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';


interface BotOnboardingProps {
  onComplete: (botName: string, botIcon: string) => void;
}

export default function BotOnboarding({ onComplete }: BotOnboardingProps) {
  const { organization, user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<'welcome' | 'name'>('welcome');
  const [botName, setBotName] = useState('Evrywher AI');
  const [botIcon] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';

  async function handleFinish() {
    if (!organization?.id) {
      setError('Organization not loaded. Please refresh and try again.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      // Try upsert (most DBs support this)
      const { error: upsertErr } = await supabase
        .from('pocket_bot_config')
        .upsert({
          organization_id: organization.id,
          bot_name: botName,
          bot_icon: botIcon,
          is_setup_complete: true,
        }, { onConflict: 'organization_id' });

      if (upsertErr) {
        console.error('Bot config upsert failed:', upsertErr);
        // Fallback: try update then insert
        const { error: updateErr } = await supabase
          .from('pocket_bot_config')
          .update({ bot_name: botName, bot_icon: botIcon, is_setup_complete: true })
          .eq('organization_id', organization.id);

        if (updateErr) {
          const { error: insertErr } = await supabase
            .from('pocket_bot_config')
            .insert({ organization_id: organization.id, bot_name: botName, bot_icon: botIcon, is_setup_complete: true });
          if (insertErr) console.error('Bot config insert failed:', insertErr);
        }
      }

      // Create bot conversation
      const welcomeMsg = `Hi! I'm ${botName}, your AI business assistant. How can I help?`;

      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_bot_chat', true)
        .maybeSingle();

      let convoId = existingConvo?.id;

      if (!convoId) {
        const { data: newConvo } = await supabase
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
        convoId = newConvo?.id;
      }

      if (convoId) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', convoId)
          .limit(1);

        if (!msgs?.length) {
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
    } catch (e) {
      console.error('Bot activation error:', e);
    }

    // ALWAYS call onComplete — even if DB writes failed.
    // The chat page will re-check and show the bot regardless.
    setSaving(false);
    onComplete(botName, botIcon);
  }

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
        <div className="mb-6">
          <AnimatedPocketChatLogo size={80} isTranslating={true} />
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
          spellCheck={false}
          autoComplete="off"
          className="w-full max-w-xs rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3.5 text-center text-lg font-semibold text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-indigo-500 focus:outline-none transition-colors"
        />
        <p className="text-[10px] text-[var(--text-4)] mt-2 mb-6">You can change this anytime in settings</p>
        <button
          onClick={handleFinish}
          disabled={saving || !botName.trim()}
          className="rounded-xl bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
        >
          {saving ? 'Creating...' : `Activate ${botName}`}
        </button>
      </div>
    );
  }
}
