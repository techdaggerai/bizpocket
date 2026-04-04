# APP_STORE_SUBMISSION.md — Evrywher
Last updated: 2026-04-04
App: Evrywher | evrywher.io | AI translation messenger

---

## Quick Reference

| Field | Value |
|-------|-------|
| App name | Evrywher |
| Subtitle | Chat in 21 languages with AI |
| Bundle ID (iOS) | io.evrywher.app |
| Package name (Android) | io.evrywher.app |
| Category | Social Networking |
| Secondary category | Productivity |
| Age rating | 4+ (iOS) / Everyone (Android) |
| Price | Free |
| Version | 1.0.0 |

---

## iOS App Store (App Store Connect)

### Step 1 — Apple Developer Account
1. Enroll at https://developer.apple.com/programs/ ($99/year)
2. Create an App ID: Identifiers → + → App ID
   - Bundle ID: `io.evrywher.app`
   - Enable: Push Notifications, Sign In with Apple (if used)
3. Create App Store Connect record:
   - https://appstoreconnect.apple.com → My Apps → +
   - Platform: iOS
   - Name: Evrywher
   - Bundle ID: io.evrywher.app

### Step 2 — Required Assets

#### App Icon
| Size | Usage | File |
|------|-------|------|
| 1024×1024 px | App Store listing | icon-1024.png |
| 180×180 px | iPhone app icon @3x | icon-180.png |
| 120×120 px | iPhone app icon @2x | icon-120.png |
| 87×87 px | Settings @3x | icon-87.png |
| 80×80 px | Spotlight @2x | icon-80.png |
| 60×60 px | iPhone @1x | icon-60.png |

**Specs:** PNG, no alpha channel, no rounded corners (Apple applies mask), no text.
**Design:** Indigo #4F46E5 background, Evrywher pocket+chat logo, white + amber bubbles.
Source: Use `public/icon-512.png` and resize/export.

#### Screenshots — iPhone 6.7" (iPhone 15 Pro Max)
**Size: 1290 × 2796 px** — minimum 3, maximum 10

| # | File | Headline |
|---|------|---------|
| 1 | public/app-store/screenshot-1.html | Chat in 21 languages |
| 2 | public/app-store/screenshot-2.html | Not just words. Meaning. |
| 3 | public/app-store/screenshot-3.html | Speak any language |
| 4 | public/app-store/screenshot-4.html | Connect with anyone |
| 5 | public/app-store/screenshot-5.html | Groups that speak every language |

**How to capture:**
1. Open each .html in Chrome
2. DevTools → Device toolbar → Custom: 1290 × 2796
3. Zoom: 100%
4. Cmd+Shift+4 → screenshot entire page
5. Save as PNG

**Optional — iPad (if submitting universal):**
- iPad Pro 12.9": 2048 × 2732 px (portrait)
- Create separate set or adapt existing HTML files

#### App Preview Video (optional but boosts conversion)
- Length: 15–30 seconds
- Format: H.264, .mp4 or .mov
- Resolution: 1290 × 2796 (portrait)

### Step 3 — App Metadata

**App name:** Evrywher
*(30 characters max — "Evrywher" = 8 chars ✅)*

**Subtitle (30 chars max):**
```
Chat in 21 languages with AI
```

**Keywords (100 chars max, comma-separated, no spaces after commas):**
```
translation,chat,AI,messenger,language,cultural,Japanese,Arabic,Korean,multilingual,translate
```

**Short description (promotional text — 170 chars):**
```
Chat with anyone, anywhere, in any language. AI translates every message in real-time. 21 languages. Cultural context included. Free forever.
```

**Full description (4000 chars max):**
→ See `public/app-store/metadata.md` for the complete approved text.

**What's New (v1.0.0):**
→ See `public/app-store/metadata.md` for the complete approved text.

**Support URL:** https://evrywher.io/support
**Marketing URL:** https://evrywher.io
**Privacy Policy URL:** https://evrywher.io/privacy

### Step 4 — App Information

- **Primary language:** English (U.S.)
- **Category:** Social Networking
- **Content Rights:** Check "This app does not contain, show, or access third-party content"
- **Age Rating:** Fill questionnaire → expected result: 4+
  - No violence, no adult content, no gambling, no drugs

### Step 5 — Pricing & Availability
- Price: Free
- Availability: All countries (or Japan first, then expand)
- Pre-orders: Not required for v1.0

### Step 6 — App Privacy
App Store Connect → App Privacy → Edit:
- Data types collected:
  - [x] Contact Info (email address — for account)
  - [x] User Content (messages, audio — for app function)
  - [x] Identifiers (user ID)
  - [ ] Location — NOT collected
  - [ ] Health — NOT collected
  - [ ] Payments — Stripe handles, not stored in app

### Step 7 — Build Upload
```bash
# Build for production
npm run build

# Use Capacitor or PWA wrapping for App Store submission
# Option A: Capacitor (native wrapper)
npx cap init Evrywher io.evrywher.app
npx cap add ios
npx cap copy ios
npx cap open ios
# Then in Xcode: Product → Archive → Distribute App

# Option B: Submit as PWA web clip (simpler, no App Store review)
# Users add to Home Screen via Safari — no submission needed
```

### Step 8 — Review Submission
1. App Store Connect → My Apps → Evrywher → + (new version)
2. Upload screenshots and metadata
3. Upload build via Xcode or Transporter
4. "Submit for Review"
5. Review time: typically 24–48 hours

