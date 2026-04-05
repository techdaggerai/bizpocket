-- ═══════════════════════════════════════════════════════════
-- Prompt 37: ID Verification — Private storage bucket
-- ═══════════════════════════════════════════════════════════

-- Private bucket for ID documents (NOT public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('id-documents', 'id-documents', false, 10485760, ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
])
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users can upload own ID docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own files
CREATE POLICY "Users can read own ID docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own ID docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'id-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role can read all files (for admin review via API)
-- Note: Admin review uses server-side API routes with service role client
