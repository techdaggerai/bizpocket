# CLAUDE.md — BizPocket
Session command: launch zarrar
Product: BizPocket | bizpocket.io | "Your AI Business Autopilot"
Legal: MS Dynamics LLC, Miami Beach FL, USA | Parent: TechDagger | Stripe: Mercury Bank
Default: en-US (American English) + JPY | RTL: Urdu + Arabic
Founder: Dr. Bilal (Doc) — User #1

CRITICAL: Never modify C:\TechDagger\pdj — copy and adapt only.
Canonical project: C:\TechDagger\bizpocket (lowercase)

Stack: Next.js 14 + TypeScript + Tailwind + Supabase Tokyo + Stripe + Vercel + Claude API
Design: Indigo #4F46E5 accent, white bg, DM Sans + DM Mono fonts
Colors: --accent:#4F46E5 --bg:#FFFFFF --text-1:#0A0A0A --green:#16A34A --red:#DC2626

DB Tables: organizations, profiles, cash_flows, expenses, invoices, invoice_items, customers, documents, contacts, conversations, messages, invoice_chats
Every table has organization_id. RLS on everything.
Roles: owner (full), staff (add only), accountant (read-only)

Core Features (v1 — BUILT):
1. Fire Invoice™ — 5 templates, 4 types (commercial/transport/service/proforma), PDF, share
2. PocketChat™ — business messenger, real-time, media, voice notes, 10 languages
3. Money View — cash flow IN/OUT, running balance, month selector
4. AI Command Hub — morning briefing (Claude API), world clock, KPI cards
5. Snap & Vault™ — document scanner, Supabase Storage, month grouping
6. Accountant Portal™ — read-only tabs, month selector
7. Auto-Translate — Claude API translation, 10 languages, language flags
8. Public Invoice Chat — /i/[token], no login required

Pricing: Starter ¥0 | Pro ¥2,980/mo (~$20) | Business ¥5,980/mo (~$40) | Enterprise Custom

Languages (13): EN-US, JA, UR, AR, BN, PT-BR, FIL, VI, TR, ZH-CN, FR, NL, ES
Currencies (16): JPY, USD, EUR, GBP, INR, PKR, SAR, AED, BDT, NGN, BRL, VND, TRY, CNY, PHP, IDR
Currency utility: src/lib/utils.ts → formatCurrency(amount, currency, locale) + CURRENCIES array

Rules:
1. Mobile first — 390px always
2. Indigo #4F46E5 for CTAs and accents
3. Multi-tenant — every query needs organization_id
4. RLS on every table — never skip
5. Test with real data — auctions, exports, car dealers
6. Commit format: [feature] description

---

## Phase 2 — AI Features (Build after ANTHROPIC_API_KEY is live)

### 2A — Telegram Bot (@BizPocketBot)
- Webhook: POST /api/telegram/webhook
- Receive text or voice messages
- Voice → Whisper API transcription
- Claude AI processes with org context (invoices, cash flows, customers)
- Intent detection: CREATE_INVOICE / LOG_EXPENSE / CHECK_BALANCE / SEND_INVOICE / MARK_PAID / QUERY
- Execute action in Supabase, reply in Telegram
- Connect in My Pocket: "Connect Telegram" → t.me/BizPocketBot → /start links account
- Store telegram_chat_id on profiles table

### 2B — WhatsApp Business API
- Same logic as Telegram but via Twilio WhatsApp API
- Webhook: POST /api/whatsapp/webhook
- Connect in My Pocket: "Connect WhatsApp" button
- Store whatsapp_number on profiles table

### 2C — Voice Message Processing
- Voice notes from Telegram/WhatsApp/PocketChat
- Whisper API transcribes audio → text
- Claude processes as text command
- Same intent detection + action execution
- Reply with text + optional voice (ElevenLabs TTS)

### 2D — AI Auto-Actions
- AI reads PocketChat messages → suggests replies
- Payment mentioned → auto-log cash flow entry
- Overdue invoice → AI sends polite reminder via PocketChat
- Auto-translate all messages in real-time
- Morning briefing auto-generated daily at 7am local time

### 2E — Smart Document Processing
- OCR on uploaded receipts (Snap & Vault)
- Auto-extract: amount, date, vendor, category
- Auto-categorize expenses
- Tax document preparation
