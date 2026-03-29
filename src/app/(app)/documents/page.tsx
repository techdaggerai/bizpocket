'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import type { Document } from '@/types/database';

const DOC_CATEGORIES = ['Receipt', 'Invoice', 'Contract', 'Auction Slip', 'Other'];

export default function DocumentsPage() {
  const { organization, user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [title, setTitle] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    if (error) toast(error.message, 'error');
    else setDocuments(data || []);
    setLoading(false);
  }, [organization.id, supabase, toast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${organization.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file);

    if (uploadError) {
      toast(uploadError.message, 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

    const { error: dbError } = await supabase.from('documents').insert({
      organization_id: organization.id,
      file_url: urlData.publicUrl,
      title: title || file.name,
      category,
      date: new Date().toISOString().slice(0, 10),
      uploaded_by: user.id,
    });

    setUploading(false);
    if (dbError) {
      toast(dbError.message, 'error');
    } else {
      toast('Document uploaded', 'success');
      setTitle('');
      fetchDocuments();
    }
  }

  // Group by month
  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const monthKey = doc.date?.slice(0, 7) || 'Unknown';
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">{t('documents.title')}</h1>
          <p className="text-xs text-[var(--text-3)]">{t('documents.subtitle')}</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="rounded-xl border-2 border-dashed border-[#E5E5E5] bg-white p-6 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
        />
        <div className="space-y-3">
          <div className="mb-2 flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title (optional)"
              className="flex-1 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[var(--text-1)]"
            >
              {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-lg bg-[#4F46E5] py-3 text-sm font-semibold text-white hover:bg-[#4338CA] disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Scan / Upload'}
            </button>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-[#E5E5E5] bg-white p-8 text-center text-sm text-[var(--text-4)]">
          {t('documents.no_documents')}
        </p>
      ) : (
        Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, docs]) => (
          <div key={monthKey}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-[var(--text-3)]">{monthKey}</h3>
            <div className="grid grid-cols-2 gap-2">
              {docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-card border border-[#E5E5E5] bg-white p-3 transition-colors hover:border-[#4F46E5]"
                >
                  <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-[var(--bg-2)]">
                    {doc.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={doc.file_url} alt={doc.title} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <svg className="h-8 w-8 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-[var(--text-1)]">{doc.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-4)]">{doc.category}</span>
                    <span className="text-[10px] text-[var(--text-4)]">{formatDate(doc.date)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
