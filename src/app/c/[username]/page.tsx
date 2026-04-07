import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import InviteClient from '@/app/invite/[code]/InviteClient'

interface Props {
  params: { username: string }
}

async function getInviterByUsername(username: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, name, full_name, avatar_url, organization_id')
    .eq('username', username.toLowerCase())
    .single()

  if (!profile) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single()

  return {
    display_name: profile.full_name || profile.name || 'Someone',
    avatar_url: profile.avatar_url || null,
    company_name: org?.name || '',
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const inviter = await getInviterByUsername(params.username)
  if (!inviter) return { title: 'Evrywher' }

  return {
    title: `Chat with ${inviter.display_name} on Evrywher`,
    description: `${inviter.display_name} wants to chat with you on Evrywher — AI-powered multilingual chat.`,
    openGraph: {
      title: `Chat with ${inviter.display_name} on Evrywher`,
      description: `${inviter.display_name} wants to chat with you on Evrywher — AI-powered multilingual chat.`,
      type: 'website',
    },
  }
}

export default async function VanityInvitePage({ params }: Props) {
  const inviter = await getInviterByUsername(params.username)
  if (!inviter) notFound()

  // Pass the username as the code — guest/create and invites/accept both resolve usernames
  return <InviteClient inviter={inviter} code={params.username} />
}
