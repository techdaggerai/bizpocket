import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Persistent cookie options — 400 days (like WhatsApp)
const PERSISTENT_COOKIE_OPTIONS = {
  maxAge: 400 * 24 * 60 * 60,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...PERSISTENT_COOKIE_OPTIONS,
              })
            )
          } catch {}
        },
      },
    }
  )
}
