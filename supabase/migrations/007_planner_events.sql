-- Sprint 3: Business Planner
CREATE TABLE IF NOT EXISTS planner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- incoming_payment, upcoming_expense, meeting,
  -- shipment, invoice_due, tax_deadline,
  -- recurring, other
  amount INTEGER,
  currency TEXT DEFAULT 'JPY',
  contact_id UUID REFERENCES contacts(id),
  invoice_id UUID REFERENCES invoices(id),
  event_date DATE NOT NULL,
  event_time TIME,
  reminder_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  -- pending, completed, cancelled
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planner_org_date ON planner_events(organization_id, event_date);

ALTER TABLE planner_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planner_org_select" ON planner_events
  FOR SELECT USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planner_org_insert" ON planner_events
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planner_org_update" ON planner_events
  FOR UPDATE USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planner_org_delete" ON planner_events
  FOR DELETE USING (
    organization_id IN (SELECT get_user_org_ids())
  );
