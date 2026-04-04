-- ============================================================
-- Migration: Storage buckets for Evrywher / BizPocket
-- Created: 2026-04-04
-- Buckets: chat-images, voice-messages, profile-photos, bot-avatars
-- ============================================================

-- ── chat-images bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to chat-images
CREATE POLICY "chat-images: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- Anyone can read chat-images (public bucket)
CREATE POLICY "chat-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- Users can delete their own uploads
CREATE POLICY "chat-images: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── voice-messages bucket ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  true,
  52428800,  -- 50 MB
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/m4a']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice-messages: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "voice-messages: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-messages');

CREATE POLICY "voice-messages: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ── profile-photos bucket ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Only the owner can upload to their own folder (auth.uid() as first folder segment)
CREATE POLICY "profile-photos: owner upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile-photos: owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-photos: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ── bot-avatars bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bot-avatars',
  'bot-avatars',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "bot-avatars: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bot-avatars');

CREATE POLICY "bot-avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bot-avatars');

CREATE POLICY "bot-avatars: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bot-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
