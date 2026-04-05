'use client';

import { createClient } from '@/lib/supabase-client';
import { useToast } from '@/components/ui/Toast';

const LABELS = [
  { key: 'new_lead', label: 'New Lead', color: '#4F46E5' },
  { key: 'vip', label: 'VIP', color: '#7C3AED' },
  { key: 'payment_pending', label: 'Payment Pending', color: '#F59E0B' },
  { key: 'follow_up', label: 'Follow Up', color: '#0EA5E9' },
  { key: 'completed', label: 'Completed', color: '#16A34A' },
  { key: 'urgent', label: 'Urgent', color: '#DC2626' },
];

interface ChatLabelsProps {
  conversationId: string;
  currentLabel: string | null;
  currentColor: string | null;
  onUpdate: (label: string | null, color: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatLabels({ conversationId, currentLabel, onUpdate, isOpen, onClose }: ChatLabelsProps) {
  const supabase = createClient();
  const { toast } = useToast();

  async function setLabel(label: string | null, color: string | null) {
    const { error } = await supabase.from('conversations').update({ label, label_color: color }).eq('id', conversationId);
    if (error) toast('Failed: ' + error.message, 'error');
    else { onUpdate(label, color); onClose(); toast(label ? `Labeled: ${label}` : 'Label removed', 'success'); }
  }

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-1 w-48 rounded-xl border border-slate-700 bg-slate-800 shadow-lg z-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[10px] font-medium text-[#999] uppercase tracking-wider">Label conversation</span>
      </div>
      {LABELS.map(l => (
        <button
          key={l.key}
          onClick={() => setLabel(l.label, l.color)}
          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800 text-left ${currentLabel === l.label ? 'bg-slate-800' : ''}`}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
          <span className="text-xs text-[#333]">{l.label}</span>
          {currentLabel === l.label && (
            <svg className="h-3 w-3 text-indigo-400 ml-auto" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          )}
        </button>
      ))}
      {currentLabel && (
        <button onClick={() => setLabel(null, null)} className="w-full px-3 py-2 text-[10px] text-[#DC2626] border-t border-[var(--border)] hover:bg-slate-800">
          Remove label
        </button>
      )}
    </div>
  );
}
