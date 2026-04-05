import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find pending messages that should be sent now
    const { data: scheduled, error: fetchErr } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .limit(50);

    if (fetchErr || !scheduled?.length) {
      return NextResponse.json({ sent: 0 });
    }

    let sentCount = 0;

    for (const sched of scheduled) {
      // Insert as a regular message
      const { error: insertErr } = await supabase.from('messages').insert({
        conversation_id: sched.conversation_id,
        organization_id: sched.org_id,
        sender_type: 'owner',
        sender_name: sched.sender_name || 'You',
        message: sched.content,
        message_type: 'text',
        original_language: sched.language || 'en',
      });

      if (!insertErr) {
        await supabase.from('scheduled_messages').update({ status: 'sent' }).eq('id', sched.id);
        await supabase.from('conversations').update({
          last_message: sched.content,
          last_message_at: new Date().toISOString(),
        }).eq('id', sched.conversation_id);
        sentCount++;
      } else {
        await supabase.from('scheduled_messages').update({ status: 'failed' }).eq('id', sched.id);
      }
    }

    return NextResponse.json({ sent: sentCount });
  } catch (error) {
    console.error('[send-scheduled]', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
