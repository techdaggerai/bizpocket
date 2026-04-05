import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import InviteClient from './InviteClient'

interface Props {
  params: { code: string }
}

async function getInviter(code: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)

  // Look up inviter by share_token on global_profiles
  const { data: gp } = await supabase
    .from('global_profiles')
    .select('user_id, tier, trust_score, title, services, operating_corridors, tagline, share_token')
    .eq('share_token', code)
    .eq('is_published', true)
    .single()

  if (!gp) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, full_name, avatar_url')
    .eq('user_id', gp.user_id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', (await supabase.from('profiles').select('organization_id').eq('user_id', gp.user_id).single()).data?.organization_id)
    .single()

  // Only return safe display fields — no user_id, share_token, or internal IDs
  return {
    tier: gp.tier,
    trust_score: gp.trust_score,
    title: gp.title,
    services: gp.services,
    operating_corridors: gp.operating_corridors,
    tagline: gp.tagline,
    display_name: profile?.full_name || profile?.name || 'A Business Professional',
    avatar_url: profile?.avatar_url || null,
    company_name: org?.name || '',
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inviter = await getInviter(params.code)
  if (!inviter) return { title: 'Join Evrywher' }

  const tierEmoji = inviter.tier === 'established' ? '\u{1F333}' : inviter.tier === 'growing' ? '\u{1F33F}' : '\u{1F331}'

  return {
    title: `${inviter.display_name} invited you to Evrywher`,
    description: `Join the global business network. ${tierEmoji} Trust: ${inviter.trust_score}. You both earn +15 Trust Score.`,
    openGraph: {
      title: `${inviter.display_name} invited you to Evrywher`,
      description: `Build your verified professional profile. Both earn +15 Trust Score.`,
      type: 'website',
    },
  }
}

export default async function InvitePage({ params }: Props) {
  const inviter = await getInviter(params.code)
  if (!inviter) notFound()

  return <InviteClient inviter={inviter} code={params.code} />
}
