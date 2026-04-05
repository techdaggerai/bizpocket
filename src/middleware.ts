import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getBrandFromHost } from '@/lib/brand';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback', '/privacy', '/terms', '/pocketchat'];
const PUBLIC_PREFIXES = ['/i/', '/site/', '/order/', '/invite/']; // Public invoice + published websites + order + invite pages
const ACCOUNTANT_ALLOWED = ['/accountant', '/login', '/settings'];

export async function middleware(request: NextRequest) {
  // Evrywher domain routing — evrywher.com / evrywyre.com / pocketchat.co serves Evrywher experience
  const hostname = request.headers.get('host') || '';
  const isPocketChat = getBrandFromHost(hostname) === 'evrywher';

  if (isPocketChat) {
    const path = request.nextUrl.pathname;

    // Root → Evrywher landing (no auth needed)
    if (path === '/') {
      return NextResponse.rewrite(new URL('/pocketchat', request.url));
    }

    // Public pages on pocketchat.co — pass through without auth
    if (['/privacy', '/terms'].includes(path) || path.startsWith('/auth')) {
      return NextResponse.next();
    }

    // Evrywher users should never see BizPocket dashboard
    if (path === '/dashboard') {
      return NextResponse.redirect(new URL('/chat', request.url));
    }

    // Login/Signup on pocketchat.co — fall through to session check below
    // (logged-in users get redirected to /chat at line 78 via isPocketChat check)
    // All other pocketchat.co paths (/chat, etc.) — fall through to normal auth flow below
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all requests
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Public prefix routes (e.g., /i/{token}) — always allow
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // Public routes — allow without auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    // If logged in and on landing/login/signup, redirect appropriately
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone();
      const mode = request.nextUrl.searchParams.get('mode');
      url.pathname = (mode === 'pocketchat' || isPocketChat) ? '/chat' : '/dashboard';
      return NextResponse.redirect(url);
    }
    // Not logged in on pocketchat.co login/signup — rewrite to inject mode param
    if (isPocketChat && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone();
      url.searchParams.set('mode', 'pocketchat');
      return NextResponse.rewrite(url);
    }
    return supabaseResponse;
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Inject pathname for server layouts that need it
  supabaseResponse.headers.set('x-pathname', pathname);

  // Evrywher onboarding gate — new users see welcome once
  if (isPocketChat && pathname !== '/welcome' && !pathname.startsWith('/auth') && !pathname.startsWith('/api')) {
    const { data: pcProfile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single();
    if (pcProfile && !pcProfile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = '/welcome';
      return NextResponse.redirect(url);
    }
  }

  // Check role for accountant restriction
  if (pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

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
