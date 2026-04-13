'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Search, Pencil, Trash2, MoreVertical, X } from 'lucide-react';

interface Stage { id: string; name: string; color: string; stage_order: number; }
interface Item {
  id: string; name: string; category: string; reference_id: string;
  current_stage_id: string; purchase_price: number; sale_price: number;
  total_cost: number; status: string; priority: string; supplier: string;
  entered_current_stage_at: string; created_at: string; metadata: Record<string, unknown>;
}

const CATEGORY_SUGGESTIONS = ['Product', 'Service', 'Material', 'Equipment', 'Other'];

export default function ItemsPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [loading, setLoading] = useState(true);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);

  const [form, setForm] = useState({
    name: '', category: '', reference_id: '',
    purchase_price: '', supplier: '', priority: 'normal',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: cycle } = await supabase
      .from('business_cycles').select('id').eq('organization_id', organization.id).eq('is_active', true).limit(1).maybeSingle();

    if (!cycle) { setLoading(false); return; }
    setCycleId(cycle.id);

    const [stagesRes, itemsRes] = await Promise.all([
      supabase.from('cycle_stages').select('*').eq('cycle_id', cycle.id).order('stage_order'),
      supabase.from('cycle_items').select('*').eq('cycle_id', cycle.id).order('created_at', { ascending: false }),
    ]);
    setStages(stagesRes.data || []);
    setItems((itemsRes.data || []) as Item[]);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !cycleId) return;
    setSaving(true);

    const firstStage = stages.find(s => s.stage_order === Math.min(...stages.map(st => st.stage_order)));

    const { error } = await supabase.from('cycle_items').insert({
      organization_id: organization.id,
      cycle_id: cycleId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      reference_id: form.reference_id.trim() || null,
      purchase_price: parseInt(form.purchase_price) || 0,
      supplier: form.supplier.trim() || null,
      priority: form.priority,
      current_stage_id: firstStage?.id || null,
      entered_current_stage_at: new Date().toISOString(),
      status: 'active',
      created_by: user.id,
    });

    if (error) {
      toast('Failed: ' + error.message, 'error');
    } else {
      toast('Item added to pipeline!', 'success');
      setForm({ name: '', category: '', reference_id: '', purchase_price: '', supplier: '', priority: 'normal' });
      setShowAddForm(false);
      fetchData();
    }
    setSaving(false);
  }

  async function moveToStage(itemId: string, currentStageId: string, newStageId: string) {
    const item = items.find(i => i.id === itemId);
    const daysInPrev = item?.entered_current_stage_at
      ? Math.floor((Date.now() - new Date(item.entered_current_stage_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const { error: transError } = await supabase.from('cycle_transitions').insert({
      organization_id: organization.id,
      item_id: itemId,
      from_stage_id: currentStageId,
      to_stage_id: newStageId,
      days_in_previous_stage: daysInPrev,
      triggered_by: user.id,
    });

    if (transError) { toast('Failed: ' + transError.message, 'error'); return; }

    const { error: moveError } = await supabase.from('cycle_items').update({
      current_stage_id: newStageId,
      entered_current_stage_at: new Date().toISOString(),
    }).eq('id', itemId);

    if (moveError) { toast('Failed: ' + moveError.message, 'error'); return; }

    const newStage = stages.find(s => s.id === newStageId);
    toast(`Moved to ${newStage?.name || 'next stage'}`, 'success');
    fetchData();
  }

  async function markCompleted(itemId: string) {
    const { error } = await supabase.from('cycle_items').update({ status: 'completed' }).eq('id', itemId);
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    toast('Item completed!', 'success');
    fetchData();
  }

  function openEditForm(item: Item) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category || '',
      reference_id: item.reference_id || '',
      purchase_price: item.purchase_price ? String(item.purchase_price) : '',
      supplier: item.supplier || '',
      priority: item.priority || 'normal',
    });
    setShowAddForm(true);
    setMenuOpenId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !editingItem) return;
    setSaving(true);
    const { error } = await supabase.from('cycle_items').update({
      name: form.name.trim(),
      category: form.category.trim() || null,
      reference_id: form.reference_id.trim() || null,
      purchase_price: parseInt(form.purchase_price) || 0,
      supplier: form.supplier.trim() || null,
      priority: form.priority,
    }).eq('id', editingItem.id);
    if (error) { toast('Failed: ' + error.message, 'error'); }
    else { toast('Item updated', 'success'); closeForm(); fetchData(); }
    setSaving(false);
  }

  async function deleteItem(item: Item) {
    const { error } = await supabase.from('cycle_items').delete().eq('id', item.id);
    if (error) { toast('Failed: ' + error.message, 'error'); }
    else { toast('Item deleted', 'success'); fetchData(); }
    setDeleteConfirm(null);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingItem(null);
    setForm({ name: '', category: '', reference_id: '', purchase_price: '', supplier: '', priority: 'normal' });
  }

  // Filter items by search + category
  const filteredItems = items.filter(i => {
    if (i.status !== 'active') return false;
    const q = searchQuery.toLowerCase();
    if (q && !i.name.toLowerCase().includes(q) && !(i.category || '').toLowerCase().includes(q) && !(i.reference_id || '').toLowerCase().includes(q)) return false;
    if (categoryFilter !== 'All' && (i.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
    return true;
  });

  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]';

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>;
  }

  if (!cycleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-lg font-bold text-[var(--text-1)] mb-2">Set up your business cycle first</h2>
        <Link href="/cycle-setup" className="rounded-xl bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white">Create Business Cycle</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Items" backPath="/dashboard" />
      <div className="flex items-center justify-between px-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">Pipeline Items</h1>
          <p className="text-xs text-[var(--text-3)]">{items.filter(i => i.status === 'active').length} active &middot; {items.filter(i => i.status === 'completed').length} completed</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ops-radar" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-[var(--text-3)] hover:bg-[var(--bg-2)] transition-colors">Ops Radar</Link>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4338CA] transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative px-4">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {['All', ...CATEGORY_SUGGESTIONS].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-[#4F46E5] text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {showAddForm && (
        <form onSubmit={editingItem ? saveEdit : addItem} className="rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            {editingItem ? 'Edit Item' : 'New Pipeline Item'}
          </h3>
          <input type="text" placeholder="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          <div>
            <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {CATEGORY_SUGGESTIONS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    form.category === cat
                      ? 'bg-[#4F46E5]/20 text-indigo-400 border border-[#4F46E5]/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <input type="text" placeholder="Reference ID" value={form.reference_id} onChange={(e) => setForm({ ...form, reference_id: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Purchase Price" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
          </div>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#4F46E5] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Pipeline'}
            </button>
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-[var(--text-3)]">Cancel</button>
          </div>
        </form>
      )}

      {stages.map((stage) => {
        const stageItems = filteredItems.filter(i => i.current_stage_id === stage.id);
        if (stageItems.length === 0) return null;
        const nextStage = stages.find(s => s.stage_order === stage.stage_order + 1);

        return (
          <div key={stage.id}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">{stage.name}</h2>
              <span className="text-[10px] text-[var(--text-4)]">({stageItems.length})</span>
            </div>
            <div className="space-y-1.5">
              {stageItems.map((item) => {
                const daysInStage = item.entered_current_stage_at
                  ? Math.floor((Date.now() - new Date(item.entered_current_stage_at).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-1)] truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.category && <span className="text-[10px] text-[var(--text-4)]">{item.category}</span>}
                          {item.reference_id && <span className="text-[10px] text-[var(--text-4)]">#{item.reference_id}</span>}
                          <span className="text-[10px] text-[var(--text-4)]">{daysInStage}d</span>
                          {item.purchase_price > 0 && <span className="text-[10px] font-mono text-[var(--text-4)]">{formatCurrency(item.purchase_price, currency)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Three-dot menu */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuOpenId === item.id && (
                            <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1">
                              <button
                                onClick={() => openEditForm(item)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm(item); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {nextStage ? (
                          <button
                            onClick={() => moveToStage(item.id, stage.id, nextStage.id)}
                            className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors"
                            style={{ backgroundColor: nextStage.color }}
                          >
                            &rarr; {nextStage.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => markCompleted(item.id)}
                            className="rounded-md bg-[#16A34A] px-2.5 py-1.5 text-[10px] font-semibold text-white"
                          >
                            Complete &check;
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No results for search/filter */}
      {filteredItems.length === 0 && (searchQuery || categoryFilter !== 'All') && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">No items match your search</p>
          <button onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }} className="mt-2 text-xs text-indigo-400 hover:underline">Clear filters</button>
        </div>
      )}

      {items.filter(i => i.status === 'active').length === 0 && !showAddForm && !searchQuery && categoryFilter === 'All' && (
        <div className="rounded-xl border border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">Your pipeline is empty</p>
          <p className="text-[10px] text-[var(--text-4)] mt-1">Add your first item to start tracking</p>
          <button onClick={() => setShowAddForm(true)} className="mt-3 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white">+ Add First Item</button>
        </div>
      )}

      {items.filter(i => i.status === 'completed').length > 0 && (
        <div className="text-center">
          <p className="text-[10px] text-[var(--text-4)]">{items.filter(i => i.status === 'completed').length} completed items</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[var(--text-1)]">Delete Item</h3>
              <button onClick={() => setDeleteConfirm(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-[var(--text-3)] mb-5">
              Delete <span className="font-semibold text-[var(--text-1)]">{deleteConfirm.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-[var(--text-3)]">Cancel</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="flex-1 rounded-lg bg-[#DC2626] py-2.5 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpenId && <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />}
    </div>
  );
}
