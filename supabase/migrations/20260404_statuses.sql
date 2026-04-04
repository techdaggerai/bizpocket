-- ============================================================
-- Migration: Statuses (WhatsApp-style stories)
-- Created: 2026-04-04
-- ============================================================

CREATE TABLE IF NOT EXISTS statuses (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type          text DEFAULT 'text' CHECK (type IN ('text', 'image')),
  content       text,
  image_url     text,
  background_color text DEFAULT '#4F46E5',
  views         uuid[] DEFAULT '{}',
  expires_at    timestamptz DEFAULT now() + interval '24 hours',
  created_at    timestamptz DEFAULT now()
);

-- Index: fast lookup of active statuses per org
CREATE INDEX IF NOT EXISTS idx_statuses_org_active
  ON statuses(org_id, expires_at)
  WHERE expires_at > now();

-- Index: fast lookup by user
CREATE INDEX IF NOT EXISTS idx_statuses_user
  ON statuses(user_id, created_at DESC);

-- RLS
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- Users can read statuses from their own org
CREATE POLICY "statuses: read own org"
  ON statuses FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own statuses
CREATE POLICY "statuses: insert own"
  ON statuses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update views on any status in their org (to mark as viewed)
-- and update their own statuses
CREATE POLICY "statuses: update"
  ON statuses FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own statuses
CREATE POLICY "statuses: delete own"
  ON statuses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-cleanup: optional pg_cron job (run manually or via edge function)
-- DELETE FROM statuses WHERE expires_at < now();
