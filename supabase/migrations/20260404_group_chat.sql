-- ============================================================
-- Migration: Group chat foundation
-- Created: 2026-04-04
-- Adds is_group, group_name, group_member_ids to conversations
-- ============================================================

-- Add group columns to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_member_ids TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for faster group queries
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(organization_id, is_group) WHERE is_group = TRUE;

-- Add onboarding_completed to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing Evrywher users (those with signup_source = 'pocketchat' org) to have onboarding completed
-- so they don't see the onboarding flow for existing accounts
UPDATE profiles p
SET onboarding_completed = TRUE
FROM organizations o
WHERE p.organization_id = o.id
  AND o.signup_source = 'pocketchat'
  AND p.onboarding_completed IS NULL;
