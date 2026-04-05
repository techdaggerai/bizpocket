'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface DetectionResult {
  document_type: string;
  document_type_local: string;
  confidence: string;
  original_language: string;
  key_info: {
    amounts: string[];
    dates: string[];
    parties: string[];
    reference_numbers: string[];
  };
  translation: string;
  explanation: string;
  suggested_action: string;
  urgency: string;
  category: string;
}

export default function DetectPage() {
  const { user, profile, organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingPlanner, setAddingPlanner] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, setContacts] = useState<any[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Load contacts for "Send to Contact"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { supabase.from('contacts').select('id, name, contact_type').eq('organization_id', organization.id).order('name').then(({ data }) => setContacts(data || [])); }, [organization.id]);

  async function handleSendToContact(contactId: string) {
    if (!result || !originalFile) return;
    setSendingTo(contactId);
    let convoId;
    const { data: existing } = await supabase.from('conversations')
      .select('id').eq('organization_id', organization.id).eq('contact_id', contactId).limit(1).maybeSingle();
    if (existing) {
      convoId = existing.id;
      await supabase.from('conversations').update({ last_message: 'Document shared', last_message_at: new Date().toISOString() }).eq('id', existing.id);
    }
    else {
      const contact = contacts.find(c => c.id === contactId);
      const { data: newConvo } = await supabase.from('conversations').insert({
        organization_id: organization.id, contact_id: contactId,
        title: contact?.name || 'Contact', last_message: 'Document shared',
        last_message_at: new Date().toISOString(),
      }).select('id').single();
      convoId = newConvo?.id;
    }
    if (!convoId) { toast('Failed to create conversation', 'error'); setSendingTo(null); return; }
    const path = `${organization.id}/detect/${Date.now()}-${originalFile.name}`;
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, originalFile);
    if (uploadErr) { toast('Upload failed', 'error'); setSendingTo(null); return; }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const reportText = `AI Document Report\n\nType: ${result.document_type}\nCategory: ${result.category}\n\n${result.translation}\n\nSuggested Action: ${result.suggested_action}`;
    await supabase.from('messages').insert({
      conversation_id: convoId, organization_id: organization.id,
      sender_type: 'owner', sender_name: profile.full_name || profile.name || 'Owner',
      message: reportText, message_type: 'document', attachment_url: urlData.publicUrl,
    });
    toast('Sent to contact!', 'success');
    setSendingTo(null); setShowContactPicker(false);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'error');
      return;
    }

    setOriginalFile(file);
    setResult(null);
    setMediaType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  async function handleDetect() {
    if (!imageBase64) return;

    setDetecting(true);
    try {
      const res = await fetch('/api/ai/detect-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType,
          language: profile.language || 'en',
          organizationId: organization.id,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
      } else if (data.result) {
        setResult(data.result);
      }
    } catch {
      toast('Detection failed. Please try again.', 'error');
    }
    setDetecting(false);
  }

  async function handleSaveToVault() {
    if (!originalFile || !result) return;
    setSaving(true);

    const ext = originalFile.name.split('.').pop();
    const path = `${organization.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, originalFile);

    if (uploadError) {
      toast(uploadError.message, 'error');
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

    const { error: dbError } = await supabase.from('documents').insert({
      organization_id: organization.id,
      file_url: urlData.publicUrl,
      title: result.document_type,
      category: result.category === 'tax' ? 'Receipt' : result.category === 'financial' ? 'Invoice' : result.category === 'legal' ? 'Contract' : 'Other',
      date: new Date().toISOString().slice(0, 10),
      uploaded_by: user.id,
      notes: `AI Detected: ${result.document_type}\n\n${result.explanation}\n\nSuggested Action: ${result.suggested_action}`,
    });

    setSaving(false);
    if (dbError) {
      toast(dbError.message, 'error');
    } else {
      toast('Saved to Vault', 'success');
    }
  }

  async function handleAddToPlanner() {
    if (!result) return;
    setAddingPlanner(true);

    const dueDate = result.key_info.dates?.[0] || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const amount = result.key_info.amounts?.[0] || '';

    const { error } = await supabase.from('planner_events').insert({
      organization_id: organization.id,
      title: result.document_type + (amount ? ` — ${amount}` : ''),
      event_date: dueDate,
      event_type: result.category === 'tax' ? 'tax_deadline' : result.category === 'financial' ? 'invoice_due' : 'other',
      notes: result.suggested_action,
      status: 'pending',
    });

    setAddingPlanner(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Added to Planner', 'success');
    }
  }

  function reset() {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setOriginalFile(null);
  }

  const urgencyColors: Record<string, string> = {
    high: 'bg-[#DC2626]/10 text-[#DC2626]',
    medium: 'bg-[#F59E0B]/10 text-[#F59E0B]',
    low: 'bg-[#16A34A]/10 text-[#16A34A]',
  };

  const confidenceColors: Record<string, string> = {
    high: 'text-[#16A34A]',
    medium: 'text-[#F59E0B]',
    low: 'text-[#DC2626]',
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Document Scanner" backPath="/dashboard" />

      {/* Camera / Upload Area */}
      {!imagePreview ? (
        <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-800 p-8 text-center">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(79,70,229,0.08)]">
            <svg className="h-8 w-8 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-[var(--text-1)]">Snap or upload a document</p>
          <p className="mb-5 text-xs text-[var(--text-3)]">Tax notices, contracts, invoices, government forms — any language</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
              Take Photo
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-slate-800 px-5 py-3 text-sm font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Image Preview */}
          <div className="relative rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
            <img src={imagePreview} alt="Document" className="w-full max-h-64 object-contain bg-[#F9F9F9]" />
            <button
              onClick={reset}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Detect Button */}
          {!result && !detecting && (
            <button
              onClick={handleDetect}
              className="w-full rounded-xl bg-[#4F46E5] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#4338CA] hover:-translate-y-px flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              Detect & Translate
            </button>
          )}

          {/* Loading State */}
          {detecting && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
                <span className="text-sm font-medium text-[#4F46E5]">AI is analyzing your document...</span>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-[rgba(79,70,229,0.08)]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-[rgba(79,70,229,0.06)]" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-[rgba(79,70,229,0.04)]" />
                <div className="h-20 w-full animate-pulse rounded-lg bg-[rgba(79,70,229,0.05)]" />
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Detection Header */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#4F46E5]">AI DETECTED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyColors[result.urgency] || urgencyColors.medium}`}>
                      {result.urgency?.toUpperCase()} PRIORITY
                    </span>
                    <span className={`text-[10px] font-medium ${confidenceColors[result.confidence] || confidenceColors.medium}`}>
                      {result.confidence} confidence
                    </span>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-1)]">{result.document_type}</h2>
                {result.document_type_local && (
                  <p className="text-sm text-[var(--text-3)]">{result.document_type_local}</p>
                )}
                <p className="mt-1 text-xs text-[var(--text-4)]">
                  Language: {result.original_language} · Category: {result.category}
                </p>
              </div>

              {/* Key Information */}
              {(result.key_info.amounts.length > 0 || result.key_info.dates.length > 0 || result.key_info.parties.length > 0) && (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-4)]">Key Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    {result.key_info.amounts.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[var(--text-4)]">Amounts</p>
                        {result.key_info.amounts.map((a, i) => (
                          <p key={i} className="font-mono text-sm font-semibold text-[var(--text-1)]">{a}</p>
                        ))}
                      </div>
                    )}
                    {result.key_info.dates.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[var(--text-4)]">Dates</p>
                        {result.key_info.dates.map((d, i) => (
                          <p key={i} className="text-sm font-medium text-[var(--text-1)]">{d}</p>
                        ))}
                      </div>
                    )}
                    {result.key_info.parties.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-[var(--text-4)]">Parties</p>
                        {result.key_info.parties.map((p, i) => (
                          <p key={i} className="text-sm text-[var(--text-1)]">{p}</p>
                        ))}
                      </div>
                    )}
                    {result.key_info.reference_numbers.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-[var(--text-4)]">Reference Numbers</p>
                        {result.key_info.reference_numbers.map((r, i) => (
                          <p key={i} className="font-mono text-sm text-[var(--text-2)]">{r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Translation */}
              <div className="rounded-xl border border-[rgba(79,70,229,0.15)] bg-[rgba(79,70,229,0.03)] p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="h-3.5 w-3.5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                  </svg>
                  <span className="text-[10px] font-semibold text-[#4F46E5]">TRANSLATION</span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--text-1)]">{result.translation}</p>
              </div>

              {/* Explanation */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="mb-2 text-xs font-semibold text-[var(--text-1)]">What does this mean?</p>
                <p className="text-sm leading-relaxed text-[var(--text-2)]">{result.explanation}</p>
              </div>

              {/* Suggested Action */}
              <div className="rounded-xl border border-[#16A34A]/15 bg-[#16A34A]/5 p-4">
                <p className="mb-1.5 text-xs font-semibold text-[#16A34A]">Suggested Action</p>
                <p className="text-sm leading-relaxed text-[var(--text-2)]">{result.suggested_action}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddToPlanner}
                  disabled={addingPlanner}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  {addingPlanner ? 'Adding...' : 'Add to Planner'}
                </button>
                <button
                  onClick={handleSaveToVault}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-slate-800 py-3 text-sm font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  {saving ? 'Saving...' : 'Save to Vault'}
                </button>
              </div>

              {/* Send to Contact */}
              <button onClick={() => setShowContactPicker(!showContactPicker)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 py-3 text-sm font-medium text-[#4F46E5] transition-colors hover:bg-[#4F46E5]/10">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                Send to Contact
              </button>
              {showContactPicker && (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Choose contact</p>
                  {contacts.length === 0 && <p className="text-xs text-[#999] py-2">No contacts yet</p>}
                  {contacts.map(c => (
                    <button key={c.id} onClick={() => handleSendToContact(c.id)} disabled={sendingTo === c.id}
                      className="w-full flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-left hover:bg-slate-700 disabled:opacity-50">
                      <span className="text-sm font-medium text-slate-50">{c.name}</span>
                      <span className="text-[10px] text-[#999] capitalize">{c.contact_type}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Scan Another */}
              <button
                onClick={reset}
                className="w-full py-2.5 text-center text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                Scan another document
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
