'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';
import { getBrandModeClient } from '@/lib/brand';

type ActivePanel = null | 'chat' | 'emergency';

interface Conversation {
  id: string;
  title: string;
  last_message: string;
  last_message_at: string;
  contact?: { name: string } | null;
}

interface EmergencyData {
  name_en: string;
  name_jp: string;
  address_en: string;
  address_jp: string;
  phone: string;
  blood_type: string;
  blood_rh: string;
  allergies: string;
  emergency1_name: string;
  emergency1_phone: string;
  emergency2_name: string;
  emergency2_phone: string;
  embassy: string;
  insurance: string;
}

const EMPTY_EMERGENCY: EmergencyData = {
  name_en: '', name_jp: '', address_en: '', address_jp: '',
  phone: '', blood_type: 'A', blood_rh: '+', allergies: '',
  emergency1_name: '', emergency1_phone: '',
  emergency2_name: '', emergency2_phone: '',
  embassy: '', insurance: '',
};

const EMERGENCY_KEY = 'evryai-emergency-card';

export default function PDFExportPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const supabase = createClient();
  const isPro = ['pro', 'business', 'enterprise'].includes(organization?.plan || '');
  const isEvrywher = getBrandModeClient(organization?.signup_source) === 'evrywher';

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Chat export state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [exportingChat, setExportingChat] = useState<string | null>(null);

  // Emergency card state
  const [emergency, setEmergency] = useState<EmergencyData>(EMPTY_EMERGENCY);
  const [exportingEmergency, setExportingEmergency] = useState(false);

  // Translation history
  const [exportingHistory, setExportingHistory] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load emergency data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMERGENCY_KEY);
      if (stored) setEmergency(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  const saveEmergency = (data: EmergencyData) => {
    setEmergency(data);
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(data));
  };

  // ─── Fetch chats ───
  const fetchChats = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingChats(true);
    const { data } = await supabase
      .from('conversations')
      .select('id, title, last_message, last_message_at, contact:contacts(name)')
      .eq('organization_id', organization.id)
      .order('last_message_at', { ascending: false })
      .limit(20);
    setConversations((data as Conversation[]) || []);
    setLoadingChats(false);
  }, [organization?.id, supabase]);

  useEffect(() => {
    if (activePanel === 'chat') fetchChats();
  }, [activePanel, fetchChats]);

  // ─── PDF Generation Helper ───
  const generatePDF = useCallback(async (htmlContent: string, filename: string) => {
    const html2pdf = (await import('html2pdf.js')).default;

    const watermark = !isPro
      ? '<div style="text-align:center;padding:12px;border-top:1px solid #eee;margin-top:20px;color:#999;font-size:10px;">Exported from Evrywher — evrywher.io</div>'
      : '';

    const fullHtml = `<div style="font-family:system-ui,sans-serif;color:#111;background:#fff;">${htmlContent}${watermark}</div>`;

    const container = document.createElement('div');
    container.innerHTML = fullHtml;
    document.body.appendChild(container);

    const pdf = await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .outputPdf('blob');

    document.body.removeChild(container);

    const pdfFile = new File([pdf], filename, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share({ files: [pdfFile], title: filename.replace('.pdf', '') });
    } else {
      const url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [isPro]);

  // ─── Export Chat ───
  const exportChat = useCallback(async (convo: Conversation) => {
    setExportingChat(convo.id);
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: true })
        .limit(500);

      if (!messages || messages.length === 0) {
        setExportingChat(null);
        return;
      }

      const title = convo.contact?.name || convo.title || 'Chat';
      const firstDate = new Date(messages[0].created_at).toLocaleDateString();
      const lastDate = new Date(messages[messages.length - 1].created_at).toLocaleDateString();

      const messagesHtml = messages.map(m => {
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isBot = m.sender_type === 'bot';
        return `
          <div style="margin-bottom:12px;padding:8px 12px;background:${isBot ? '#F0F4FF' : '#F8FAFC'};border-radius:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong style="font-size:13px;color:${isBot ? '#4F46E5' : '#333'};">${m.sender_name || 'Unknown'}</strong>
              <span style="font-size:11px;color:#999;">${time}</span>
            </div>
            <p style="font-size:13px;color:#333;margin:0;line-height:1.5;">${m.message || ''}</p>
            ${m.translated_content ? `<p style="font-size:12px;color:#666;margin:4px 0 0;font-style:italic;">Translation: ${m.translated_content}</p>` : ''}
          </div>
        `;
      }).join('');

      const html = `
        <div style="padding:20px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="color:#333;margin:0 0 4px;">💬 ${title}</h2>
            <p style="color:#888;font-size:12px;margin:0;">${firstDate} — ${lastDate} · ${messages.length} messages</p>
          </div>
          ${messagesHtml}
        </div>
      `;

      await generatePDF(html, `chat-${title.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('[chat-export]', err);
    } finally {
      setExportingChat(null);
    }
  }, [supabase, generatePDF]);

  // ─── Export Translation History ───
  const exportTranslationHistory = useCallback(async () => {
    setExportingHistory(true);
    try {
      // Gather from both camera and voice history
      const cameraHistory = JSON.parse(localStorage.getItem('evryai-camera-history') || '[]');
      const voiceHistory = JSON.parse(localStorage.getItem('evryai-voice-history') || '[]');

      const allItems = [
        ...cameraHistory.map((h: { result?: { original_text?: string; translated_text?: string; detected_language?: string }; timestamp?: number }) => ({
          type: 'Camera',
          original: h.result?.original_text || '',
          translated: h.result?.translated_text || '',
          language: h.result?.detected_language || '',
          time: h.timestamp,
        })),
        ...voiceHistory.map((h: { originalText?: string; translatedText?: string; fromLang?: string; timestamp?: number }) => ({
          type: 'Voice',
          original: h.originalText || '',
          translated: h.translatedText || '',
          language: h.fromLang || '',
          time: h.timestamp,
        })),
      ].sort((a, b) => (b.time || 0) - (a.time || 0));

      if (allItems.length === 0) {
        setExportingHistory(false);
        return;
      }

      const rows = allItems.map(item => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#888;">${item.type}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#555;">${item.original.slice(0, 100)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#111;">${item.translated.slice(0, 100)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px;color:#999;">${item.time ? new Date(item.time).toLocaleDateString() : ''}</td>
        </tr>
      `).join('');

      const html = `
        <div style="padding:20px;">
          <h2 style="color:#333;margin-bottom:16px;">📋 Translation History</h2>
          <p style="color:#888;font-size:12px;margin-bottom:16px;">${allItems.length} translations</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#F8FAFC;">
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;">Type</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;">Original</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;">Translation</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;">Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generatePDF(html, `translations-${Date.now()}.pdf`);
    } catch (err) {
      console.error('[history-export]', err);
    } finally {
      setExportingHistory(false);
    }
  }, [generatePDF]);

  // ─── Export Emergency Card ───
  const exportEmergencyCard = useCallback(async () => {
    setExportingEmergency(true);
    saveEmergency(emergency);

    try {
      const html = `
        <div style="padding:16px;max-width:400px;margin:0 auto;">
          <div style="background:#DC2626;color:white;text-align:center;padding:12px 16px;border-radius:12px 12px 0 0;">
            <h2 style="margin:0;font-size:18px;">EMERGENCY / 緊急連絡先</h2>
          </div>
          <div style="border:2px solid #DC2626;border-top:none;border-radius:0 0 12px 12px;padding:16px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              ${emergency.name_en ? `
                <tr>
                  <td style="padding:6px 0;color:#666;width:40%;">Name</td>
                  <td style="padding:6px 0;color:#111;font-weight:600;">${emergency.name_en}</td>
                </tr>
              ` : ''}
              ${emergency.name_jp ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">名前</td>
                  <td style="padding:6px 0;color:#111;">${emergency.name_jp}</td>
                </tr>
              ` : ''}
              ${emergency.phone ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">Phone / 電話</td>
                  <td style="padding:6px 0;color:#111;font-weight:600;">${emergency.phone}</td>
                </tr>
              ` : ''}
              ${emergency.blood_type ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">Blood Type / 血液型</td>
                  <td style="padding:6px 0;color:#DC2626;font-weight:700;font-size:16px;">${emergency.blood_type}${emergency.blood_rh}</td>
                </tr>
              ` : ''}
              ${emergency.allergies ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">Allergies / アレルギー</td>
                  <td style="padding:6px 0;color:#DC2626;font-weight:600;">${emergency.allergies}</td>
                </tr>
              ` : ''}
              ${emergency.address_en ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">Address</td>
                  <td style="padding:6px 0;color:#111;font-size:11px;">${emergency.address_en}</td>
                </tr>
              ` : ''}
              ${emergency.address_jp ? `
                <tr>
                  <td style="padding:6px 0;color:#666;">住所</td>
                  <td style="padding:6px 0;color:#111;font-size:11px;">${emergency.address_jp}</td>
                </tr>
              ` : ''}
            </table>

            ${emergency.emergency1_name || emergency.emergency2_name ? `
              <div style="border-top:1px solid #eee;margin-top:12px;padding-top:12px;">
                <p style="font-size:11px;color:#888;margin:0 0 8px;font-weight:600;">EMERGENCY CONTACTS / 緊急連絡先</p>
                ${emergency.emergency1_name ? `
                  <p style="font-size:13px;margin:0 0 4px;"><strong>${emergency.emergency1_name}</strong>: ${emergency.emergency1_phone}</p>
                ` : ''}
                ${emergency.emergency2_name ? `
                  <p style="font-size:13px;margin:0 0 4px;"><strong>${emergency.emergency2_name}</strong>: ${emergency.emergency2_phone}</p>
                ` : ''}
              </div>
            ` : ''}

            ${emergency.embassy ? `
              <div style="border-top:1px solid #eee;margin-top:12px;padding-top:12px;">
                <p style="font-size:11px;color:#888;margin:0 0 4px;">Embassy / 大使館</p>
                <p style="font-size:12px;margin:0;color:#333;">${emergency.embassy}</p>
              </div>
            ` : ''}

            ${emergency.insurance ? `
              <div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px;">
                <p style="font-size:11px;color:#888;margin:0 0 4px;">Insurance / 保険</p>
                <p style="font-size:12px;margin:0;color:#333;">${emergency.insurance}</p>
              </div>
            ` : ''}
          </div>
          <p style="text-align:center;font-size:9px;color:#bbb;margin-top:8px;">Print, cut, and keep in your wallet — evrywher.io</p>
        </div>
      `;

      await generatePDF(html, `emergency-card-${Date.now()}.pdf`);
    } catch (err) {
      console.error('[emergency-export]', err);
    } finally {
      setExportingEmergency(false);
    }
  }, [emergency, generatePDF]);

  // ─── Export Cards Data ───
  const CARDS = [
    { key: 'chat', emoji: '💬', label: 'Chat Export', desc: 'Export any conversation as PDF', color: 'bg-indigo-600', action: () => setActivePanel('chat') },
    { key: 'docs', emoji: '📄', label: 'Scanned Documents', desc: 'Your translated documents', color: 'bg-cyan-600', action: () => router.push('/ai/documents') },
    { key: 'cards', emoji: '💳', label: 'Business Cards', desc: 'Saved card scans', color: 'bg-amber-600', action: () => router.push('/ai/card-scanner') },
    { key: 'history', emoji: '📋', label: 'Translation History', desc: 'Your recent translations', color: 'bg-emerald-600', action: exportTranslationHistory, loading: exportingHistory },
    { key: 'emergency', emoji: '🆘', label: 'Emergency Card', desc: 'Personal info card for Japan', color: 'bg-red-600', action: () => setActivePanel('emergency') },
    ...(!isEvrywher ? [{ key: 'invoices', emoji: '🧾', label: 'Invoices', desc: 'Export invoices as PDF', color: 'bg-purple-600', action: () => router.push('/invoices') }] : []),
  ];

  // ═══════════════════════════════════════
  //  CHAT EXPORT PANEL
  // ═══════════════════════════════════════
  if (activePanel === 'chat') {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Export Chat</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
          {loadingChats ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">No conversations found</p>
          ) : (
            <div className="space-y-2">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => exportChat(c)}
                  disabled={exportingChat === c.id}
                  className="w-full text-left bg-slate-800/60 rounded-xl px-4 py-3.5 border border-slate-700/50 active:bg-slate-800 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <MessageCircle size={18} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {c.contact?.name || c.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{c.last_message || 'No messages'}</p>
                  </div>
                  {exportingChat === c.id ? (
                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shrink-0" />
                  ) : (
                    <Download size={16} className="text-slate-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  EMERGENCY CARD PANEL
  // ═══════════════════════════════════════
  if (activePanel === 'emergency') {
    const updateField = (key: keyof EmergencyData, value: string) => {
      const updated = { ...emergency, [key]: value };
      saveEmergency(updated);
    };

    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
          <div className="pt-3 pb-3">
            <button onClick={() => setActivePanel(null)} className="p-1 -ml-1 text-white active:opacity-60">
              <ArrowLeft size={22} />
            </button>
          </div>
          <h1 className="text-white text-sm font-semibold flex-1 pt-3 pb-3">Emergency Card</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
          <p className="text-xs text-slate-400 mb-4">Fill in your details. This generates a credit-card-sized PDF you can print and keep in your wallet.</p>

          <div className="space-y-3">
            {/* Name */}
            <Field label="Full Name (English)" value={emergency.name_en} onChange={v => updateField('name_en', v)} />
            <Field label="Full Name (日本語)" value={emergency.name_jp} onChange={v => updateField('name_jp', v)} />

            {/* Address */}
            <Field label="Address (English)" value={emergency.address_en} onChange={v => updateField('address_en', v)} />
            <Field label="Address (日本語)" value={emergency.address_jp} onChange={v => updateField('address_jp', v)} />

            {/* Phone */}
            <Field label="Phone Number" value={emergency.phone} onChange={v => updateField('phone', v)} />

            {/* Blood type */}
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                <p className="text-[11px] text-slate-500 mb-1.5">Blood Type / 血液型</p>
                <div className="flex gap-1.5">
                  {['A', 'B', 'O', 'AB'].map(bt => (
                    <button
                      key={bt}
                      onClick={() => updateField('blood_type', bt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                        emergency.blood_type === bt ? 'bg-red-600 text-white' : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-20 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                <p className="text-[11px] text-slate-500 mb-1.5">Rh</p>
                <div className="flex gap-1">
                  {['+', '-'].map(rh => (
                    <button
                      key={rh}
                      onClick={() => updateField('blood_rh', rh)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                        emergency.blood_rh === rh ? 'bg-red-600 text-white' : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {rh}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Allergies */}
            <Field label="Allergies / アレルギー" value={emergency.allergies} onChange={v => updateField('allergies', v)} placeholder="e.g. Penicillin, shellfish" />

            {/* Emergency contacts */}
            <div className="border-t border-slate-700/50 pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Emergency Contacts</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Contact 1 Name" value={emergency.emergency1_name} onChange={v => updateField('emergency1_name', v)} /></div>
              <div className="flex-1"><Field label="Phone" value={emergency.emergency1_phone} onChange={v => updateField('emergency1_phone', v)} /></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Contact 2 Name" value={emergency.emergency2_name} onChange={v => updateField('emergency2_name', v)} /></div>
              <div className="flex-1"><Field label="Phone" value={emergency.emergency2_phone} onChange={v => updateField('emergency2_phone', v)} /></div>
            </div>

            {/* Embassy + Insurance */}
            <Field label="Embassy / 大使館" value={emergency.embassy} onChange={v => updateField('embassy', v)} placeholder="e.g. US Embassy Tokyo: 03-3224-5000" />
            <Field label="Insurance Info / 保険" value={emergency.insurance} onChange={v => updateField('insurance', v)} placeholder="e.g. National Health Insurance #..." />
          </div>
        </div>

        {/* Export button */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
          <button
            onClick={exportEmergencyCard}
            disabled={exportingEmergency || !emergency.name_en}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm active:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exportingEmergency ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exportingEmergency ? 'Generating...' : 'Export Emergency Card PDF'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  MAIN GRID
  // ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] border-b border-slate-800">
        <div className="pt-3 pb-3">
          <button onClick={() => router.push('/ai')} className="p-1 -ml-1 text-white active:opacity-60">
            <ArrowLeft size={22} />
          </button>
        </div>
        <div className="flex-1 pt-3 pb-3">
          <h1 className="text-white text-sm font-semibold">PDF Export</h1>
          <p className="text-[10px] text-slate-500">Export, share & print anything</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
        {/* Hero */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mb-3 shadow-lg">
            <Download size={24} className="text-white" />
          </div>
          <p className="text-sm text-slate-400 text-center max-w-[240px]">
            Export conversations, documents, and cards as PDF
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(card => (
            <button
              key={card.key}
              onClick={card.action}
              disabled={'loading' in card && card.loading}
              className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left active:bg-slate-800 active:border-indigo-500/30 transition-colors disabled:opacity-50"
            >
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <span className="text-xl">{card.emoji}</span>
              </div>
              <p className="text-sm font-semibold text-white mb-0.5">{card.label}</p>
              <p className="text-[11px] text-slate-500 leading-snug">{card.desc}</p>
              {'loading' in card && card.loading && (
                <div className="mt-2 w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div ref={printRef} className="hidden" />
    </div>
  );
}

/* ---------- Reusable Field ---------- */

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
      <p className="text-[11px] text-slate-500 mb-1.5">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-white text-sm outline-none border-b border-transparent focus:border-indigo-500/50 pb-0.5 transition-colors placeholder:text-slate-600"
      />
    </div>
  );
}
