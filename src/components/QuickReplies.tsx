'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';

interface QuickReply { id: string; shortcut: string; message: string; }

interface QuickRepliesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (message: string) => void;
  inputValue?: string;
}

const DEFAULT_REPLIES = [
  { shortcut: '/thanks', message: 'Thank you for your message! I\'ll get back to you shortly.' },
  { shortcut: '/price', message: 'I\'ll send you a detailed quote right away. Could you confirm the specifications?' },
  { shortcut: '/hours', message: 'Our business hours are 9:00 AM to 6:00 PM, Monday to Friday.' },
  { shortcut: '/order', message: 'Your order has been received! I\'ll send you a confirmation with details shortly.' },
  { shortcut: '/paid', message: 'Payment received — thank you! Your receipt is on the way.' },
];

export default function QuickReplies({ isOpen, onClose, onSelect, inputValue }: QuickRepliesProps) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('quick_replies').select('*').eq('organization_id', organization.id).order('created_at')
      .then(({ data, error }) => {
        if (error) toast('Failed to load quick replies', 'error');
        else setReplies(data || []);
      });
  }, [isOpen, organization.id, supabase]);

  const allReplies = [...DEFAULT_REPLIES.map((r, i) => ({ ...r, id: `default-${i}` })), ...replies];

  const filtered = inputValue?.startsWith('/')
    ? allReplies.filter(r => r.shortcut.toLowerCase().includes(inputValue.toLowerCase()))
    : allReplies;

  async function addReply() {
    if (!newShortcut.trim() || !newMessage.trim()) return;
    setSaving(true);
    const shortcut = newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`;
    const { error } = await supabase.from('quick_replies').insert({
      organization_id: organization.id, shortcut: shortcut.trim(), message: newMessage.trim(),
    });
    if (error) toast('Failed: ' + error.message, 'error');
    else {
      toast('Quick reply added!', 'success');
      setReplies(prev => [...prev, { id: Date.now().toString(), shortcut: shortcut.trim(), message: newMessage.trim() }]);
      setNewShortcut(''); setNewMessage(''); setShowAdd(false);
    }
    setSaving(false);
  }

  async function deleteReply(id: string) {
    if (id.startsWith('default-')) return;
    const { error } = await supabase.from('quick_replies').delete().eq('id', id);
    if (error) { toast('Failed to delete', 'error'); return; }
    setReplies(prev => prev.filter(r => r.id !== id));
    toast('Deleted', 'success');
  }

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-[300px] overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white shadow-lg z-50">
      <div className="sticky top-0 bg-white border-b border-[#F0F0F0] px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Quick Replies</span>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="text-[10px] text-[#4F46E5] font-medium">{showAdd ? 'Cancel' : '+ Add'}</button>
          <button onClick={onClose} className="text-[10px] text-[#999]">Close</button>
        </div>
      </div>

      {showAdd && (
        <div className="p-3 border-b border-[#F0F0F0] space-y-2">
          <input value={newShortcut} onChange={e => setNewShortcut(e.target.value)} placeholder="/shortcut" className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs focus:border-[#4F46E5] focus:outline-none" />
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Reply message..." rows={2} className="w-full rounded-md border border-[#E5E5E5] px-2.5 py-1.5 text-xs focus:border-[#4F46E5] focus:outline-none" />
          <button onClick={addReply} disabled={saving} className="w-full rounded-md bg-[#4F46E5] py-1.5 text-[10px] font-medium text-white disabled:opacity-50">{saving ? '...' : 'Save'}</button>
        </div>
      )}

      {filtered.map(r => (
        <div
          key={r.id}
          role="button"
          tabIndex={0}
          onClick={() => { onSelect(r.message); onClose(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onSelect(r.message); onClose(); } }}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#FAFAFA] border-b border-[#F5F5F5] last:border-0 text-left cursor-pointer"
        >
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-[#4F46E5]">{r.shortcut}</span>
            <p className="text-xs text-[#333] truncate mt-0.5">{r.message}</p>
          </div>
          {!r.id.startsWith('default-') && (
            <button onClick={(e) => { e.stopPropagation(); deleteReply(r.id); }} className="text-[#DC2626] text-[10px] ml-2 shrink-0">x</button>
          )}
        </div>
      ))}
    </div>
  );
}
