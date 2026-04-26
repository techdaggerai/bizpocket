-- Auth gate fix v1 — schema migration
-- Source spec: docs/AUTH_DESIGN_v1.md §4
-- Date: 2026-04-26
-- Run in Supabase SQL editor. Idempotent. Additive only — no drops.

-- =========================================================================
-- 4.1 — profiles table additions
-- =========================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_verification_method_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_verification_method_check
      CHECK (verification_method IN ('sms_otp', 'line', 'email_magic_link') OR verification_method IS NULL);
  END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_line_user_id_unique
  ON profiles (line_user_id) WHERE line_user_id IS NOT NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_e164 text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique
  ON profiles (phone_e164) WHERE phone_e164 IS NOT NULL;

-- =========================================================================
-- 4.2 — phone_verifications table (new)
-- =========================================================================

CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  ip_address inet NULL,
  user_agent text NULL
);

CREATE INDEX IF NOT EXISTS phone_verifications_phone_active
  ON phone_verifications (phone_e164, expires_at)
  WHERE consumed_at IS NULL;

-- =========================================================================
-- 4.3 — auth_attempts table (new)
-- =========================================================================

CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NULL,
  email text NULL,
  ip_address inet NOT NULL,
  attempt_type text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'auth_attempts'
      AND constraint_name = 'auth_attempts_attempt_type_check'
  ) THEN
    ALTER TABLE auth_attempts
      ADD CONSTRAINT auth_attempts_attempt_type_check
      CHECK (attempt_type IN ('otp_request', 'otp_verify', 'magic_link', 'line_oauth'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS auth_attempts_phone_recent
  ON auth_attempts (phone_e164, created_at DESC) WHERE phone_e164 IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_attempts_ip_recent
  ON auth_attempts (ip_address, created_at DESC);

-- =========================================================================
-- 4.4 — Backfill: mark all existing profiles as unverified ghosts
-- =========================================================================
-- Existing accounts created before this migration are unverified.
-- They are NOT deleted. Middleware (Prompt 4) will route them through
-- /settings/verify on next authenticated request.

UPDATE profiles
SET verified_at = NULL, verification_method = NULL
WHERE verified_at IS NULL;

-- Phone E.164 backfill is in application code, not SQL.
-- See scripts/normalize_phone_e164.ts (created in a later prompt).

-- =========================================================================
-- End of migration
-- =========================================================================
