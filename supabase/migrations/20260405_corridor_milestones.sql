-- ═══════════════════════════════════════════════════════════
-- Corridor Milestones — tracks first paid invoice on each country corridor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS corridor_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  from_country TEXT NOT NULL,
  to_country TEXT NOT NULL,
  corridor_label TEXT NOT NULL,
  first_invoice_id UUID,
  first_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, from_country, to_country)
);

ALTER TABLE corridor_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_milestones" ON corridor_milestones
  FOR ALL USING (auth.uid() = user_id);
