-- LINE Official Account integration
CREATE TABLE IF NOT EXISTS line_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id text NOT NULL,
  line_display_name text,
  line_picture_url text,
  evrywher_user_id uuid REFERENCES auth.users(id),
  evrywher_chat_id uuid,
  language text DEFAULT 'ja',
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  UNIQUE(line_user_id)
);

ALTER TABLE line_threads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_line_threads_user ON line_threads(line_user_id);
