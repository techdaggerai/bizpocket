import { notFound } from 'next/navigation'
import { getProfileDisplayData } from '@/lib/profile-helpers'
import type { Metadata } from 'next'
import PublicProfileClient from './PublicProfileClient'

interface Props {
  params: { shareToken: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = params
  const profile = await getProfileDisplayData(shareToken)
  if (!profile) return { title: 'Profile Not Found | Evrywher' }

  const corridors = profile.operating_corridors
    ?.map((c: any) => `${c.flag_from} ${c.from} \u2194 ${c.flag_to} ${c.to}`)
    .join(', ') || ''

  const tierEmoji = profile.tier === 'established' ? '\u{1F333}' : profile.tier === 'growing' ? '\u{1F33F}' : '\u{1F331}'
  const tierLabel = profile.tier === 'established' ? 'Established' : profile.tier === 'growing' ? 'Growing' : 'New Business'

  return {
    title: `${profile.display_name} \u2014 ${profile.title || 'Professional'} | Evrywher`,
    description: profile.tagline || profile.bio_en?.substring(0, 150) || 'Verified business professional on Evrywher',
    openGraph: {
      title: `${profile.display_name} on Evrywher`,
      description: `${tierEmoji} ${tierLabel} \u00B7 Trust: ${profile.trust_score} \u00B7 ${(profile.services || []).slice(0, 3).join(' \u00B7 ')}`,
      images: [`/p/${shareToken}/opengraph-image`],
      type: 'profile',
      url: `https://evrywher.io/p/${shareToken}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.display_name} on Evrywher`,
      description: `${tierEmoji} ${tierLabel} \u00B7 Trust: ${profile.trust_score}`,
      images: [`/p/${shareToken}/opengraph-image`],
    },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { shareToken } = params
  const profile = await getProfileDisplayData(shareToken)
  if (!profile) notFound()

  return <PublicProfileClient profile={profile} shareToken={shareToken} />
}
