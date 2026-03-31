'use client';

interface InvoiceData {
  invoice_number: string;
  date: string;
  due_date?: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_tax_number?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  currency: string;
  notes?: string;
  status?: string;
}

function fmt(amount: number, currency: string): string {
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 }).format(amount);
}

/* ═══════════════════════════════════════════
   TEMPLATE 01: CLASSIC
   Clean black & white, professional, timeless
   ═══════════════════════════════════════════ */
function ClassicTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-[#0A0A0A] text-white px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">{data.company_name}</h1>
          {data.company_address && <p className="text-xs text-white/60 mt-1">{data.company_address}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-widest">INVOICE</p>
          <p className="text-xs text-white/60 mt-1">{data.invoice_number}</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">Bill To</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.customer_name}</p>
            {data.customer_address && <p className="text-xs text-[#666] mt-0.5">{data.customer_address}</p>}
            {data.customer_phone && <p className="text-xs text-[#666]">{data.customer_phone}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div><span className="text-[10px] text-[#999]">Date: </span><span className="text-xs text-[#0A0A0A]">{data.date}</span></div>
              {data.due_date && <div><span className="text-[10px] text-[#999]">Due: </span><span className="text-xs text-[#0A0A0A]">{data.due_date}</span></div>}
              {data.company_tax_number && <div><span className="text-[10px] text-[#999]">Tax ID: </span><span className="text-xs text-[#0A0A0A]">{data.company_tax_number}</span></div>}
            </div>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="bg-[#0A0A0A] text-white">
              <th className="text-left text-[10px] font-semibold px-3 py-2.5 uppercase tracking-wider">Description</th>
              <th className="text-center text-[10px] font-semibold px-3 py-2.5 uppercase tracking-wider w-16">Qty</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2.5 uppercase tracking-wider w-28">Unit Price</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2.5 uppercase tracking-wider w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#E5E5E5]">
                <td className="text-sm text-[#0A0A0A] px-3 py-3">{item.description}</td>
                <td className="text-sm text-[#0A0A0A] text-center px-3 py-3">{item.quantity}</td>
                <td className="text-sm text-[#0A0A0A] text-right px-3 py-3 font-mono">{fmt(item.unit_price, data.currency)}</td>
                <td className="text-sm text-[#0A0A0A] text-right px-3 py-3 font-mono">{fmt(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-1.5 text-sm text-[#666]">
              <span>Subtotal</span><span className="font-mono">{fmt(data.subtotal, data.currency)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm text-[#666]">
              <span>Tax ({(data.tax_rate * 100).toFixed(0)}%)</span><span className="font-mono">{fmt(data.tax_amount, data.currency)}</span>
            </div>
            <div className="flex justify-between py-2.5 border-t-2 border-[#0A0A0A] text-base font-bold text-[#0A0A0A]">
              <span>Total</span><span className="font-mono">{fmt(data.grand_total, data.currency)}</span>
            </div>
          </div>
        </div>

        {data.bank_name && (
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Payment Details</p>
            <div className="text-xs text-[#666] space-y-0.5">
              <p>Bank: {data.bank_name} {data.bank_branch && `(${data.bank_branch})`}</p>
              {data.bank_account_name && <p>Account: {data.bank_account_name}</p>}
              {data.bank_account_number && <p>Number: {data.bank_account_number}</p>}
            </div>
          </div>
        )}

        {data.notes && (
          <div className="mt-4 border-t border-[#E5E5E5] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">Notes</p>
            <p className="text-xs text-[#666]">{data.notes}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-[9px] text-[#BBB]">Generated by BizPocket &middot; bizpocket.io</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATE 02: MODERN
   Indigo accent, bold typography, gradient header
   ═══════════════════════════════════════════ */
function ModernTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white px-8 py-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-3xl font-bold">INVOICE</p>
            <p className="text-sm text-white/70 mt-1">{data.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{data.company_name}</p>
            {data.company_address && <p className="text-xs text-white/60 mt-0.5">{data.company_address}</p>}
            {data.company_phone && <p className="text-xs text-white/60">{data.company_phone}</p>}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex gap-4 mb-6 bg-[#F8F7FF] rounded-lg p-3">
          <div><span className="text-[10px] text-[#7C3AED] font-semibold">ISSUED</span><p className="text-sm text-[#0A0A0A] font-medium">{data.date}</p></div>
          {data.due_date && <div><span className="text-[10px] text-[#7C3AED] font-semibold">DUE</span><p className="text-sm text-[#0A0A0A] font-medium">{data.due_date}</p></div>}
          {data.status && <div className="ml-auto"><span className="text-[10px] text-[#7C3AED] font-semibold">STATUS</span><p className="text-sm text-[#0A0A0A] font-medium uppercase">{data.status}</p></div>}
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] mb-1">Billed To</p>
          <p className="text-sm font-semibold text-[#0A0A0A]">{data.customer_name}</p>
          {data.customer_address && <p className="text-xs text-[#666]">{data.customer_address}</p>}
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="bg-[#4F46E5] text-white">
              <th className="text-left text-[10px] font-semibold px-3 py-2.5 rounded-tl-lg">Item</th>
              <th className="text-center text-[10px] font-semibold px-3 py-2.5 w-16">Qty</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2.5 w-28">Rate</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2.5 w-28 rounded-tr-lg">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#FAFAFE]' : 'bg-white'}>
                <td className="text-sm text-[#0A0A0A] px-3 py-3">{item.description}</td>
                <td className="text-sm text-center px-3 py-3">{item.quantity}</td>
                <td className="text-sm text-right px-3 py-3 font-mono text-[#666]">{fmt(item.unit_price, data.currency)}</td>
                <td className="text-sm text-right px-3 py-3 font-mono font-medium">{fmt(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64 bg-[#F8F7FF] rounded-lg p-4">
            <div className="flex justify-between py-1 text-sm text-[#666]">
              <span>Subtotal</span><span className="font-mono">{fmt(data.subtotal, data.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-[#666]">
              <span>Tax ({(data.tax_rate * 100).toFixed(0)}%)</span><span className="font-mono">{fmt(data.tax_amount, data.currency)}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-[#4F46E5]/20 text-lg font-bold text-[#4F46E5]">
              <span>Total</span><span className="font-mono">{fmt(data.grand_total, data.currency)}</span>
            </div>
          </div>
        </div>

        {data.bank_name && (
          <div className="border-t border-[#E5E5E5] pt-4 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] mb-2">Payment Details</p>
            <div className="text-xs text-[#666] space-y-0.5">
              <p>{data.bank_name} {data.bank_branch && `\u00B7 ${data.bank_branch}`}</p>
              {data.bank_account_name && <p>{data.bank_account_name}</p>}
              {data.bank_account_number && <p>{data.bank_account_number}</p>}
            </div>
          </div>
        )}

        {data.notes && <p className="text-xs text-[#999] italic mt-2">{data.notes}</p>}
        <p className="text-[9px] text-[#CCC] text-center mt-8">Powered by BizPocket &middot; bizpocket.io</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATE 03: JAPANESE STYLE
   Traditional Japanese business invoice with hanko seal
   ═══════════════════════════════════════════ */
function JapaneseTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif" }}>
      <div className="h-1 bg-[#0A0A0A]" />
      <div className="px-8 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-[0.3em] text-[#0A0A0A]">{'\u8ACB\u6C42\u66F8'}</h1>
          <p className="text-[10px] text-[#999] mt-1 tracking-widest">INVOICE</p>
        </div>

        <div className="flex justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.customer_name} <span className="text-[#999]">{'\u69D8'}</span></p>
            {data.customer_address && <p className="text-xs text-[#666] mt-0.5">{data.customer_address}</p>}
          </div>
          <div className="text-right flex items-start gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0A0A0A]">{data.company_name}</p>
              {data.company_address && <p className="text-xs text-[#666] mt-0.5">{data.company_address}</p>}
              {data.company_phone && <p className="text-xs text-[#666]">TEL: {data.company_phone}</p>}
              {data.company_tax_number && <p className="text-xs text-[#666]">{'\u767B\u9332\u756A\u53F7'}: {data.company_tax_number}</p>}
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-[#DC2626] flex items-center justify-center shrink-0">
              <span className="text-[#DC2626] text-xs font-bold" style={{ writingMode: 'vertical-rl' }}>
                {data.company_name.slice(0, 3)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between mb-4 text-xs">
          <div><span className="text-[#999]">{'\u8ACB\u6C42\u66F8\u756A\u53F7'}: </span><span className="text-[#0A0A0A]">{data.invoice_number}</span></div>
          <div><span className="text-[#999]">{'\u8ACB\u6C42\u65E5'}: </span><span className="text-[#0A0A0A]">{data.date}</span></div>
          {data.due_date && <div><span className="text-[#999]">{'\u652F\u6255\u671F\u9650'}: </span><span className="text-[#0A0A0A]">{data.due_date}</span></div>}
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded p-3 mb-6 flex justify-between items-center">
          <span className="text-sm font-semibold text-[#0A0A0A]">{'\u3054\u8ACB\u6C42\u91D1\u984D'}</span>
          <span className="text-xl font-bold text-[#0A0A0A] font-mono">{fmt(data.grand_total, data.currency)}</span>
        </div>

        <table className="w-full mb-6 border border-[#0A0A0A]">
          <thead>
            <tr className="bg-[#F5F5F5]">
              <th className="text-left text-[10px] font-semibold px-3 py-2 border border-[#DDD]">{'\u54C1\u540D'} / Description</th>
              <th className="text-center text-[10px] font-semibold px-3 py-2 border border-[#DDD] w-14">{'\u6570\u91CF'}</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2 border border-[#DDD] w-24">{'\u5358\u4FA1'}</th>
              <th className="text-right text-[10px] font-semibold px-3 py-2 border border-[#DDD] w-24">{'\u91D1\u984D'}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i}>
                <td className="text-sm px-3 py-2.5 border border-[#DDD]">{item.description}</td>
                <td className="text-sm text-center px-3 py-2.5 border border-[#DDD]">{item.quantity}</td>
                <td className="text-sm text-right px-3 py-2.5 border border-[#DDD] font-mono">{fmt(item.unit_price, data.currency)}</td>
                <td className="text-sm text-right px-3 py-2.5 border border-[#DDD] font-mono">{fmt(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-56">
            <div className="flex justify-between py-1 text-xs"><span className="text-[#666]">{'\u5C0F\u8A08'}</span><span className="font-mono">{fmt(data.subtotal, data.currency)}</span></div>
            <div className="flex justify-between py-1 text-xs"><span className="text-[#666]">{'\u6D88\u8CBB\u7A0E'} ({(data.tax_rate * 100).toFixed(0)}%)</span><span className="font-mono">{fmt(data.tax_amount, data.currency)}</span></div>
            <div className="flex justify-between py-2 border-t-2 border-[#0A0A0A] text-sm font-bold"><span>{'\u5408\u8A08'}</span><span className="font-mono">{fmt(data.grand_total, data.currency)}</span></div>
          </div>
        </div>

        {data.bank_name && (
          <div className="border border-[#E5E5E5] rounded p-3 mb-4">
            <p className="text-[10px] font-semibold text-[#999] mb-1">{'\u304A\u632F\u8FBC\u5148'}</p>
            <div className="text-xs text-[#0A0A0A] space-y-0.5">
              <p>{data.bank_name}{data.bank_branch ? ` ${data.bank_branch}` : ''}</p>
              {data.bank_account_name && <p>{'\u53E3\u5EA7\u540D\u7FA9'}: {data.bank_account_name}</p>}
              {data.bank_account_number && <p>{'\u53E3\u5EA7\u756A\u53F7'}: {data.bank_account_number}</p>}
            </div>
          </div>
        )}

        {data.notes && <p className="text-xs text-[#999] mt-2">{'\u5099\u8003'}: {data.notes}</p>}
        <p className="text-[9px] text-[#CCC] text-center mt-8">BizPocket &middot; bizpocket.io</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATE 04: COMPACT
   Minimal, space-efficient, green accent
   ═══════════════════════════════════════════ */
function CompactTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="border-t-[3px] border-[#16A34A]" />
      <div className="px-6 py-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A]">{data.company_name}</p>
            {data.company_address && <p className="text-[10px] text-[#999]">{data.company_address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">Invoice</p>
            <p className="text-[10px] text-[#999]">{data.invoice_number} &middot; {data.date}</p>
          </div>
        </div>

        <div className="flex gap-8 mb-4 text-xs">
          <div>
            <span className="text-[10px] text-[#16A34A] font-semibold uppercase">From</span>
            <p className="text-[#0A0A0A] font-medium">{data.company_name}</p>
            {data.company_phone && <p className="text-[#999]">{data.company_phone}</p>}
          </div>
          <div>
            <span className="text-[10px] text-[#16A34A] font-semibold uppercase">To</span>
            <p className="text-[#0A0A0A] font-medium">{data.customer_name}</p>
            {data.customer_phone && <p className="text-[#999]">{data.customer_phone}</p>}
          </div>
        </div>

        <div className="border-t border-b border-[#E5E5E5] mb-4">
          <div className="flex text-[9px] font-semibold uppercase tracking-wider text-[#999] py-1.5 px-2">
            <span className="flex-1">Description</span>
            <span className="w-12 text-center">Qty</span>
            <span className="w-20 text-right">Price</span>
            <span className="w-20 text-right">Total</span>
          </div>
          {data.items.map((item, i) => (
            <div key={i} className="flex text-xs py-2 px-2 border-t border-[#F5F5F5]">
              <span className="flex-1 text-[#0A0A0A]">{item.description}</span>
              <span className="w-12 text-center text-[#666]">{item.quantity}</span>
              <span className="w-20 text-right font-mono text-[#666]">{fmt(item.unit_price, data.currency)}</span>
              <span className="w-20 text-right font-mono font-medium text-[#0A0A0A]">{fmt(item.total, data.currency)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end mb-4">
          <div className="text-xs space-y-1">
            <div className="flex gap-8"><span className="text-[#999]">Subtotal</span><span className="font-mono w-20 text-right">{fmt(data.subtotal, data.currency)}</span></div>
            <div className="flex gap-8"><span className="text-[#999]">Tax</span><span className="font-mono w-20 text-right">{fmt(data.tax_amount, data.currency)}</span></div>
            <div className="flex gap-8 pt-1 border-t border-[#16A34A] font-bold text-[#16A34A]"><span>Total</span><span className="font-mono w-20 text-right">{fmt(data.grand_total, data.currency)}</span></div>
          </div>
        </div>

        {data.bank_name && (
          <div className="text-[10px] text-[#999] border-t border-[#F5F5F5] pt-2">
            Pay to: {data.bank_name}{data.bank_branch ? ` (${data.bank_branch})` : ''}{data.bank_account_name ? ` \u00B7 ${data.bank_account_name}` : ''}{data.bank_account_number ? ` \u00B7 ${data.bank_account_number}` : ''}
          </div>
        )}
        {data.notes && <p className="text-[10px] text-[#999] mt-1">{data.notes}</p>}
        <p className="text-[8px] text-[#DDD] text-center mt-4">BizPocket &middot; bizpocket.io</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATE 05: EXPORT
   International trade focused, dark header
   ═══════════════════════════════════════════ */
function ExportTemplate({ data }: { data: InvoiceData }) {
  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-[#1E293B] text-white px-8 py-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-[#94A3B8]">COMMERCIAL INVOICE</p>
            <p className="text-xl font-bold mt-0.5">{data.company_name}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-bold">{data.invoice_number}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">{data.date}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-[#E2E8F0] rounded p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">Seller / Exporter</p>
            <p className="text-sm font-semibold text-[#0F172A]">{data.company_name}</p>
            {data.company_address && <p className="text-xs text-[#64748B] mt-0.5">{data.company_address}</p>}
            {data.company_phone && <p className="text-xs text-[#64748B]">Tel: {data.company_phone}</p>}
            {data.company_tax_number && <p className="text-xs text-[#64748B]">Tax ID: {data.company_tax_number}</p>}
          </div>
          <div className="border border-[#E2E8F0] rounded p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">Buyer / Importer</p>
            <p className="text-sm font-semibold text-[#0F172A]">{data.customer_name}</p>
            {data.customer_address && <p className="text-xs text-[#64748B] mt-0.5">{data.customer_address}</p>}
            {data.customer_phone && <p className="text-xs text-[#64748B]">Tel: {data.customer_phone}</p>}
          </div>
        </div>

        <div className="flex gap-6 mb-4 text-xs">
          {data.due_date && (
            <div className="flex-1 bg-[#F8FAFC] rounded p-2"><span className="text-[9px] text-[#94A3B8] uppercase font-semibold">Payment Terms</span><p className="text-[#0F172A] font-medium">Due: {data.due_date}</p></div>
          )}
          <div className="flex-1 bg-[#F8FAFC] rounded p-2"><span className="text-[9px] text-[#94A3B8] uppercase font-semibold">Currency</span><p className="text-[#0F172A] font-medium">{data.currency}</p></div>
        </div>

        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-[#1E293B] text-white">
              <th className="text-left text-[9px] font-semibold px-3 py-2 uppercase tracking-wider">Description of Goods</th>
              <th className="text-center text-[9px] font-semibold px-3 py-2 w-14">Qty</th>
              <th className="text-right text-[9px] font-semibold px-3 py-2 w-28">Unit Value</th>
              <th className="text-right text-[9px] font-semibold px-3 py-2 w-28">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#E2E8F0]">
                <td className="px-3 py-2.5 text-[#0F172A]">{item.description}</td>
                <td className="text-center px-3 py-2.5 text-[#64748B]">{item.quantity}</td>
                <td className="text-right px-3 py-2.5 font-mono text-[#64748B]">{fmt(item.unit_price, data.currency)}</td>
                <td className="text-right px-3 py-2.5 font-mono font-medium text-[#0F172A]">{fmt(item.total, data.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64 border border-[#E2E8F0] rounded overflow-hidden">
            <div className="flex justify-between px-3 py-1.5 text-xs text-[#64748B] bg-[#F8FAFC]"><span>Subtotal</span><span className="font-mono">{fmt(data.subtotal, data.currency)}</span></div>
            <div className="flex justify-between px-3 py-1.5 text-xs text-[#64748B]"><span>Tax ({(data.tax_rate * 100).toFixed(0)}%)</span><span className="font-mono">{fmt(data.tax_amount, data.currency)}</span></div>
            <div className="flex justify-between px-3 py-2 text-sm font-bold bg-[#1E293B] text-white"><span>Total Due</span><span className="font-mono">{fmt(data.grand_total, data.currency)}</span></div>
          </div>
        </div>

        {data.bank_name && (
          <div className="border border-[#E2E8F0] rounded p-3 mb-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">Remittance Instructions</p>
            <div className="text-xs text-[#64748B] space-y-0.5">
              <p>Bank: {data.bank_name} {data.bank_branch && `(${data.bank_branch})`}</p>
              {data.bank_account_name && <p>Beneficiary: {data.bank_account_name}</p>}
              {data.bank_account_number && <p>Account: {data.bank_account_number}</p>}
            </div>
          </div>
        )}

        {data.notes && <p className="text-xs text-[#94A3B8] mt-2">{data.notes}</p>}
        <p className="text-[8px] text-[#CBD5E1] text-center mt-8">Generated by BizPocket &middot; bizpocket.io</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEMPLATE REGISTRY
   ═══════════════════════════════════════════ */
export const TEMPLATES: Record<string, { name: string; description: string; Component: React.FC<{ data: InvoiceData }> }> = {
  classic: { name: 'Classic', description: 'Clean, traditional, black & white', Component: ClassicTemplate },
  modern: { name: 'Modern', description: 'Bold indigo gradient, professional', Component: ModernTemplate },
  japanese: { name: 'Japanese Style', description: '\u8ACB\u6C42\u66F8 format with hanko seal', Component: JapaneseTemplate },
  compact: { name: 'Compact', description: 'Minimal, space-efficient', Component: CompactTemplate },
  export: { name: 'Export', description: 'International trade, commercial invoice', Component: ExportTemplate },
};

export type { InvoiceData };
export { ClassicTemplate, ModernTemplate, JapaneseTemplate, CompactTemplate, ExportTemplate };
