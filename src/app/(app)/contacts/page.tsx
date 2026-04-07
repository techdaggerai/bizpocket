'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import OutlinePillButton from '@/components/OutlinePillButton';
import PocketAvatar from '@/components/PocketAvatar';
import QRCode from 'qrcode';
import BusinessCardScanner from '@/components/BusinessCardScanner';
import QRScanner from '@/components/QRScanner';
import { getBrandModeClient } from '@/lib/brand';

type ContactType = 'customer' | 'supplier' | 'accountant' | 'partner' | 'friend' | 'family' | 'work';

type Contact = {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  avatar_url: string | null;
  contact_type: ContactType;
  category?: ContactType | null;
  language?: string | null;
  notes: string | null;
  created_at: string;
};

type ContactForm = {
  name: string;
  company: string;
  phone: string;
  email: string;
  country: string;
  contact_type: ContactType;
  category: ContactType;
  language: string;
  notes: string;
};

const CONTACT_LANGUAGES = [
  { code: '', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'pt', label: 'Português (BR)' },
  { code: 'tl', label: 'Filipino' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'zh', label: '中文 (Chinese)' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'es', label: 'Español' },
];

const BADGE_COLORS: Record<string, string> = {
  friend: 'bg-[#FEF3C7] text-[#854D0E]',
  family: 'bg-[#FCE7F3] text-[#9D174D]',
  work: 'bg-[#F0FDF4] text-[#166534]',
  customer: 'bg-[#DBEAFE] text-[#1D4ED8]',
  supplier: 'bg-[#E1F5EE] text-[#085041]',
  accountant: 'bg-[#EEEDFE] text-[#3C3489]',
  partner: 'bg-[#FAECE7] text-[#712B13]',
};

const AVATAR_COLORS = ['#4F46E5', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED', '#0EA5E9', '#EC4899', '#14B8A6'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const POCKETCHAT_TABS: { label: string; value: ContactType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Friends', value: 'friend' },
  { label: 'Family', value: 'family' },
  { label: 'Work', value: 'work' },
];

const BIZPOCKET_TABS: { label: string; value: ContactType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Customers', value: 'customer' },
  { label: 'Suppliers', value: 'supplier' },
  { label: 'Accountants', value: 'accountant' },
  { label: 'Partners', value: 'partner' },
];

const POCKETCHAT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family' },
  { value: 'work', label: 'Work' },
];

const BIZPOCKET_TYPES: { value: ContactType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'partner', label: 'Partner' },
];

