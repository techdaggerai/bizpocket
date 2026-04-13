# CLAUDE.md — BizPocket / Evrywher
Session command: launch zarrar
Product: BizPocket | bizpocket.io | "Your AI Business Autopilot"
Product: Evrywher  | evrywher.io  | "You bring the missing E. We bring the world."
Legal: MS Dynamics LLC, Miami Beach FL, USA | Parent: TechDagger | Stripe: Mercury Bank
Default: en-US (American English) + JPY | RTL: Urdu + Arabic
Founder: Dr. Bilal (Doc) — User #1

CRITICAL: Never modify C:\TechDagger\pdj — copy and adapt only.
Canonical project: C:\TechDagger\bizpocket (lowercase)
GitHub: https://github.com/techdaggerai/bizpocket

Stack: Next.js 14 + TypeScript + Tailwind + Supabase Tokyo + Stripe + Vercel + Claude Sonnet 4.6 + ElevenLabs
Design: Indigo #4F46E5 accent, white bg, DM Sans + DM Mono fonts
Colors: --accent:#4F46E5 --bg:#FFFFFF --text-1:#0A0A0A --green:#16A34A --red:#DC2626

---

## Database Tables

### Core
| Table | Purpose |
|-------|---------|
| organizations | Multi-tenant root — every table joins here |
| profiles | User profiles, roles, language, avatar |
| cash_flows | IN/OUT transactions, running balance |
| customers | Customer records with contact info |
| invoices | Fire Invoice™ — all invoice types |
| invoice_items | Line items for invoices |
| invoice_templates | Saved invoice templates |
| documents | Snap & Vault — scanned docs, files |
| expenses | Expense records |
| expense_categories | Custom expense category definitions |
| estimates | Quote/estimate documents |
| time_entries | Time tracking entries |

### Chat & Messaging (Evrywher / PocketChat)
| Table | Purpose |
|-------|---------|
| conversations | Chat threads — 1:1 and group |
| messages | All messages with translations, reactions |
| contacts | Contact book (linked to conversations) |
| quick_replies | Saved quick reply templates |
| pocket_bot_config | AI bot personality, rules, avatar per org |
| invoice_chats | Public invoice chat sessions |

### AI & Intelligence
| Table | Purpose |
|-------|---------|
| ai_conversations | AI briefing / command hub history |
| ai_insights | Generated AI insights per org |
| usage_tracking | Per-org daily AI usage limits |
| notifications | In-app notification queue |
| feedback | User feedback submissions |

### Planning & Operations
| Table | Purpose |
|-------|---------|
| planner_events | Calendar events |
| planned_expenses | Budget/planned expenses |
| planned_income | Budget/planned income |
| business_cycles | Spaceship Protocol™ business cycles |
| cycle_stages | Stages within a business cycle |
| cycle_items | Items/tasks per stage |
| cycle_transitions | Stage transition history |
| cycle_items (costs) | Item cost breakdown |
| item_photos | Photos attached to items |
| item_templates | Reusable item/product templates |
| stakeholders | Key stakeholders per cycle |

### Team & Admin
| Table | Purpose |
|-------|---------|
| team_invites | Pending team member invites |
| team_documents | Shared team documents |
| team_activity | Audit log of team actions |
| published_websites | Website Builder published sites |

### Storage Buckets (Supabase)
| Bucket | Public | Purpose |
|--------|--------|---------|
| documents | ✅ | Invoices, scanned docs, attachments |
| chat-images | ✅ | Chat image messages |
| voice-messages | ✅ | Voice message audio files |
| profile-photos | ✅ | User profile/avatar photos |
| bot-avatars | ✅ | AI bot avatar images |

---

## API Routes (all under /api/)

### AI Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/ai/translate | POST | Translate text between languages |
| /api/ai/smart-replies | POST | Generate 3 contextual reply suggestions |
| /api/ai/summarize | POST | Summarize last 50 messages |
| /api/ai/briefing | POST | Morning AI briefing |
| /api/ai/cashflow-quick | POST | Quick cashflow entry via AI |
| /api/ai/categorize-expense | POST | Auto-categorize an expense |
| /api/ai/accountant-report | POST | Generate accountant summary report |
| /api/ai/bot-respond | POST | AI bot auto-reply generation |
| /api/ai/cycle-setup | POST | Spaceship Protocol setup assistant |
| /api/ai/detect-document | POST | OCR + document intelligence |
| /api/ai/form-fill | POST | AI form auto-fill assistant |
| /api/ai/image-translate | POST | Translate text in images |
| /api/ai/invoice-helper | POST | Invoice AI suggestions |
| /api/ai/live-guide | POST | Live camera guide (screen reading) |
| /api/ai/social-media | POST | Social media content generation |
| /api/ai/voice-clone | POST | Voice cloning via ElevenLabs |
| /api/ai/voice-speak | POST | TTS via ElevenLabs |
| /api/ai/voice-translate | POST | Transcribe + translate voice |
| /api/ai/website-builder | POST | AI website content generation |

