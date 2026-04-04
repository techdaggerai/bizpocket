/**
 * Evrywher AI Usage Tracking
 * Free tier: 3 translations/day, 10 bot messages/day
 * Pro/Business/Team: unlimited
 */

import { SupabaseClient } from '@supabase/supabase-js';

const FREE_LIMITS: Record<string, number> = {
  translation: 3,
  bot_chat: 10,
};

export async function checkUsageLimit(
  supabase: SupabaseClient,
  orgId: string,
  usageType: string,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  // Paid plans: unlimited
  if (plan === 'pro' || plan === 'business' || plan === 'team') {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const limit = FREE_LIMITS[usageType] || 0;
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('usage_tracking')
    .select('count')
    .eq('org_id', orgId)
    .eq('usage_type', usageType)
    .eq('usage_date', today)
    .single();

  const used = data?.count || 0;
  return { allowed: used < limit, used, limit };
}

export async function incrementUsage(
  supabase: SupabaseClient,
  orgId: string,
  usageType: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Upsert: insert or increment
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, count')
    .eq('org_id', orgId)
    .eq('usage_type', usageType)
    .eq('usage_date', today)
    .single();

  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage_tracking')
      .insert({ org_id: orgId, usage_type: usageType, usage_date: today, count: 1 });
  }
}
