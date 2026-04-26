# AUTH_DESIGN_v1.md

**Project:** Evrywher / BizPocket (shared codebase)
**Author:** ARCHITECT (Claude Opus 4.7)
**Commander approval:** Doc, April 25, 2026
**Status:** LOCKED — implementation spec for Zarrar
**Supersedes:** Apr 12, 2026 "phone-only, no OTP" workaround (now identified as auth-gate-open vulnerability)

---

## 1. Why this document exists

On April 25, 2026, during a live ground-truth flow trace, we discovered that the deployed phone signup endpoint accepts any phone number string with no verification, creates an account, and signs the user in. No SMS OTP fires. No identity is bound to the user. The user lands in the app as a ghost — no record of which number they signed up with, no way to recover the account, no way to be invited or to invite, no way to be uniquely identified.

This was the root cause of every previously-observed "broken" flow: the brother test, the wife test, duplicate conversations, bare guest screens, missing user identity. All collapsed into one diagnosis. The fix replaces the open gate with a verified gate.

This document is the spec for that fix. Zarrar builds from this document, not from chat memory. Every change to the auth surface must trace back to a section here.

## 2. Chosen pattern

**Pattern A primary, LINE secondary, Email magic-link tertiary, Username/password removed.**

- **Primary — SMS OTP via Twilio.** User enters phone, Twilio sends 6-digit code, user enters code, account verified and created/logged in.
- **Secondary — LINE login.** One-tap OAuth via LINE Messaging API. User identity verified by LINE itself.
- **Tertiary — Email magic-link via Supabase Auth.** User enters email, taps link in inbox, account verified and created/logged in.
- **Removed — Username/password.** Not on signup screen, not on login screen. May return as a recovery mechanism for verified users in a later phase. Not in this phase.

## 3. Acceptance criteria — what "fixed" means

The fix is not complete until all of these pass with a fresh human, fresh device, fresh number, in private browsing:

1. A user attempting signup with a phone number receives an SMS OTP within 30 seconds.
2. Entering the wrong code three times locks the attempt for 5 minutes.
3. Entering the correct code creates an account and logs the user in.
4. The user's verified phone number is visible in Settings → Account.
5. A second attempt to sign up with the same phone number does NOT create a second account; it sends a new OTP and logs into the existing account.
6. A user attempting to log in with a phone they do not control cannot proceed past the OTP step.
7. Existing ghost accounts (created before this fix) are flagged `verified_at IS NULL` and forced through OTP verification on next access. They cannot use identity-bound features (invites, contacts, messaging) until verified.
8. LINE login button creates an account with `provider = 'line'`, `line_user_id` populated, `verified_at` set to login timestamp.
9. Email magic-link creates an account with `verified_at` set when link is consumed.
10. The username/password signup option is removed from the welcome screen.

## 4. Schema changes

All changes additive. No drops, no destructive migrations. Run as one migration file `supabase/migrations/2026XXXXXX_auth_gate_fix.sql`.

### 4.1 — `profiles` table

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at timestamptz NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method text NULL
  CHECK (verification_method IN ('sms_otp', 'line', 'email_magic_link') OR verification_method IS NULL);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id text NULL UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_e164 text NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique
  ON profiles (phone_e164) WHERE phone_e164 IS NOT NULL;
```

`phone_e164` is the canonical E.164-formatted phone (`+12025551234`). The existing `profiles.phone` column is preserved for backwards compatibility but new code reads/writes `phone_e164`. A backfill query is in section 4.4.

### 4.2 — `phone_verifications` table (new)

OTP storage. Short-lived. One row per outstanding verification attempt.

```sql
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  ip_address inet NULL,
  user_agent text NULL
);
CREATE INDEX IF NOT EXISTS phone_verifications_phone_active
  ON phone_verifications (phone_e164, expires_at)
  WHERE consumed_at IS NULL;
```

`code_hash` stores a bcrypt or sha256 hash of the OTP, not the OTP itself. Codes expire 5 minutes after creation. A row is consumed (marked `consumed_at`) on successful verification. Three failed `attempts` invalidate the row.

### 4.3 — `auth_attempts` table (new)

Rate limiting. One row per attempt. Used to prevent SMS-pumping abuse and enumeration attacks.

```sql
CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NULL,
  email text NULL,
  ip_address inet NOT NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('otp_request', 'otp_verify', 'magic_link', 'line_oauth')),
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_phone_recent
  ON auth_attempts (phone_e164, created_at DESC) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS auth_attempts_ip_recent
  ON auth_attempts (ip_address, created_at DESC);
