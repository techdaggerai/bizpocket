-- ============================================================
-- Expanded Topic Library — 30 topics across 6 categories
-- ============================================================

-- Upsert all topics (adds new ones, updates existing)
INSERT INTO learning_topics (slug, title_en, title_target, description, icon, category, difficulty, word_count, is_premium, sort_order) VALUES
-- Daily Life (free)
('daily-konbini', 'Convenience Store', 'コンビニ', 'Receipts, payment methods, bags, points cards, warming up food', '🏪', 'daily', 'beginner', 20, false, 1),
('daily-supermarket', 'Supermarket Shopping', 'スーパー', 'Food labels, weights, allergies, self-checkout, bargain stickers', '🛒', 'daily', 'beginner', 25, false, 2),
('daily-restaurant', 'At a Restaurant', 'レストラン', 'Ordering food, dietary needs, chopstick etiquette, splitting the bill', '🍱', 'daily', 'beginner', 25, false, 3),
('daily-train', 'Train & Station', '電車・駅', 'Tickets, platforms, transfers, delays, reserved seats, IC cards', '🚃', 'daily', 'beginner', 20, false, 4),
('daily-bus-taxi', 'Bus & Taxi', 'バス・タクシー', 'Bus stops, fare payment, taxi phrases, destination directions', '🚌', 'daily', 'beginner', 15, false, 5),
('daily-atm', 'At the ATM', 'ATM', 'Withdrawal, balance check, transfer, PIN, overseas cards', '🏧', 'daily', 'beginner', 12, false, 6),
-- Essential (mix free/pro)
('essential-bank', 'Banking & Transfers', '銀行', 'Open accounts, transfer money, bank books, fees, wire transfers', '🏦', 'essential', 'intermediate', 20, false, 10),
('essential-doctor', 'At the Doctor', '病院', 'Describe symptoms, medical history, prescriptions, insurance card', '🏥', 'essential', 'intermediate', 25, true, 11),
('essential-pharmacy', 'At the Pharmacy', '薬局', 'Over-the-counter medicine, dosage, allergies, cold remedies', '💊', 'essential', 'intermediate', 15, true, 12),
('essential-post-office', 'Post Office & Mail', '郵便局', 'Domestic/international mail, packages, EMS, registered mail', '📮', 'essential', 'elementary', 15, false, 13),
('essential-city-hall', 'City Hall & Forms', '市役所', 'Residence card, health insurance, pension, moving notification', '🏛️', 'essential', 'intermediate', 20, true, 14),
('essential-emergency', 'Police & Emergency', '警察・救急', 'Report incidents, describe problems, emergency numbers, accident', '🚨', 'essential', 'beginner', 15, false, 15),
-- Living in Japan (pro)
('living-apartment', 'Renting an Apartment', 'アパートを借りる', 'Lease terms, key money, deposit, guarantor, move-in costs', '🏠', 'living', 'intermediate', 25, true, 20),
('living-landlord', 'Talking to Landlord', '大家さんと話す', 'Repairs, noise complaints, rent, contract renewal, moving out', '🗝️', 'living', 'intermediate', 20, true, 21),
('living-garbage', 'Garbage & Recycling', 'ゴミの分別', 'Burnable, non-burnable, PET bottles, collection days, oversized', '♻️', 'living', 'elementary', 15, true, 22),
('living-phone', 'Phone & Internet', '携帯・インターネット', 'Phone contract, SIM, Wi-Fi, data plans, cancellation', '📱', 'living', 'elementary', 15, true, 23),
('living-gym', 'At the Gym', 'ジム', 'Membership, machines, locker room, shower, schedule, classes', '🏋️', 'living', 'elementary', 15, true, 24),
('living-salon', 'Salon & Haircut', '美容院', 'Haircut styles, coloring, length, bangs, wash and blow-dry', '💇', 'living', 'elementary', 12, true, 25),
-- Work & Business (pro)
('work-office', 'Office Japanese', 'オフィス日本語', 'Daily office phrases, copier, desk, schedule, reporting to boss', '💼', 'work', 'intermediate', 25, true, 30),
('work-email', 'Business Email', 'ビジネスメール', 'Email greetings, closings, cc, attachments, follow-up phrases', '📧', 'work', 'advanced', 20, true, 31),
('work-meeting', 'Meeting Japanese', '会議', 'Agenda, minutes, presenting, agreeing, disagreeing, action items', '🤝', 'work', 'advanced', 20, true, 32),
('work-keigo', 'Keigo (Polite Forms)', '敬語', 'Sonkeigo, kenjougo, teineigo — the 3 levels of Japanese politeness', '🎩', 'work', 'advanced', 30, true, 33),
-- Culture (mix)
('culture-greetings', 'Greetings & Manners', '挨拶・マナー', 'Time-based greetings, bowing, business card exchange, apologies', '🎌', 'culture', 'beginner', 15, false, 40),
('culture-seasons', 'Seasons & Weather', '季節・天気', 'Cherry blossom, rainy season, typhoon, seasonal greetings', '🌸', 'culture', 'elementary', 15, false, 41),
('culture-festivals', 'Festivals & Holidays', 'お祭り・祝日', 'New Year, Obon, Golden Week, shrine visits, lucky charms', '🎪', 'culture', 'elementary', 20, true, 42),
('culture-food', 'Food Culture', '食文化', 'Sushi etiquette, ramen ordering, izakaya, chopstick manners', '🍣', 'culture', 'elementary', 20, true, 43),
-- Travel (free)
('travel-airport', 'Airport & Immigration', '空港', 'Check-in, customs, immigration forms, boarding, luggage', '✈️', 'travel', 'beginner', 14, false, 50),
('travel-hotel', 'Hotels & Accommodation', 'ホテル', 'Check-in/out, room types, amenities, wake-up call, complaints', '🏨', 'travel', 'beginner', 12, false, 51),
('travel-directions', 'Asking Directions', '道案内', 'Left, right, straight, intersection, landmarks, walking time', '🗺️', 'travel', 'beginner', 15, false, 52),
('travel-sightseeing', 'Sightseeing', '観光', 'Temples, shrines, museums, tickets, photos, souvenirs', '⛩️', 'travel', 'beginner', 15, false, 53)
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_target = EXCLUDED.title_target,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  word_count = EXCLUDED.word_count,
  is_premium = EXCLUDED.is_premium,
  sort_order = EXCLUDED.sort_order;
