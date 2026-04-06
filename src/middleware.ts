import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getBrandFromHost } from '@/lib/brand';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback', '/privacy', '/terms', '/pocketchat'];
const PUBLIC_PREFIXES = ['/i/', '/site/', '/order/', '/invite/']; // Public invoice + published websites + order + invite pages
const ACCOUNTANT_ALLOWED = ['/accountant', '/login', '/settings'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isPocketChat = getBrandFromHost(hostname) === 'evrywher';
  const pathname = request.nextUrl.pathname;

  // ── Fast exits: skip Supabase entirely for static/public paths ──

  // Public prefix routes (e.g., /i/{token}) — always allow, no auth needed
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes — let the route handler do its own auth, don't add middleware latency
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Evrywher domain routing (non-auth shortcuts)
  if (isPocketChat) {
    // Note: '/' is NOT handled here — it flows through to auth check below.
    // Authenticated users → /chat, unauthenticated → /pocketchat landing.
    if (['/privacy', '/terms'].includes(pathname) || pathname.startsWith('/auth')) {
      return NextResponse.next();
    }
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }

  // ── Supabase auth check ──

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  // Persistent cookies — 400 days (WhatsApp-like)
  const persistentCookieOptions = {
    maxAge: 400 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
  };

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...persistentCookieOptions,
            })
          );
        },
      },
    }
  );

  // Single auth call — this is the only network round-trip for most requests
  const { data: { user } } = await supabase.auth.getUser();

  // Public routes — allow without auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    // Authenticated users on public pages → redirect to app
    if (user && (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/pocketchat')) {
      const url = request.nextUrl.clone();
      const mode = request.nextUrl.searchParams.get('mode');
      url.pathname = (mode === 'pocketchat' || isPocketChat) ? '/chat' : '/dashboard';
      return NextResponse.redirect(url);
    }
    // Evrywher domain: rewrite login/signup to add mode param
    if (isPocketChat && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone();
      url.searchParams.set('mode', 'pocketchat');
      return NextResponse.rewrite(url);
    }
    // Evrywher domain: show pocketchat landing for unauthenticated users on /
    if (isPocketChat && pathname === '/') {
      return NextResponse.rewrite(new URL('/pocketchat', request.url));
    }
    return supabaseResponse;
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  supabaseResponse.headers.set('x-pathname', pathname);

  // ── Single profile query for BOTH onboarding + role check ──
  // Only needed for page navigations, not for /auth or /onboarding
  if (pathname !== '/onboarding' && !pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('user_id', user.id)
      .single();

    // Evrywher onboarding gate
    if (isPocketChat && pathname !== '/welcome' && profile && !profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = '/welcome';
      return NextResponse.redirect(url);
    }

    // Accountant role restriction
    if (profile?.role === 'accountant') {
      const isAllowed = ACCOUNTANT_ALLOWED.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      );
      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/accountant';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
