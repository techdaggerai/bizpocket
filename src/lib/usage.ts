/**
 * Evrywher AI Usage Tracking
 * Free tier: 10 translations/day, unlimited bot, 3 smart replies/day, 3 groups max
 * Pro/Business/Team: unlimited everything
 */

import { SupabaseClient } from '@supabase/supabase-js';

const FREE_LIMITS: Record<string, number> = {
  translation: 10,
  smart_reply: 3,
  group_create: 3,
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

  // Bot chat: unlimited on free tier
  if (usageType === 'bot_chat') {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const limit = FREE_LIMITS[usageType] || 0;
  if (limit === 0) return { allowed: true, used: 0, limit: Infinity };

  const today = new Date().toISOString().slice(0, 10);

  // For group_create, count total groups (not daily)
  if (usageType === 'group_create') {
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_group', true);
    const used = count || 0;
    return { allowed: used < limit, used, limit };
  }

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
  // Skip tracking for unlimited types
  if (usageType === 'bot_chat' || usageType === 'group_create') return;

  const today = new Date().toISOString().slice(0, 10);

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
