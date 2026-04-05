'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const LANGUAGES = [
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', rec: true },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

const LEVELS = [
  { value: 'beginner', icon: '🌱', label: 'Total Beginner', desc: "I don't know any Japanese" },
  { value: 'elementary', icon: '📗', label: 'Elementary', desc: 'I know basics (hello, thank you, numbers)' },
  { value: 'intermediate', icon: '📕', label: 'Intermediate', desc: 'I can have simple conversations' },
  { value: 'advanced', icon: '🎓', label: 'Advanced', desc: 'I want to polish my skills' },
];

const INTERESTS = [
  { id: 'shopping', icon: '🏪', label: 'Daily Shopping', desc: 'Konbini, supermarket' },
  { id: 'transport', icon: '🚃', label: 'Getting Around', desc: 'Trains, buses, taxis' },
  { id: 'banking', icon: '🏦', label: 'Banking & Money', desc: 'ATM, transfers, accounts' },
  { id: 'health', icon: '🏥', label: 'Doctor & Hospital', desc: 'Symptoms, pharmacy' },
  { id: 'food', icon: '🍱', label: 'Food & Restaurants', desc: 'Ordering, menus, allergies' },
  { id: 'mail', icon: '📮', label: 'Mail & Post Office', desc: 'Packages, stamps' },
  { id: 'housing', icon: '🏠', label: 'Housing & Landlord', desc: 'Rent, repairs, contracts' },
  { id: 'work', icon: '💼', label: 'Work & Office', desc: 'Meetings, emails, keigo' },
  { id: 'phone', icon: '📱', label: 'Phone & Internet', desc: 'SIM, contracts, Wi-Fi' },
  { id: 'culture', icon: '🎌', label: 'Culture & Customs', desc: 'Manners, festivals, seasons' },
  { id: 'travel', icon: '✈️', label: 'Travel & Tourism', desc: 'Hotels, sightseeing' },
  { id: 'emergency', icon: '🆘', label: 'Emergencies', desc: 'Police, disaster, medical' },
];

const GOALS = [
  { words: 5, minutes: 5, icon: '⚡', label: 'Quick', desc: '5 words/day · ~5 min' },
  { words: 10, minutes: 10, icon: '📖', label: 'Steady', desc: '10 words/day · ~10 min' },
  { words: 20, minutes: 20, icon: '📚', label: 'Serious', desc: '20 words/day · ~20 min' },
];

export default function LearningOnboarding() {
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const userId = profile?.id;

  const [step, setStep] = useState(1);
  const [lang, setLang] = useState('ja');
  const [level, setLevel] = useState('beginner');
  const [interests, setInterests] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [saving, setSaving] = useState(false);

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);

    // Upsert learning profile
    await supabase.from('learning_profiles').upsert({
      user_id: userId,
      target_language: lang,
      native_language: profile?.language || 'en',
      level,
      daily_goal: dailyGoal,
      interests,
      streak_days: 0,
      total_words_learned: 0,
      total_xp: 0,
    }, { onConflict: 'user_id' });

    router.push('/learn');
  }

  const totalSteps = 4;
  const progress = step / totalSteps;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-2)]">
              <svg className="h-5 w-5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full rounded-full bg-[#4F46E5] transition-all duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-xs text-[var(--text-4)]">{step}/{totalSteps}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ─── STEP 1: Language ─────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <span className="text-5xl">🌍</span>
              <h1 className="mt-4 text-2xl font-bold text-[var(--text-1)]">What do you want to learn?</h1>
              <p className="mt-2 text-sm text-[var(--text-4)]">We&apos;ll tailor everything to your target language</p>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                    lang === l.code
                      ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/5'
                      : 'border-2 border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <span className="text-2xl">{l.flag}</span>
                  <span className="text-sm font-semibold text-[var(--text-1)] flex-1">{l.name}</span>
                  {l.rec && (
                    <span className="rounded-full bg-[#4F46E5]/10 px-2 py-0.5 text-[9px] font-bold text-[#4F46E5]">
                      RECOMMENDED
                    </span>
                  )}
                  {lang === l.code && (
                    <svg className="h-5 w-5 text-[#4F46E5]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Level ────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <span className="text-5xl">📊</span>
              <h1 className="mt-4 text-2xl font-bold text-[var(--text-1)]">What&apos;s your level?</h1>
              <p className="mt-2 text-sm text-[var(--text-4)]">We&apos;ll match content to where you are</p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                    level === l.value
                      ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/5'
                      : 'border-2 border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <span className="text-3xl">{l.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--text-1)]">{l.label}</p>
                    <p className="text-xs text-[var(--text-4)] mt-0.5">{l.desc}</p>
                  </div>
                  {level === l.value && (
                    <svg className="h-5 w-5 text-[#4F46E5] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 3: Interests ────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl">🎯</span>
              <h1 className="mt-4 text-2xl font-bold text-[var(--text-1)]">What do you want to learn about?</h1>
              <p className="mt-2 text-sm text-[var(--text-4)]">Pick as many as you like — we&apos;ll prioritize these topics</p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {INTERESTS.map(i => {
                const selected = interests.includes(i.id);
                return (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`flex items-center gap-2 rounded-2xl p-3 text-left transition-all ${
                      selected
                        ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/5'
                        : 'border-2 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <span className="text-xl">{i.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--text-1)] leading-tight">{i.label}</p>
                      <p className="text-[9px] text-[var(--text-4)]">{i.desc}</p>
                    </div>
                    {selected && (
                      <svg className="h-4 w-4 text-[#4F46E5] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── STEP 4: Daily Goal ───────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="text-center mb-8">
              <span className="text-5xl">⏱️</span>
              <h1 className="mt-4 text-2xl font-bold text-[var(--text-1)]">How much time per day?</h1>
              <p className="mt-2 text-sm text-[var(--text-4)]">Start small — you can always change this later</p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
              {GOALS.map(g => (
                <button
                  key={g.words}
                  onClick={() => setDailyGoal(g.words)}
                  className={`w-full flex items-center gap-4 rounded-2xl p-5 text-left transition-all ${
                    dailyGoal === g.words
                      ? 'border-2 border-[#4F46E5] bg-[#4F46E5]/5'
                      : 'border-2 border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <span className="text-3xl">{g.icon}</span>
                  <div className="flex-1">
                    <p className="text-base font-bold text-[var(--text-1)]">{g.label}</p>
                    <p className="text-xs text-[var(--text-4)] mt-0.5">{g.desc}</p>
                  </div>
                  {dailyGoal === g.words && (
                    <svg className="h-5 w-5 text-[#4F46E5] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-8 pt-4 safe-bottom">
        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 3 && interests.length === 0}
            className="w-full rounded-2xl bg-[#4F46E5] py-4 text-sm font-bold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] py-4 text-sm font-bold text-white transition-colors disabled:opacity-60"
          >
            {saving ? 'Setting up...' : "Let's Start! 🚀"}
          </button>
        )}
      </div>
    </div>
  );
}
