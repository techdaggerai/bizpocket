import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type VerifiedProfile = {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  verified_at: string | null;
};

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function requireVerifiedProfile() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, user_id, organization_id, role, verified_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !profile?.organization_id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Profile required' }, { status: 403 }),
    };
  }

  if (!profile.verified_at) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Verification required' }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
    profile: profile as VerifiedProfile,
    supabase,
  };
}

export async function requireConversationInOrg(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string,
  orgId: string
) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, organization_id')
    .eq('id', conversationId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return null;
}
