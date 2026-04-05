// ═══════════════════════════════════════════════════════════
// Admin Verification API
// Server-side approve/reject + signed URL generation
// Uses service role for cross-user storage access
// ═══════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logTrustEvent } from '@/lib/trust-score'

const ADMIN_EMAILS = ['bilal@techdagger.com', 'test123@techdagger.com']

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

// GET: List pending + generate signed URLs
export async function GET() {
  const supabase = await getAuthSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = getServiceSupabase()

  const { data: verifications } = await service
    .from('id_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (!verifications || verifications.length === 0) {
    return NextResponse.json({ verifications: [] })
  }

  // Get user names
  const userIds = verifications.map((v: any) => v.user_id)
  const { data: profiles } = await service
    .from('profiles')
    .select('user_id, name, full_name, email')
    .in('user_id', userIds)

  const nameMap = new Map<string, any>(
    (profiles || []).map((p: any) => [p.user_id, p])
  )

  // Generate signed URLs with service role
  const enriched = await Promise.all(
    verifications.map(async (v: any) => {
      const profile = nameMap.get(v.user_id)
      const { data: idUrl } = await service.storage
        .from('id-documents')
        .createSignedUrl(v.id_document_url, 600)
      const { data: selfieUrl } = await service.storage
        .from('id-documents')
        .createSignedUrl(v.selfie_url, 600)

      return {
        ...v,
        user_name: profile?.full_name || profile?.name || 'Unknown',
        user_email: profile?.email || '',
        id_image_url: idUrl?.signedUrl || null,
        selfie_image_url: selfieUrl?.signedUrl || null,
      }
    })
  )

  return NextResponse.json({ verifications: enriched })
}

// POST: Approve or reject
export async function POST(request: Request) {
  const supabase = await getAuthSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { verificationId: string; action: 'approve' | 'reject'; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const service = getServiceSupabase()

  // Verify the record is still pending
  const { data: verif } = await service
    .from('id_verifications')
    .select('id, user_id, status')
    .eq('id', body.verificationId)
    .eq('status', 'pending')
    .single()

  if (!verif) {
    return NextResponse.json({ error: 'Verification not found or already reviewed' }, { status: 404 })
  }

  if (body.action === 'approve') {
    // Update verification
    await service.from('id_verifications').update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', verif.id)

    // Update badge
    await service.from('global_profiles').update({
      badge_tier: 'id_verified',
    }).eq('user_id', verif.user_id)

    // Log trust event for the verified user (using service role)
    try {
      await logTrustEvent(service, verif.user_id, 'id_verified')
    } catch (err) {
      console.error('[AdminVerif] Trust event error:', err)
    }

    // Notification
    const { data: profile } = await service
      .from('profiles')
      .select('organization_id')
      .eq('user_id', verif.user_id)
      .single()

    if (profile) {
      await service.from('notifications').insert({
        organization_id: profile.organization_id,
        type: 'system',
        title: '\u{1F7E2} You\'re ID Verified!',
        body: 'Your identity has been verified. You now have the green badge.',
        action_url: '/verification',
      })
    }

    return NextResponse.json({ success: true, action: 'approved' })
  }

  if (body.action === 'reject') {
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

    await service.from('id_verifications').update({
      status: 'rejected',
      rejection_reason: body.reason.trim(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', verif.id)

    const { data: profile } = await service
      .from('profiles')
      .select('organization_id')
      .eq('user_id', verif.user_id)
      .single()

    if (profile) {
      await service.from('notifications').insert({
        organization_id: profile.organization_id,
        type: 'system',
        title: 'Verification Not Approved',
        body: `Your verification was not approved: ${body.reason.trim()}. You can submit again.`,
        action_url: '/verification',
      })
    }

    return NextResponse.json({ success: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
