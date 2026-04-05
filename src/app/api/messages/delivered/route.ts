import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { messageIds } = await req.json();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds required' }, { status: 400 });
    }

    // Only mark undelivered messages
    const { error } = await supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .in('id', messageIds)
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
