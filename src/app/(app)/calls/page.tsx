'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';
import { useToast } from '@/components/ui/Toast';
import PocketAvatar from '@/components/PocketAvatar';
import {
  Phone,
  Plus,
  Calendar,
  Grid3X3,
  Heart,
  Search,
  X,
  Delete,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  company: string;
  avatar_url?: string;
  contact_type: string;
}

/* ---------- Dial Pad Modal ---------- */
function DialPad({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [number, setNumber] = useState('');

  if (!open) return null;

  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 border-t border-slate-700/50"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Number display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1" />
          <p className="text-2xl text-white text-center font-light tracking-widest min-h-[2rem] flex-1">
            {number || '\u00A0'}
          </p>
          <div className="flex-1 flex justify-end">
            {number && (
              <button onClick={() => setNumber(n => n.slice(0, -1))} className="p-2 text-slate-400">
                <Delete size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Number grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-[280px] mx-auto">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => setNumber(n => n + key)}
              className="w-16 h-16 mx-auto rounded-full bg-slate-800 text-white text-2xl font-light flex items-center justify-center active:bg-slate-700 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Call + close buttons */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={onClose} className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 active:bg-slate-700">
            <X size={24} />
          </button>
          <button
            onClick={() => {
              if (number) window.location.href = `tel:${number}`;
            }}
            className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center shadow-lg shadow-green-500/20 active:bg-green-600"
          >
            <Phone size={24} className="text-white" />
          </button>
          <div className="w-14" /> {/* spacer */}
        </div>
      </div>
    </div>
  );
}

/* ---------- Contact Picker Modal ---------- */
function ContactPicker({
  open,
  onClose,
  contacts,
}: {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
}) {
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  if (!open) return null;

  const filtered = contacts.filter((c) => {
    if (!c.phone) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.company?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">Call a contact</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-4">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-8">No contacts with phone numbers</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                window.location.href = `tel:${c.phone.replace(/\s+/g, '')}`;
                onClose();
              }}
              className="w-full flex items-center gap-3 py-3 border-b border-slate-800 active:bg-slate-800/50 transition-colors"
            >
              <PocketAvatar name={c.name} size={40} />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-slate-400">{c.phone}</p>
              </div>
              <Phone size={18} className="text-[#22C55E] shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Main Calls Page ---------- */
export default function CallsPage() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDialPad, setShowDialPad] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);

  useEffect(() => {
    document.title = 'Calls';
  }, []);

  // Fetch contacts with phone numbers
  useEffect(() => {
    if (!organization?.id) return;
    const supabase = createClient();
    supabase
      .from('contacts')
      .select('id, name, phone, company, avatar_url, contact_type')
      .eq('organization_id', organization.id)
      .neq('phone', '')
      .order('name')
      .then(({ data }) => {
        if (data) setContacts(data as Contact[]);
      });
  }, [organization?.id]);

  const actions = [
    { label: 'Call', icon: Phone, onClick: () => setShowDialPad(true) },
    { label: 'Schedule', icon: Calendar, onClick: () => toast('Coming soon!', 'info') },
    { label: 'Keypad', icon: Grid3X3, onClick: () => setShowDialPad(true) },
    { label: 'Favorites', icon: Heart, onClick: () => toast('Coming soon!', 'info') },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-900 pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Calls</h1>
        <button
          onClick={() => setShowContactPicker(true)}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 active:bg-slate-700"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Action bar */}
      <div className="flex gap-4 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex flex-col items-center gap-1.5 min-w-[64px]"
            >
              <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 active:bg-slate-700 transition-colors">
                <Icon size={22} />
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Call log — empty state */}
      <div className="flex flex-col items-center justify-center px-4 pt-16">
        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
          <Phone size={28} className="text-slate-600" />
        </div>
        <p className="text-lg font-semibold text-slate-400">No calls yet</p>
        <p className="text-sm text-slate-500 mt-1 text-center">
          Start a call using the buttons above or tap the <span className="text-indigo-400">+</span> to call a contact
        </p>
      </div>

      {/* Modals */}
      <DialPad open={showDialPad} onClose={() => setShowDialPad(false)} />
      <ContactPicker open={showContactPicker} onClose={() => setShowContactPicker(false)} contacts={contacts} />
    </div>
  );
}
