-- ═══════════════════════════════════════════════════════════
-- Festivals — cultural awareness for dashboard greetings
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_codes TEXT[] NOT NULL,
  name TEXT NOT NULL,
  greeting TEXT NOT NULL,
  suggestion TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Seed 2026 festivals
INSERT INTO festivals (country_codes, name, greeting, suggestion, start_date, end_date, year) VALUES
('{"PK","IN","BD","NP","AE","SA"}', 'Eid al-Fitr', 'Eid Mubarak! 🌙', 'Send invoices before the holiday', '2026-03-20', '2026-03-22', 2026),
('{"IN","NP","LK"}', 'Diwali', 'Happy Diwali! 🪔', 'Great time to connect with your network', '2026-10-20', '2026-10-22', 2026),
('{"JP"}', 'Golden Week', 'ゴールデンウィーク 🌸', 'Schedule invoices — offices may be closed', '2026-04-29', '2026-05-05', 2026),
('{"JP"}', 'Obon', 'お盆 🏮', 'Many businesses close — plan ahead', '2026-08-13', '2026-08-16', 2026),
('{"PK"}', 'Pakistan Day', 'Happy Pakistan Day! 🇵🇰', 'Celebrate with your JP↔PK network', '2026-03-23', '2026-03-23', 2026),
('{"IN"}', 'Republic Day', 'Happy Republic Day! 🇮🇳', 'Connect with your Indian business contacts', '2026-01-26', '2026-01-26', 2026),
('{"AE","SA"}', 'Eid al-Adha', 'Eid Mubarak! 🐑', 'Plan invoices around the holiday', '2026-05-26', '2026-05-29', 2026)
ON CONFLICT DO NOTHING;