### Chat Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/chat/translate | POST | Real-time message translation |
| /api/chat/bot | POST | PocketBot message handler |

### Business Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/invoices/sign | POST | Save e-signature on invoice |
| /api/notifications/generate | POST | Generate AI notification |
| /api/stripe/checkout | POST | Create Stripe checkout session |
| /api/stripe/portal | POST | Open Stripe customer portal |
| /api/stripe/webhook | POST | Stripe webhook handler |

---

## Environment Variables

### Required — Supabase
| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon/public key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (server-only) |

### Required — Stripe
| Variable | Description |
|----------|-------------|
| STRIPE_SECRET_KEY | Stripe secret API key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |
| NEXT_PUBLIC_STRIPE_PRO_PRICE_ID | Stripe price ID for Pro plan |
| NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID | Stripe price ID for Business plan |
| STRIPE_BUSINESS_PRICE_ID | Server-side Business price ID |

### Required — AI
| Variable | Description |
|----------|-------------|
| ANTHROPIC_API_KEY | Anthropic Claude API key |
| ELEVENLABS_API_KEY | ElevenLabs TTS/voice clone key |

### Optional
| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_APP_URL | App base URL (e.g. https://evrywher.io) |

---

## Features Built (40+)

### Evrywher (pocketchat.co / evrywher.io)
1. Real-time AI translation chat (21 languages)
2. Smart reply suggestions (AI-generated, 3 pills)
3. On-demand message translation (long-press → any language)
4. Conversation summarizer (last 50 messages, Pro+)
5. Voice messages with waveform playback
6. Voice message translation (record → AI transcribes → translates)
7. Cultural intelligence notes inline
8. Group chat (multi-language, 2×2 avatar grid)
9. AI Bot / Auto-reply (custom personality, rules, keigo)
10. QR code contact sharing
11. Typing indicator (animated, multilingual)
12. Read receipts + online status
13. Message reactions (5 emojis)
14. Message starring + delete
15. Chat labels + color coding
16. Link preview in messages
17. Image sharing in chat
18. Chat wallpaper customization
19. Bot setup wizard (name, personality, avatar, rules)
20. 3-screen onboarding flow
21. Profile avatar upload → Supabase Storage
22. Dark mode (Light / System / Dark toggle)
23. PWA manifest (installable on phones)
24. App Store screenshots + metadata
25. Email templates (welcome, trial expiring, invite)
26. Website widget (embed on any site)
27. Public chat link (no login required for customers)
28. Live voice calls (translated)
29. Live Guide (camera → AI reads screen)
30. NewGroup modal (multi-select, 2-step flow)

### BizPocket (bizpocket.io)
31. Fire Invoice™ (5 templates, 4 types, PDF, e-sign, share)
32. Money View (cash flow IN/OUT, running balance, month selector)
33. AI Command Hub (morning briefing, world clock, KPI cards)
34. Snap & Vault™ (document scanner, OCR, month grouping)
35. Accountant Portal™ (read-only, month selector)
36. Expense Planner (AI categorization, recurring)
37. Customer CRM (profiles, chat history, tags)
38. Estimates → Invoice conversion
39. Time tracking
40. Spaceship Protocol™ (business cycle management)
41. Ops Radar (AI business intelligence)
42. Website Builder (AI-generated, published)
43. Social Media AI (content generation)
44. Form Fill AI (auto-complete forms)
45. Team Hub (invite staff + accountant, shared docs)

---

## Roles
| Role | Permissions |
|------|-------------|
| owner | Full access — all features |
| staff | Add only — no delete, no settings |
| accountant | Read-only — financial data only |

## Pricing
| Plan | Price | Key Limits |
|------|-------|-----------|
| Free | ¥0 | 3 AI translations/day, 3 invoices/month |
| Pro | ¥1,980/mo (~$13) | Unlimited translations, AI briefing |
| Business | ¥4,980/mo (~$33) | All features, team, voice AI |
| Enterprise | Custom | Unlimited everything |

## Languages (21)
EN-US, JA, UR, AR, BN, PT-BR, FIL, VI, TR, ZH-CN, FR, NL, ES, PS, FA, HI, KO, TH, ID, NE, SI

## Currencies (16)
JPY, USD, EUR, GBP, INR, PKR, SAR, AED, BDT, NGN, BRL, VND, TRY, CNY, PHP, IDR

## Rules
0. Before searching or exploring files, ALWAYS read graphify-out/GRAPH_REPORT.md first. Navigate by graph structure instead of blind file searching.
1. Mobile first — 390px always
2. Indigo #4F46E5 for CTAs and accents
3. Multi-tenant — every query needs organization_id
4. RLS on every table — never skip
5. Test with real data — auctions, exports, car dealers
6. Commit format: [feature] / [fix] / [hardening] description
7. Hermes (me) saves files, tells Doc, Zarrar pulls and pushes
8. Never touch: src/app/(app)/chat/page.tsx without Zarrar coordination
