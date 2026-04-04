-- ============================================================
-- Migration: Profile status message
-- Created: 2026-04-04
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_message TEXT;

-- Enforce max length at DB level
ALTER TABLE profiles ADD CONSTRAINT profiles_status_message_length
  CHECK (char_length(status_message) <= 140);
