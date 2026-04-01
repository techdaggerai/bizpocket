-- Custom invoice columns per organization (e.g. Chassis #, Color, Model)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_invoice_columns JSONB DEFAULT '[]'::jsonb;
