# CLAUDE.md — BizPocket Japan
Session command: launch zarrar
Product: BizPocket Japan | bizpocket.jp | "Your business in your pocket"
Legal: MS Dynamics LLC (Miami Beach FL) | Parent: TechDagger | Stripe: Mercury Bank
Founder: Dr. Bilal (Doc) — User #1

CRITICAL: Never modify C:\TechDagger\pdj — copy and adapt only.
Canonical project: C:\TechDagger\bizpocket (lowercase)

Stack: Next.js 14 + TypeScript + Tailwind + Supabase Tokyo + Stripe + Vercel
Colors: --gold:#FFD700 --void:#09090B --card:#111113 --snow:#FAFAFA --ash:#A1A1AA
Fonts: Syne (display+body) + DM Mono (numbers) + Noto Sans JP

DB Tables: organizations, profiles, cash_flows, expenses, invoices, customers, documents, invoice_templates
Every table has organization_id. RLS on everything.
Roles: owner (full), staff (add only), accountant (read-only)

Features: Fire Invoice, Money View, Log It, Snap & Vault (Pro), Accountant Portal (Pro — killer feature)
Pricing: Free ¥0 | Pro ¥1,980/mo | Team ¥3,980/mo

Rules:
1. Mobile first — 390px always
2. Gold #FFD700 for CTAs and key numbers only
3. Multi-tenant — every query needs organization_id
4. RLS on every table — never skip
5. Test with real data — auctions, exports, car dealers
6. Commit format: [feature] description
