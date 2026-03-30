-- Sprint 3: Recurring Transactions
ALTER TABLE cash_flows
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_frequency TEXT,
  ADD COLUMN IF NOT EXISTS recurring_end_date DATE,
  ADD COLUMN IF NOT EXISTS parent_recurring_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for recurring lookups
CREATE INDEX IF NOT EXISTS idx_cash_flows_recurring ON cash_flows(organization_id) WHERE is_recurring = true;
