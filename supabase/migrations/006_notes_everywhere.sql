-- Sprint 3: Notes on Everything
-- cash_flows.notes already added in 005
-- customers.notes already exists
-- invoices.notes already exists
-- contacts.notes already exists

-- Add notes to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;
