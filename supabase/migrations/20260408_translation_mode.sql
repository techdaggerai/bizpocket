-- Add per-chat translation mode toggle
-- Values: 'auto' (default), 'translate_all', 'direct', 'text_only'
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS translation_mode text DEFAULT 'auto';
