import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contactId, undo } = await req.json()

    if (!contactId || typeof contactId !== 'string') {
      return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
    }

    // Get user's profile to verify org membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify the contact belongs to the user's organization
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, organization_id')
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    if (undo) {
      // Undo: restore contact by clearing hidden_at
      await supabase
        .from('contacts')
        .update({ hidden_at: null })
        .eq('id', contactId)
        .eq('organization_id', profile.organization_id)

      return NextResponse.json({ restored: true })
    }

    // Soft delete: set hidden_at timestamp (do NOT delete the record)
    await supabase
      .from('contacts')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[contacts/delete]', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
