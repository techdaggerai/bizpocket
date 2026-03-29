'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, InvoiceLineItem, ItemTemplate, InvoiceStatus } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let html2pdf: any = null;
if (typeof window !== 'undefined') {
  import('html2pdf.js').then((mod) => { html2pdf = mod.default; });
}

const TAX_RATES = [
  { label: '10%', value: 0.10 },
  { label: '8%', value: 0.08 },
  { label: '0%', value: 0 },
];

const emptyLineItem = (): InvoiceLineItem => ({
  line_number: 1,
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0.10,
  tax_amount: 0,
  total_price: 0,
});

function calcLineItem(item: InvoiceLineItem): InvoiceLineItem {
  const subtotal = item.quantity * item.unit_price;
  const tax_amount = Math.round(subtotal * item.tax_rate);
  return { ...item, tax_amount, total_price: subtotal + tax_amount };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { organization, user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  // Wizard step (0 = template picker, 1-5 = form steps)
  const [step, setStep] = useState(0);
  const totalSteps = 5;
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [invoiceType, setInvoiceType] = useState('commercial');

  // Transport-specific fields
  const [transportFields, setTransportFields] = useState({
    vessel: '', port_loading: '', port_discharge: '',
    shipping_terms: 'FOB', container_no: '', bill_of_lading: '',
  });

  // Step 1 — Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', company: '', phone: '', email: '', address: '', fax: '',
  });

  // Step 2 — Invoice Details
  const [invoiceDate, setInvoiceDate] = useState(formatDate(new Date().toISOString()));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDate(d.toISOString());
  });
  const [invoiceLang, setInvoiceLang] = useState('ja');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Step 3 — Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([calcLineItem(emptyLineItem())]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [swipingIdx, setSwipingIdx] = useState<number | null>(null);
  const touchStartX = useRef(0);

  // Step 4 — Bank Details (pre-fill from org)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;
  const [bankName, setBankName] = useState((org.bank_name as string) || '');
  const [bankBranch, setBankBranch] = useState((org.bank_branch as string) || '');
  const [bankAccountName, setBankAccountName] = useState((org.bank_account_name as string) || '');
  const [bankAccountNumber, setBankAccountNumber] = useState((org.bank_account_number as string) || '');
  const [bankAccountType, setBankAccountType] = useState((org.bank_account_type as string) || 'Futsu');

  // Step 5 — Preview & Save
  const [saving, setSaving] = useState(false);

  // Computed
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxTotal = lineItems.reduce((s, i) => s + i.tax_amount, 0);
  const grandTotal = subtotal + taxTotal;
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
      )
    : customers;

  // Fetch data
  const fetchData = useCallback(async () => {
    const [custRes, tplRes] = await Promise.all([
      supabase.from('customers').select('*').eq('organization_id', organization.id).order('name'),
      supabase.from('item_templates').select('*').eq('organization_id', organization.id).order('name'),
    ]);
    setCustomers(custRes.data || []);
    setTemplates(tplRes.data || []);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save new customer
  async function handleSaveCustomer() {
    if (!newCustomer.name.trim()) return;
    setSavingCustomer(true);
    const { data, error } = await supabase
      .from('customers')
      .insert({
        organization_id: organization.id,
        name: newCustomer.name.trim(),
        address: [newCustomer.company, newCustomer.address].filter(Boolean).join('\n'),
        phone: newCustomer.phone,
        email: newCustomer.email,
        notes: newCustomer.fax ? `FAX: ${newCustomer.fax}` : null,
      })
      .select()
      .single();
    setSavingCustomer(false);

    if (error) {
      toast(error.message, 'error');
    } else if (data) {
      setCustomers((prev) => [...prev, data]);
      setSelectedCustomerId(data.id);
      setShowNewCustomer(false);
      setNewCustomer({ name: '', company: '', phone: '', email: '', address: '', fax: '' });
      toast('Customer saved', 'success');
    }
  }

  // Line item helpers
  function updateLineItem(idx: number, field: keyof InvoiceLineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updated[idx] as any)[field] = value;
      updated[idx] = calcLineItem(updated[idx]);
      return updated;
    });
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, line_number: i + 1 }));
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      calcLineItem({ ...emptyLineItem(), line_number: prev.length + 1 }),
    ]);
    setShowAddItem(false);
  }

  function addFromTemplate(tpl: ItemTemplate) {
    setLineItems((prev) => [
      ...prev,
      calcLineItem({
        line_number: prev.length + 1,
        description: tpl.description || tpl.name,
        quantity: 1,
        unit_price: tpl.default_price,
        tax_rate: tpl.default_tax_rate,
        tax_amount: 0,
        total_price: 0,
      }),
    ]);
    setShowTemplates(false);
  }

  // Touch swipe to delete
  function handleTouchStart(e: React.TouchEvent, idx: number) {
    touchStartX.current = e.touches[0].clientX;
    setSwipingIdx(idx);
  }

  function handleTouchEnd(e: React.TouchEvent, idx: number) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 80) removeLineItem(idx);
    setSwipingIdx(null);
  }

  // Generate invoice number
  async function generateInvoiceNumber(): Promise<string> {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);
    const seq = String((count || 0) + 1).padStart(4, '0');
    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `INV/${prefix}/${ymd}-${seq}`;
  }

  // Save invoice
  async function handleSave(status: InvoiceStatus = 'draft') {
    if (!selectedCustomer) {
      toast('Please select a customer', 'error');
      return;
    }
    setSaving(true);

    const invoiceNumber = await generateInvoiceNumber();
    const itemsJson = lineItems.filter((i) => i.description).map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      amount: i.quantity * i.unit_price,
    }));

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_address: selectedCustomer.address,
        items: itemsJson,
        subtotal,
        tax: taxTotal,
        total: grandTotal,
        tax_rate: 0.10,
        tax_amount: taxTotal,
        grand_total: grandTotal,
        notes: invoiceNotes || null,
        bank_name: bankName || null,
        bank_branch: bankBranch || null,
        bank_account_name: bankAccountName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_type: bankAccountType || 'Futsu',
        invoice_prefix: 'INV',
        template: selectedTemplate,
        invoice_type: invoiceType,
        ...(invoiceType === 'transport' ? {
          vessel: transportFields.vessel || null,
          port_loading: transportFields.port_loading || null,
          port_discharge: transportFields.port_discharge || null,
          shipping_terms: transportFields.shipping_terms || null,
          container_no: transportFields.container_no || null,
          bill_of_lading: transportFields.bill_of_lading || null,
        } : {}),
        currency,
        status,
        language: invoiceLang,
        created_by: user.id,
        ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      toast(error.message, 'error');
      return;
    }

    // Save line items to invoice_items table
    if (invoice) {
      const dbItems = lineItems
        .filter((i) => i.description)
        .map((i, idx) => ({
          organization_id: organization.id,
          invoice_id: invoice.id,
          line_number: idx + 1,
          description: i.description,
          chassis_no: i.chassis_no || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_rate: i.tax_rate,
          tax_amount: i.tax_amount,
          total_price: i.total_price,
          is_manual_entry: true,
        }));

      if (dbItems.length > 0) {
        await supabase.from('invoice_items').insert(dbItems);
      }
    }

    setSaving(false);
    toast(status === 'draft' ? 'Invoice saved as draft' : 'Invoice sent', 'success');
    router.push('/invoices');
  }

  // PDF generation
  async function generatePDF(): Promise<Blob | null> {
    const el = document.getElementById('invoice-preview');
    if (!el || !html2pdf) return null;

    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const fileName = `BizPocket_INV-${prefix}-${invoiceDate.replace(/-/g, '')}.pdf`;

    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    const blob: Blob = await html2pdf().set(opt).from(el).outputPdf('blob');
    return blob;
  }

  async function handleDownloadPDF() {
    const el = document.getElementById('invoice-preview');
    if (!el || !html2pdf) {
      toast('PDF engine loading...', 'error');
      return;
    }

    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const fileName = `BizPocket_INV-${prefix}-${invoiceDate.replace(/-/g, '')}.pdf`;

    await html2pdf().set({
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    }).from(el).save();

    toast('PDF downloaded', 'success');
  }

  // Share via Web Share API
  async function handleShare() {
    const blob = await generatePDF();
    if (!blob) {
      toast('Could not generate PDF', 'error');
      return;
    }

    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const fileName = `BizPocket_INV-${prefix}-${invoiceDate.replace(/-/g, '')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Invoice — ${selectedCustomer?.name || 'Customer'}`,
          text: `Invoice from ${organization.name} — ${formatCurrency(grandTotal, currency)}`,
          files: [file],
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast('Share cancelled', 'info');
        }
      }
    } else {
      // Fallback: download the PDF
      handleDownloadPDF();
    }
  }

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  const labelClass = "mb-1.5 block text-sm text-[var(--text-3)]";

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('invoices.new_invoice')}</h1>
          <p className="text-xs text-[var(--text-3)]">
            {step === 0 ? 'Choose template' : `${t('invoices.step')} ${step} ${t('invoices.of')} ${totalSteps}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/invoices')}
          className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          {t('common.cancel')}
        </button>
      </div>

      {/* Progress Bar */}
      {step > 0 && <div className="mb-6 flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>}

      {/* Step Content */}
      <div className="flex-1">
        {/* ===== STEP 0: TEMPLATE PICKER ===== */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--text-1)]">Choose Invoice Template</h2>
            <p className="text-sm text-[var(--text-3)]">Select a style for your invoice PDF</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Classic */}
              <button
                onClick={() => { setSelectedTemplate('classic'); setStep(1); }}
                className={`flex flex-col rounded-card border text-left transition-all hover:shadow-sm overflow-hidden ${
                  selectedTemplate === 'classic' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="h-[160px] w-full overflow-hidden bg-white relative">
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555px', position: 'absolute', top: 0, left: 0 }}>
                    <div style={{ background: '#000', color: '#fff', padding: '20px 24px', fontSize: '18px', fontWeight: 700 }}>BIZPOCKET CO.</div>
                    <div style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>INVOICE #INV/BIZ/260330-0001</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginBottom: '14px' }}>
                        <div><b style={{ color: '#000' }}>Bill To:</b><br/>Customer Corp<br/>Tokyo, Japan</div>
                        <div style={{ textAlign: 'right' }}><b style={{ color: '#000' }}>Date:</b> 2026-03-30<br/><b style={{ color: '#000' }}>Due:</b> 2026-04-29</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead><tr style={{ background: '#000', color: '#fff' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                        </tr></thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px 8px' }}>Used Vehicle — Toyota Hiace</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥850,000</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥850,000</td></tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px 8px' }}>Shipping & Export</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥120,000</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥120,000</td></tr>
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '8px', borderTop: '2px solid #000', paddingTop: '6px' }}><b>Total: ¥970,000</b></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[var(--text-1)]">Classic</p>
                  <p className="text-xs text-[var(--text-4)]">Clean, traditional layout</p>
                </div>
              </button>

              {/* Modern */}
              <button
                onClick={() => { setSelectedTemplate('modern'); setStep(1); }}
                className={`flex flex-col rounded-card border text-left transition-all hover:shadow-sm overflow-hidden ${
                  selectedTemplate === 'modern' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="h-[160px] w-full overflow-hidden bg-white relative">
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555px', position: 'absolute', top: 0, left: 0 }}>
                    <div style={{ background: '#4F46E5', color: '#fff', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>INVOICE</div>
                      <div style={{ textAlign: 'right', fontSize: '11px' }}>BizPocket Co.<br/>#INV/BIZ/260330</div>
                    </div>
                    <div style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginBottom: '14px' }}>
                        <div><b style={{ color: '#000' }}>Bill To:</b><br/>Customer Corp</div>
                        <div style={{ textAlign: 'right' }}>Date: 2026-03-30<br/>Due: 2026-04-29</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead><tr style={{ background: '#4F46E5', color: '#fff' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                        </tr></thead>
                        <tbody>
                          <tr style={{ background: '#F8F8FF' }}><td style={{ padding: '6px 8px' }}>Toyota Hiace 2024</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥850,000</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥850,000</td></tr>
                          <tr><td style={{ padding: '6px 8px' }}>Export Handling</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥120,000</td><td style={{ padding: '6px 8px', textAlign: 'right' }}>¥120,000</td></tr>
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', fontSize: '11px', marginTop: '8px', color: '#4F46E5', fontWeight: 700 }}>Total: ¥970,000</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[var(--text-1)]">Modern</p>
                  <p className="text-xs text-[var(--text-4)]">Bold indigo typography</p>
                </div>
              </button>

              {/* Japanese Style */}
              <button
                onClick={() => { setSelectedTemplate('japanese'); setStep(1); }}
                className={`flex flex-col rounded-card border text-left transition-all hover:shadow-sm overflow-hidden ${
                  selectedTemplate === 'japanese' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="h-[160px] w-full overflow-hidden bg-white relative">
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555px', position: 'absolute', top: 0, left: 0 }}>
                    <div style={{ borderTop: '4px solid #000', padding: '20px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '0.2em' }}>請求書</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>INVOICE</div>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '12px' }}>
                        <div><b>御中:</b> Customer Corp 様</div>
                        <div style={{ textAlign: 'right' }}>請求日: 2026/03/30<br/>支払期限: 2026/04/29</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000' }}>
                        <thead><tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: '5px', border: '1px solid #000', textAlign: 'left' }}>品名</th>
                          <th style={{ padding: '5px', border: '1px solid #000', textAlign: 'right' }}>数量</th>
                          <th style={{ padding: '5px', border: '1px solid #000', textAlign: 'right' }}>単価</th>
                          <th style={{ padding: '5px', border: '1px solid #000', textAlign: 'right' }}>金額</th>
                        </tr></thead>
                        <tbody>
                          <tr><td style={{ padding: '5px', border: '1px solid #ddd' }}>中古車 トヨタ ハイエース</td><td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right' }}>1</td><td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right' }}>¥850,000</td><td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right' }}>¥850,000</td></tr>
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>合計: ¥850,000</div>
                        <div style={{ width: '50px', height: '50px', border: '2px solid #DC2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontSize: '10px', fontWeight: 700 }}>印</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[var(--text-1)]">Japanese Style</p>
                  <p className="text-xs text-[var(--text-4)]">請求書 format with seal</p>
                </div>
              </button>

              {/* Compact */}
              <button
                onClick={() => { setSelectedTemplate('compact'); setStep(1); }}
                className={`flex flex-col rounded-card border text-left transition-all hover:shadow-sm overflow-hidden ${
                  selectedTemplate === 'compact' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="h-[160px] w-full overflow-hidden bg-white relative">
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555px', position: 'absolute', top: 0, left: 0 }}>
                    <div style={{ borderTop: '3px solid #16A34A', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>INVOICE</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>#INV/BIZ/260330 · 2026-03-30</div>
                    </div>
                    <div style={{ padding: '0 24px', fontSize: '9px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#666' }}>
                        <div><b style={{ color: '#000' }}>From:</b> BizPocket Co.</div>
                        <div><b style={{ color: '#000' }}>To:</b> Customer Corp</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                        <thead><tr style={{ borderBottom: '1px solid #16A34A' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left', color: '#16A34A' }}>Item</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', color: '#16A34A' }}>Qty</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', color: '#16A34A' }}>Price</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', color: '#16A34A' }}>Total</th>
                        </tr></thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '3px 6px' }}>Toyota Hiace</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>1</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥850,000</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥850,000</td></tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '3px 6px' }}>Shipping</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>1</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥120,000</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥120,000</td></tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '3px 6px' }}>Insurance</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>1</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥45,000</td><td style={{ padding: '3px 6px', textAlign: 'right' }}>¥45,000</td></tr>
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', marginTop: '6px', fontWeight: 700, color: '#16A34A', fontSize: '10px' }}>Total: ¥1,015,000</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[var(--text-1)]">Compact</p>
                  <p className="text-xs text-[var(--text-4)]">Dense, more items per page</p>
                </div>
              </button>

              {/* Export */}
              <button
                onClick={() => { setSelectedTemplate('export'); setStep(1); }}
                className={`flex flex-col rounded-card border text-left transition-all hover:shadow-sm overflow-hidden ${
                  selectedTemplate === 'export' ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="h-[160px] w-full overflow-hidden bg-white relative">
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555px', position: 'absolute', top: 0, left: 0 }}>
                    <div style={{ background: '#111', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#7C3AED', fontSize: '16px', fontWeight: 700 }}>EXPORT INVOICE</div>
                      <div style={{ color: '#999', fontSize: '10px', textAlign: 'right' }}>BizPocket Co.<br/>Tokyo, Japan</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: '#f8f8f8', fontSize: '8px', padding: '6px 24px', borderBottom: '1px solid #ddd' }}>
                      <div><b>Port:</b> Yokohama</div>
                      <div><b>Terms:</b> FOB</div>
                      <div><b>Vessel:</b> TBD</div>
                      <div><b>Country:</b> UAE</div>
                    </div>
                    <div style={{ padding: '10px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '48%' }}><b>Shipper:</b><br/>BizPocket Co.<br/>Tokyo, Japan</div>
                        <div style={{ width: '48%' }}><b>Consignee:</b><br/>Al-Rashid Motors<br/>Dubai, UAE</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                        <thead><tr style={{ background: '#7C3AED', color: '#fff' }}>
                          <th style={{ padding: '5px 6px', textAlign: 'left' }}>Vehicle</th>
                          <th style={{ padding: '5px 6px', textAlign: 'left' }}>Chassis</th>
                          <th style={{ padding: '5px 6px', textAlign: 'right' }}>Price</th>
                        </tr></thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 6px' }}>Toyota Hiace 2024</td><td style={{ padding: '4px 6px' }}>GDH-303</td><td style={{ padding: '4px 6px', textAlign: 'right' }}>$7,200</td></tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '4px 6px' }}>Suzuki Carry 2023</td><td style={{ padding: '4px 6px' }}>DA16T-K</td><td style={{ padding: '4px 6px', textAlign: 'right' }}>$3,800</td></tr>
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', marginTop: '6px', fontWeight: 700, color: '#7C3AED', fontSize: '10px' }}>Total: $11,000</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[var(--text-1)]">Export</p>
                  <p className="text-xs text-[var(--text-4)]">International trade format</p>
                </div>
              </button>
            </div>

            {/* Invoice Type Selector */}
            <div className="mt-6">
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Invoice Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'commercial', label: 'Commercial', desc: 'Goods, cars, parts', icon: '📦' },
                  { id: 'transport', label: 'Transport', desc: 'Shipping, freight', icon: '🚢' },
                  { id: 'service', label: 'Service', desc: 'Repair, consulting', icon: '🔧' },
                  { id: 'proforma', label: 'Proforma', desc: 'Estimate, quote', icon: '📋' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setInvoiceType(type.id)}
                    className={`flex items-center gap-3 rounded-[12px] border p-3 text-left transition-all ${
                      invoiceType === type.id
                        ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[#E5E5E5] bg-white hover:border-[#C5C5C5]'
                    }`}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-1)]">{type.label}</p>
                      <p className="text-[11px] text-[var(--text-4)]">{type.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 1: CUSTOMER SELECTION ===== */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--text-1)]">{t('invoices.customer')}</h2>

            {/* Search */}
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className={inputClass}
              placeholder={t('invoices.select_customer')}
            />

            {/* Customer List */}
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full rounded-card border p-3.5 text-left transition-all ${
                    selectedCustomerId === c.id
                      ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                      : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--text-1)]">{c.name}</p>
                  {c.email && <p className="text-xs text-[var(--text-4)]">{c.email}</p>}
                  {c.phone && <p className="text-xs text-[var(--text-4)]">{c.phone}</p>}
                </button>
              ))}
              {filteredCustomers.length === 0 && !showNewCustomer && (
                <p className="py-4 text-center text-sm text-[var(--text-4)]">No customers found</p>
              )}
            </div>

            {/* Add New Customer Button */}
            {!showNewCustomer && (
              <button
                onClick={() => setShowNewCustomer(true)}
                className="w-full rounded-btn border border-dashed border-[var(--accent)]/40 bg-[var(--accent-light)] py-3 text-sm font-medium text-[var(--accent)] transition-all hover:border-[var(--accent)]"
              >
                + {t('invoices.new_customer')}
              </button>
            )}

            {/* Inline New Customer Form — Slide Up */}
            {showNewCustomer && (
              <div className="animate-slide-up space-y-3 rounded-card border border-[var(--accent)]/30 bg-[var(--card-bg)] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text-1)]">{t('invoices.new_customer')}</h3>
                  <button
                    onClick={() => setShowNewCustomer(false)}
                    className="text-xs text-[var(--text-4)] hover:text-[var(--text-2)]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>

                <div>
                  <label className={labelClass}>{t('invoices.customer_name')} *</label>
                  <input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className={inputClass}
                    placeholder="Tanaka Motors"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('invoices.company')}</label>
                  <input
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    className={inputClass}
                    placeholder="ABC Trading Co."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('invoices.phone')}</label>
                    <input
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className={inputClass}
                      placeholder="090-1234-5678"
                      type="tel"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('invoices.email')}</label>
                    <input
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className={inputClass}
                      placeholder="info@company.jp"
                      type="email"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t('invoices.address')}</label>
                  <input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className={inputClass}
                    placeholder="Tokyo, Minato-ku..."
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('invoices.fax')}</label>
                  <input
                    value={newCustomer.fax}
                    onChange={(e) => setNewCustomer({ ...newCustomer, fax: e.target.value })}
                    className={inputClass}
                    placeholder="03-1234-5678"
                    type="tel"
                  />
                </div>

                <button
                  onClick={handleSaveCustomer}
                  disabled={!newCustomer.name.trim() || savingCustomer}
                  className="w-full rounded-btn bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {savingCustomer ? t('common.loading') : t('invoices.save_customer')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: INVOICE DETAILS ===== */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--text-1)]">Invoice Details</h2>

            {/* Invoice Number Preview */}
            <div className="rounded-card border border-[var(--card-border)] bg-[var(--bg-2)] p-3">
              <p className="text-xs text-[var(--text-4)]">{t('invoices.invoice_number')}</p>
              <p className="font-mono text-sm font-medium text-[var(--text-1)]">
                INV/{organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/Auto
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('invoices.invoice_date')}</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('invoices.due_date')}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Invoice Language */}
            <div>
              <label className={labelClass}>Invoice Language</label>
              <div className="flex gap-2">
                {['en', 'ja', 'ur'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setInvoiceLang(l)}
                    className={`flex-1 rounded-btn border px-3 py-2.5 text-sm transition-colors ${
                      invoiceLang === l
                        ? 'border-[var(--accent)] bg-[var(--accent-light)] font-medium text-[var(--accent)]'
                        : 'border-[var(--border-strong)] text-[var(--text-3)]'
                    }`}
                  >
                    {l === 'en' ? 'English' : l === 'ja' ? '日本語' : 'اردو'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>{t('invoices.notes')}</label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className={inputClass + ' min-h-[80px] resize-none'}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            {/* Transport-specific fields */}
            {invoiceType === 'transport' && (
              <div className="space-y-3 rounded-card border border-[#E5E5E5] bg-[var(--bg-2)] p-4">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">Shipping Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Vessel / Flight</label>
                    <input value={transportFields.vessel} onChange={(e) => setTransportFields(p => ({ ...p, vessel: e.target.value }))} className={inputClass} placeholder="MV Pacific Star" />
                  </div>
                  <div>
                    <label className={labelClass}>Shipping Terms</label>
                    <select value={transportFields.shipping_terms} onChange={(e) => setTransportFields(p => ({ ...p, shipping_terms: e.target.value }))} className={inputClass}>
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                      <option value="CFR">CFR</option>
                      <option value="EXW">EXW</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Port of Loading</label>
                    <input value={transportFields.port_loading} onChange={(e) => setTransportFields(p => ({ ...p, port_loading: e.target.value }))} className={inputClass} placeholder="Yokohama" />
                  </div>
                  <div>
                    <label className={labelClass}>Port of Discharge</label>
                    <input value={transportFields.port_discharge} onChange={(e) => setTransportFields(p => ({ ...p, port_discharge: e.target.value }))} className={inputClass} placeholder="Dubai" />
                  </div>
                  <div>
                    <label className={labelClass}>Container No.</label>
                    <input value={transportFields.container_no} onChange={(e) => setTransportFields(p => ({ ...p, container_no: e.target.value }))} className={inputClass} placeholder="MSKU1234567" />
                  </div>
                  <div>
                    <label className={labelClass}>Bill of Lading</label>
                    <input value={transportFields.bill_of_lading} onChange={(e) => setTransportFields(p => ({ ...p, bill_of_lading: e.target.value }))} className={inputClass} placeholder="BL-2026-0001" />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Customer Card */}
            {selectedCustomer && (
              <div className="rounded-card border border-[var(--accent)]/20 bg-[var(--accent-light)] p-3">
                <p className="text-xs text-[var(--text-4)]">Bill To</p>
                <p className="text-sm font-medium text-[var(--text-1)]">{selectedCustomer.name}</p>
                {selectedCustomer.address && (
                  <p className="text-xs text-[var(--text-3)]">{selectedCustomer.address}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 3: LINE ITEMS ===== */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-[var(--text-1)]">{t('invoices.items')}</h2>
              <div className="flex gap-2">
                {templates.length > 0 && (
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
                  >
                    {t('invoices.from_templates')}
                  </button>
                )}
              </div>
            </div>

            {/* Templates Picker */}
            {showTemplates && (
              <div className="animate-slide-up space-y-2 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
                <p className="text-xs font-medium text-[var(--text-3)]">{t('invoices.from_templates')}</p>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => addFromTemplate(tpl)}
                    className="w-full rounded-input border border-[var(--card-border)] bg-[var(--bg)] p-2.5 text-left transition-all hover:border-[var(--accent)]"
                  >
                    <p className="text-sm text-[var(--text-1)]">{tpl.name}</p>
                    <p className="font-mono text-xs text-[var(--text-4)]">
                      {formatCurrency(tpl.default_price, currency)} · Tax {(tpl.default_tax_rate * 100).toFixed(0)}%
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3.5"
                  onTouchStart={(e) => handleTouchStart(e, idx)}
                  onTouchEnd={(e) => handleTouchEnd(e, idx)}
                >
                  {/* Swipe delete indicator */}
                  {swipingIdx === idx && lineItems.length > 1 && (
                    <div className="absolute right-0 top-0 flex h-full items-center bg-[var(--red)] px-4">
                      <span className="text-xs font-medium text-white">{t('common.delete')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--text-4)]">#{idx + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="text-xs text-[var(--red)] hover:opacity-80"
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>

                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    placeholder={t('invoices.description')}
                    className={inputClass + ' mb-2'}
                  />

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-[var(--text-4)]">{t('invoices.quantity')}</label>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className={inputClass + ' font-mono'}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-[var(--text-4)]">{t('invoices.unit_price')}</label>
                      <input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={(e) => updateLineItem(idx, 'unit_price', parseInt(e.target.value) || 0)}
                        className={inputClass + ' font-mono'}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Tax Rate Toggle */}
                  <div className="mb-2 flex gap-1.5">
                    {TAX_RATES.map((rate) => (
                      <button
                        key={rate.value}
                        onClick={() => updateLineItem(idx, 'tax_rate', rate.value)}
                        className={`flex-1 rounded-btn border py-1.5 text-xs transition-colors ${
                          item.tax_rate === rate.value
                            ? 'border-[var(--accent)] bg-[var(--accent-light)] font-medium text-[var(--accent)]'
                            : 'border-[var(--border)] text-[var(--text-4)]'
                        }`}
                      >
                        Tax {rate.label}
                      </button>
                    ))}
                  </div>

                  {/* Chassis No (optional) */}
                  <input
                    value={item.chassis_no || ''}
                    onChange={(e) => updateLineItem(idx, 'chassis_no', e.target.value)}
                    placeholder={t('invoices.chassis_no') + ' (optional)'}
                    className="w-full rounded-input border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 text-xs text-[var(--text-3)] placeholder-[var(--text-4)]"
                  />

                  {/* Line Total */}
                  <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="text-xs text-[var(--text-4)]">
                      Tax: {formatCurrency(item.tax_amount, currency)}
                    </span>
                    <span className="font-mono text-sm font-medium text-[var(--text-1)]">
                      {formatCurrency(item.total_price, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Button */}
            <button
              onClick={addLineItem}
              className="w-full rounded-btn border border-dashed border-[var(--accent)]/40 bg-[var(--accent-light)] py-3 text-sm font-medium text-[var(--accent)] transition-all hover:border-[var(--accent)]"
            >
              + {t('invoices.add_item')}
            </button>
          </div>
        )}

        {/* ===== STEP 4: BANK DETAILS ===== */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--text-1)]">{t('invoices.bank_details')}</h2>
            <p className="text-xs text-[var(--text-4)]">Payment destination for your customer</p>

            <div>
              <label className={labelClass}>{t('invoices.bank_name')}</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="MUFG Bank" />
            </div>
            <div>
              <label className={labelClass}>{t('invoices.bank_branch')}</label>
              <input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className={inputClass} placeholder="Shibuya Branch" />
            </div>
            <div>
              <label className={labelClass}>{t('invoices.bank_account_name')}</label>
              <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className={inputClass} placeholder="MS Dynamics LLC" />
            </div>
            <div>
              <label className={labelClass}>{t('invoices.bank_account_number')}</label>
              <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={inputClass} placeholder="1234567" />
            </div>
            <div>
              <label className={labelClass}>{t('invoices.bank_account_type')}</label>
              <div className="flex gap-2">
                {['Futsu', 'Touza'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setBankAccountType(type)}
                    className={`flex-1 rounded-btn border py-2.5 text-sm transition-colors ${
                      bankAccountType === type
                        ? 'border-[var(--accent)] bg-[var(--accent-light)] font-medium text-[var(--accent)]'
                        : 'border-[var(--border-strong)] text-[var(--text-3)]'
                    }`}
                  >
                    {type === 'Futsu' ? '普通 (Futsu)' : '当座 (Touza)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 5: PREVIEW ===== */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-[var(--text-1)]">{t('invoices.preview')}</h2>

            {/* A4 Preview Card */}
            <div id="invoice-preview" className="rounded-card border border-[var(--card-border)] bg-white p-5">
              {/* Header */}
              <div className="mb-6 flex justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{organization.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">INVOICE</p>
                  <p className="font-mono text-xs text-gray-500">
                    INV/{organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/...
                  </p>
                  <p className="text-xs text-gray-500">{invoiceDate}</p>
                </div>
              </div>

              {/* Bill To */}
              {selectedCustomer && (
                <div className="mb-6 rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Bill To</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                  {selectedCustomer.address && (
                    <p className="whitespace-pre-line text-xs text-gray-600">{selectedCustomer.address}</p>
                  )}
                  {selectedCustomer.email && (
                    <p className="text-xs text-gray-600">{selectedCustomer.email}</p>
                  )}
                </div>
              )}

              {/* Items Table */}
              <table className="mb-4 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">S.No</th>
                    <th className="py-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">Particulars</th>
                    <th className="py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Qty</th>
                    <th className="py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Unit {currency === 'JPY' ? '¥' : '$'}</th>
                    <th className="py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-400">Total {currency === 'JPY' ? '¥' : '$'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.filter((i) => i.description).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-gray-600">{idx + 1}</td>
                      <td className="py-2 text-gray-900">
                        {item.description}
                        {item.chassis_no && (
                          <span className="ml-1 text-[10px] text-gray-400">[{item.chassis_no}]</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-right font-mono text-gray-600">{formatCurrency(item.unit_price, currency)}</td>
                      <td className="py-2 text-right font-mono font-medium text-gray-900">{formatCurrency(item.total_price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="ml-auto w-48 space-y-1 border-t border-gray-200 pt-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrency(taxTotal, currency)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1.5 text-sm font-bold text-gray-900">
                  <span>Grand Total</span>
                  <span className="font-mono">{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>

              {/* Bank Details */}
              {bankName && (
                <div className="mt-6 rounded bg-gray-50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Bank Details</p>
                  <p className="text-xs text-gray-700">{bankName} — {bankBranch}</p>
                  <p className="text-xs text-gray-700">{bankAccountType} {bankAccountNumber}</p>
                  <p className="text-xs text-gray-700">{bankAccountName}</p>
                </div>
              )}

              {/* Notes */}
              {invoiceNotes && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Notes</p>
                  <p className="text-xs text-gray-600">{invoiceNotes}</p>
                </div>
              )}

              {/* Due Date */}
              <div className="mt-4 text-center text-[10px] text-gray-400">
                Payment due by {dueDate} · Generated by BizPocket
              </div>
            </div>

            {/* PDF & Share Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 rounded-btn border border-[var(--border-strong)] bg-[var(--bg)] py-3 text-sm font-medium text-[var(--text-2)] transition-all hover:text-[var(--text-1)]"
              >
                {t('invoices.download_pdf')}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 rounded-btn border border-[var(--accent)] bg-[var(--accent-light)] py-3 text-sm font-medium text-[var(--accent)] transition-all hover:bg-[var(--accent)]  hover:text-white"
              >
                {t('invoices.share')}
              </button>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex-1 rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] py-3 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('invoices.save_draft')}
              </button>
              <button
                onClick={() => handleSave('sent')}
                disabled={saving}
                className="flex-1 rounded-btn bg-[var(--accent)] py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('invoices.save_send')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== STICKY BOTTOM BAR ===== */}
      <div className="sticky bottom-16 mt-4 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-lg">
        {/* Running Total */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-[var(--text-3)]">{t('invoices.total')}</span>
          <span className="font-mono text-lg font-semibold text-[var(--text-1)]">
            {formatCurrency(grandTotal, currency)}
          </span>
        </div>

        {/* Navigation */}
        {step > 0 && <div className="flex gap-2">
          {step >= 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-btn border border-[var(--border-strong)] bg-[var(--bg)] py-3 text-sm font-medium text-[var(--text-2)] transition-all hover:text-[var(--text-1)]"
            >
              {step === 1 ? 'Templates' : t('invoices.back')}
            </button>
          )}
          {step < totalSteps && (
            <button
              onClick={() => {
                if (step === 1 && !selectedCustomerId) {
                  toast('Please select a customer', 'error');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 rounded-btn bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
            >
              {t('invoices.next')}
            </button>
          )}
        </div>}
      </div>
    </div>
  );
}