### Common Rejection Reasons & Fixes
| Rejection | Fix |
|-----------|-----|
| 4.0 — Design: Broken links | Test all buttons/links before submitting |
| 2.1 — Performance: Incomplete | Ensure app works without backend errors |
| 5.1.1 — Privacy: Data collection | Complete App Privacy section accurately |
| 1.0 — App crashes | Test on actual device, not just simulator |
| 4.2 — Minimum functionality | Ensure onboarding completes successfully |

---

## Google Play Store

### Step 1 — Google Play Console
1. Enroll at https://play.google.com/console ($25 one-time)
2. Create app: All apps → Create app
   - App name: Evrywher
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free

### Step 2 — Required Assets

#### App Icon
| Size | Usage |
|------|-------|
| 512×512 px | Play Store listing (PNG, ≤1MB) |
| 192×192 px | Adaptive icon foreground |
| 48×48 px | Launcher icon |

**Adaptive icon specs:**
- Foreground layer: 108×108 dp (432×432 px for xxxhdpi)
- Background layer: solid #4F46E5 or indigo gradient
- Safe zone: 66×66 dp centered (no important content outside)

#### Feature Graphic (required)
- Size: **1024 × 500 px**
- Used as banner at top of Play Store listing
- Design: Evrywher logo + tagline on indigo/gradient background

#### Screenshots — Phone
- Size: min 320px, max 3840px on any side
- Aspect ratio: 16:9 or 9:16 (portrait preferred)
- Min 2, max 8 screenshots
- Use same screenshots as iOS (1290×2796 crops fine)

#### Screenshots — Tablet (optional but recommended)
- 7-inch: 1024 × 600 or similar
- 10-inch: 1280 × 800 or similar

### Step 3 — Store Listing

**App name:** Evrywher *(50 chars max)*
**Short description (80 chars):**
```
AI chat app that translates every message in real-time. 21 languages.
```

**Full description (4000 chars max):**
→ See `public/app-store/metadata.md` for the complete approved text.

**App category:** Communication
**Tags:** Translation, Chat, AI, Messenger
**Email:** hello@evrywher.io
**Website:** https://evrywher.io
**Privacy policy:** https://evrywher.io/privacy

### Step 4 — Content Rating Questionnaire
Play Console → Policy → App content → Ratings:
- Violence: None
- Sexual content: None
- Language: None offensive
- Controlled substances: None
- **Expected rating: EVERYONE (E) / 3+**

Complete the questionnaire for each category. Evrywher should receive the lowest age restriction.

### Step 5 — Target Audience & Content
- Target age group: 18+ (or all ages — messaging app)
- Designed for families: No (unless adding parental controls)
- Does app contain ads: No

### Step 6 — Data Safety
Play Console → Policy → Data safety:

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | Account |
| Email | Yes | No | Account |
| User messages | Yes | No | Core function |
| Audio (voice) | Yes | No | Voice messages |
| Photos | Yes | No | Profile, chat images |
| User IDs | Yes | No | Authentication |

- Is data encrypted in transit: Yes
- Can users delete data: Yes (delete account in settings)

### Step 7 — Build Upload
```bash
# Option A: PWA via Bubblewrap (converts PWA to Android APK/AAB)
npx @bubblewrap/cli init --manifest=https://evrywher.io/manifest.json
npx @bubblewrap/cli build
# Output: app-release-signed.aab

# Option B: Capacitor
npx cap add android
npx cap copy android
npx cap open android
# Android Studio: Build → Generate Signed Bundle/APK

# Option C: PWA listing only
# Google Play allows PWA submission via Trusted Web Activity (TWA)
# Bubblewrap handles this automatically
```

### Step 8 — Release
1. Play Console → Production → Create new release
2. Upload .aab file
3. Add release notes (same as "What's New" text)
4. Review → Rollout to production
5. Review time: typically 2–3 days

---

## Asset Production Checklist

### iOS
- [ ] App icon 1024×1024 (no alpha)
- [ ] 5 screenshots at 1290×2796 (captured from HTML files)
- [ ] App name, subtitle, keywords entered
- [ ] Full description entered
- [ ] Privacy policy URL live at evrywher.io/privacy
- [ ] Support URL live at evrywher.io/support
- [ ] App Privacy section completed
- [ ] Build uploaded via Xcode/Transporter
- [ ] Age rating questionnaire completed

### Android
- [ ] App icon 512×512 PNG
- [ ] Adaptive icon foreground + background layers
- [ ] Feature graphic 1024×500
- [ ] 5 screenshots (can reuse iOS screenshots)
- [ ] Short description (80 chars)
- [ ] Full description entered
- [ ] Privacy policy URL live
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed
- [ ] APK/AAB signed and uploaded
- [ ] Age targeting set

---

## PWA Alternative (No App Store Required)

Evrywher already has PWA support (`/public/manifest.json`). Users can install directly:

**iOS (Safari):**
1. Open evrywher.io in Safari
2. Share → Add to Home Screen
3. App icon appears on home screen, launches full-screen

**Android (Chrome):**
1. Open evrywher.io in Chrome
2. Banner appears: "Add Evrywher to Home Screen"
3. Or: Menu → Add to Home screen

**Advantages:** No review process, instant updates, no 30% Apple/Google fee.
**Disadvantages:** No App Store discovery, no push notifications on iOS (until iOS 17+).

---

## Timeline Estimate

| Task | Time |
|------|------|
| Asset production (icons, screenshots) | 1–2 days |
| iOS metadata + submission | 2–3 hours |
| iOS review | 1–3 days |
| Android metadata + submission | 2–3 hours |
| Google Play review | 2–3 days |
| **Total to live in both stores** | **~1 week** |
