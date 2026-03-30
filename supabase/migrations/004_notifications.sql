-- Sprint 3: Smart Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- invoice_overdue, payment_due, tax_deadline,
  -- low_balance, expense_reminder, planner_reminder
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(organization_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_org_select" ON notifications
  FOR SELECT USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "notifications_org_insert" ON notifications
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "notifications_org_update" ON notifications
  FOR UPDATE USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "notifications_org_delete" ON notifications
  FOR DELETE USING (
    organization_id IN (SELECT get_user_org_ids())
  );
