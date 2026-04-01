-- ═══ COMPLETE INVOICE SYSTEM UPGRADE ═══

-- Invoice table upgrades
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS disclaimer TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none'; -- none, percentage, fixed
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_estimate_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Organization saved settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invoice_disclaimer TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT 'bank_transfer';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_categories JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_from_to JSONB DEFAULT '[]';

-- ═══ ESTIMATES TABLE ═══
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'draft', -- draft, sent, approved, declined, converted
  template TEXT DEFAULT 'classic',
  currency TEXT DEFAULT 'JPY',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0.10,
  tax_amount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'none',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  converted_invoice_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON estimates FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "public_read_estimates" ON estimates FOR SELECT USING (true);

-- ═══ TIME TRACKING TABLE ═══
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  project_name TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  is_billable BOOLEAN DEFAULT true,
  is_invoiced BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON time_entries FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- ═══ INVOICE LINE ITEM DISCOUNTS ═══
-- Items JSONB in invoices already stores line items
-- Each item will now support: { description, quantity, unit_price, tax_rate, discount_percent, discount_amount, image_url }

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_estimates_org ON estimates(organization_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_org ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(is_billable, is_invoiced);
