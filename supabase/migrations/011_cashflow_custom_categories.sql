-- Cash Flow upgrades: custom categories and from/to history per organization

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_from_to JSONB DEFAULT '[]'::jsonb;
