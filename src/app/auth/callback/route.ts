import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component — ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Read source from URL params (supports both 'source' and legacy 'mode')
        const source = searchParams.get('source') || (searchParams.get('mode') === 'pocketchat' ? 'pocketchat' : 'bizpocket');
        const isPocketChat = source === 'pocketchat';

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          // Existing user — route based on source
          return NextResponse.redirect(`${origin}${isPocketChat ? '/chat' : '/dashboard'}`);
        }

        // New user — auto-create org + profile
        const userLang = (user.user_metadata?.preferred_language || searchParams.get('lang') || 'en').substring(0, 5);
        const trialEnd = isPocketChat ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: org } = await supabase.from('organizations').insert({
          name: 'My Business',
          created_by: user.id,
          plan: 'starter',
          language: userLang,
          currency: 'JPY',
          signup_source: source,
          trial_ends_at: trialEnd,
        }).select().single();

        if (org) {
          await supabase.from('profiles').insert({
            user_id: user.id,
            organization_id: org.id,
            role: 'owner',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
            email: user.email!,
            language: userLang,
          });
        }

        return NextResponse.redirect(`${origin}${isPocketChat ? '/chat' : '/onboarding'}`);
      }
    }
  }

  // Fallback: something went wrong, send to login
  return NextResponse.redirect(`${origin}/login`);
}
