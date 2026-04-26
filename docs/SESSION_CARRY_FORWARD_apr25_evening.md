# SESSION CARRY-FORWARD — April 25, 2026 (evening) | TechDagger Studio

**Outgoing ARCHITECT:** Claude Opus 4.7 (this chat)
**Incoming ARCHITECT:** next Claude session
**Commander:** Doc
**Project:** Evrywher / BizPocket (shared codebase)

Upload this file to the next chat as the first message. Do not skip.

---

## 1. The headline

**The auth gate is open.** Phone signup endpoint accepts any input, creates an account with no verification, and signs the user in. No SMS OTP fires. No identity is bound to the user. Users land in the app as ghosts with no record of which number they signed up with.

This is the root cause of every "broken" symptom we've been chasing for two weeks: brother test, wife test, duplicate conversations, bare guest screens, missing user identity. They all collapse into this one diagnosis.

Phone signup endpoint itself returns 200. UX appears broken because users are dropped into identity-less ghost sessions. **A 200 response is a worse failure than a 500 here, because nobody alerts on 200s.**

## 2. The spec

`docs/AUTH_DESIGN_v1.md` is committed to the repo (or about to be). That file is the locked spec. The next ARCHITECT must read it before drafting any Zarrar prompt. It contains:

- Pattern A confirmed (SMS OTP via Twilio Verify) primary
- LINE login secondary
- Email magic-link tertiary
- Username/password REMOVED from public signup
- Ghost account migration: mark `verified_at = NULL`, gate at middleware, force re-verification on next access (reversible — not a wipe)
- Schema: `profiles.verified_at`, `profiles.verification_method`, `profiles.line_user_id`, `profiles.phone_e164` + new tables `phone_verifications`, `auth_attempts`
- 8-prompt build sequence in section 12

## 3. What was verified today (Apr 25 ground truth)

Confirmed via Zarrar diagnostic + Vercel logs + Supabase SQL:

- **Production deployed commit:** `1d67729` (Apr 13, 2026). No commits since. `/api/version` returns this. evrywher.io and bizpocket.io are aliases on the same Vercel project.
- **Critical file SHAs recorded** for `phone-signup/route.ts`, `messages/relay/route.ts`, `conversation-summary/route.ts`, `middleware.ts`, `sw.js`, `pocketchat-logo.svg`, `brand.ts` — see Diagnostic #001 report in chat history if needed.
- **Project layout:** `src/`-prefixed (`src/app/api/...`, `src/middleware.ts`, `src/lib/brand.ts`). The previous truth-state document had wrong paths.
- **Schema state in production:**
  - PRESENT: `profiles.phone`, `profiles.username`, `profiles.permanent_invite_code`, `contacts.hidden_at`, `organizations.subscription_status`, `conversations.translation_mode`
  - MISSING: `profiles.bot_name`, `profiles.bot_personality` (bot config persistence bug — separate, parked)
- **`conversation-summary` import bug:** RESOLVED on disk and in prod. Memory was stale. Remove from open bugs.
- **Service worker:** healthy. `evrywher-v2`, `skipWaiting` + `clients.claim` present, old caches cleaned on activate.
- **Phone signup happy path verified live at 21:19:13:** `POST /api/auth/phone-signup → 200 OK`, redirect to `/chat`, app loaded. **But this is the bug, not the fix** — see section 1.

## 4. What is still untested

- **Invite link flow** (`/invite/[code]`). Brother's actual failure path. Held until auth gate is fixed because the flow assumes a verified user identity that doesn't currently exist.
- **Brand new phone number cold signup** with a number that has never touched the system. Today's test (`305772545*` in private mode) may have matched an existing ghost account.
- **OTP flow end to end.** Currently no OTP fires at all.

## 5. Open bugs — current state

| # | Bug | Status |
|---|-----|--------|
| 1 | Auth gate open / ghost users | **CRITICAL — door for the project, fix in progress per AUTH_DESIGN_v1** |
| 2 | Cron 401s every minute on `/api/cron/send-scheduled-messages` | Known, parked. Likely missing `CRON_SECRET` env var or wrong auth check in route |
| 3 | `profiles.bot_name`, `profiles.bot_personality` columns missing in production | Known, simple migration, parked until after auth fix |
| 4 | Multiple `/welcome` redirects on signup landing (4-5 hits in 2s) | Park, low priority |
| 5 | Phone validator accepts <10 digits for US (+1) | Park, will be replaced by E.164 validation in auth fix |
| 6 | Guest chat bare screen | Likely downstream of auth gate fix |
| 7 | Send-as language selector ignored | Park |
| 8 | Doodle background invisible on older iPhones | Park |
| 9 | Duplicate conversations from same invite | Likely downstream of auth gate fix |
| 10 | No contact deletion feature | Park |
| 11 | Invite modal obscured by bottom navigation footer | Park |

Bugs flagged "downstream of auth gate fix" should be retested AFTER the auth fix lands, before any individual fix is written for them.

## 6. Iron rules — locked Apr 25

For Evrywher project specifically:

