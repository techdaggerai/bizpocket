import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // ─── Auth: verify caller is authenticated ───
    const cookieStore = await cookies();
    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageIds } = await req.json();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds required' }, { status: 400 });
    }

    // Get caller's org to scope the update
    const admin = createClient(url, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No profile' }, { status: 403 });
    }

    // Only mark messages in the caller's org as delivered
    const { error } = await admin
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .in('id', messageIds)
      .eq('organization_id', profile.organization_id)
      .is('delivered_at', null);

    if (error) {
      console.error('[delivered]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[delivered]', error);
    return NextResponse.json({ error: 'Failed to mark delivered' }, { status: 500 });
  }
}
