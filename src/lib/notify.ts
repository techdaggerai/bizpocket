/**
 * Server-side notification helper.
 * Call from API routes to create notifications.
 */
import { SupabaseClient } from '@supabase/supabase-js';

export async function createNotification(
  supabase: SupabaseClient,
  orgId: string,
  type: string,
  title: string,
  body?: string,
  actionUrl?: string
) {
  await supabase.from('notifications').insert({
    organization_id: orgId,
    type,
    title,
    body: body || '',
    action_url: actionUrl || null,
  });
}