export default function ContactsPage() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const isPocketChatMode = getBrandModeClient(organization?.signup_source) === 'evrywher';

  const defaultType: ContactType = isPocketChatMode ? 'friend' : 'customer';
  const tabs = isPocketChatMode ? POCKETCHAT_TABS : BIZPOCKET_TABS;
  const typeOptions = isPocketChatMode ? POCKETCHAT_TYPES : BIZPOCKET_TYPES;

  const emptyForm: ContactForm = {
    name: '', company: '', phone: '', email: '', country: '',
    contact_type: defaultType, category: defaultType, language: '', notes: '',
  };

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ContactType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [showCardScanner, setShowCardScanner] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [permanentInviteCode, setPermanentInviteCode] = useState<string | null>(null);

  useEffect(() => { document.title = 'Evrywher — Contacts'; }, []);

  const fetchContacts = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast(error.message, 'error');
    } else {
      setContacts(data ?? []);
    }
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filtered = contacts.filter((c) => {
    // Use category column if set, fall back to contact_type
    const effectiveCategory = c.category ?? c.contact_type;
    if (activeTab !== 'all' && effectiveCategory !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q);
  });

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c: Contact) {
    const resolvedType = c.category ?? c.contact_type;
    setForm({
      name: c.name, company: c.company ?? '', phone: c.phone ?? '',
      email: c.email ?? '', country: c.country ?? '',
      contact_type: resolvedType, category: resolvedType,
      language: c.language ?? '', notes: c.notes ?? '',
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      country: form.country.trim() || null,
      contact_type: form.contact_type,
      category: form.contact_type, // keep category in sync
      language: form.language || null,
      notes: form.notes.trim() || null,
      organization_id: organization!.id,
    };

    if (editingId) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editingId);
      if (error) { toast(error.message, 'error'); }
      else { toast('Contact updated', 'success'); cancelForm(); fetchContacts(); }
    } else {
      const { error } = await supabase.from('contacts').insert(payload);
      if (error) { toast(error.message, 'error'); }
      else { toast('Contact added', 'success'); cancelForm(); fetchContacts(); }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id).eq('organization_id', organization!.id);
    if (error) { toast(`Delete failed: ${error.message}`, 'error'); }
    else { toast('Contact deleted', 'success'); setContacts((prev) => prev.filter((c) => c.id !== id)); }
    setDeleteConfirmId(null);
  }

  async function importFromCustomers() {
    if (!organization?.id) return;
    setImporting(true);
    const { data: customers, error: fetchErr } = await supabase
      .from('customers').select('*').eq('organization_id', organization.id);

    if (fetchErr) { toast(fetchErr.message, 'error'); setImporting(false); return; }
    if (!customers || customers.length === 0) { toast('No customers to import', 'error'); setImporting(false); return; }

    const existing = new Set(
      contacts.map((c) => c.email ? c.email.toLowerCase() : `${c.name.toLowerCase()}|${(c.phone ?? '').toLowerCase()}`)
    );

    const toInsert = customers
      .filter((cust: { email?: string | null; name: string; phone?: string | null }) => {
        const byEmail = cust.email ? cust.email.toLowerCase() : null;
        const byNamePhone = `${cust.name.toLowerCase()}|${(cust.phone ?? '').toLowerCase()}`;
        if (byEmail && existing.has(byEmail)) return false;
        if (existing.has(byNamePhone)) return false;
        return true;
      })
      .map((cust: { name: string; company?: string | null; phone?: string | null; email?: string | null; notes?: string | null }) => ({
        name: cust.name, company: cust.company ?? null, phone: cust.phone ?? null,
        email: cust.email ?? null, country: null, contact_type: 'customer' as ContactType,
        notes: cust.notes ?? null, organization_id: organization.id,
      }));

    if (toInsert.length === 0) { toast('All customers already imported', 'success'); setImporting(false); return; }

    const { error: insertErr } = await supabase.from('contacts').insert(toInsert);
    if (insertErr) { toast(insertErr.message, 'error'); }
    else { toast(`Imported ${toInsert.length} contact${toInsert.length !== 1 ? 's' : ''}`, 'success'); fetchContacts(); }
    setImporting(false);
  }

  function updateField(field: keyof ContactForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inviteUrl = permanentInviteCode
    ? `https://evrywher.io/invite/${permanentInviteCode}`
    : `https://evrywher.io/invite/${organization?.id || ''}`;

  async function openQRModal() {
    setShowQR(true);
    // Ensure we have a permanent invite code
    if (!permanentInviteCode) {
      try {
        const res = await fetch('/api/invites/create', { method: 'POST' });
        const data = await res.json();
        if (data.permanent_code) setPermanentInviteCode(data.permanent_code);
      } catch {}
    }
    try {
      const url = permanentInviteCode
        ? `https://evrywher.io/invite/${permanentInviteCode}`
        : `https://evrywher.io/invite/${organization?.id || ''}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#0A0A0A', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      toast('Failed to generate QR code', 'error');
    }
  }

  async function handleContactSearch() {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setSearching(true);
    try {
      const res = await fetch('/api/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      toast('Search failed', 'error');
    }
    setSearching(false);
  }

  async function handleAddFromSearch(inviteCode: string, userName: string) {
    setAddingUser(inviteCode);
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Connected with ${userName}!`, 'success');
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        fetchContacts();
      } else if (data.already_connected) {
        toast('Already connected!', 'info');
      } else {
        toast(data.error || 'Failed to connect', 'error');
      }
    } catch {
      toast('Network error', 'error');
    }
    setAddingUser(null);
  }

  async function handleQRScan(code: string) {
    setShowQRScanner(false);
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Connected with ${data.inviter?.name || 'contact'}!`, 'success');
        fetchContacts();
      } else if (data.already_connected) {
        toast('Already connected!', 'info');
      } else {
        toast(data.error || 'Invalid QR code', 'error');
      }
    } catch {
      toast('Failed to process QR code', 'error');
    }
  }

  async function downloadQR() {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'evrywher-invite.png';
    link.href = qrDataUrl;
    link.click();
  }

  async function shareQR() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chat with me on Evrywher',
          text: 'Scan to chat with me on Evrywher — AI-powered translation in 21 languages',
          url: inviteUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast('Invite link copied!', 'success');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Contacts</h1>
          <p className="text-xs text-[var(--text-3)]">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <OutlinePillButton
            label="Find"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
            color="#16A34A"
            onClick={() => setShowSearch(true)}
          />
          <OutlinePillButton
            label="Scan QR"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM17 17h3v3h-3z"/></svg>}
            color="#F59E0B"
            onClick={() => setShowQRScanner(true)}
          />
          <OutlinePillButton
            label="My QR"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" /></svg>}
            color="#F59E0B"
            onClick={openQRModal}
          />
          {!isPocketChatMode && (
            <button
              onClick={importFromCustomers}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-[20px] px-3.5 py-[7px] text-[13px] font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--text-2)] hover:text-white disabled:opacity-50"
              style={{ border: '1px solid #D1D5DB' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
          <OutlinePillButton
            label="Add Contact"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
            color="#4F46E5"
            onClick={openAdd}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-[20px] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-[rgba(79,70,229,0.08)] text-indigo-400'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search contacts..."
        className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
      />

      {/* Contact Form Modal / Bottom Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelForm} />
          <div className="relative w-full max-w-md sm:mx-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-800 rounded-t-2xl">
              <h2 className="text-[15px] font-bold text-white">
                {editingId ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button onClick={cancelForm} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-200 mb-1.5 block">Name <span className="text-[#DC2626]">*</span></label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Contact name" required
                  className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
              </div>

              {!isPocketChatMode && (
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1.5 block">Company</label>
                  <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Company name"
                    className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1.5 block">Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Phone number"
                    className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1.5 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Email address"
                    className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1.5 block">Country</label>
                  <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} placeholder="Country"
                    className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-1.5 block">Type</label>
                  <select value={form.contact_type} onChange={(e) => updateField('contact_type', e.target.value)}
                    className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]">
                    {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-1.5 block">Language</label>
                <select value={form.language} onChange={(e) => updateField('language', e.target.value)}
                  className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]">
                  {CONTACT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">AI will translate messages to this language</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-200 mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Additional notes" rows={2}
                  className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-white placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] resize-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-btn bg-[#4F46E5] py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save Contact'}
                </button>
                <button type="button" onClick={cancelForm}
                  className="rounded-btn border border-slate-700 px-4 py-2.5 text-sm text-slate-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact List */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-slate-700 bg-slate-800 p-8 text-center">
          {search || activeTab !== 'all' ? (
            <p className="text-sm text-slate-200">No contacts match your filters.</p>
          ) : (
            <>
              <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-slate-700 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <p className="text-sm font-medium text-white">No contacts yet</p>
              <p className="text-xs text-slate-400 mt-1">Add someone to start chatting!</p>
              <button onClick={openAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Contact
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 hover:bg-slate-700 transition-colors"
            >
              {/* Avatar */}
              <PocketAvatar name={c.name} size={40} />

              {/* Name + badge + language */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailContact(c)}>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium text-white truncate">{c.name}</p>
                  <span className={`inline-block text-[11px] font-medium rounded-full px-2 py-0.5 capitalize ${BADGE_COLORS[c.category ?? c.contact_type] || BADGE_COLORS.friend}`}>
                    {c.category ?? c.contact_type}
                  </span>
                </div>
                {(c.company || c.phone || c.email) && (
                  <p className="text-[12px] text-[var(--text-3)] truncate mt-0.5">
                    {c.company || c.phone || c.email}
                  </p>
                )}
              </div>

              {/* Action icons — 44px tap targets */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => router.push(`/chat?contact=${c.id}`)}
                  className="min-w-[44px] min-h-[44px] p-2 rounded-full flex items-center justify-center text-indigo-400 hover:bg-[#4F46E5]/10 transition-colors"
                  title="Chat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="min-w-[44px] min-h-[44px] p-2 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
                  title="Edit">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {deleteConfirmId === c.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(c.id)}
                      className="rounded-full bg-[#DC2626] px-3 py-1.5 text-[11px] font-medium text-white">
                      Delete?
                    </button>
                    <button onClick={() => setDeleteConfirmId(null)}
                      className="text-[11px] text-slate-400 px-1">
                      No
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(c.id)}
                    className="min-w-[44px] min-h-[44px] p-2 rounded-full flex items-center justify-center text-[#DC2626]/40 hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                    title="Delete">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQR(false)} />
          <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-xs mx-4 text-center">
            <button onClick={() => setShowQR(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Your Invite QR</h3>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Invite QR Code" className="mx-auto w-[280px] h-[280px] rounded-xl" />
            ) : (
              <div className="flex items-center justify-center w-[280px] h-[280px] mx-auto">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
              </div>
            )}
            <p className="mt-4 text-sm text-slate-200">Scan to chat with me on Evrywher</p>
            <canvas ref={qrCanvasRef} className="hidden" />
            <div className="flex gap-2 mt-5">
              <button onClick={downloadQR} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                Download
              </button>
              <button onClick={shareQR} className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors">
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {detailContact && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailContact(null)} />
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Contact Details</h2>
              <button onClick={() => setDetailContact(null)} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center gap-3">
                <PocketAvatar name={detailContact.name} size={80} />
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{detailContact.name}</p>
                  <span className={`inline-block mt-1 text-xs font-medium rounded-full px-3 py-0.5 capitalize ${BADGE_COLORS[detailContact.category ?? detailContact.contact_type] || BADGE_COLORS.friend}`}>
                    {detailContact.category ?? detailContact.contact_type}
                  </span>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-0.5">
                {detailContact.company && (
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-t-lg">
                    <span className="text-sm text-slate-300">Company</span>
                    <span className="text-sm font-medium text-white">{detailContact.company}</span>
                  </div>
                )}
                {detailContact.phone && (
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
                    <span className="text-sm text-slate-300">Phone</span>
                    <a href={`tel:${detailContact.phone}`} className="text-sm font-medium text-indigo-400">{detailContact.phone}</a>
                  </div>
                )}
                {detailContact.email && (
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
                    <span className="text-sm text-slate-300">Email</span>
                    <a href={`mailto:${detailContact.email}`} className="text-sm font-medium text-indigo-400 truncate max-w-[200px]">{detailContact.email}</a>
                  </div>
                )}
                {detailContact.language && (
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
                    <span className="text-sm text-slate-300">Language</span>
                    <span className="text-sm font-medium text-white">{detailContact.language}</span>
                  </div>
                )}
                {detailContact.notes && (
                  <div className="bg-slate-800 px-4 py-3 rounded-b-lg">
                    <span className="text-sm text-slate-300 block mb-1">Notes</span>
                    <p className="text-sm text-white">{detailContact.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { router.push(`/chat?contact=${detailContact.id}`); setDetailContact(null); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  Chat
                </button>
                <button
                  onClick={() => { openEdit(detailContact); setDetailContact(null); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit
                </button>
                <button
                  onClick={() => { handleDelete(detailContact.id); setDetailContact(null); }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#DC2626]/20 px-4 py-2.5 text-sm font-medium text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
              {/* Block */}
              <button
                onClick={async () => {
                  if (!confirm(`Block ${detailContact.name}? They won't be able to send you messages.`)) return;
                  await supabase.from('contacts').update({ is_blocked: true }).eq('id', detailContact.id);
                  setContacts(prev => prev.map(c => c.id === detailContact.id ? { ...c, is_blocked: true } : c));
                  toast(`${detailContact.name} blocked`, 'success');
                  setDetailContact(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></svg>
                Block contact
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Business Card Scanner */}
      {showCardScanner && (
        <BusinessCardScanner
          onClose={() => setShowCardScanner(false)}
          onSave={async (data) => {
            setShowCardScanner(false);
            const payload = {
              name: data.name,
              company: data.company || null,
              phone: data.phone || null,
              email: data.email || null,
              country: null,
              contact_type: isPocketChatMode ? 'work' as ContactType : 'customer' as ContactType,
              category: isPocketChatMode ? 'work' as ContactType : 'customer' as ContactType,
              language: data.language || 'ja',
              notes: data.notes || null,
              organization_id: organization!.id,
            };
            const { error: insertErr } = await supabase.from('contacts').insert(payload);
            if (insertErr) toast(insertErr.message, 'error');
            else { toast('Contact saved from business card!', 'success'); fetchContacts(); }
          }}
        />
      )}

      {/* QR Scanner */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />

      {/* Find by Email/Phone Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }} />
          <div className="relative bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] min-h-[50vh] overflow-y-auto pb-20 sm:pb-4">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Find Contact</h2>
              <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }} className="text-slate-400 hover:text-white">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-400">Search by email or phone number to find Evrywher users</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContactSearch()}
                  placeholder="Email or phone number..."
                  className="flex-1 rounded-[10px] border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
                />
                <button
                  onClick={handleContactSearch}
                  disabled={searching || searchQuery.trim().length < 3}
                  className="rounded-[10px] bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4338CA] disabled:opacity-40"
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>

              {/* Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <div key={r.user_id} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                      <PocketAvatar name={r.name} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.name}</p>
                        {r.language && <p className="text-xs text-slate-400">{r.language.toUpperCase()}</p>}
                      </div>
                      <button
                        onClick={() => handleAddFromSearch(r.invite_code, r.name)}
                        disabled={addingUser === r.invite_code}
                        className="rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4338CA] disabled:opacity-50"
                      >
                        {addingUser === r.invite_code ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery.trim().length >= 3 && !searching && (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-300">No users found</p>
                  <p className="text-xs text-slate-400 mt-1">Invite them to Evrywher instead!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
