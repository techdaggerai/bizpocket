// ═══════════════════════════════════════════════════════════
// Spaceship — Matchmaker Agent
// AI-powered cross-border business partner matching
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'

export interface MatchCandidate {
  user_id: string
  tier: string
  trust_score: number
  title: string | null
  bio_en: string | null
  tagline: string | null
  services: string[]
  operating_corridors: any[]
  industry_keywords: string[]
  display_name?: string
  company_name?: string
  avatar_url?: string | null
  badge_tier?: string
}

export interface MatchResult {
  matched_user_id: string
  match_score: number
  match_reasons: string[]
  corridor_tag: string
  tier_dynamic: 'peer' | 'mentorship' | 'partnership' | 'high_value'
  icebreaker_en: string
  icebreaker_native: string
  service_complement_score: number
  corridor_relevance_score: number
  industry_overlap_score: number
  language_compatibility_score: number
  trust_proximity_score: number
  candidate: MatchCandidate
}

const SYSTEM_PROMPT = `You are BizPocket's Matchmaker — you find cross-border business partnerships for foreign entrepreneurs in Japan.

You receive a requesting user's profile and a list of candidate profiles.
Your job is to score and rank the best matches.

SCORING CRITERIA (total 100):
- Service Complement (30 pts): Do their services fill gaps for each other? Buyer-seller, complementary offerings.
- Corridor Relevance (25 pts): Do they share or connect operating corridors? Same country pairs = high.
- Industry Overlap (20 pts): Related industries that create natural partnerships.
- Language Compatibility (15 pts): Shared languages enable direct communication.
- Trust Proximity (10 pts): Similar trust scores suggest peer-level relationships.

TIER DYNAMIC:
- "peer": Similar tier and trust score (within 15 pts)
- "mentorship": Established matching with Starter (knowledge transfer potential)
- "partnership": Growing matching with Growing (equal growth partners)
- "high_value": Established matching with Growing/Established (premium connection)

ICEBREAKER RULES:
- Must be culturally appropriate and professional
- Reference specific shared corridors, services, or industries
- Generate in English AND the requesting user's native language
- Keep under 100 words each
- Never generic — always reference real data from both profiles

Respond ONLY with valid JSON array of matches, sorted by match_score DESC.
Return at most 5 matches. Each match:
{
  "matched_user_id": "uuid",
  "match_score": 0-100,
  "match_reasons": ["reason1", "reason2"],
  "corridor_tag": "🇯🇵 ↔ 🇵🇰 Japan ↔ Pakistan",
  "tier_dynamic": "peer|mentorship|partnership|high_value",
  "icebreaker_en": "English icebreaker message",
  "icebreaker_native": "Native language icebreaker",
  "service_complement_score": 0-30,
  "corridor_relevance_score": 0-25,
  "industry_overlap_score": 0-20,
  "language_compatibility_score": 0-15,
  "trust_proximity_score": 0-10
}`

