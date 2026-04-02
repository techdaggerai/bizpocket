import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { token, signature_url, signature_name } = await request.json()

  if (!token || !signature_url || !signature_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Find invoice by share token
  const { data: invoice, error: findError } = await supabase
    .from('invoices')
    .select('id, status, signature_url')
    .eq('public_token', token)
    .single()

  if (findError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.signature_url) {
    return NextResponse.json({ error: 'Already signed' }, { status: 400 })
  }

  // Save signature
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      signature_url,
      signature_name,
      signed_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
