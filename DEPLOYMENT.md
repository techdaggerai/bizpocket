# DEPLOYMENT.md — BizPocket / Evrywher
Last updated: 2026-04-04
Stack: Next.js 14 · Supabase Tokyo · Vercel · Stripe · Anthropic · ElevenLabs

---

## Prerequisites

- GitHub account with access to `techdaggerai/bizpocket`
- Vercel account (vercel.com)
- Supabase account (supabase.com)
- Stripe account (stripe.com)
- Anthropic API key (console.anthropic.com)
- ElevenLabs API key (elevenlabs.io) — optional for voice features
- Domain: evrywher.io + bizpocket.io (or your domains)

---

## 1. Supabase Setup

### 1a. Create Project
1. Go to https://supabase.com/dashboard → New project
2. **Name:** bizpocket (or evrywher)
3. **Region:** Tokyo (ap-northeast-1) — REQUIRED for Japan data residency
4. **Database password:** Save this securely
5. Click Create project — wait ~2 minutes

### 1b. Collect Credentials
Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL (e.g. `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon / public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (keep secret — server only)

### 1c. Run Migrations (SQL Editor)
Go to Supabase Dashboard → SQL Editor → run each file in order:

```
supabase/schema.sql                    ← run first (base tables)
supabase/migrations/003_pdj_invoice_tables.sql
supabase/migrations/004_notifications.sql
supabase/migrations/005_recurring_transactions.sql
supabase/migrations/006_notes_everywhere.sql
supabase/migrations/007_planner_events.sql
supabase/migrations/008_expense_planner.sql
supabase/migrations/009_spaceship_protocol.sql
supabase/migrations/010_pocketchat_upgrades.sql
supabase/migrations/011_cashflow_custom_categories.sql
supabase/migrations/012_team_hub.sql
supabase/migrations/013_custom_invoice_columns.sql
supabase/migrations/20260401_invoice_upgrade.sql
supabase/migrations/20260404_group_chat.sql
supabase/migrations/20260404_storage_buckets.sql   ← creates Storage buckets
```

> Tip: Open each file locally, copy contents, paste in SQL editor, click Run.

### 1d. Enable Row Level Security
All tables have RLS policies defined in the migrations.
Verify: Table Editor → select any table → RLS should show "Enabled".

### 1e. Create Storage Buckets (if not created by migration)
Storage → New bucket for each:

| Bucket name | Public | File size limit | Allowed types |
|-------------|--------|-----------------|---------------|
| documents | ✅ | 50 MB | any |
| chat-images | ✅ | 10 MB | image/* |
| voice-messages | ✅ | 50 MB | audio/* |
| profile-photos | ✅ | 5 MB | image/* |
| bot-avatars | ✅ | 5 MB | image/* |

Or run: `SUPABASE_SERVICE_KEY=<key> node scripts/create-buckets.js`

### 1f. Set Auth Redirect URLs
Authentication → URL Configuration:
- Site URL: `https://evrywher.io` (or your domain)
- Redirect URLs — add all:
  ```
  https://evrywher.io/auth/callback
  https://bizpocket.io/auth/callback
  https://pocketchat.co/auth/callback
  https://your-preview.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  ```

### 1g. Enable Auth Providers (optional)
Authentication → Providers → enable Google/Apple if desired.
For magic links: Email provider is enabled by default.

---

## 2. Stripe Setup

### 2a. Get API Keys
Stripe Dashboard → Developers → API keys:
- `STRIPE_SECRET_KEY` = Secret key (`sk_live_...` or `sk_test_...`)

### 2b. Create Products & Prices
Stripe Dashboard → Products → Add product:

**Pro Plan**
- Name: Evrywher Pro
- Pricing: Recurring, ¥1,980/month (JPY)
- Copy the Price ID → `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

**Business Plan**
- Name: Evrywher Business
- Pricing: Recurring, ¥4,980/month (JPY)
- Copy the Price ID → `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` and `STRIPE_BUSINESS_PRICE_ID`

### 2c. Set Up Webhook
Stripe Dashboard → Developers → Webhooks → Add endpoint:
- Endpoint URL: `https://evrywher.io/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### 2d. Test Mode vs Live Mode
- Use `sk_test_...` and test price IDs during development
- Switch to `sk_live_...` for production deployment

---

## 3. Anthropic Setup

1. Go to https://console.anthropic.com → API Keys → Create key
2. Copy key → `ANTHROPIC_API_KEY`
3. Model used: `claude-sonnet-4-20250514` (defined in route files)
4. Ensure billing is set up — translation + AI features make many calls

---

## 4. ElevenLabs Setup (Voice Features)

1. Go to https://elevenlabs.io → Profile → API Keys → Copy
2. Set → `ELEVENLABS_API_KEY`
3. Voice IDs are passed per-request from the client
4. Without this key, voice speak/clone endpoints return 500 (gracefully)

---

## 5. Vercel Deployment

### 5a. Connect Repository
1. Go to https://vercel.com → New Project
2. Import from GitHub → select `techdaggerai/bizpocket`
3. Framework preset: Next.js (auto-detected)
4. Root directory: `.` (leave default)
5. Build command: `next build` (default)
6. Output directory: `.next` (default)

### 5b. Set Environment Variables
Vercel project → Settings → Environment Variables.
Add ALL variables from the checklist below.
Set for: Production + Preview + Development.

### 5c. Deploy
Click Deploy. First deploy takes ~3-4 minutes.
Subsequent deploys trigger automatically on push to `main`.

### 5d. Preview Deployments
Every pull request gets a unique preview URL.
Add these to Supabase redirect URLs if needed.

---

## 6. DNS Configuration

### For evrywher.io (and bizpocket.io)
In your DNS provider (Cloudflare, Namecheap, etc.):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | Auto |
| CNAME | www | cname.vercel-dns.com | Auto |

> Vercel uses 76.76.21.21 as their primary IP. Always check Vercel dashboard for the latest.

### Vercel Domain Setup
Vercel project → Settings → Domains:
- Add `evrywher.io` → assign to production
- Add `www.evrywher.io` → redirect to apex
- Add `bizpocket.io` → assign to production
- Add `pocketchat.co` → assign to production (Evrywher landing)

### SSL
Vercel auto-provisions Let's Encrypt SSL for all custom domains.
No action required — certificate is ready within ~60 seconds of DNS propagation.

---

## 7. Environment Variables — Full Checklist

Copy this block to Vercel → Environment Variables:

```env
# ── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# ── Anthropic ────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── ElevenLabs (optional — voice features) ───────────────────────────────────
ELEVENLABS_API_KEY=...

# ── App ──────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://evrywher.io
```

### Variable descriptions

| Variable | Where to get it | Required |
|----------|----------------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Settings → API | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → Settings → API | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API | ✅ |
| STRIPE_SECRET_KEY | Stripe → Developers → API keys | ✅ |
| STRIPE_WEBHOOK_SECRET | Stripe → Developers → Webhooks → signing secret | ✅ |
| NEXT_PUBLIC_STRIPE_PRO_PRICE_ID | Stripe → Products → Pro plan price | ✅ |
| NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID | Stripe → Products → Business plan price | ✅ |
| STRIPE_BUSINESS_PRICE_ID | Same as above (server-side copy) | ✅ |
| ANTHROPIC_API_KEY | console.anthropic.com → API keys | ✅ |
| ELEVENLABS_API_KEY | elevenlabs.io → Profile → API key | ⚡ Voice only |
| NEXT_PUBLIC_APP_URL | Your production domain | Optional |

---

## 8. Post-Deployment Checklist

- [ ] Visit `https://evrywher.io` — landing page loads
- [ ] Visit `https://evrywher.io/signup` — signup form works
- [ ] Sign up with a test email — receive magic link
- [ ] Complete onboarding flow
- [ ] Send a test message — translation fires
- [ ] Test Stripe checkout — use card `4242 4242 4242 4242`
- [ ] Verify Stripe webhook fires after checkout (`stripe listen --forward-to`)
- [ ] Check Supabase logs for any RLS errors
- [ ] Open `https://evrywher.io/chat` — chat loads
- [ ] Check `/api/ai/translate` returns 200
- [ ] Test PWA: on mobile → "Add to Home Screen" works
- [ ] Verify OG image at `https://evrywher.io/og-image.png`

---

## 9. Local Development

```bash
git clone https://github.com/techdaggerai/bizpocket.git
cd bizpocket
npm install

# Copy env vars
cp .env.example .env.local
# Edit .env.local with your keys

npm run dev
# → http://localhost:3000
```

Stripe local testing:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 10. Useful Links

| Resource | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard |
| Stripe Dashboard | https://dashboard.stripe.com |
| Anthropic Console | https://console.anthropic.com |
| ElevenLabs | https://elevenlabs.io |
| GitHub Repo | https://github.com/techdaggerai/bizpocket |
| Production App | https://evrywher.io |
| BizPocket | https://bizpocket.io |
