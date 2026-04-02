'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import PublicPocketChat from '@/components/PublicPocketChat';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OrderItem {
  id: string;
  name: string;
  description: string;
  price: number;
  photo_url: string | null;
  category: string;
}

export default function PublicOrderPage() {
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [business, setBusiness] = useState<{ name: string; type: string; currency: string; phone: string; social_links: Record<string, string> } | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', email: '', notes: '', quantity: '1' });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    async function loadStore() {
      if (!slug) return;

      const { data: site } = await supabase
        .from('published_websites')
        .select('organization_id, business_name')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (!site) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrgId(site.organization_id);

      const { data: org } = await supabase
        .from('organizations')
        .select('name, business_type, currency, phone, social_links')
        .eq('id', site.organization_id)
        .maybeSingle();

      if (org) setBusiness(org as typeof business);

      const { data: cycleItems } = await supabase
        .from('cycle_items')
        .select('id, name, category, sale_price')
        .eq('organization_id', site.organization_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      const catalogItems: OrderItem[] = (cycleItems || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: '',
        price: item.sale_price || 0,
        photo_url: null,
        category: item.category || '',
      }));

      setItems(catalogItems);
      setLoading(false);
    }
    loadStore();
  }, [slug]);

  async function submitOrder() {
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orgId) return;
    setSubmitting(true);

    const { error } = await supabase.from('planner_events').insert({
      organization_id: orgId,
      title: `Order: ${selectedItem?.name || 'Custom'} \u00D7 ${orderForm.quantity}`,
      description: `Customer: ${orderForm.name}\nPhone: ${orderForm.phone}\nEmail: ${orderForm.email}\nNotes: ${orderForm.notes}\nQuantity: ${orderForm.quantity}`,
      event_date: new Date().toISOString().slice(0, 10),
      event_type: 'incoming_payment',
      amount: selectedItem ? selectedItem.price * parseInt(orderForm.quantity || '1') : 0,
      status: 'pending',
    });

    setSubmitting(false);
    if (error) return;
    setOrderSuccess(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">Store not found</h1>
          <p className="text-sm text-[#666]">This store doesn&apos;t exist yet.</p>
          <a href="https://www.bizpocket.io" className="mt-4 inline-block text-sm text-[#4F46E5] font-medium">Create yours with BizPocket &rarr;</a>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A]/10">
            <svg className="h-8 w-8 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#0A0A0A] mb-2">Order Received!</h1>
          <p className="text-sm text-[#666] mb-1">{business?.name} will contact you shortly.</p>
          {business?.phone && <p className="text-sm text-[#4F46E5]">Call: {business.phone}</p>}
          <button onClick={() => { setOrderSuccess(false); setShowOrderForm(false); setSelectedItem(null); }} className="mt-4 text-sm text-[#4F46E5] font-medium">&larr; Back to store</button>
        </div>
      </div>
    );
  }

  const currency = business?.currency || 'JPY';
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-4 text-center">
        <h1 className="text-xl font-bold text-[#0A0A0A]">{business?.name}</h1>
        <p className="text-xs text-[#999] mt-0.5">{business?.type}</p>
      </div>

      {showOrderForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowOrderForm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <button onClick={() => setShowOrderForm(false)} className="absolute right-4 top-4 text-[#999]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-lg font-bold text-[#0A0A0A] mb-1">Place Order</h3>
            {selectedItem && <p className="text-sm text-[#666] mb-4">{selectedItem.name} &mdash; {fmt(selectedItem.price)}</p>}
            <div className="space-y-3">
              <input type="text" placeholder="Your name *" value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm focus:border-[#4F46E5] focus:outline-none" required />
              <input type="tel" placeholder="Phone number *" value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm focus:border-[#4F46E5] focus:outline-none" required />
              <input type="email" placeholder="Email (optional)" value={orderForm.email} onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })} className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm focus:border-[#4F46E5] focus:outline-none" />
              <input type="number" placeholder="Quantity" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} min="1" className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm focus:border-[#4F46E5] focus:outline-none" />
              <textarea placeholder="Special notes" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm focus:border-[#4F46E5] focus:outline-none" />
            </div>
            <button onClick={submitOrder} disabled={submitting || !orderForm.name.trim() || !orderForm.phone.trim()} className="mt-4 w-full rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? 'Sending...' : 'Send Order'}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button key={item.id} onClick={() => { setSelectedItem(item); setShowOrderForm(true); }} className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden text-left hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-br from-[#F5F5F5] to-[#E5E5E5] flex items-center justify-center">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="h-8 w-8 text-[#CCC]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v13.5a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-[#0A0A0A] truncate">{item.name}</p>
                  {item.category && <p className="text-[10px] text-[#999]">{item.category}</p>}
                  {item.price > 0 && <p className="text-sm font-bold text-[#4F46E5] mt-1">{fmt(item.price)}</p>}
                  <p className="text-[10px] text-[#4F46E5] mt-1 font-medium">Order Now &rarr;</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-sm text-[#999]">No items listed yet</p></div>
        )}

        <button onClick={() => { setSelectedItem(null); setShowOrderForm(true); }} className="mt-4 w-full rounded-xl border-2 border-dashed border-[#4F46E5]/30 bg-[#4F46E5]/[0.02] py-4 text-center">
          <p className="text-sm font-medium text-[#4F46E5]">Custom Order</p>
          <p className="text-[10px] text-[#999]">Don&apos;t see what you want? Send a custom request</p>
        </button>
      </div>

      <div className="border-t border-[#E5E5E5] bg-white px-4 py-4 text-center">
        <p className="text-[9px] text-[#CCC]">Powered by <a href="https://www.bizpocket.io?ref=order" className="text-[#4F46E5]">BizPocket</a> — AI Business Autopilot</p>
      </div>

      {orgId && (
        <PublicPocketChat
          conversationId={orgId}
          ownerId={orgId}
          ownerName={business?.name || 'Business'}
          ownerLanguage="en"
          orgId={orgId}
          context="order"
        />
      )}
    </div>
  );
}
