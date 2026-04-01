-- Invoice upgrade: payment method, disclaimer, discounts, viewed tracking, and org defaults
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS disclaimer TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invoice_disclaimer TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT 'bank_transfer';

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  customer_address TEXT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  validity_days INTEGER DEFAULT 30,
  share_token TEXT UNIQUE,
  currency TEXT DEFAULT 'JPY',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_estimates' AND tablename = 'estimates') THEN
    CREATE POLICY "org_estimates" ON estimates FOR ALL
      USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  is_billable BOOLEAN DEFAULT true,
  is_invoiced BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_time_entries' AND tablename = 'time_entries') THEN
    CREATE POLICY "org_time_entries" ON time_entries FOR ALL
      USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Secure function to track invoice views (only sets viewed_at)
CREATE OR REPLACE FUNCTION public.track_invoice_view(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invoices SET viewed_at = NOW()
  WHERE public_token = p_token AND viewed_at IS NULL;
END;
$$;

-- Fix FK: allow planner_events to cascade on invoice delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%planner_events%invoice%' AND table_name = 'planner_events'
  ) THEN
    ALTER TABLE planner_events DROP CONSTRAINT IF EXISTS planner_events_invoice_id_fkey;
    ALTER TABLE planner_events ADD CONSTRAINT planner_events_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Allow org members to delete their own invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'org_delete_invoices' AND tablename = 'invoices'
  ) THEN
    CREATE POLICY "org_delete_invoices" ON invoices FOR DELETE
      USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END $$;