```

Rate limits enforced in route logic:
- Per phone number: max 3 OTP requests per hour, max 10 per 24 hours.
- Per IP address: max 10 OTP requests per hour, max 30 per 24 hours.
- Per phone number: max 5 OTP verify attempts per 15 minutes.

Exceeding limits returns 429 with a friendly message and a `retry-after` header.

### 4.4 — Backfill of existing rows

```sql
-- Mark all existing profiles as unverified ghosts
UPDATE profiles
SET verified_at = NULL, verification_method = NULL
WHERE verified_at IS NULL;

-- Backfill phone_e164 from phone column where parseable
-- Done in application code, not SQL, because E.164 normalization needs libphonenumber.
-- Migration script lives in scripts/normalize_phone_e164.ts and runs once after migration.
```

## 5. Route inventory

### 5.1 — Routes to CREATE

```
POST   /api/auth/otp/request       — Phone OTP request. Body: { phone_e164 }. Sends SMS via Twilio.
POST   /api/auth/otp/verify        — Phone OTP verification. Body: { phone_e164, code }. Creates session.
POST   /api/auth/line/callback     — LINE OAuth callback handler.
GET    /api/auth/line/start        — LINE OAuth initiation, returns redirect URL.
POST   /api/auth/email/magic-link  — Email magic-link request. (May already exist via Supabase; verify.)
GET    /api/auth/me                — Returns the current authenticated user's verified identity (phone, email, method, verified_at). Used by Settings page.
```

### 5.2 — Routes to MODIFY

```
POST   /api/auth/phone-signup      — DEPRECATE. Either remove entirely OR have it return 410 Gone with a message pointing to /api/auth/otp/request. Recommend remove entirely after frontend cuts over.
```

### 5.3 — Routes to AUDIT (do not touch in this phase, but flag if they bypass auth)

```
POST   /api/auth/guest             — Guest chat creation. Currently allows unverified access. KEEP for guest mode but ensure guest sessions cannot upgrade to full accounts without OTP verification.
GET    /invite/[code]              — Invite link landing. Must route unverified users through OTP gate before accepting invite.
```

## 6. Frontend changes

### 6.1 — Welcome screen (`/welcome`)

- KEEP "Sign in with phone number" (indigo box) — wire to new OTP flow.
- KEEP "Sign in with email" (teal box) — wire to magic-link flow.
- ADD "Sign in with LINE" (green box, between phone and email) — wire to LINE OAuth.
- REMOVE "Sign in with username & password" (orange box). Delete the entire UI element.
- KEEP the "Add Evrywher to Home Screen" PWA prompt at the bottom.

### 6.2 — Phone OTP flow

Two screens, both new or modified:

**Screen 1: Phone entry** (`/auth/phone`)
- Country code picker (default to user's geo-IP country, fallback to +1).
- Phone number input. Validate against E.164 in real time using `libphonenumber-js`.
- "Continue →" button DISABLED until valid E.164.
- On submit: POST `/api/auth/otp/request` with `phone_e164`.
- On success: navigate to OTP entry screen. On rate-limit: show friendly 429 message.

**Screen 2: OTP entry** (`/auth/phone/verify`)
- 6-digit code input.
- "Resend code" button, disabled for 60 seconds after each request.
- "Continue →" button enabled when 6 digits entered.
- On submit: POST `/api/auth/otp/verify`.
- On success: redirect to `/chat`.
- On wrong code: friendly inline error, increment attempts client-side.
- On 3 wrong codes: lock the form, prompt user to request a new code.

### 6.3 — Settings → Account page

This page does not currently show the user their identity. **It must.** New section:

```
Account
  Phone:  +1 (305) 772-545X      [Verified ✓]    [Change]
  Email:  hello@example.com      [Verified ✓]    [Change]
  LINE:   Connected as @doc      [Verified ✓]    [Disconnect]
  Joined: April 12, 2026
