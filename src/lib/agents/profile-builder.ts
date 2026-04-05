// ═══════════════════════════════════════════════════════════
// Spaceship — Profile Builder Agent (Claude Sonnet)
// Generates professional bio, services, tagline, corridors
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import type { ClassificationResult } from './onboarding-classifier'

export interface GeneratedProfile {
  title: string
  bio_en: string
  bio_native: string
  bio_ja: string
  tagline: string // max 60 chars, WhatsApp-friendly
  services: string[]
  operating_corridors: { from: string; to: string; flag_from: string; flag_to: string }[]
  industry_keywords: string[]
  missing_fields: string[]
  next_milestone_tip: string
}

const TIER_INSTRUCTIONS: Record<string, string> = {
  starter: `TIER: 🌱 Starter (New Business)
TONE: Aspirational but honest. Never inflate credentials.
STYLE: "Building something new" energy. Highlight ambition and fresh perspective.
BIO: Short, forward-looking. "Launching..." or "Building..." framing.
TAGLINE: Emphasize potential and first steps.`,

  growing: `TIER: 🌿 Growing (Active Business)
TONE: Confident with real numbers. Show traction.
STYLE: "Proven and expanding" energy. Reference actual track record.
BIO: Medium length, include concrete metrics (invoices sent, clients served).
TAGLINE: Emphasize reliability and growth momentum.`,

  established: `TIER: 🌳 Established (Verified Business)
TONE: Authoritative with full track record. Professional and trusted.
STYLE: "Industry leader" energy. Reference verified credentials.
BIO: Full professional bio. Include years of operation, scale, specialties.
TAGLINE: Emphasize trust, scale, and expertise.`,
}

const SYSTEM_PROMPT = `You are BizPocket's Profile Builder — you generate professional business profiles for foreign entrepreneurs operating in Japan.

RULES:
1. Generate ALL three bios: bio_en (English), bio_native (in the user's native language), bio_ja (Japanese)
2. Title should be a professional role title (e.g. "International Auto Dealer", "Halal Food Supplier")
3. Services should be inferred from business type, invoices, and any available data
4. Operating corridors = country pairs the business connects (e.g. Pakistan→Japan for import/export)
5. Tagline MUST be under 60 characters — it's for WhatsApp/LINE sharing
6. Industry keywords for search/discovery
7. Missing fields = what data the user hasn't provided yet
8. next_milestone_tip = one actionable sentence about their next tier goal

IMPORTANT:
- Never fabricate credentials or numbers the user hasn't earned
- For starter tier, be encouraging but never dishonest
- Use the user's actual data to inform the bio
- bio_native must be in the user's detected native language (from their profile language setting)
- bio_ja must be natural Japanese, not machine-translated

Respond ONLY with valid JSON matching this exact schema:
{
  "title": "string",
  "bio_en": "string",
  "bio_native": "string",
  "bio_ja": "string",
  "tagline": "string (max 60 chars)",
  "services": ["string"],
  "operating_corridors": [{"from": "country", "to": "country", "flag_from": "emoji", "flag_to": "emoji"}],
  "industry_keywords": ["string"],
  "missing_fields": ["string"],
  "next_milestone_tip": "string"
}`

export async function buildProfile(
  userId: string,
  orgId: string,
  classification: ClassificationResult,
  profileData: any,
  orgData: any,
  supabase: any
): Promise<GeneratedProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({ apiKey })

  const tierInstruction = TIER_INSTRUCTIONS[classification.tier] || TIER_INSTRUCTIONS.starter

  const userContext = `
${tierInstruction}

USER DATA:
- Name: ${profileData.full_name || profileData.name || 'Not set'}
- Language: ${profileData.language || 'en'}
- Business Name: ${orgData.name || 'Not set'}
- Business Type: ${orgData.business_type || 'general'}
- Currency: ${orgData.currency || 'JPY'}
- Country: Japan (operating base)
- Has Photo: ${classification.rawData.hasPhoto}
- Has Phone: ${classification.rawData.hasPhone}
- Has Address: ${classification.rawData.hasAddress}

BUSINESS METRICS:
- Invoices Sent: ${classification.rawData.invoiceCount}
- Invoices Paid: ${classification.rawData.paidInvoices}
- Contacts: ${classification.rawData.contactCount}
- Has Tax Info: ${classification.rawData.hasTaxInfo}
- Days Since Signup: ${classification.rawData.daysSinceSignup}
- Trust Score: ${classification.trustScore}/100

TIER: ${classification.tierEmoji} ${classification.tierLabel}
NEXT MILESTONE: ${classification.nextMilestone ? classification.nextMilestone.requirement : 'Max tier reached'}
`.trim()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a professional profile for this business:\n\n${userContext}`,
      },
    ],
  })

  // Fix #6: Safely extract text from response
  const textBlock = message.content?.find((b: any) => b.type === 'text')
  const responseText = textBlock && 'text' in textBlock ? textBlock.text : ''

  if (!responseText) {
    throw new Error('AI returned empty response')
  }

  let parsed: any
  try {
    parsed = JSON.parse(responseText)
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim())
    } else {
      throw new Error('Failed to parse AI profile response')
    }
  }

  // Validate required fields exist
  const generated: GeneratedProfile = {
    title: typeof parsed.title === 'string' ? parsed.title : 'Business Professional',
    bio_en: typeof parsed.bio_en === 'string' ? parsed.bio_en : '',
    bio_native: typeof parsed.bio_native === 'string' ? parsed.bio_native : '',
    bio_ja: typeof parsed.bio_ja === 'string' ? parsed.bio_ja : '',
    tagline: typeof parsed.tagline === 'string' ? parsed.tagline : '',
    services: Array.isArray(parsed.services) ? parsed.services.filter((s: any) => typeof s === 'string') : [],
    operating_corridors: Array.isArray(parsed.operating_corridors) ? parsed.operating_corridors : [],
    industry_keywords: Array.isArray(parsed.industry_keywords) ? parsed.industry_keywords.filter((k: any) => typeof k === 'string') : [],
    missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
    next_milestone_tip: typeof parsed.next_milestone_tip === 'string' ? parsed.next_milestone_tip : '',
  }

  // Enforce tagline length
  if (generated.tagline && generated.tagline.length > 60) {
    generated.tagline = generated.tagline.slice(0, 57) + '...'
  }

  // Save to global_profiles
  const { error: upsertError } = await supabase
    .from('global_profiles')
    .upsert(
      {
        user_id: userId,
        organization_id: orgId,
        tier: classification.tier,
        trust_score: classification.trustScore,
        title: generated.title,
        bio_en: generated.bio_en,
        bio_native: generated.bio_native,
        bio_ja: generated.bio_ja,
        tagline: generated.tagline,
        services: generated.services,
        operating_corridors: generated.operating_corridors,
        industry_keywords: generated.industry_keywords,
        is_published: false,
        matches_today: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    console.error('[ProfileBuilder] Upsert error:', upsertError)
    throw new Error(`Failed to save profile: ${upsertError.message}`)
  }

  return generated
}
