-- ═══════════════════════════════════════════════════════════
-- Prompt 29: Profile Builder — business_profiles table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),

  -- Classification (AI-generated)
  business_category    TEXT,          -- e.g. 'automotive', 'food_service', 'import_export'
  business_subcategory TEXT,          -- e.g. 'used_car_dealer', 'halal_restaurant'
  industry_tags        TEXT[] DEFAULT '{}',

  -- Profile content
  business_description TEXT,          -- AI-generated elevator pitch
  target_market        TEXT,          -- AI-suggested target market
  key_services         TEXT[] DEFAULT '{}',
  unique_selling_points TEXT[] DEFAULT '{}',
  languages_served     TEXT[] DEFAULT '{}',

  -- Business details
  company_size         TEXT CHECK (company_size IN ('solo', '2-5', '6-20', '21-50', '51-200', '200+')),
  years_in_business    TEXT CHECK (years_in_business IN ('new', '1-2', '3-5', '6-10', '10+')),
  annual_revenue_range TEXT CHECK (annual_revenue_range IN ('pre-revenue', 'under_5m_jpy', '5m-20m_jpy', '20m-50m_jpy', '50m-100m_jpy', '100m+')),

  -- Online presence
  website_url    TEXT,
  social_links   JSONB DEFAULT '{}',

  -- AI outputs
  ai_classification    JSONB DEFAULT '{}',   -- full classifier output snapshot
  recommended_features TEXT[] DEFAULT '{}',   -- BizPocket features to highlight
  onboarding_tips      TEXT[] DEFAULT '{}',   -- contextual tips for this business type
  profile_completeness INT DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_org_profile UNIQUE (organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_org ON business_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_category ON business_profiles(business_category);

-- RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org business profile"
  ON business_profiles FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can insert business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY "Owners can update business profile"
  ON business_profiles FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_business_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_business_profiles_updated_at();