```

If a field is unverified, show "Unverified — Verify now" instead of "[Verified ✓]". Tapping "Verify now" routes to the appropriate verification flow.

### 6.4 — Ghost account interception

On every authenticated route load, middleware checks `profiles.verified_at`. If `NULL`:

- Route is permitted only if it is `/auth/*`, `/welcome`, or `/settings/verify`.
- All other routes redirect to `/settings/verify`, which forces OTP/LINE/email verification before proceeding.
- The user's existing data (if any) is preserved. They are not signed out; they are gated.

## 7. Twilio integration

### 7.1 — Configuration

Required environment variables (verify all in Vercel project settings):

```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID    # Use Twilio Verify, not raw SMS, for cleaner OTP handling
```

Recommendation: use **Twilio Verify** API rather than raw `Messages.create()`. Verify handles code generation, hashing, expiry, retry, and i18n out of the box. Saves us from rolling our own OTP storage on the happy path. The `phone_verifications` table in section 4.2 still exists as a local audit trail, populated alongside Verify calls.

### 7.2 — OTP request flow (server-side pseudocode)

```typescript
// POST /api/auth/otp/request
const { phone_e164 } = await req.json();

// 1. Validate E.164
if (!isValidE164(phone_e164)) return 400;

// 2. Rate limit check
if (await rateLimitExceeded(phone_e164, ip)) return 429;

// 3. Call Twilio Verify
const verification = await twilio.verify.v2
  .services(TWILIO_VERIFY_SERVICE_SID)
  .verifications.create({ to: phone_e164, channel: 'sms' });

// 4. Log attempt
await db.insert('auth_attempts', { phone_e164, ip, attempt_type: 'otp_request', succeeded: true });
await db.insert('phone_verifications', { phone_e164, code_hash: 'twilio_managed', expires_at: now() + 5min });

// 5. Return success (no code in response — defense in depth)
return 200 { sent: true };
```

### 7.3 — OTP verify flow

```typescript
// POST /api/auth/otp/verify
const { phone_e164, code } = await req.json();

// 1. Rate limit check
if (await verifyRateLimitExceeded(phone_e164)) return 429;

// 2. Call Twilio Verify check
const check = await twilio.verify.v2
  .services(TWILIO_VERIFY_SERVICE_SID)
  .verificationChecks.create({ to: phone_e164, code });

// 3. Log attempt
await db.insert('auth_attempts', { phone_e164, ip, attempt_type: 'otp_verify', succeeded: check.status === 'approved' });

if (check.status !== 'approved') return 400 { error: 'invalid_code' };

// 4. Find or create profile
let profile = await db.query('select * from profiles where phone_e164 = $1', [phone_e164]);
if (!profile) {
  profile = await createProfile({ phone_e164, verified_at: now(), verification_method: 'sms_otp' });
} else if (profile.verified_at === null) {
  // Existing ghost — verify and bind
  await db.update('profiles', profile.id, { verified_at: now(), verification_method: 'sms_otp' });
}

// 5. Create Supabase auth session for this profile
const session = await supabaseAdmin.auth.admin.createSession(profile.user_id);
return 200 { session };
```

## 8. LINE login integration

LINE Login OAuth 2.0 flow. Documented at https://developers.line.biz/en/docs/line-login/.

### 8.1 — Configuration

```
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
LINE_REDIRECT_URI = https://www.evrywher.io/api/auth/line/callback
```

### 8.2 — Flow

1. User taps "Sign in with LINE" → frontend hits `GET /api/auth/line/start`.
2. Backend generates state token, stores in cookie, returns LINE OAuth URL.
3. User redirected to LINE, authenticates, returns to `/api/auth/line/callback?code=...&state=...`.
4. Backend validates state, exchanges code for access token, fetches LINE user profile.
5. `line_user_id` from profile is the unique identifier.
6. Find or create `profiles` row matching `line_user_id`. Set `verified_at = now()`, `verification_method = 'line'`.
7. Create Supabase session, redirect to `/chat`.

LINE provides display name and (with extra scopes) email. We capture display name as `profiles.full_name` if not already set.

## 9. Email magic-link

Already partially implemented per memory ("Sign in with email" teal box on welcome screen). Audit existing implementation; if it uses Supabase Auth's `signInWithOtp({ email })`, it likely already verifies — confirm before assuming.

If the existing flow creates an account without email verification: same fix pattern as phone. Add the verification gate.

## 10. Migration plan for existing ghost accounts

### 10.1 — Detection

```sql
SELECT id, phone, created_at FROM profiles WHERE verified_at IS NULL;
```

After backfill in section 4.4, this returns every account currently in the system. Expected to be a small number (< 100) consisting of Doc's tests and family attempts.

### 10.2 — Treatment

These accounts are NOT deleted. On next login attempt, they are intercepted by middleware (section 6.4) and routed through `/settings/verify`. Once verified via OTP/LINE/email, `verified_at` is populated and the account is fully active. Any data attached to the account (conversations, contacts, settings) is preserved.

If a ghost account is never accessed again, it remains dormant with `verified_at = NULL`. A periodic cleanup job (NOT in this phase) can purge after 90 days of dormancy.

### 10.3 — Edge case: ghost account with same phone as a new signup

If a new user enters phone X via OTP, and a ghost account already exists with `phone = X`, behavior:
1. OTP fires to phone X.
2. On verification, `find_or_create` matches the existing ghost.
3. Ghost is verified, user takes ownership.
4. Any prior data on the ghost (likely none for true ghosts) becomes the new user's.

This is intentional. The phone number is the canonical identity. Whoever proves ownership of the phone owns the account.

## 11. Iron rules for the auth surface

Locked. These do not bend.

1. **No code path creates a `profiles` row with `verified_at = NULL` going forward.** Ghosts are a legacy artifact, not a feature.
2. **No code path bypasses Twilio Verify, LINE OAuth, or Supabase magic-link.** No "developer mode" shortcut. No "for testing" backdoor that ships to production.
3. **No identity-bound feature (invites, contacts, messaging, payments) is accessible to a user with `verified_at = NULL`.** Middleware enforced.
4. **No phone number is stored or compared in any format other than E.164.** All inputs normalized at the edge.
5. **No OTP code is logged, returned in responses, or stored in plaintext anywhere.** Twilio Verify holds the source of truth.
6. **Rate limits are enforced server-side, not client-side, on every auth attempt.**
7. **Any change to the auth surface requires INSPECTOR (Codex) adversarial review before merge.** Per UOP 2.1.

## 12. Build sequence — Zarrar prompt order

Each prompt is one atomic unit, INSPECTOR-reviewed, fresh-human-verified, before the next begins.

**Prompt 1.** Schema migration only. The SQL in section 4. Run in Supabase SQL editor by Doc. No code change. Verify columns exist via `information_schema` query.

**Prompt 2.** New routes for `/api/auth/otp/request` and `/api/auth/otp/verify`. Twilio Verify integration. Rate limiting. Audit log writes. No frontend change yet.

**Prompt 3.** Frontend phone OTP flow. Two screens (`/auth/phone`, `/auth/phone/verify`). Wire to routes from prompt 2. Welcome screen "Sign in with phone number" routes here.

**Prompt 4.** Middleware ghost-account interception (section 6.4). All routes except auth and verify-self redirect ghosts to `/settings/verify`.

**Prompt 5.** Settings → Account page (section 6.3). Show verified phone/email/LINE. "Verify now" links for unverified.

**Prompt 6.** LINE OAuth flow. Routes from section 5.1. Welcome screen "Sign in with LINE" button.

**Prompt 7.** Remove username/password signup option. Welcome screen UI change. Confirm the route still exists for any legacy login attempts but does NOT create new accounts.

**Prompt 8.** Audit and gate the invite flow (`/invite/[code]`) and guest flow (`/api/auth/guest`) against the new verification model. Section 5.3.

Each prompt: Principle 13 stamped, "do not touch" list specified, INSPECTOR review template applied (UOP 1.11), fresh human verification before next prompt.

## 13. Out of scope for this phase

Explicitly NOT in this fix:

- Two-factor authentication (TOTP, authenticator apps).
- Biometric login (Face ID, Touch ID, WebAuthn).
- Account recovery via secondary contact methods.
- Password-based auth as a recovery mechanism.
- Compliance audit (GDPR, APPI, CCPA flows).
- Audit log UI for users to see their own login history.
- Admin tools to manually verify or unverify accounts.

These are followups, not blockers. Door first.

## 14. Open questions for Commander

1. **Country default for phone entry?** Recommend geo-IP detection with fallback to `+1`. Confirm or override.
2. **OTP message text?** Recommend `"Your Evrywher code is XXXXXX. Don't share this with anyone. Expires in 5 minutes."` Confirm or rewrite.
3. **LINE login: request email scope?** Costs an extra LINE consent screen but lets us match LINE-signups to existing email accounts. Recommend YES.
4. **Twilio Verify Service: production-ready?** Account is set up (per memory: +17624758966), but Twilio Verify Service ID may need separate creation. Confirm before Prompt 2.
5. **Username/password removal: hard delete the route or 410 Gone?** Recommend hard delete after frontend cuts over (Prompt 7). Cleaner.

---

## Appendix A — Forbidden patterns

These patterns will fail INSPECTOR review and must not appear in any auth-surface code:

```typescript
// ❌ FORBIDDEN — creates ghost
const profile = await db.insert('profiles', { phone, /* no verified_at */ });

// ❌ FORBIDDEN — accepts unverified phone
const session = await createSession({ phone: req.body.phone });

// ❌ FORBIDDEN — returns OTP in response
return { code: generatedCode };

// ❌ FORBIDDEN — logs OTP
console.log('OTP for', phone, 'is', code);

// ❌ FORBIDDEN — stores plaintext OTP
await db.insert('phone_verifications', { code: '123456' });

// ❌ FORBIDDEN — non-E.164 storage
await db.insert('profiles', { phone: '305-772-5450' });

// ❌ FORBIDDEN — bypass for "testing"
if (code === '000000' || process.env.NODE_ENV !== 'production') return success;
```

## Appendix B — Required env vars (final list)

```
# Existing, verify present:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN

# New for this phase:
TWILIO_VERIFY_SERVICE_SID
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
LINE_REDIRECT_URI

# Cron secret for the unrelated cron 401 bug, while we're here:
CRON_SECRET
```

---

**End of AUTH_DESIGN_v1.md.**

Doc reads. Doc commits to repo at `docs/AUTH_DESIGN_v1.md`. Doc closes session. Next session opens with this file as ARCHITECT's source of truth and BUILDER's spec.
