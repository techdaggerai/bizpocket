'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { PocketChatMark } from '@/components/Logo';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PageHeader from '@/components/PageHeader';

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

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #475569', fontSize: 16, boxSizing: 'border-box' as const, fontFamily: 'inherit', backgroundColor: '#1E293B', color: '#F1F5F9' };

export default function BotSetupPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState('');
  const [botIcon, setBotIcon] = useState('1');
  const [botLang, setBotLang] = useState('en');
  const [personality, setPersonality] = useState('professional');
  const [greeting, setGreeting] = useState('');
  const [awayMessage, setAwayMessage] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [orgReady, setOrgReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalBotName, setOriginalBotName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
        setOriginalBotName(data.bot_name || '');
        setBotIcon(data.bot_icon || '1');
        setBotLang(data.language || 'en');
        setPersonality(data.bot_personality || 'professional');
        setGreeting(data.greeting_message || '');
        setAwayMessage(data.away_message || '');
        const existingRules = (data.bot_rules || [])
          .filter((r: { active: boolean }) => r.active)
          .map((r: { trigger: string }) => r.trigger);
        if (existingRules.length > 0) setRules(existingRules);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        setIsEditMode(true);
      }
      setLoaded(true);
    })();
  }, [organization?.id, loaded, supabase]);

  const handleSave = async () => {
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
        ...(avatarUrl !== null && { avatar_url: avatarUrl }),
      }, { onConflict: 'organization_id' });

      if (upsertError) throw upsertError;

      // Send re-introduction message ONLY if bot name changed
      const nameChanged = botName.trim() !== originalBotName.trim();

      const { data: botConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_bot_chat', true)
        .single();

      if (botConvo && nameChanged) {
        const introMsg = `Hi! I'm ${botName} — your Evrywher assistant. I've been updated and I'm ready to help!`;
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
      } else if (botConvo) {
        // Name didn't change, just update conversation title silently
        await supabase.from('conversations').update({
          title: botName,
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${organization.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('bot-avatars').upload(path, file, { upsert: true });
    if (error) {
      console.error('[AVATAR] Upload failed:', error);
      alert('Upload failed. Try again.');
      setAvatarPreview(null);
    } else {
      const { data: urlData } = supabase.storage.from('bot-avatars').getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
    }
    setUploading(false);
  };

  const displayAvatar = avatarPreview || avatarUrl;
  // EDIT MODE: single page with all fields
  if (isEditMode && loaded) {
    return (
      <div className="max-w-[560px] mx-auto">
        <PageHeader title="Bot Setup" backPath="/chat" />
        <div className="px-6 pt-6">
        <div className="flex justify-center mb-6"><PocketChatMark size={48} /></div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Edit {botName || 'your assistant'}</h2>
        <p className="text-sm text-slate-200 text-center mb-8">Update your bot&apos;s settings.</p>

        <label className="text-sm font-medium text-slate-200 block mb-1.5">Bot name</label>
        <input type="text" value={botName} onChange={e => setBotName(e.target.value)} placeholder="e.g. Bilal's Assistant" spellCheck={false} autoComplete="off" style={{ ...inputStyle, marginBottom: 20 }} />

        <label className="text-sm font-medium text-slate-200 block mb-2.5">Avatar</label>
        <div className="flex flex-col items-center gap-3 mb-6">
          <label className="relative cursor-pointer group">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Bot avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <AnimatedPocketChatLogo size={80} isTranslating={true} />
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
          {uploading && <p className="text-xs text-slate-400">Uploading...</p>}
          <p className="text-xs text-slate-300">Tap to upload custom photo</p>
        </div>

        <label className="text-sm font-medium text-slate-200 block mb-1.5">Language</label>
        <select value={botLang} onChange={e => setBotLang(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
        </select>

        <label className="text-sm font-medium text-slate-200 block mb-2.5">Personality</label>
        <div className="flex flex-col gap-2 mb-6">
          {PERSONALITIES.map(p => (
            <button key={p.id} onClick={() => setPersonality(p.id)}
              className={`p-3.5 rounded-xl text-left cursor-pointer ${personality === p.id ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/10' : 'border border-slate-700 bg-slate-800'}`}>
              <p className="text-sm font-semibold text-white">{p.name}</p>
              <p className="text-xs text-slate-200 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>

        <label className="text-sm font-medium text-slate-200 block mb-1.5">Greeting message</label>
        <textarea value={greeting} onChange={e => setGreeting(e.target.value)} placeholder={`Hi! I'm ${botName}. How can I help you today?`} rows={3} style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }} />

        <label className="text-sm font-medium text-slate-200 block mb-1.5">Away message</label>
        <textarea value={awayMessage} onChange={e => setAwayMessage(e.target.value)} placeholder="Thanks for your message! I'm currently away but will respond soon." rows={3} style={{ ...inputStyle, marginBottom: 24, resize: 'vertical' }} />

        <div className="flex gap-2.5">
          <button onClick={() => router.push('/chat')} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-800">Cancel</button>
          <button onClick={handleSave} disabled={!orgReady || saving || !botName.trim()} className={`flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white ${!orgReady || saving || !botName.trim() ? 'bg-[#9ca3af]' : 'bg-[#4F46E5]'}`}>
            {!orgReady ? 'Loading...' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <PageHeader title="Bot Setup" backPath="/chat" />
      <div className="px-6 pt-6">
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
          <h2 className="text-2xl font-bold text-white text-center mb-2">Create your AI assistant</h2>
          <p className="text-sm text-slate-200 text-center mb-8">Your bot responds when you can&apos;t. In any language.</p>
          <label className="text-sm font-medium text-slate-200 block mb-1.5">Give your bot a name</label>
          <input type="text" value={botName} onChange={e => setBotName(e.target.value)} placeholder="e.g. Bilal's Assistant, Sweet Cakes Bot" spellCheck={false} autoComplete="off" style={{ ...inputStyle, marginBottom: 20 }} />
          <label className="text-sm font-medium text-slate-200 block mb-2.5">Avatar</label>
          <div className="flex flex-col items-center gap-3 mb-6">
            <label className="relative cursor-pointer group">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Bot avatar" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <AnimatedPocketChatLogo size={64} isTranslating={true} />
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            {uploading && <p className="text-xs text-slate-400">Uploading...</p>}
            <p className="text-xs text-slate-300">Upload custom photo</p>
          </div>
          <button onClick={() => botName.trim() && setStep(2)} disabled={!botName.trim()}
            className={`w-full py-3 rounded-[10px] text-sm font-semibold text-white ${botName.trim() ? 'bg-[#4F46E5] cursor-pointer' : 'bg-[#d1d5db]'}`}>Next</button>
        </div>
      )}

      {/* STEP 2: Language & Personality */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">How should {botName} speak?</h2>
          <p className="text-sm text-slate-200 text-center mb-8">Choose the default language and tone.</p>
          <label className="text-sm font-medium text-slate-200 block mb-1.5">Bot&apos;s default language</label>
          <select value={botLang} onChange={e => setBotLang(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </select>
          <label className="text-sm font-medium text-slate-200 block mb-2.5">Personality</label>
          <div className="flex flex-col gap-2 mb-6">
            {PERSONALITIES.map(p => (
              <button key={p.id} onClick={() => setPersonality(p.id)}
                className={`p-3.5 rounded-xl text-left cursor-pointer ${personality === p.id ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/10' : 'border border-slate-700 bg-slate-800'}`}>
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="text-xs text-slate-200 mt-0.5">{p.desc}</p>
                <p className="text-xs text-slate-300 italic mt-1.5">&quot;{p.example}&quot;</p>
              </button>
            ))}
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-800">Back</button>
            <button onClick={() => setStep(3)} className="flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white bg-[#4F46E5]">Next</button>
          </div>
        </div>
      )}

      {/* STEP 3: Greeting & Away Message */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">What does {botName} say?</h2>
          <p className="text-sm text-slate-200 text-center mb-8">Set a greeting for new visitors and an away message.</p>
          <label className="text-sm font-medium text-slate-200 block mb-1.5">Greeting message</label>
          <textarea value={greeting} onChange={e => setGreeting(e.target.value)} placeholder={`Hi! I'm ${botName}. How can I help you today?`} rows={3} style={{ ...inputStyle, marginBottom: 20, resize: 'vertical' }} />
          <label className="text-sm font-medium text-slate-200 block mb-1.5">Away message</label>
          <textarea value={awayMessage} onChange={e => setAwayMessage(e.target.value)} placeholder="Thanks for your message! I'm currently away but will respond soon." rows={3} style={{ ...inputStyle, marginBottom: 24, resize: 'vertical' }} />
          <div className="flex gap-2.5">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-800">Back</button>
            <button onClick={() => setStep(4)} className="flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white bg-[#4F46E5]">Next</button>
          </div>
        </div>
      )}

      {/* STEP 4: Custom Rules */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Teach {botName} your rules</h2>
          <p className="text-sm text-slate-200 text-center mb-3">Write rules in plain language. Your bot follows them.</p>
          <div className="bg-[#fef3c7] rounded-[10px] px-3.5 py-2.5 mb-6">
            <p className="text-xs text-[#92400e] leading-relaxed">Examples: &quot;When I&apos;m praying, tell everyone I&apos;ll respond in 30 minutes&quot; &bull; &quot;When someone asks about prices, send my catalog link&quot; &bull; &quot;Between 10pm and 7am, say I&apos;m resting&quot;</p>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-semibold min-w-[20px]">{i + 1}.</span>
                <input type="text" value={rule} onChange={e => { const n = [...rules]; n[i] = e.target.value; setRules(n); }} placeholder="Write a rule in plain language..." className="flex-1 px-3 py-2.5 rounded-lg border border-slate-700 text-[13px]" />
                {rules.length > 1 && <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-[#ef4444] text-lg px-1">×</button>}
              </div>
            ))}
          </div>
          <button onClick={() => setRules([...rules, ''])} className="w-full py-2.5 rounded-lg bg-slate-800 border border-dashed border-slate-600 text-[13px] text-slate-200 mb-6">+ Add another rule</button>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-800">Back</button>
            <button onClick={handleSave} disabled={!orgReady || saving} className={`flex-[2] py-3 rounded-[10px] text-sm font-semibold text-white ${!orgReady || saving ? 'bg-[#9ca3af]' : 'bg-[#4F46E5]'}`}>
              {!orgReady ? 'Loading...' : saving ? 'Creating...' : `Activate ${botName}`}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
