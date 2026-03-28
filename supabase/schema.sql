-- BizPocket Japan — Multi-Tenant Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Organizations
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'other',
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'JPY',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. Profiles
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'accountant')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. Cash Flows
-- ============================================
CREATE TABLE cash_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('IN', 'OUT')),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'JPY',
  category TEXT NOT NULL DEFAULT 'Other',
  from_to TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  classify_as TEXT NOT NULL DEFAULT 'cash_flow_only' CHECK (classify_as IN ('expense', 'investment', 'cash_flow_only')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. Customers
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. Invoices
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  language TEXT NOT NULL DEFAULT 'en',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. Documents
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  ocr_text TEXT,
  amount_detected NUMERIC(15,2),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 7. Invoice Templates (future)
-- ============================================
CREATE TABLE invoice_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  header TEXT,
  footer TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_org_id ON profiles(organization_id);
CREATE INDEX idx_cash_flows_org_date ON cash_flows(organization_id, date);
CREATE INDEX idx_cash_flows_classify ON cash_flows(organization_id, classify_as);
CREATE INDEX idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_documents_org_id ON documents(organization_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid();
$$;

-- Organizations: users can see orgs they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Profiles: users can see profiles in their org
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Cash Flows: org-scoped access
CREATE POLICY "Users can view cash flows in their org"
  ON cash_flows FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Non-accountant users can insert cash flows"
  ON cash_flows FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND organization_id = cash_flows.organization_id
      AND role != 'accountant'
    )
  );

CREATE POLICY "Non-accountant users can update cash flows"
  ON cash_flows FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_org_ids())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND organization_id = cash_flows.organization_id
      AND role != 'accountant'
    )
  );

CREATE POLICY "Non-accountant users can delete cash flows"
  ON cash_flows FOR DELETE
  USING (
    organization_id IN (SELECT get_user_org_ids())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND organization_id = cash_flows.organization_id
      AND role != 'accountant'
    )
  );

-- Customers: org-scoped
CREATE POLICY "Users can view customers in their org"
  ON customers FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Non-accountant users can manage customers"
  ON customers FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- Invoices: org-scoped
CREATE POLICY "Users can view invoices in their org"
  ON invoices FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Non-accountant users can manage invoices"
  ON invoices FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Non-accountant users can update invoices"
  ON invoices FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Documents: org-scoped
CREATE POLICY "Users can view documents in their org"
  ON documents FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Non-accountant users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

-- Invoice Templates: org-scoped
CREATE POLICY "Users can view templates in their org"
  ON invoice_templates FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can manage templates"
  ON invoice_templates FOR ALL
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================
-- Storage bucket for documents
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');
