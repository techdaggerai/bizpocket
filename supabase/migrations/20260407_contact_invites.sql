-- Contact invite system: invite links, email/phone search, QR codes

-- 1. Add phone + permanent_invite_code to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permanent_invite_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_permanent_invite_code ON profiles(permanent_invite_code);

-- 2. Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid REFERENCES auth.users(id) NOT NULL,
  inviter_org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  invite_type text DEFAULT 'contact' CHECK (invite_type IN ('contact', 'group')),
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invites" ON invites FOR SELECT USING (auth.uid() = inviter_id);
CREATE POLICY "Users can create own invites" ON invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
