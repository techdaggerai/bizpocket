'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import NoteEditor from '@/components/NoteEditor';
import PageHeader from '@/components/PageHeader';
import type { Customer } from '@/types/database';

type CustomerForm = {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  fax: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  fax: '',
  notes: '',
};

export default function CustomersPage() {
  const { organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast(error.message, 'error');
    } else {
      setCustomers(data ?? []);
    }
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setForm({
      name: c.name,
      company: c.company ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      fax: c.fax ?? '',
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
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      fax: form.fax.trim() || null,
      notes: form.notes.trim() || null,
      organization_id: organization.id,
    };

    if (editingId) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Customer updated', 'success');
        cancelForm();
        fetchCustomers();
      }
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Customer added', 'success');
        cancelForm();
        fetchCustomers();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) {
      toast(`Delete failed: ${error.message}`, 'error');
    } else {
      toast('Customer deleted', 'success');
      // Optimistic removal from local state
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
    setDeleteConfirmId(null);
  }

  function updateField(field: keyof CustomerForm, value: string) {
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
    <div className="space-y-4">
      <PageHeader title="Customers" backPath="/dashboard" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-3)]">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-btn bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338CA]"
        >
          Add Customer
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or company..."
        className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
      />

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-slate-700 bg-slate-800 p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-[var(--text-1)]">
            {editingId ? 'Edit Customer' : 'New Customer'}
          </h2>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">
              Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Customer name"
              required
              className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="Company name"
              className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
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
                className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Email address"
                className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Full address"
              className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Fax</label>
            <input
              type="text"
              value={form.fax}
              onChange={(e) => updateField('fax', e.target.value)}
              placeholder="Fax number"
              className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text-2)] mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes"
              rows={2}
              className="w-full rounded-input border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] resize-none"
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
              className="rounded-btn border border-slate-700 px-4 py-2 text-sm text-[var(--text-2)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Customer List */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-slate-700 bg-slate-800 p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">
            {search
              ? 'No customers match your search.'
              : 'No customers yet. Add your first customer.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-card border border-slate-700 bg-slate-800 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-1)] truncate">
                    {c.name}
                  </p>
                  {c.company && (
                    <p className="text-xs text-[var(--text-3)] truncate">{c.company}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {c.phone && (
                      <span className="text-xs text-[var(--text-3)]">{c.phone}</span>
                    )}
                    {c.email && (
                      <span className="text-xs text-[var(--text-3)]">{c.email}</span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-xs text-indigo-400 hover:opacity-80"
                  >
                    Edit
                  </button>
                  <a
                    href={`/customers/${c.id}`}
                    className="text-xs text-[var(--text-4)] hover:text-indigo-400"
                  >
                    View
                  </a>
                  {deleteConfirmId === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded-btn bg-[#DC2626] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#B91C1C]"
                      >
                        Delete {c.name.split(' ')[0]}?
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
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <NoteEditor
                  note={c.notes}
                  onSave={async (note) => {
                    await supabase.from('customers').update({ notes: note }).eq('id', c.id);
                    fetchCustomers();
                  }}
                  onDelete={async () => {
                    await supabase.from('customers').update({ notes: null }).eq('id', c.id);
                    fetchCustomers();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
