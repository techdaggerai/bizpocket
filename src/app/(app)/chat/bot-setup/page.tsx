'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { PocketChatMark } from '@/components/Logo';

const BOT_ICONS = [
  { id: 'professional', emoji: '👔', label: 'Professional' },
  { id: 'friendly', emoji: '😊', label: 'Friendly' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'crown', emoji: '👑', label: 'Royal' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'globe', emoji: '🌍', label: 'Global' },
];

const PERSONALITIES = [
  { id: 'professional', name: 'Professional', desc: 'Formal, business-appropriate responses', example: 'Thank you for reaching out. I will inform them of your message.' },
  { id: 'friendly', name: 'Friendly', desc: 'Warm, casual, approachable', example: 'Hey! Thanks for the message. I will let them know right away!' },
  { id: 'concise', name: 'Concise', desc: 'Short, direct, to the point', example: 'Noted. They will respond shortly.' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' }, { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' }, { code: 'ar', name: 'Arabic', flag: '🇦🇪' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' }, { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' }, { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' }, { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' }, { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ps', name: 'Pashto', flag: '🇦🇫' }, { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' }, { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' }, { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' }, { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
];

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' as const, fontFamily: 'inherit' };

export default function BotSetupPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState('');
  const [botIcon, setBotIcon] = useState('professional');
  const [botLang, setBotLang] = useState('en');
  const [personality, setPersonality] = useState('professional');
  const [greeting, setGreeting] = useState('');
  const [awayMessage, setAwayMessage] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [orgReady, setOrgReady] = useState(false);

  useEffect(() => {
    if (organization?.id) setOrgReady(true);
  }, [organization?.id]);

  // Load existing config for editing
  useEffect(() => {
    if (!organization?.id || loaded) return;
    (async () => {
      const { data } = await supabase
        .from('pocket_bot_config')
        .select('*')
        .eq('organization_id', organization.id)
        .single();
      if (data) {
        setBotName(data.bot_name || '');
        setBotIcon(data.bot_icon || 'professional');
        setBotLang(data.language || 'en');
        setPersonality(data.bot_personality || 'professional');
        setGreeting(data.greeting_message || '');
        setAwayMessage(data.away_message || '');
        const existingRules = (data.bot_rules || [])
          .filter((r: { active: boolean }) => r.active)
          .map((r: { trigger: string }) => r.trigger);
        if (existingRules.length > 0) setRules(existingRules);
      }
      setLoaded(true);
    })();
  }, [organization?.id, loaded, supabase]);

  const handleSave = async () => {
    alert('DEBUG: handleSave called. orgId=' + organization?.id + ' orgReady=' + orgReady + ' botName=' + botName); // TEMP DEBUG — remove after testing
    if (!botName.trim() || !organization?.id) return;
    setSaving(true);
    try {
      const botRules = rules.filter(r => r.trim()).map(r => ({ trigger: r, action: r, active: true }));
      const { error: upsertError } = await supabase.from('pocket_bot_config').upsert({
        organization_id: organization.id,
        bot_name: botName, bot_icon: botIcon, language: botLang, bot_personality: personality,
        greeting_message: greeting || `Hi! I'm ${botName}. How can I help you today?`,
        away_message: awayMessage || `Thanks for your message. I'll get back to you soon.`,
        auto_reply_enabled: true, bot_rules: botRules, is_setup_complete: true, response_style: personality,
      }, { onConflict: 'organization_id' });

      if (upsertError) throw upsertError;

      // Send re-introduction message in the bot conversation
      const { data: botConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_bot_chat', true)
        .single();

      if (botConvo) {
        const introMsg = `Hi! I'm ${botName} — your PocketChat assistant. I've been updated and I'm ready to help!`;
        await supabase.from('messages').insert({
          conversation_id: botConvo.id,
          organization_id: organization.id,
          sender_type: 'bot',
          sender_name: botName,
          message: introMsg,
          message_type: 'text',
        });
        await supabase.from('conversations').update({
          title: botName,
          last_message: introMsg,
          last_message_at: new Date().toISOString(),
        }).eq('id', botConvo.id);
      }

      // Pass new config directly to chat page via sessionStorage
      sessionStorage.setItem('bot_config_updated', JSON.stringify({
        bot_name: botName,
        bot_icon: botIcon,
        ts: Date.now(),
      }));
      router.push('/chat');
    } catch (err) {
      console.error('[BOT SETUP] Save failed:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto py-10 px-6">
      {/* Header */}
      <div className="flex justify-center mb-6"><PocketChatMark size={48} /></div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="h-2 rounded-full transition-all duration-300" style={{ width: s === step ? 24 : 8, background: s <= step ? '#4F46E5' : '#e5e7eb' }} />
        ))}
      </div>

      {/* STEP 1: Name & Icon */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-[#111827] text-center mb-2">Create your AI assistant</h2>
          <p className="text-sm text-[#6b7280] text-center mb-8">Your bot responds when you can&apos;t. In any language.</p>
          <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Give your bot a name</label>
          <input type="text" value={botName} onChange={e => setBotName(e.target.value)} placeholder="e.g. Bilal's Assistant, Sweet Cakes Bot" style={{ ...inputStyle, marginBottom: 20 }} />
          <label className="text-[13px] font-semibold text-[#374151] block mb-2.5">Choose an icon</label>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {BOT_ICONS.map(icon => (
              <button key={icon.id} onClick={() => setBotIcon(icon.id)}
                className={`py-3 px-2 rounded-[10px] text-center cursor-pointer ${botIcon === icon.id ? 'border-2 border-[#4F46E5] bg-[#eef2ff]' : 'border border-[#e5e7eb] bg-white'}`}>
                <span className="text-2xl block">{icon.emoji}</span>
                <span className="text-[11px] text-[#6b7280] mt-1 block">{icon.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => botName.trim() && setStep(2)} disabled={!botName.trim()}
            className={`w-full py-3 rounded-[10px] text-sm font-semibold text-white ${botName.trim() ? 'bg-[#4F46E5] cursor-pointer' : 'bg-[#d1d5db]'}`}>Next</button>
        </div>
      )}

      {/* STEP 2: Language & Personality */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-[#111827] text-center mb-2">How should {botName} speak?</h2>
          <p className="text-sm text-[#6b7280] text-center mb-8">Choose the default language and tone.</p>
          <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Bot&apos;s default language</label>
          <select value={botLang} onChange={e => setBotLang(e.target.value)} style={{ ...inputStyle, marginBottom: 20, background: 'white' }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </select>
          <label className="text-[13px] font-semibold text-[#374151] block mb-2.5">Personality</label>
          <div className="flex flex-col gap-2 mb-6">
            {PERSONALITIES.map(p => (
              <button key={p.id} onClick={() => setPersonality(p.id)}
                className={`p-3.5 rounded-xl text-left cursor-pointer ${personality === p.id ? 'border-2 border-[#4F46E5] bg-[#eef2ff]' : 'border border-[#e5e7eb] bg-white'}`}>
                <p className="text-sm font-semibold text-[#111827]">{p.name}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">{p.desc}</p>
                <p className="text-xs text-[#9ca3af] italic mt-1.5">&quot;{p.example}&quot;</p>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-[#374151] border border-[#e5e7eb] bg-white">Back</button>
            <button onClick={() => setStep(3)} className="flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white bg-[#4F46E5]">Next</button>
          </div>
        </div>
      )}

      {/* STEP 3: Greeting & Away Message */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-[#111827] text-center mb-2">What does {botName} say?</h2>
          <p className="text-sm text-[#6b7280] text-center mb-8">Set a greeting for new visitors and an away message.</p>
          <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Greeting message</label>
          <textarea value={greeting} onChange={e => setGreeting(e.target.value)} placeholder={`Hi! I'm ${botName}. How can I help you today?`} rows={3} style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }} />
          <label className="text-[13px] font-semibold text-[#374151] block mb-1.5">Away message</label>
          <textarea value={awayMessage} onChange={e => setAwayMessage(e.target.value)} placeholder="Thanks for your message! I'm currently away but will respond soon." rows={3} style={{ ...inputStyle, marginBottom: 24, resize: 'vertical' }} />
          <div className="flex gap-2.5">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-[#374151] border border-[#e5e7eb] bg-white">Back</button>
            <button onClick={() => setStep(4)} className="flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white bg-[#4F46E5]">Next</button>
          </div>
        </div>
      )}

      {/* STEP 4: Custom Rules */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-[#111827] text-center mb-2">Teach {botName} your rules</h2>
          <p className="text-sm text-[#6b7280] text-center mb-3">Write rules in plain language. Your bot follows them.</p>
          <div className="bg-[#fef3c7] rounded-[10px] px-3.5 py-2.5 mb-6">
            <p className="text-xs text-[#92400e] leading-relaxed">Examples: &quot;When I&apos;m praying, tell everyone I&apos;ll respond in 30 minutes&quot; &bull; &quot;When someone asks about prices, send my catalog link&quot; &bull; &quot;Between 10pm and 7am, say I&apos;m resting&quot;</p>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-[#9ca3af] font-semibold min-w-[20px]">{i + 1}.</span>
                <input type="text" value={rule} onChange={e => { const n = [...rules]; n[i] = e.target.value; setRules(n); }} placeholder="Write a rule in plain language..." className="flex-1 px-3 py-2.5 rounded-lg border border-[#e5e7eb] text-[13px]" />
                {rules.length > 1 && <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-[#ef4444] text-lg px-1">×</button>}
              </div>
            ))}
          </div>
          <button onClick={() => setRules([...rules, ''])} className="w-full py-2.5 rounded-lg bg-[#f9fafb] border border-dashed border-[#d1d5db] text-[13px] text-[#6b7280] mb-6">+ Add another rule</button>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-[#374151] border border-[#e5e7eb] bg-white">Back</button>
            <button onClick={handleSave} disabled={!orgReady || saving} className={`flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white ${!orgReady || saving ? 'bg-[#9ca3af]' : 'bg-[#4F46E5]'}`}>
              {!orgReady ? 'Loading...' : saving ? 'Creating...' : `Activate ${botName}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
