-- PocketChat upgrades: quick replies, labels, away message

-- Quick reply templates per organization
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  message TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Read access for all org members
CREATE POLICY "org_quick_replies_select" ON quick_replies FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Write access only for owner and staff (not accountant)
CREATE POLICY "org_quick_replies_insert" ON quick_replies FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'staff')));

CREATE POLICY "org_quick_replies_update" ON quick_replies FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'staff')));

CREATE POLICY "org_quick_replies_delete" ON quick_replies FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner', 'staff')));

-- Chat labels on conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS label_color TEXT;

-- Away message settings per organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS away_message TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS away_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_hours_start TIME DEFAULT '09:00';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_hours_end TIME DEFAULT '18:00';
