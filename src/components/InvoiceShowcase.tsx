'use client';

import { useState } from 'react';

const TEMPLATES = [
  { name: 'Classic', bg: '#ffffff', border: '1px solid #e5e7eb', headerColor: '#111827', bodyBg: '#f9fafb', totalBorder: '#111827', textColor: '#111827', subColor: '#6b7280', labelColor: '#9ca3af' },
  { name: 'Modern', bg: '#ffffff', border: '1px solid #e5e7eb', borderLeft: '4px solid #4F46E5', headerColor: '#4F46E5', bodyBg: '#eef2ff', totalBorder: '#4F46E5', textColor: '#111827', subColor: '#6b7280', labelColor: '#4F46E5' },
  { name: 'Japanese', bg: '#fefce8', border: '1px solid #fef08a', headerColor: '#92400e', bodyBg: '#fffbeb', totalBorder: '#92400e', textColor: '#111827', subColor: '#6b7280', labelColor: '#92400e', showTNumber: true },
  { name: 'Compact', bg: '#f9fafb', border: '1px solid #e5e7eb', headerColor: '#374151', bodyBg: '#f3f4f6', totalBorder: '#374151', textColor: '#374151', subColor: '#6b7280', labelColor: '#9ca3af', compact: true },
  { name: 'Bold', bg: '#111827', border: '2px solid #F59E0B', headerColor: '#ffffff', bodyBg: '#1e293b', totalBorder: '#F59E0B', textColor: '#ffffff', subColor: '#94a3b8', labelColor: '#F59E0B', dark: true },
  { name: 'Export' }, { name: 'Elegant' }, { name: 'Receipt' }, { name: 'Corporate' }, { name: 'Minimal' },
];

export default function InvoiceShowcase() {
  const [active, setActive] = useState('Classic');
  const t = TEMPLATES.find(t => t.name === active) || TEMPLATES[0];
  const hasStyle = !!t.bg;

  return (
    <div className="bg-slate-800 rounded-[20px] p-6">
      <div className="rounded-[14px] overflow-hidden" style={{ background: hasStyle ? t.bg : '#fff', border: t.border || '1px solid #e5e7eb', borderLeft: t.borderLeft, transition: 'all 0.3s ease' }}>
        <div className="flex justify-between items-start" style={{ padding: t.compact ? '14px 16px 10px' : '20px 20px 14px', borderBottom: '1px solid ' + (t.dark ? '#334155' : '#f3f4f6') }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: t.labelColor || '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>INVOICE</p>
            <p style={{ margin: '4px 0 0', fontSize: t.compact ? 14 : 16, fontWeight: 700, color: t.headerColor || '#111827' }}>INV/PDJ/260402-042</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: t.subColor || '#9ca3af' }}>April 2, 2026</p>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: 100, background: t.dark ? '#065f46' : '#f0fdf4', fontSize: 12, fontWeight: 600, color: t.dark ? '#4ade80' : '#16a34a' }}>PAID</span>
        </div>
        <div style={{ padding: t.compact ? 14 : 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: t.compact ? 12 : 20 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: t.labelColor, fontWeight: 600, textTransform: 'uppercase' }}>From</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: t.textColor }}>Premium Drives Japan</p>
              <p style={{ margin: 0, fontSize: 12, color: t.subColor }}>Nagoya, Japan</p>
              {(t.showTNumber || active === 'Classic') && <p style={{ margin: 0, fontSize: 11, color: t.labelColor }}>登録番号: T1234567890123</p>}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: t.labelColor, fontWeight: 600, textTransform: 'uppercase' }}>To</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: t.textColor }}>Al-Rashid Motors</p>
              <p style={{ margin: 0, fontSize: 12, color: t.subColor }}>Karachi, Pakistan</p>
            </div>
          </div>
          <div style={{ background: t.bodyBg, borderRadius: 10, padding: t.compact ? '8px 10px' : '10px 12px', marginBottom: t.compact ? 10 : 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid ' + (t.dark ? '#334155' : '#f3f4f6') }}>
              <span style={{ color: t.subColor }}>Toyota Alphard 2022 — White</span>
              <span style={{ fontWeight: 600, color: t.textColor }}>¥850,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid ' + (t.dark ? '#334155' : '#f3f4f6') }}>
              <span style={{ color: t.subColor }}>Full inspection + repair</span>
              <span style={{ fontWeight: 600, color: t.textColor }}>¥85,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: t.subColor }}>
              <span>Tax (10%)</span><span>¥93,500</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: t.compact ? 8 : 12, borderTop: '2px solid ' + t.totalBorder }}>
            <span style={{ fontSize: t.compact ? 14 : 16, fontWeight: 700, color: t.textColor }}>Total</span>
            <span style={{ fontSize: t.compact ? 14 : 16, fontWeight: 700, color: t.textColor }}>¥1,028,500</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
        {TEMPLATES.map((tpl) => (
          <button key={tpl.name} onClick={() => tpl.bg && setActive(tpl.name)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${active === tpl.name ? 'bg-[#4F46E5] text-white' : tpl.bg ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-[#4F46E5] cursor-pointer' : 'bg-slate-800 text-[#d1d5db] border border-slate-700 cursor-default'}`}>
            {tpl.name}
          </button>
        ))}
      </div>
    </div>
  );
}
