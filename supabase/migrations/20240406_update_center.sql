-- ============================================================
-- Update Center — app_updates + user_update_reads
-- ============================================================

-- App updates (changelog / feature announcements)
CREATE TABLE IF NOT EXISTS app_updates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  body        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('feature','bugfix','improvement','announcement','tip')),
  version     text,
  deep_link   text,
  image_url   text,
  tutorial_steps jsonb,          -- [{title, description, image}]
  platforms   text[] DEFAULT '{all}',
  published_at timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now(),
  is_active   boolean DEFAULT true
);

-- User read tracking
CREATE TABLE IF NOT EXISTS user_update_reads (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  update_id uuid NOT NULL REFERENCES app_updates(id) ON DELETE CASCADE,
  read_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, update_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_updates_active ON app_updates(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_update_reads_user ON user_update_reads(user_id);

-- RLS
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_update_reads ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read updates
CREATE POLICY "Anyone can read active updates"
  ON app_updates FOR SELECT
  USING (is_active = true);

-- Users manage their own read status
CREATE POLICY "Users read own update reads"
  ON user_update_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own update reads"
  ON user_update_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Seed initial updates (our 22 prompts of features)
-- ============================================================

INSERT INTO app_updates (title, body, type, version, deep_link, published_at) VALUES
(
  '📸 Live Camera Translation',
  'Point your camera at any Japanese text — signs, menus, documents — and get instant AI translation with cultural context. No typing needed!',
  'feature', '2.1.0', '/detect',
  now() - interval '1 hour'
),
(
  '🌏 Cultural Coach Mode',
  'AI now warns you before sending culturally inappropriate messages. Get real-time guidance on keigo levels, honorifics, and business etiquette in Japan.',
  'feature', '2.1.0', '/chat',
  now() - interval '6 hours'
),
(
  '🎙️ Voice-to-Voice Translation',
  'Record a voice message in any language — AI transcribes, translates, and speaks it back in the target language using ElevenLabs natural voices.',
  'feature', '2.0.0', '/chat',
  now() - interval '1 day'
),
(
  '📇 Business Card Scanner',
  'Scan Japanese meishi (名刺) with your camera. AI extracts name, company, title, phone, email and creates a contact automatically.',
  'feature', '2.0.0', '/contacts',
  now() - interval '2 days'
),
(
  '🆘 Emergency Translation Card',
  'Pre-loaded emergency phrases in Japanese for medical, police, and disaster situations. Works 100% offline — no internet needed.',
  'feature', '2.0.0', '/emergency',
  now() - interval '3 days'
),
(
  '📅 Scheduled Messages & Chat Folders',
  'Schedule messages to send later and organize your chats into folders with Telegram-style tabs. Never miss a time zone again.',
  'feature', '2.0.0', '/chat',
  now() - interval '4 days'
),
(
  '📖 Language Learning Mode',
  'Learn vocabulary from real conversations. Tap any message to see pronunciation, meaning, and example sentences. Build your Japanese naturally.',
  'feature', '2.0.0', '/vocabulary',
  now() - interval '5 days'
),
(
  '🐛 Bug Fixes & Polish',
  'Fixed dark mode on contacts page. Chat input consolidated to single bar. Messages no longer clip on mobile. Layout overflow fixed across all pages. Tap targets enlarged for better mobile UX.',
  'bugfix', '2.0.1', NULL,
  now() - interval '8 days'
),
(
  '⚡ Branding & UX Improvements',
  'New Outfit 600 font across the app. Vibrant color palette. Improved PWA icons. Better login experience. Profile avatars in settings.',
  'improvement', '2.0.0', '/settings',
  now() - interval '10 days'
),
(
  '📸 Photo Editor & Group Polls',
  'Edit photos before sending — crop, rotate, draw, add text. Create polls in group chats to make decisions together.',
  'feature', '1.9.0', '/chat',
  now() - interval '12 days'
),
(
  '🧠 Conversation Memory',
  'AI now remembers context across your chats. It knows your preferences, past topics, and adapts responses to your conversation history.',
  'feature', '1.9.0', '/chat',
  now() - interval '14 days'
),
(
  '💡 Tip: Long Press Messages',
  'Did you know? Long press any message to reply, forward, react, star, or delete. Swipe right to quickly quote-reply!',
  'tip', NULL, '/chat',
  now() - interval '1 day'
),
(
  '💡 Tip: Voice Messages',
  'Hold the microphone button to record a voice message. AI will transcribe and translate it automatically for your chat partner.',
  'tip', NULL, '/chat',
  now() - interval '2 days'
),
(
  '💡 Tip: Chat Wallpapers',
  'Personalize your chat! Go to any conversation → tap the header → change wallpaper. Choose from patterns, gradients, or solid colors.',
  'tip', NULL, '/chat',
  now() - interval '3 days'
);
