'use client';

/**
 * NewGroupModal.tsx
 * Multi-select contacts → set group name → create group conversation.
 * Rendered from chat/page.tsx alongside the existing NewChat modal.
 *
 * Usage:
 *   <NewGroupModal
 *     isOpen={showNewGroup}
 *     contacts={contacts}
 *     organizationId={organization.id}
 *     onCreated={(convo) => { ... }}
 *     onClose={() => setShowNewGroup(false)}
 *   />
 */

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import PocketAvatar from '@/components/PocketAvatar';

// ── Types ───────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  organization_id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_type?: string | null;
}

interface GroupConversation {
  id: string;
  organization_id: string;
  contact_id: string | null;
  invoice_id: string | null;
  title: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  is_bot_chat?: boolean;
  label?: string | null;
  label_color?: string | null;
  is_group: boolean;
  group_name: string | null;
  group_member_ids: string[];
  contact?: Contact | null;
}

interface Props {
  isOpen: boolean;
  contacts: Contact[];
  organizationId: string;
  onCreated: (convo: GroupConversation) => void;
  onClose: () => void;
}

// ── Group Avatar grid ───────────────────────────────────────────────────────

function GroupAvatarGrid({ members, size = 40 }: { members: Contact[]; size?: number }) {
  const slice = members.slice(0, 4);
  const cellSize = Math.floor(size / 2) - 1;

  if (slice.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-[#EEF2FF]"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    );
  }

  if (slice.length === 1) {
    return <PocketAvatar name={slice[0].name} size={size} />;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ width: size, height: size }}
    >
      <div className="grid grid-cols-2 gap-[1px] w-full h-full">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="overflow-hidden" style={{ width: cellSize, height: cellSize }}>
            {i < slice.length ? (
              <PocketAvatar name={slice[i].name} size={cellSize} />
            ) : (
              <div className="w-full h-full bg-[#E5E7EB]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────────────────────

type ModalStep = 'select' | 'name';

export default function NewGroupModal({ isOpen, contacts, organizationId, onCreated, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [step, setStep] = useState<ModalStep>('select');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  function toggleSelect(contact: Contact) {
    setSelected(prev =>
      prev.find(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  }

  function handleClose() {
    setStep('select');
    setSearch('');
    setSelected([]);
    setGroupName('');
    onClose();
  }

  // Auto-generate group name from member names
  function autoGroupName() {
    if (selected.length === 0) return '';
    const names = selected.slice(0, 3).map(c => c.name.split(' ')[0]);
    return names.join(', ') + (selected.length > 3 ? ` +${selected.length - 3}` : '');
  }

  function goToName() {
    if (selected.length < 2) {
      toast('Select at least 2 contacts for a group', 'error');
      return;
    }
    if (!groupName) setGroupName(autoGroupName());
    setStep('name');
  }

  async function handleCreate() {
    const finalName = groupName.trim() || autoGroupName();
    if (!finalName) { toast('Please enter a group name', 'error'); return; }
    if (selected.length < 2) { toast('Select at least 2 contacts', 'error'); return; }

    setCreating(true);
    try {
      const memberIds = selected.map(c => c.id);
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          contact_id: null,
          title: finalName,
          unread_count: 0,
          is_group: true,
          group_name: finalName,
          group_member_ids: memberIds,
          created_by_user_id: user?.id ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;

      toast(`Group "${finalName}" created`, 'success');
      onCreated(data as GroupConversation);
      handleClose();
    } catch (err) {
      console.error('[NewGroupModal] create error', err);
      toast('Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="px-4 py-4 border-b border-[#E5E5E5] flex items-center gap-3">
          {step === 'name' && (
            <button
              onClick={() => setStep('select')}
              className="text-[#4F46E5] mr-1"
              aria-label="Back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#0A0A0A]">
              {step === 'select' ? 'New Group' : 'Name your group'}
            </h2>
            <p className="text-[11px] text-[#9CA3AF]">
              {step === 'select'
                ? `${selected.length} selected · need at least 2`
                : `${selected.length} members`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── STEP: Select contacts ── */}
        {step === 'select' && (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search contacts…"
                  className="flex-1 bg-transparent text-[14px] text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#F3F4F6]">
                {selected.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[12px] font-medium hover:bg-[#E0E7FF] transition-colors"
                  >
                    {c.name.split(' ')[0]}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                ))}
              </div>
            )}

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-[#9CA3AF]">
                  No contacts found
                </div>
              ) : (
                filtered.map(contact => {
                  const isSelected = !!selected.find(c => c.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleSelect(contact)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors ${isSelected ? 'bg-[#F5F3FF]' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <PocketAvatar name={contact.name} size={40} />
                        {isSelected && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#4F46E5] flex items-center justify-center border-2 border-white">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[14px] truncate ${isSelected ? 'font-semibold text-[#4F46E5]' : 'font-medium text-[#0A0A0A]'}`}>
                          {contact.name}
                        </p>
                        {contact.company && (
                          <p className="text-[12px] text-[#9CA3AF] truncate">{contact.company}</p>
                        )}
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#4F46E5] bg-[#4F46E5]'
                          : 'border-[#D1D5DB] bg-white'
                      }`}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E5E5E5]">
              <button
                onClick={goToName}
                disabled={selected.length < 2}
                className="w-full rounded-xl bg-[#4F46E5] py-3.5 text-[14px] font-semibold text-white disabled:opacity-40 hover:bg-[#4338CA] transition-colors"
              >
                Next → {selected.length >= 2 ? `(${selected.length} members)` : ''}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: Name the group ── */}
        {step === 'name' && (
          <div className="flex flex-col flex-1 p-4">
            {/* Group avatar preview */}
            <div className="flex flex-col items-center gap-3 py-6">
              <GroupAvatarGrid members={selected} size={72} />
              <p className="text-[12px] text-[#9CA3AF]">
                {selected.map(c => c.name.split(' ')[0]).join(', ')}
              </p>
            </div>

            {/* Name input */}
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wider font-medium text-[#9CA3AF] mb-1.5 px-1">
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Team Tokyo, Family, Work…"
                className="w-full rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-3 text-[15px] text-[#0A0A0A] placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] transition-colors"
                maxLength={60}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1 text-right px-1">{groupName.length}/60</p>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleCreate}
                disabled={creating || (!groupName.trim() && !autoGroupName())}
                className="w-full rounded-xl bg-[#4F46E5] py-3.5 text-[14px] font-semibold text-white disabled:opacity-40 hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Creating…
                  </>
                ) : (
                  '💬 Create Group'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
