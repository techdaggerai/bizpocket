'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface Stage {
  name: string;
  order: number;
  color: string;
  is_start: boolean;
  is_end: boolean;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  cycle?: {
    cycle_name: string;
    business_type: string;
    stages: Stage[];
  };
}

export default function CycleSetupPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedCycle, setGeneratedCycle] = useState<{ cycle_name: string; business_type: string; stages: Stage[] } | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startConversation() {
    setStarted(true);
    setLoading(true);

    const firstMessage = {
      role: 'user' as const,
      content: `Hi, I want to set up my business operations cycle. My business is called "${organization.name}".`,
    };

    setMessages([firstMessage]);

    try {
      const res = await fetch('/api/ai/cycle-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: firstMessage.content }],
          organizationId: organization.id,
        }),
      });
      const data = await res.json();
      if (data.result) {
        const aiMsg: Message = {
          role: 'assistant',
          content: data.result.message,
        };
        if (data.result.type === 'cycle') {
          aiMsg.cycle = {
            cycle_name: data.result.cycle_name,
            business_type: data.result.business_type,
            stages: data.result.stages,
          };
          setGeneratedCycle(aiMsg.cycle);
        }
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch {
      toast('Failed to start. Please try again.', 'error');
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/cycle-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          organizationId: organization.id,
        }),
      });
      const data = await res.json();
      if (data.result) {
        const aiMsg: Message = {
          role: 'assistant',
          content: data.result.message,
        };
        if (data.result.type === 'cycle') {
          aiMsg.cycle = {
            cycle_name: data.result.cycle_name,
            business_type: data.result.business_type,
            stages: data.result.stages,
          };
          setGeneratedCycle(aiMsg.cycle);
        }
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch {
      toast('Failed to send. Please try again.', 'error');
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  async function saveCycle() {
    if (!generatedCycle) return;
    setSaving(true);

    // Deactivate any existing active cycles first
    await supabase
      .from('business_cycles')
      .update({ is_active: false })
      .eq('organization_id', organization.id)
      .eq('is_active', true);

    // Create business cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('business_cycles')
      .insert({
        organization_id: organization.id,
        name: generatedCycle.cycle_name,
        business_type: generatedCycle.business_type,
        description: `AI-generated cycle for ${organization.name}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (cycleError || !cycle) {
      toast(cycleError?.message || 'Failed to create cycle', 'error');
      setSaving(false);
      return;
    }

    // Create stages
    const stageInserts = generatedCycle.stages.map(s => ({
      organization_id: organization.id,
      cycle_id: cycle.id,
      name: s.name,
      stage_order: s.order,
      color: s.color,
      is_start: s.is_start,
      is_end: s.is_end,
      description: s.description,
    }));

    const { error: stageError } = await supabase
      .from('cycle_stages')
      .insert(stageInserts);

    if (stageError) {
      toast(stageError.message, 'error');
      setSaving(false);
      return;
    }

    // Save the conversation to ai_conversations
    for (const msg of messages) {
      await supabase.from('ai_conversations').insert({
        organization_id: organization.id,
        context: 'cycle_setup',
        role: msg.role,
        content: msg.content,
        created_by: user.id,
      });
    }

    setSaving(false);
    toast('Business cycle created!', 'success');
    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <PageHeader title="Cycle Setup" backPath="/dashboard" />

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!started ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--text-1)]">Let&apos;s map your business</h2>
            <p className="mb-2 text-sm text-[var(--text-3)] max-w-sm">
              I&apos;ll ask you a few questions about how your business works. Then I&apos;ll create a custom operations cycle — your pipeline from start to finish.
            </p>
            <p className="mb-6 text-xs text-[var(--text-4)] max-w-xs">
              Takes about 2 minutes. You can always change it later.
            </p>
            <button
              onClick={startConversation}
              className="rounded-xl bg-[#4F46E5] px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] hover:-translate-y-0.5"
            >
              Start the Interview
            </button>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i}>
                {/* Message bubble */}
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-[#4F46E5] text-white'
                        : 'rounded-bl-md border border-slate-700 bg-slate-800 text-[var(--text-1)]'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>

                {/* Cycle Preview */}
                {msg.cycle && (
                  <div className="mt-4 rounded-xl border-2 border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{msg.cycle.cycle_name}</span>
                    </div>

                    {/* Visual pipeline */}
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                      {msg.cycle.stages.map((stage, si) => (
                        <div key={si} className="flex items-center shrink-0">
                          <div
                            className="rounded-lg px-3 py-2 text-center min-w-[80px]"
                            style={{ backgroundColor: stage.color + '15', borderLeft: `3px solid ${stage.color}` }}
                          >
                            <p className="text-[11px] font-bold" style={{ color: stage.color }}>{stage.order}</p>
                            <p className="text-[10px] font-semibold text-[var(--text-1)]">{stage.name}</p>
                          </div>
                          {si < msg.cycle!.stages.length - 1 && (
                            <svg className="h-4 w-4 text-[var(--text-4)] shrink-0 mx-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Stage details */}
                    <div className="space-y-1.5 mb-4">
                      {msg.cycle.stages.map((stage, si) => (
                        <div key={si} className="flex items-start gap-2">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-1)]">{stage.name}</span>
                            <span className="text-xs text-[var(--text-3)]"> — {stage.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={saveCycle}
                        disabled={saving}
                        className="flex-1 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] disabled:opacity-50"
                      >
                        {saving ? 'Creating...' : 'Use This Cycle'}
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedCycle(null);
                          setInput('I want to change some stages. ');
                          inputRef.current?.focus();
                        }}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)]"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-700 bg-slate-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      {started && (
        <div className="border-t border-slate-700 bg-slate-800 px-4 py-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your business..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-[var(--bg-2)] px-4 py-3 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5] text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
