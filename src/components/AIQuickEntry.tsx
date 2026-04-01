'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';

interface QuickEntryProps {
  onEntryAdded: () => void;
}

export default function AIQuickEntry({ onEntryAdded }: QuickEntryProps) {
  const { organization, profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<{
    flow_type: string; category: string; from_to: string;
    description: string; amount: number; date: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function processText(text: string) {
    if (!text.trim()) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/ai/cashflow-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          businessName: organization.name,
          businessType: organization.business_type || '',
          currency: organization.currency || 'JPY',
          language: profile.language || 'en',
        }),
      });
      if (!res.ok) { toast('AI request failed', 'error'); setProcessing(false); return; }
      const data = await res.json();

      if (data.entry) {
        setPendingEntry(data.entry);
        setInput('');
      } else {
        toast(data.error || 'Could not parse entry', 'error');
      }
    } catch {
      toast('Failed to process', 'error');
    }
    setProcessing(false);
  }

  async function confirmEntry() {
    if (!pendingEntry) return;
    setProcessing(true);

    // Validate AI output before inserting
    const ft = pendingEntry.flow_type;
    const amt = pendingEntry.amount;
    if ((ft !== 'IN' && ft !== 'OUT') || !Number.isFinite(amt) || amt <= 0) {
      toast('Invalid entry data from AI — please try again', 'error');
      setProcessing(false);
      return;
    }

    const { error } = await supabase.from('cash_flows').insert({
      organization_id: organization.id,
      date: pendingEntry.date,
      flow_type: ft,
      category: pendingEntry.category,
      from_to: pendingEntry.from_to,
      description: pendingEntry.description,
      amount: amt,
      currency: organization.currency || 'JPY',
      status: 'COMPLETED',
      classify_as: ft === 'OUT' ? 'expense' : 'cash_flow_only',
      created_by: profile.user_id,
    });

    if (error) {
      toast('Failed to save: ' + error.message, 'error');
    } else {
      toast('Entry logged!', 'success');
      setPendingEntry(null);
      onEntryAdded();
    }
    setProcessing(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        toast('Voice captured! Type your entry for now — voice AI coming soon.', 'info');
        setRecording(false);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast('Microphone not available', 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-3 text-center hover:bg-[#4F46E5]/[0.05] transition-colors"
      >
        <p className="text-[13px] font-medium text-[#4F46E5]">Quick entry — tell AI what happened</p>
        <p className="text-[10px] text-[#999] mt-0.5">&quot;Paid ¥5000 for flour&quot; or &quot;Got ¥50000 from Tanaka&quot;</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#4F46E5]/20 bg-white p-4">
      {!pendingEntry ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-[13px] font-medium text-[#0A0A0A]">Quick entry</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#999] text-xs">Close</button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                recording ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#F5F5F5] text-[#666] hover:bg-[#E5E5E5]'
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processText(input)}
              placeholder="e.g., 'Paid ¥5000 for flour at Costco'"
              className="flex-1 rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm placeholder-[#BBB] focus:border-[#4F46E5] focus:outline-none"
            />
            <button
              onClick={() => processText(input)}
              disabled={!input.trim() || processing}
              className="shrink-0 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {processing ? '...' : 'Log'}
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto">
            {['Paid rent', 'Bought supplies', 'Got payment from client', 'Fuel cost'].map((s) => (
              <button key={s} onClick={() => setInput(s)} className="shrink-0 rounded-full border border-[#E5E5E5] px-2.5 py-1 text-[10px] text-[#666] hover:bg-[#F5F5F5]">
                {s}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Confirm parsed entry */
        <div>
          <p className="text-[11px] font-medium text-[#4F46E5] uppercase tracking-wider mb-3">AI parsed your entry — confirm?</p>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">Type</span>
              <span className={`font-medium ${pendingEntry.flow_type === 'IN' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                {pendingEntry.flow_type === 'IN' ? 'Money In' : 'Money Out'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">Amount</span>
              <span className="font-mono font-medium">{organization.currency} {pendingEntry.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">Category</span>
              <span className="font-medium">{pendingEntry.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">From/To</span>
              <span className="font-medium">{pendingEntry.from_to || '—'}</span>
            </div>
            {pendingEntry.description && (
              <div className="flex justify-between text-sm">
                <span className="text-[#666]">Note</span>
                <span className="font-medium text-right max-w-[60%]">{pendingEntry.description}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPendingEntry(null)} className="flex-1 rounded-lg border border-[#E5E5E5] py-2.5 text-xs font-medium text-[#666]">
              Cancel
            </button>
            <button onClick={confirmEntry} disabled={processing} className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-xs font-medium text-white disabled:opacity-50">
              {processing ? 'Saving...' : 'Confirm & Log'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
