-- Team Hub — Business tier feature

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'accountant', 'manager')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invites_select" ON team_invites FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "team_invites_insert" ON team_invites FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "team_invites_delete" ON team_invites FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

-- Shared team documents
CREATE TABLE IF NOT EXISTS team_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_docs_select" ON team_documents FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "team_docs_insert" ON team_documents FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')));

CREATE POLICY "team_docs_delete" ON team_documents FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

-- Team activity log
CREATE TABLE IF NOT EXISTS team_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_activity_select" ON team_activity FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "team_activity_insert" ON team_activity FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_org ON team_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_docs_org ON team_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_org ON team_activity(organization_id);
