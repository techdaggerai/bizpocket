-- ============================================================
-- Migration 003: PDJ Reference Tables
-- invoice_items, item_templates, expense_categories, planned_expenses
-- + invoice table column additions + default category seeding
-- ============================================================

-- TABLE 1: invoice_items (line items — CRITICAL)
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  chassis_no TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0.10,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  is_manual_entry BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_select" ON invoice_items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "invoice_items_insert" ON invoice_items
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "invoice_items_update" ON invoice_items
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "invoice_items_delete" ON invoice_items
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- TABLE 2: item_templates (saved line items)
CREATE TABLE item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price INTEGER DEFAULT 0,
  default_tax_rate NUMERIC DEFAULT 0.10,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_templates_select" ON item_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "item_templates_insert" ON item_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "item_templates_update" ON item_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "item_templates_delete" ON item_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner')
    )
  );

-- TABLE 3: expense_categories (custom categories per org)
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#4F46E5',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_select" ON expense_categories
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "expense_categories_insert" ON expense_categories
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "expense_categories_update" ON expense_categories
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner')
    )
  );

-- TABLE 4: planned_expenses (monthly budget planner)
CREATE TABLE planned_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  planned_amount INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE planned_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_expenses_select" ON planned_expenses
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "planned_expenses_insert" ON planned_expenses
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

CREATE POLICY "planned_expenses_update" ON planned_expenses
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'staff')
    )
  );

-- UPDATE invoices table — add missing columns from PDJ
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS tax_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type TEXT DEFAULT 'Futsu',
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- SEED default expense categories for new orgs
CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO expense_categories
    (organization_id, name, icon, color, is_default)
  VALUES
    (NEW.id, 'Auction', '🏷️', '#4F46E5', true),
    (NEW.id, 'Shipping', '🚢', '#4F46E5', true),
    (NEW.id, 'Repair', '🔧', '#4F46E5', true),
    (NEW.id, 'Tax & Duties', '🏛️', '#4F46E5', true),
    (NEW.id, 'Office', '🏢', '#4F46E5', true),
    (NEW.id, 'Transport', '🚗', '#4F46E5', true),
    (NEW.id, 'Salary', '👤', '#4F46E5', true),
    (NEW.id, 'Other', '📦', '#4F46E5', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_org_created_seed_categories
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_categories();
