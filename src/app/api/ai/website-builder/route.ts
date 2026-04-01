import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const anthropic = new Anthropic({ apiKey })

  // ACTION: Generate color palettes
  if (body.action === 'palettes') {
    try {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: 'Generate 3 color palettes for a website. Return JSON only, no markdown, no backticks. Format: {"palettes":[{"name":"...","primary":"#hex","secondary":"#hex","accent":"#hex","bg":"#hex","text":"#hex"},...]}',
        messages: [{ role: 'user', content: `Business type: ${body.businessType}. Style: ${body.style}. Generate 3 distinct, professional color palettes.` }],
      })
      const raw = res.content[0].type === 'text' ? res.content[0].text : ''
      const cleaned = raw.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      return NextResponse.json(JSON.parse(cleaned))
    } catch {
      return NextResponse.json({ palettes: [
        { name: 'Professional', primary: '#0A0A0A', secondary: '#4F46E5', accent: '#4F46E5', bg: '#FFFFFF', text: '#0A0A0A' },
        { name: 'Natural', primary: '#1B4332', secondary: '#2D6A4F', accent: '#40916C', bg: '#F0FFF4', text: '#1B4332' },
        { name: 'Warm', primary: '#7C2D12', secondary: '#C2410C', accent: '#EA580C', bg: '#FFFBF5', text: '#431407' },
      ]})
    }
  }

  // ACTION: Generate website
  const { businessName, businessType, tagline, aboutText, services, phone, email, address, language, style, palette, sections } = body

  const PROMPT = `You are a world-class web designer. Generate a complete single-page HTML website.

DESIGN BRIEF:
- Business: ${businessName} (${businessType})
- Tagline: ${tagline || 'none provided'}
- About: ${aboutText || 'none provided'}
- Services: ${services || 'none provided'}
- Contact: Phone ${phone || 'N/A'}, Email ${email || 'N/A'}, Address ${address || 'N/A'}
- Language: ${language || 'en'}

STYLE: ${style}
COLOR PALETTE:
- Primary: ${palette?.primary || '#0A0A0A'}
- Secondary: ${palette?.secondary || '#4F46E5'}
- Accent: ${palette?.accent || '#4F46E5'}
- Background: ${palette?.bg || '#FFFFFF'}
- Text: ${palette?.text || '#0A0A0A'}

SECTIONS TO INCLUDE: ${(sections || []).join(', ')}

RULES:
- Return ONLY the complete HTML. No explanation. No markdown. No backticks.
- Complete <!DOCTYPE html> document with <html>, <head>, <body>
- Use Google Fonts (import in head) — choose fonts that match the style
- Mobile-responsive with CSS flexbox/grid
- Use the EXACT colors from the palette above
- Make it visually stunning — this represents their business
- Smooth scroll, hover effects, subtle CSS animations
- Use gradient backgrounds where appropriate (using palette colors)
- For gallery/photos: use gradient placeholder divs with text
- Include a functional-looking contact form (visual only)
- If "order" section selected: add a prominent "Order Now" button linking to bizpocket.io/order/${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
- Footer must include "Powered by BizPocket" with link to bizpocket.io
- Keep total HTML under 20KB
- The design should feel like it was made by a professional agency, NOT a template
- Do NOT make it look like the BizPocket website itself — make it unique to this business`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10000,
      system: PROMPT,
      messages: [{ role: 'user', content: `Generate the complete HTML website now. Make it beautiful.` }],
    })

    let html = response.content[0].type === 'text' ? response.content[0].text : ''
    html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    if (!html.toLowerCase().startsWith('<!doctype')) {
      const match = html.match(/<!DOCTYPE[\s\S]*/i)
      if (match) html = match[0]
    }

    return NextResponse.json({ html })
  } catch (err) {
    console.error('[Website Builder] Error:', err)
    return NextResponse.json({ error: 'Failed to generate website' }, { status: 500 })
  }
}
