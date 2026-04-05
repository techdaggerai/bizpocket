-- ============================================================
-- Language Learning Engine — core tables
-- ============================================================

-- User's learning profile
CREATE TABLE IF NOT EXISTS learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_language TEXT NOT NULL DEFAULT 'ja',
  native_language TEXT NOT NULL DEFAULT 'en',
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','elementary','intermediate','advanced')),
  daily_goal INTEGER DEFAULT 10,
  streak_days INTEGER DEFAULT 0,
  total_words_learned INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  last_study_date DATE,
  interests TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Vocabulary items learned from real translations
CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  reading TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  example_translation TEXT,
  context TEXT,
  source TEXT,
  source_id UUID,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  times_reviewed INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  next_review_at TIMESTAMPTZ DEFAULT now(),
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 3),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson topics
CREATE TABLE IF NOT EXISTS learning_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_target TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'beginner',
  word_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- User progress per topic
CREATE TABLE IF NOT EXISTS topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE NOT NULL,
  words_completed INTEGER DEFAULT 0,
  words_total INTEGER,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, topic_id)
);

-- Study sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT,
  words_studied INTEGER DEFAULT 0,
  words_correct INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON vocabulary(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_source ON vocabulary(user_id, source);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON vocabulary(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_learning_profiles_user ON learning_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user ON topic_progress(user_id);

-- RLS
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning profile"
  ON learning_profiles FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own vocabulary"
  ON vocabulary FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can read topics"
  ON learning_topics FOR SELECT USING (true);

CREATE POLICY "Users manage own topic progress"
  ON topic_progress FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own study sessions"
  ON study_sessions FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Seed learning topics
-- ============================================================

INSERT INTO learning_topics (slug, title_en, title_target, description, icon, category, difficulty, word_count, sort_order) VALUES
('daily-konbini', 'Convenience Store', 'コンビニ', 'Essential words for konbini shopping — receipts, payment, bags, points cards', '🏪', 'daily', 'beginner', 15, 1),
('daily-train', 'Train & Station', '電車・駅', 'Navigate Japanese trains — tickets, platforms, transfers, delays', '🚃', 'daily', 'beginner', 20, 2),
('daily-restaurant', 'Eating Out', 'レストラン', 'Order food, ask about ingredients, understand menus', '🍱', 'daily', 'beginner', 25, 3),
('daily-post-office', 'Post Office', '郵便局', 'Send packages, buy stamps, fill out forms', '📮', 'daily', 'beginner', 12, 4),
('daily-hospital', 'At the Doctor', '病院', 'Describe symptoms, understand prescriptions, medical terms', '🏥', 'daily', 'intermediate', 18, 5),
('daily-supermarket', 'Supermarket', 'スーパー', 'Food labels, weights, allergies, checkout', '🛒', 'daily', 'beginner', 16, 6),
('business-bank', 'Banking', '銀行', 'Open accounts, transfer money, ATM vocabulary', '🏦', 'business', 'intermediate', 22, 7),
('business-office', 'Office Japanese', 'オフィス', 'Business keigo, meetings, emails, phone calls', '💼', 'business', 'intermediate', 20, 8),
('business-real-estate', 'Renting an Apartment', '不動産', 'Lease terms, guarantors, move-in costs, utilities', '🏠', 'business', 'intermediate', 18, 9),
('travel-airport', 'Airport & Immigration', '空港', 'Check-in, customs, immigration forms, boarding', '✈️', 'travel', 'beginner', 14, 10),
('travel-hotel', 'Hotels & Accommodation', 'ホテル', 'Check-in/out, room service, amenities', '🏨', 'travel', 'beginner', 12, 11),
('travel-directions', 'Asking Directions', '道案内', 'Left, right, straight, landmarks, distance', '🗺️', 'travel', 'beginner', 15, 12),
('emergency-police', 'Police & Safety', '警察', 'Report incidents, describe problems, legal terms', '🚔', 'emergency', 'intermediate', 14, 13),
('emergency-disaster', 'Natural Disasters', '災害', 'Earthquake, typhoon, evacuation, emergency broadcasts', '🌊', 'emergency', 'intermediate', 16, 14),
('culture-seasons', 'Seasons & Greetings', '季節の挨拶', 'Seasonal phrases, holiday greetings, weather talk', '🌸', 'daily', 'beginner', 12, 15),
('business-tax', 'Tax & Government', '税金・役所', 'City hall forms, tax returns, residence card renewal', '🏛️', 'business', 'advanced', 20, 16)
ON CONFLICT (slug) DO NOTHING;
