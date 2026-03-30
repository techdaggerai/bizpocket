-- Sprint 4A: AI-Powered Expense & Planner
-- Adds planned_income table, updates planned_expenses with completion tracking

-- Update planned_expenses with missing columns
ALTER TABLE planned_expenses
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE POLICY "planned_expenses_delete" ON planned_expenses
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- Planned Income table
CREATE TABLE IF NOT EXISTS planned_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  planned_amount INTEGER NOT NULL DEFAULT 0,
  expected_date DATE,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_planned_income_org_month ON planned_income(organization_id, month);

ALTER TABLE planned_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_income_select" ON planned_income
  FOR SELECT USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planned_income_insert" ON planned_income
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planned_income_update" ON planned_income
  FOR UPDATE USING (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "planned_income_delete" ON planned_income
  FOR DELETE USING (
    organization_id IN (SELECT get_user_org_ids())
  );
