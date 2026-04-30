import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();

    // Persistent cookie options — 400 days
    const persistOpts = {
      maxAge: 400 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

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
                cookieStore.set(name, value, { ...options, ...persistOpts })
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
        const verifiedAt = user.phone_confirmed_at || user.email_confirmed_at || user.confirmed_at || new Date().toISOString();
        const verificationMethod = user.phone ? 'sms_otp' : 'email_magic_link';

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              verified_at: verifiedAt,
              verification_method: verificationMethod,
              email: user.email!,
              ...(user.phone ? { phone: user.phone, phone_e164: user.phone } : {}),
            })
            .eq('id', profile.id);
          // Existing user — route based on source
          return NextResponse.redirect(`${origin}${isPocketChat ? '/chat' : '/dashboard'}`);
        }

        // New user — auto-create org + profile
        const userLang = (user.user_metadata?.preferred_language || searchParams.get('lang') || 'en').substring(0, 5);
        const trialEnd = isPocketChat ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: org } = await supabase.from('organizations').insert({
          name: 'My Business',
          created_by: user.id,
          plan: 'free',
          language: userLang,
          currency: 'JPY',
          signup_source: source,
          trial_ends_at: trialEnd,
        }).select().single();

        if (org) {
          const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner';
          await supabase.from('profiles').insert({
            user_id: user.id,
            organization_id: org.id,
            role: 'owner',
            name: userName,
            email: user.email!,
            language: userLang,
            phone: user.phone || null,
            phone_e164: user.phone || null,
            verified_at: verifiedAt,
            verification_method: verificationMethod,
          });

          // Handle invite referral — create mutual contacts
          const refOrgId = searchParams.get('ref');
          if (refOrgId && isPocketChat) {
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('name, full_name, email, language')
              .eq('organization_id', refOrgId)
              .eq('role', 'owner')
              .single();

            if (inviterProfile) {
              await supabase.from('contacts').insert([
                {
                  organization_id: org.id,
                  name: inviterProfile.full_name || inviterProfile.name || 'Contact',
                  email: inviterProfile.email,
                  contact_type: 'friend',
                  language: inviterProfile.language || 'en',
                },
                {
                  organization_id: refOrgId,
                  name: userName,
                  email: user.email,
                  contact_type: 'friend',
                  language: userLang,
                },
              ]);
            }
          }
        }

        return NextResponse.redirect(`${origin}${isPocketChat ? '/chat' : '/onboarding'}`);
      }
    }
  }

  // Fallback: something went wrong, send to login
  return NextResponse.redirect(`${origin}/login`);
}