1. **No fix ships without fresh-human verification.** Not Doc, not ARCHITECT, not INSPECTOR. A second person on a new device completing the flow.
2. **No batched fixes.** One feature, one prompt, one file, one verification.
3. **DB migrations verified in Supabase dashboard before any code depending on them gets pushed.**
4. **Service worker bust verified after every deploy.**
5. **Locked files NEVER modified, only forked:** `public/pocketchat-logo.svg`, `lib/brand.ts`, `components/AnimatedPocketChatLogo.tsx`, `components/Logo.tsx`, `POCKET-MAGIC-v4.1`.
6. **Any change to the auth surface requires INSPECTOR (Codex) adversarial review** before merge. Per UOP 2.1.
7. **No code path creates `profiles` row with `verified_at = NULL`** going forward.

## 7. Lessons added today (#21–#26)

- **#21:** Project uses Next.js `src/` layout. All path references in prompts must be `src/`-prefixed.
- **#22:** `/api/version` endpoint returns deployed commit SHA. Use as canonical disk-vs-cloud parity check, faster than `vercel inspect`.
- **#23:** Migration files in `supabase/migrations/` ≠ migrations applied in production. Verify in `information_schema` before code depending on them ships.
- **#24:** Truth-state assumptions decay. Any "broken" claim older than 72 hours without a re-test must be re-verified before writing fix prompts.
- **#25:** When users say "it doesn't work," do not assume failure is in the page they're on. Trace API response *and* observe what user sees *and* check what was supposed to happen. A 200 response can be a worse failure than a 500.
- **#26:** Friction-reduction must never delete verification. Reducing signup steps ≠ removing identity gates. Move the gate, never remove it.

## 8. TRIDENT v3 status — UOP-aligned

Roles:
- **COMMANDER:** Doc — only true auditor, "fresh tester completed flow" is the only PASS
- **ARCHITECT:** Claude Chat (Opus 4.7) — strategy, prompt design, forensic analysis
- **BUILDER:** Zarrar (Claude Code) — launches from `C:\TechDagger\bizpocket`, runs `claude --version` (currently 2.1.119)
- **INSPECTOR:** Codex — currently benched, returns when auth code change is ready for security review

Project Adaptation Block:
- PROJECT_NAME: Evrywher + BizPocket (shared codebase, aliased on one Vercel project)
- BUILDER_TOOLING: Claude Code on Windows CMD, repo `techdaggerai/bizpocket`, Vercel CLI 51.7.0 installed and authenticated, **Supabase MCP NOT attached** (open task to add to `.mcp.json`)
- CRITICAL_FILES: see section 3 SHAs
- NON_NEGOTIABLE_RULES: 7 iron rules in section 6

## 9. What the next session does, in order

1. **Read `docs/AUTH_DESIGN_v1.md`** in full. It is the spec. Do not improvise around it.
2. **Confirm the 5 open questions** in section 14 of that doc are answered (country default, OTP text, LINE email scope, Twilio Verify Service ID status, username/password removal mechanism). If not, ask Commander.
3. **Write Zarrar Prompt 1: schema migration.** SQL only. Run in Supabase SQL editor by Doc. No code change. Verify columns exist via `information_schema` query.
4. **INSPECTOR review on the SQL** before running. Yes — even SQL. Auth-adjacent.
5. **Fresh-human verify** the migration: Doc queries the new columns from a separate SQL window, confirms presence, types, defaults.
6. **Then and only then,** Prompt 2: OTP routes.

UOP 1.8: live-operation crises do not get fixed in the same session they're diagnosed. Today's session was diagnosis. Build is fresh session. Honor the quarantine.

## 10. What NOT to do at session start

- Do not write a Zarrar prompt before reading `AUTH_DESIGN_v1.md`.
- Do not assume any of the 25 prior "fixes" need re-fixing — most are downstream of auth and will resolve once the gate is closed.
- Do not run the invite link test until auth gate is closed.
- Do not attempt to fix the cron 401s, bot_name columns, or any other parked bug until auth fix lands and a fresh human has completed signup → invite → message in clean state.
- Do not skip the `claude --version`, `git status`, `git log --oneline -10` Tool Check at session start.

## 11. Twilio + LINE — what Doc needs to do offline before next session

- **Confirm Twilio Verify Service exists** in Twilio console. If not, create one. Note the Service SID (starts with `VA...`). Add to Vercel env as `TWILIO_VERIFY_SERVICE_SID`.
- **Confirm LINE Channel credentials** for Login (separate from Messaging API channel). If not yet set up, create a LINE Login channel at https://developers.line.biz/console/. Note `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`. Set `LINE_REDIRECT_URI = https://www.evrywher.io/api/auth/line/callback`.
- **Add `CRON_SECRET`** env var while we're in there (resolves the cron 401 storm as a side effect of the auth fix session).

These can be done in parallel with the next session, but Prompt 2 will need them ready.

## 12. The mood

We just made more progress in 4 hours of disciplined diagnostic than the prior 2 weeks of fix-stacking. The project is no longer "at a halt" — it has a named root cause for the first time. The path forward is mapped. The door is named. The fix is designed. Build starts fresh next session.

Doc said "it's your call" at the auth pattern decision and the ARCHITECT pushed back: pattern decisions are Commander calls. Doc made the call (Pattern A). That's how TRIDENT works when it works.

---

**End of carry-forward. Upload to next session as message 1.**
