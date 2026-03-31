import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const WEBSITE_PROMPT = `You are a world-class web designer. Generate a complete, single-page HTML website for a business.

RULES:
- Return ONLY the complete HTML. No explanation. No markdown. No backticks.
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>
- Use modern CSS (flexbox, grid, gradients, shadows)
- Make it mobile-responsive
- Include these sections: Hero with business name + tagline, About/Services, Features/Products, Contact info, Footer
- Use Google Fonts (import in <head>)
- Make it visually stunning — this is the business owner's first impression
- Use the brand color provided or generate a professional palette
- Include smooth scroll, hover effects, subtle animations
- Add a "Powered by BizPocket" badge in the footer with link to bizpocket.io
- All content should be based on the business data provided
- If business type is known, tailor the design (restaurant = food photos placeholder, car dealer = automotive feel, etc.)
- Include placeholder image areas using gradient backgrounds with text overlay (no external images)
- Make the contact section include phone, email, address if provided
- Include a simple contact form (non-functional, just visual)
- Total HTML should be under 15KB

LANGUAGE: Generate the website in the language specified. If Japanese business, use Japanese text with English subtitle.`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    organizationId: string
    businessName: string
    businessType: string
    tagline?: string
    services?: string
    phone?: string
    email?: string
    address?: string
    language?: string
    brandColor?: string
    style?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { businessName, businessType, tagline, services, phone, email, address, language, brandColor, style } = body

  const userPrompt = `Generate a website for this business:

Business Name: ${businessName}
Business Type: ${businessType}
${tagline ? `Tagline: ${tagline}` : ''}
${services ? `Services/Products: ${services}` : ''}
${phone ? `Phone: ${phone}` : ''}
${email ? `Email: ${email}` : ''}
${address ? `Address: ${address}` : ''}
Language: ${language || 'English'}
Brand Color: ${brandColor || '#4F46E5'}
Style: ${style || 'modern and professional'}

Generate the complete HTML now.`

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: WEBSITE_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let html = response.content[0].type === 'text' ? response.content[0].text : ''

    // Clean markdown fences if present
    html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    // Ensure it starts with DOCTYPE
    if (!html.toLowerCase().startsWith('<!doctype')) {
      const match = html.match(/<!DOCTYPE[\s\S]*/i)
      if (match) html = match[0]
    }

    // Validate the output is actually HTML
    const lower = html.toLowerCase()
    if (!lower.startsWith('<!doctype') && !lower.startsWith('<html')) {
      return NextResponse.json({ error: 'AI generated invalid output. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ html })
  } catch (err) {
    console.error('[Website Builder] Error:', err)
    return NextResponse.json({ error: 'Failed to generate website' }, { status: 500 })
  }
}
