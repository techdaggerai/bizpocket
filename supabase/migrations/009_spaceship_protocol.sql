-- ══════════════════════════════════════════════════════════════
-- BIZPOCKET — AI BUSINESS CYCLE ENGINE
-- The Spaceship Protocol Database Architecture
--
-- This schema powers:
-- • Custom business cycle creation (AI onboarding interview)
-- • Universal inventory/item tracking through any pipeline
-- • Ops Radar (7-section command center)
-- • AI Agent loop (observe → learn → suggest → improve)
-- • Stakeholder/investor management
-- • Per-item cost tracking & profitability
-- • Item photo galleries
-- • AI insights that accumulate over time
--
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────┐
-- │  1. BUSINESS CYCLES                 │
-- │  The custom pipeline per org        │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS business_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Car Sales Pipeline", "Import/Export Flow"
  description TEXT,                      -- AI-generated description from onboarding
  business_type TEXT,                    -- e.g., "car_dealer", "import_export", "freelancer"
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE business_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON business_cycles FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- ┌─────────────────────────────────────┐
-- │  2. CYCLE STAGES                    │
-- │  Ordered steps in the pipeline      │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS cycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES business_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Purchased", "In Repair", "Ready to Sell"
  stage_order INTEGER NOT NULL,          -- 1, 2, 3... defines the sequence
  color TEXT DEFAULT '#4F46E5',          -- for UI display
  icon TEXT,                             -- optional icon name
  is_start BOOLEAN DEFAULT false,        -- first stage in cycle
  is_end BOOLEAN DEFAULT false,          -- final stage (e.g., "Settled", "Paid")
  avg_days NUMERIC DEFAULT 0,            -- computed: average days items spend here
  description TEXT,                      -- AI-generated: what happens at this stage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cycle_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON cycle_stages FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- ┌─────────────────────────────────────┐
-- │  3. CYCLE ITEMS                     │
-- │  Universal inventory / pipeline     │
-- │  Replaces PDJ's "cars" table        │
-- │  Works for ANY business type        │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS cycle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES business_cycles(id),
  item_number SERIAL,                    -- auto-incrementing per org
  name TEXT NOT NULL,                    -- e.g., "Toyota Hiace 2019", "Website Redesign Project"
  description TEXT,
  category TEXT,                         -- user-defined: "Sedan", "Van", "Import", "Service"
  reference_id TEXT,                     -- e.g., chassis number, order number, project ID

  -- Pipeline state
  current_stage_id UUID REFERENCES cycle_stages(id),
  entered_current_stage_at TIMESTAMPTZ DEFAULT NOW(),
  is_bottleneck BOOLEAN DEFAULT false,
  bottleneck_days INTEGER DEFAULT 0,

  -- Financial
  purchase_date DATE,
  purchase_price INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0,          -- purchase + all item_costs
  sale_date DATE,
  sale_price INTEGER DEFAULT 0,
  profit INTEGER DEFAULT 0,              -- sale_price - total_cost (computed on update)
  currency TEXT DEFAULT 'JPY',

  -- Relationships
  supplier TEXT,                         -- who it came from
  customer_id UUID,                      -- who it's sold to (references contacts table)
  stakeholder_id UUID,                   -- investor/partner who funded it

  -- Status
  status TEXT DEFAULT 'active',          -- active, completed, cancelled
  priority TEXT DEFAULT 'normal',        -- low, normal, high, urgent

  -- Flexible metadata for business-specific fields
  metadata JSONB DEFAULT '{}',           -- e.g., {"chassis": "ABC123", "auction_source": "USS"}

  -- Timestamps
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cycle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON cycle_items FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Index for fast pipeline queries
CREATE INDEX idx_cycle_items_org_status ON cycle_items(organization_id, status);
CREATE INDEX idx_cycle_items_stage ON cycle_items(current_stage_id);


-- ┌─────────────────────────────────────┐
-- │  4. CYCLE TRANSITIONS               │
-- │  Every stage change logged          │
-- │  This is the AI's learning data     │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS cycle_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cycle_items(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES cycle_stages(id),
  to_stage_id UUID NOT NULL REFERENCES cycle_stages(id),
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_in_previous_stage INTEGER,        -- computed: days spent in from_stage
  triggered_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cycle_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON cycle_transitions FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_transitions_item ON cycle_transitions(item_id);
CREATE INDEX idx_transitions_org_date ON cycle_transitions(organization_id, transitioned_at);


-- ┌─────────────────────────────────────┐
-- │  5. ITEM COSTS                      │
-- │  Expenses per pipeline item         │
-- │  Replaces PDJ's "car_expenses"      │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS item_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cycle_items(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,                -- e.g., "Parts", "Labor", "Transport", "Customs"
  description TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  receipt_url TEXT,
  cash_flow_id UUID,                     -- link to cash_flows if logged there
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON item_costs FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_item_costs_item ON item_costs(item_id);


