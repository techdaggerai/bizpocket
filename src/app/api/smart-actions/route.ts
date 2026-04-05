// ═══════════════════════════════════════════════════════════
// POST /api/smart-actions
// Returns prioritized suggestion for GrowthCompanion + Smart
// Action tiles based on the user's real data and tier
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { classifyUser } from '@/lib/agents/onboarding-classifier'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) {
    return NextResponse.json({ suggestion: null, tiles: [] })
  }

  // Get classification (tier, trust, next actions)
  let classification
  try {
    classification = await classifyUser(user.id, orgId, supabase)
  } catch (err: any) {
    console.error('[SmartActions] Classification failed:', err)
    return NextResponse.json({ suggestion: null, tiles: [] })
  }

  // Get recent activity in parallel
  const [pendingInvoicesRes, recentMatchesRes, globalProfileRes] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('id, customer_name, total, currency')
        .eq('organization_id', orgId)
        .is('paid_at', null)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('ai_matches')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'suggested')
        .limit(5),
      supabase
        .from('global_profiles')
        .select('is_published, operating_corridors')
        .eq('user_id', user.id)
        .single(),
    ])

  const pendingInvoices = pendingInvoicesRes.data || []
  const recentMatches = recentMatchesRes.data || []
  const globalProfile = globalProfileRes.data

  // ─── Build suggestion based on priority ────────────────

  interface Suggestion {
    title: string
    description: string
    points: number
    action: string
    route: string
    corridor?: { fromFlag: string; toFlag: string }
  }

  let suggestion: Suggestion | null = null
  const corridors = globalProfile?.operating_corridors || []
  const corridor =
    corridors.length > 0
      ? { fromFlag: corridors[0].flag_from, toFlag: corridors[0].flag_to }
      : undefined

  // PRIORITY 1: No profile yet → build one
  if (!globalProfile?.is_published) {
    suggestion = {
      title: 'Build your global profile',
      description:
        'AI creates your professional profile in 30 seconds. Get discovered by business partners.',
      points: 5,
      action: 'Build Profile',
      route: '/profile/build',
    }
  }
  // PRIORITY 2: Unpaid invoices exist → follow up
  else if (pendingInvoices.length > 0) {
    const inv = pendingInvoices[0]
    suggestion = {
      title: `Follow up with ${inv.customer_name || 'client'}`,
      description: `Invoice for ${inv.currency || '\u00A5'}${inv.total?.toLocaleString() || '?'} is still unpaid. A gentle reminder could help.`,
      points: 2,
      action: 'Send Reminder',
      route: '/invoices',
      corridor,
    }
  }
  // PRIORITY 3: Unviewed matches → check them
  else if (recentMatches.length > 0) {
    suggestion = {
      title: `${recentMatches.length} new match${recentMatches.length > 1 ? 'es' : ''} waiting`,
      description:
        'AI found business partners on your trade corridors. Connect before they expire.',
      points: 1,
      action: 'View Matches',
      route: '/opportunities',
      corridor,
    }
  }
  // PRIORITY 4: No invoices yet → send first
  else if (classification.rawData.invoiceCount === 0) {
    suggestion = {
      title: 'Send your first invoice',
      description:
        'Create a compliant invoice in any currency. Your first one earns +3 Trust.',
      points: 3,
      action: 'Create Invoice',
      route: '/invoices/new',
      corridor,
    }
  }
  // PRIORITY 5: Missing profile fields → next action
  else if (classification.nextActions.length > 0) {
    const next = classification.nextActions[0]
    const nextTierLabel =
      classification.nextMilestone?.nextTier || 'the next tier'
    suggestion = {
      title: next.action,
      description: `Complete this to earn +${next.points} Trust Score and get closer to ${nextTierLabel}.`,
      points: next.points,
      action: 'Do It Now',
      route: '/settings',
    }
  }

  // ─── Build Smart Action tiles (top 4 most valuable) ───

  interface Tile {
    icon: string
    label: string
    points?: number
    route: string
    highlight?: boolean
  }

  const tiles: Tile[] = []

  if (classification.rawData.invoiceCount === 0) {
    tiles.push({
      icon: '\u{1F9FE}',
      label: 'First Invoice',
      points: 3,
      route: '/invoices/new',
      highlight: true,
    })
  } else if (pendingInvoices.length > 0) {
    tiles.push({
      icon: '\u{1F9FE}',
      label: 'Follow Up',
      points: 2,
      route: '/invoices',
      highlight: true,
    })
  }

  if (recentMatches.length > 0) {
    tiles.push({
      icon: '\u{1F91D}',
      label: `${recentMatches.length} Match${recentMatches.length > 1 ? 'es' : ''}`,
      route: '/opportunities',
    })
  }

  if (!classification.rawData.hasPhoto) {
    tiles.push({
      icon: '\u{1F4F7}',
      label: 'Add Photo',
      points: 2,
      route: '/settings',
    })
  }

  if (!classification.rawData.hasTaxInfo) {
    tiles.push({
      icon: '\u{1F3F7}\uFE0F',
      label: 'Add Tax ID',
      points: 3,
      route: '/settings/business-setup',
    })
  }

  // Always-available actions to fill remaining slots
  tiles.push({ icon: '\u{1F4F7}', label: 'Camera', route: '/detect' })
  tiles.push({
    icon: '\u{1F4E4}',
    label: 'Invite +15',
    route: '/invite',
  })

  return NextResponse.json({
    suggestion,
    tiles: tiles.slice(0, 4),
    classification: {
      tier: classification.tier,
      tierEmoji: classification.tierEmoji,
      tierLabel: classification.tierLabel,
      trustScore: classification.trustScore,
      nextMilestone: classification.nextMilestone,
      nextActions: classification.nextActions,
    },
  })
}
