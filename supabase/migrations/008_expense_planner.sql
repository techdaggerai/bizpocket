-- ==========================================
-- BizPocket: Planned Income Table
-- Run this in Supabase SQL Editor
-- ==========================================

CREATE TABLE IF NOT EXISTS planned_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- format: YYYY-MM
  category TEXT NOT NULL DEFAULT 'Customer Payment',
  description TEXT NOT NULL,
  planned_amount INTEGER NOT NULL DEFAULT 0,
  expected_date DATE,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE planned_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org planned income"
  ON planned_income FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own org planned income"
  ON planned_income FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own org planned income"
  ON planned_income FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own org planned income"
  ON planned_income FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Also ensure planned_expenses has the right columns
-- (it may already exist from earlier sessions)
ALTER TABLE planned_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE planned_expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
