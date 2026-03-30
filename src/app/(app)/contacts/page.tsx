'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

type ContactType = 'customer' | 'supplier' | 'accountant' | 'partner';

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
  notes: string;
};

const emptyForm: ContactForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  country: '',
  contact_type: 'customer',
  notes: '',
};

const TYPE_COLORS: Record<ContactType, string> = {
  customer: 'bg-[#4F46E5]',
  supplier: 'bg-[#16A34A]',
  accountant: 'bg-[#0EA5E9]',
  partner: 'bg-[#7C3AED]',
};

const TYPE_BADGE_COLORS: Record<ContactType, string> = {
  customer: 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5]',
  supplier: 'bg-[rgba(22,163,74,0.08)] text-[#16A34A]',
  accountant: 'bg-[rgba(14,165,233,0.08)] text-[#0EA5E9]',
  partner: 'bg-[rgba(124,58,237,0.08)] text-[#7C3AED]',
};

const FILTER_TABS: { label: string; value: ContactType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Customers', value: 'customer' },
  { label: 'Suppliers', value: 'supplier' },
  { label: 'Accountants', value: 'accountant' },
  { label: 'Partners', value: 'partner' },
];

export default function ContactsPage() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

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

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter((c) => {
    if (activeTab !== 'all' && c.contact_type !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c: Contact) {
    setForm({
      name: c.name,
      company: c.company ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      country: c.country ?? '',
      contact_type: c.contact_type,
      notes: c.notes ?? '',
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
    if (!form.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      country: form.country.trim() || null,
      contact_type: form.contact_type,
      notes: form.notes.trim() || null,
      organization_id: organization!.id,
    };

    if (editingId) {
      const { error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Contact updated', 'success');
        cancelForm();
        fetchContacts();
      }
    } else {
      const { error } = await supabase.from('contacts').insert(payload);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Contact added', 'success');
        cancelForm();
        fetchContacts();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization!.id);
    if (error) {
      toast(`Delete failed: ${error.message}`, 'error');
    } else {
      toast('Contact deleted', 'success');
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
    setDeleteConfirmId(null);
  }

  async function importFromCustomers() {
    if (!organization?.id) return;
    setImporting(true);

    const { data: customers, error: fetchErr } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organization.id);

    if (fetchErr) {
      toast(fetchErr.message, 'error');
      setImporting(false);
      return;
    }

    if (!customers || customers.length === 0) {
      toast('No customers to import', 'error');
      setImporting(false);
      return;
    }

    // Build a lookup of existing contacts for dedup
    const existing = new Set(
      contacts.map((c) => {
        const key = c.email ? c.email.toLowerCase() : `${c.name.toLowerCase()}|${(c.phone ?? '').toLowerCase()}`;
        return key;
      })
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
        name: cust.name,
        company: cust.company ?? null,
        phone: cust.phone ?? null,
        email: cust.email ?? null,
        country: null,
        contact_type: 'customer' as ContactType,
        notes: cust.notes ?? null,
        organization_id: organization.id,
      }));

    if (toInsert.length === 0) {
      toast('All customers already imported', 'success');
      setImporting(false);
      return;
    }

    const { error: insertErr } = await supabase.from('contacts').insert(toInsert);
    if (insertErr) {
      toast(insertErr.message, 'error');
    } else {
      toast(`Imported ${toInsert.length} contact${toInsert.length !== 1 ? 's' : ''}`, 'success');
      fetchContacts();
    }
    setImporting(false);
  }

  function updateField(field: keyof ContactForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Contacts</h1>
          <p className="text-xs text-[var(--text-3)]">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={importFromCustomers}
            disabled={importing}
            className="rounded-btn border border-[#E5E5E5] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[rgba(79,70,229,0.04)] disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import from Customers'}
          </button>
          <button
            onClick={openAdd}
            className="rounded-btn bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA]"
          >
            Add Contact
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-btn px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              activeTab === tab.value
                ? 'bg-[rgba(79,70,229,0.08)] text-[#4F46E5]'
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
        className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
      />

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-[#E5E5E5] bg-white p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-[var(--text-1)]">
            {editingId ? 'Edit Contact' : 'New Contact'}
          </h2>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">
              Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Contact name"
              required
              className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Company name"
              className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Email address"
                className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => updateField('country', e.target.value)}
                placeholder="Country"
                className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Type</label>
              <select
                value={form.contact_type}
                onChange={(e) => updateField('contact_type', e.target.value)}
                className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="accountant">Accountant</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes"
              rows={2}
              className="w-full rounded-input border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-btn bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA] disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-btn border border-[#E5E5E5] px-4 py-2 text-sm text-[var(--text-2)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contact Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-[#E5E5E5] bg-white p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">
            {search || activeTab !== 'all'
              ? 'No contacts match your filters.'
              : 'No contacts yet. Add your first contact.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-card border border-[#E5E5E5] bg-white p-4"
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-3">
                <Link
                  href={`/chat?contact=${c.id}`}
                  className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-semibold ${TYPE_COLORS[c.contact_type]}`}
                >
                  {c.name.charAt(0).toUpperCase()}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-1)] truncate">
                    {c.name}
                  </p>
                  {c.company && (
                    <p className="text-[11px] text-[var(--text-3)] truncate">{c.company}</p>
                  )}
                  <span
                    className={`inline-block mt-1 text-[10px] font-medium uppercase rounded-btn px-1.5 py-0.5 ${TYPE_BADGE_COLORS[c.contact_type]}`}
                  >
                    {c.contact_type}
                  </span>
                </div>
              </div>

              {/* Phone + Email */}
              <div className="mt-2.5 space-y-0.5">
                {c.phone && (
                  <p className="text-[11px] text-[var(--text-3)] truncate">{c.phone}</p>
                )}
                {c.email && (
                  <p className="text-[11px] text-[var(--text-3)] truncate">{c.email}</p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t border-[#F0F0F0] pt-2.5">
                <button
                  onClick={() => openEdit(c)}
                  className="text-xs text-[#4F46E5] hover:opacity-80"
                >
                  Edit
                </button>
                {deleteConfirmId === c.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-btn bg-[#DC2626] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#B91C1C]"
                    >
                      Delete?
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(c.id)}
                    className="text-xs text-[#DC2626] hover:opacity-80"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