-- ┌─────────────────────────────────────┐
-- │  6. ITEM PHOTOS                     │
-- │  Gallery per pipeline item          │
-- │  Replaces PDJ's "car_photos"        │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES cycle_items(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_main BOOLEAN DEFAULT false,
  stage_id UUID REFERENCES cycle_stages(id),  -- photo taken at which stage
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON item_photos FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Only one main photo per item
CREATE UNIQUE INDEX one_main_photo_per_item ON item_photos (item_id) WHERE is_main = TRUE;


-- ┌─────────────────────────────────────┐
-- │  7. STAKEHOLDERS                    │
-- │  Investors, partners, key people    │
-- │  Replaces PDJ's "investors"         │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'investor', -- investor, partner, supplier, client
  email TEXT,
  phone TEXT,
  company TEXT,
  profit_model TEXT,                     -- e.g., "50/50", "40/30/30", "fixed_fee"
  profit_share_pct NUMERIC DEFAULT 0,
  total_invested INTEGER DEFAULT 0,
  total_returned INTEGER DEFAULT 0,
  roi NUMERIC DEFAULT 0,                 -- computed
  status TEXT DEFAULT 'active',
  portal_access BOOLEAN DEFAULT false,
  portal_email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON stakeholders FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));


-- ┌─────────────────────────────────────┐
-- │  8. AI INSIGHTS                     │
-- │  The AI's growing brain             │
-- │  Observations that accumulate       │
-- │  over weeks and months              │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Classification
  type TEXT NOT NULL,                    -- bottleneck, trend, recommendation, anomaly, prediction, pattern
  category TEXT,                         -- operations, financial, performance, risk, growth
  severity TEXT NOT NULL DEFAULT 'info', -- critical, warning, info, positive

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  suggestion TEXT,                       -- actionable recommendation

  -- Context
  item_id UUID REFERENCES cycle_items(id),        -- if about a specific item
  stage_id UUID REFERENCES cycle_stages(id),       -- if about a specific stage
  stakeholder_id UUID REFERENCES stakeholders(id), -- if about a specific stakeholder

  -- AI metadata
  data_snapshot JSONB DEFAULT '{}',      -- the data AI analyzed to generate this insight
  confidence NUMERIC DEFAULT 0.8,        -- AI's confidence in this insight (0-1)
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',

  -- User interaction
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_acted_on BOOLEAN DEFAULT false,
  user_feedback TEXT,                    -- helpful, not_helpful, wrong

  -- Lifecycle
  valid_until TIMESTAMPTZ,               -- insights can expire (e.g., "sell this week" expires after the week)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON ai_insights FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_insights_org_type ON ai_insights(organization_id, type);
CREATE INDEX idx_insights_unread ON ai_insights(organization_id) WHERE is_read = false;


-- ┌─────────────────────────────────────┐
-- │  9. AI AGENT CONVERSATIONS          │
-- │  The ongoing dialogue between       │
-- │  the AI and the business owner      │
-- └─────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  context TEXT NOT NULL,                 -- onboarding, cycle_setup, weekly_review, daily_briefing, user_question, strategic_analysis
  role TEXT NOT NULL,                    -- user, assistant
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',           -- any structured data from the conversation
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON ai_conversations FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_conversations_org_ctx ON ai_conversations(organization_id, context);


-- ┌─────────────────────────────────────┐
-- │  10. ADD STAKEHOLDER FK TO ITEMS    │
-- │  Link cycle_items to stakeholders   │
-- └─────────────────────────────────────┘

ALTER TABLE cycle_items
  ADD CONSTRAINT fk_item_stakeholder
  FOREIGN KEY (stakeholder_id)
  REFERENCES stakeholders(id);


-- ┌─────────────────────────────────────┐
-- │  11. STORAGE BUCKET                 │
-- │  For item photos                    │
-- └─────────────────────────────────────┘

-- Run this separately if bucket doesn't exist:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);


-- ══════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════
--
-- NEW TABLES (9):
--   1. business_cycles      — custom pipeline definitions
--   2. cycle_stages         — ordered steps in each pipeline
--   3. cycle_items          — universal inventory tracking
--   4. cycle_transitions    — every stage change (AI learning data)
--   5. item_costs           — expenses per item
--   6. item_photos          — photo gallery per item
--   7. stakeholders         — investors, partners, key people
--   8. ai_insights          — AI's accumulating observations
--   9. ai_conversations     — AI agent dialogue history
--
-- EXISTING TABLES TOUCHED:
--   - organizations (already has trial_ends_at from earlier)
--
-- ALL TABLES have:
--   - organization_id for multi-tenancy
--   - RLS policies for data isolation
--   - Proper indexes for query performance
--
-- THE DATA FLOW:
--   AI Interview → business_cycles + cycle_stages
--   User adds items → cycle_items
--   User moves items → cycle_transitions (AI learns)
--   User logs costs → item_costs (profitability tracking)
--   User takes photos → item_photos
--   AI runs analysis → ai_insights (accumulates over time)
--   AI converses → ai_conversations (ongoing dialogue)
--   Ops Radar reads ALL of this → single page command center
--
-- ══════════════════════════════════════════════════════════════