export async function findMatches(
  userId: string,
  supabase: any
): Promise<MatchResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  // Get requesting user's profile
  const { data: myProfile, error: myError } = await supabase
    .from('global_profiles')
    .select('user_id, tier, trust_score, title, bio_en, tagline, services, operating_corridors, industry_keywords, badge_tier, organization_id')
    .eq('user_id', userId)
    .eq('is_published', true)
    .single()

  if (myError || !myProfile) {
    throw new Error('Your profile must be published to find matches')
  }

  // Get user's display info
  const { data: myBizProfile } = await supabase
    .from('profiles')
    .select('name, full_name, language')
    .eq('user_id', userId)
    .single()

  const { data: myOrg } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', myProfile.organization_id)
    .single()

  // Get already matched/dismissed user IDs
  const { data: existingMatches } = await supabase
    .from('ai_matches')
    .select('matched_user_id')
    .eq('user_id', userId)
    .in('status', ['connected', 'dismissed'])

  const excludeIds = [userId, ...(existingMatches || []).map((m: any) => m.matched_user_id)]

  // Query candidates — use proper array filter
  let query = supabase
    .from('global_profiles')
    .select('user_id, tier, trust_score, title, bio_en, tagline, services, operating_corridors, industry_keywords, badge_tier')
    .eq('is_published', true)
    .eq('is_discoverable', true)
    .order('trust_score', { ascending: false })
    .limit(20)

  // Filter out excluded IDs using proper PostgREST array syntax
  for (const id of excludeIds) {
    query = query.neq('user_id', id)
  }

  const { data: candidates, error: candError } = await query

  if (candError) {
    console.error('[Matchmaker] Candidate query error:', candError)
    throw new Error('Failed to query candidates')
  }

  if (!candidates || candidates.length === 0) {
    return []
  }

  // Enrich candidates with display info
  const candidateUserIds = candidates.map((c: any) => c.user_id)
  const { data: candProfiles } = await supabase
    .from('profiles')
    .select('user_id, name, full_name, avatar_url')
    .in('user_id', candidateUserIds)

  const profileMap = new Map<string, any>((candProfiles || []).map((p: any) => [p.user_id, p]))

  const enrichedCandidates: MatchCandidate[] = candidates.map((c: any) => {
    const bp = profileMap.get(c.user_id)
    return {
      ...c,
      display_name: bp?.full_name || bp?.name || 'Business Professional',
      avatar_url: bp?.avatar_url || null,
    }
  })

  // Build AI prompt
  const myContext = {
    user_id: myProfile.user_id,
    name: myBizProfile?.full_name || myBizProfile?.name || 'User',
    language: myBizProfile?.language || 'en',
    company: myOrg?.name || '',
    tier: myProfile.tier,
    trust_score: myProfile.trust_score,
    title: myProfile.title,
    services: myProfile.services || [],
    corridors: myProfile.operating_corridors || [],
    industries: myProfile.industry_keywords || [],
  }

  const candidateContext = enrichedCandidates.map((c) => ({
    user_id: c.user_id,
    name: c.display_name,
    tier: c.tier,
    trust_score: c.trust_score,
    title: c.title,
    services: c.services || [],
    corridors: c.operating_corridors || [],
    industries: c.industry_keywords || [],
    tagline: c.tagline,
    badge_tier: c.badge_tier,
  }))

  const anthropic = new Anthropic({ apiKey })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Find the best business matches for this user:\n\nREQUESTING USER:\n${JSON.stringify(myContext, null, 2)}\n\nCANDIDATES (${candidateContext.length}):\n${JSON.stringify(candidateContext, null, 2)}`,
      },
    ],
  })

  // Parse response
  const textBlock = message.content?.find((b: any) => b.type === 'text')
  const responseText = textBlock && 'text' in textBlock ? textBlock.text : ''

  if (!responseText) return []

  let parsed: any[]
  try {
    parsed = JSON.parse(responseText)
  } catch {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim())
    } else {
      console.error('[Matchmaker] Failed to parse AI response')
      return []
    }
  }

  if (!Array.isArray(parsed)) return []

  // Validate and enrich results — only accept matches with known candidate IDs
  const validCandidateIds = new Set(enrichedCandidates.map((c) => c.user_id))

  const results: MatchResult[] = parsed
    .filter((m: any) =>
      m.matched_user_id
      && typeof m.match_score === 'number'
      && validCandidateIds.has(m.matched_user_id) // reject hallucinated IDs
    )
    .slice(0, 5)
    .map((m: any) => {
      const candidate = enrichedCandidates.find((c) => c.user_id === m.matched_user_id)!
      return {
        matched_user_id: m.matched_user_id,
        match_score: Math.min(100, Math.max(0, m.match_score)),
        match_reasons: Array.isArray(m.match_reasons) ? m.match_reasons : [],
        corridor_tag: typeof m.corridor_tag === 'string' ? m.corridor_tag : '',
        tier_dynamic: ['peer', 'mentorship', 'partnership', 'high_value'].includes(m.tier_dynamic)
          ? m.tier_dynamic
          : 'peer',
        icebreaker_en: typeof m.icebreaker_en === 'string' ? m.icebreaker_en : '',
        icebreaker_native: typeof m.icebreaker_native === 'string' ? m.icebreaker_native : '',
        service_complement_score: Math.min(30, Math.max(0, m.service_complement_score || 0)),
        corridor_relevance_score: Math.min(25, Math.max(0, m.corridor_relevance_score || 0)),
        industry_overlap_score: Math.min(20, Math.max(0, m.industry_overlap_score || 0)),
        language_compatibility_score: Math.min(15, Math.max(0, m.language_compatibility_score || 0)),
        trust_proximity_score: Math.min(10, Math.max(0, m.trust_proximity_score || 0)),
        candidate,
      }
    })

  return results
}
