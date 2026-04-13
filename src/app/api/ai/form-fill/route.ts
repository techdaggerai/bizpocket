import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const action = formData.get('action') as string

    // ── ACTION: analyze ────────────────────────────────────────────────────────
    if (action === 'analyze') {
      const file = formData.get('file') as File
      const language = (formData.get('language') as string) || 'English'

      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })

      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'

      if (!isImage && !isPDF) {
        return NextResponse.json({ error: 'Only images and PDFs are supported' }, { status: 400 })
      }

      const prompt = `You are a form analysis expert. Carefully analyze this form and extract EVERY fillable field.

Return ONLY a valid JSON array — no explanation, no markdown, no backticks. Each item:
{
  "id": "field_1",
  "label": "Field name translated to ${language}",
  "originalLabel": "Exact label as shown on form",
  "type": "text|number|date|checkbox|select|email|phone|address",
  "required": true,
  "hint": "Short helpful tip for what to enter here",
  "options": []
}

Rules:
- "options" array only for select/radio fields, otherwise empty array []
- Include ALL fields: name, address, date, checkboxes, signatures, etc.
- Translate labels to ${language} in the "label" field
- Keep original text in "originalLabel"
- Return ONLY the JSON array, absolutely nothing else`

      let messageContent: Anthropic.MessageParam['content']

      if (isImage) {
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        messageContent = [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      } else {
        messageContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt }
        ]
      }

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content: messageContent }]
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const clean = rawText.replace(/```json|```/g, '').trim()

      let fields
      try {
        fields = JSON.parse(clean)
        if (!Array.isArray(fields)) throw new Error('Not an array')
      } catch {
        return NextResponse.json({ error: 'Failed to parse form fields' }, { status: 500 })
      }

      return NextResponse.json({ fields, fieldCount: fields.length })
    }

    // ── ACTION: guide — Japanese form expert analysis ────────────────────────
    if (action === 'guide') {
      const file = formData.get('file') as File
      const formType = (formData.get('formType') as string) || 'unknown'

      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })

      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const guidePrompt = `You are a Japanese form expert helping foreigners fill out Japanese forms. Analyze this form image carefully.

Form type hint: ${formType}

Return ONLY valid JSON with this exact structure — no explanation, no markdown, no backticks:
{
  "formTitle": "The Japanese title of the form exactly as written",
  "formTitleTranslated": "English translation of the form title",
  "fields": [
    {
      "number": 1,
      "japaneseLabel": "Exact Japanese label as written on the form",
      "englishLabel": "English translation",
      "guidance": "Clear guidance in English on what to write, including format requirements",
      "example": "Example value that would be correct",
      "required": true,
      "type": "text"
    }
  ]
}

Rules:
- Identify EVERY field, checkbox, radio button, and section
- For checkboxes/radio buttons, explain what each option means in English
- Mark fields as required if they have ※ or 必須 or appear mandatory
- type can be: text, date, checkbox, radio, select, address, phone, name
- If form type is "${formType}", use your deep knowledge of that specific Japanese form to give extra-precise guidance
- For name fields, note if furigana (フリガナ) is needed
- For date fields, specify Japanese format (令和/Year format)
- For address fields, note the order (prefecture → city → street)
- Include seal/stamp (印鑑) fields if present
- Return ONLY the JSON, nothing else`

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: guidePrompt },
          ],
        }],
      })

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const clean = rawText.replace(/```json|```/g, '').trim()

      try {
        const result = JSON.parse(clean)
        return NextResponse.json(result)
      } catch {
        return NextResponse.json({ error: 'Failed to parse form analysis' }, { status: 500 })
      }
    }

    // ── ACTION: follow-up — ask about a specific field ─────────────────────
    if (action === 'follow-up') {
      const question = formData.get('question') as string
      const fieldJson = formData.get('field') as string
      if (!question) return NextResponse.json({ error: 'Missing question' }, { status: 400 })

      let fieldContext = ''
      if (fieldJson) {
        try {
          const f = JSON.parse(fieldJson)
          const jpLabel = f.japaneseLabel || f.label_jp || ''
          const enLabel = f.englishLabel || f.label_en || ''
          const guide = f.guidance || f.explanation || ''
          fieldContext = `Field: "${jpLabel}" (${enLabel}). Guidance: ${guide}. Example: ${f.example || ''}.`
        } catch { /* ignore */ }
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are a Japanese form expert helping a foreigner. ${fieldContext}

Their question: "${question}"

Give a clear, helpful answer in English. Be specific about Japanese conventions, formats, and requirements. Keep it concise (2-4 sentences).`,
        }],
      })

      const answer = response.content[0].type === 'text' ? response.content[0].text.trim() : 'Sorry, I could not answer that.'
      return NextResponse.json({ answer })
    }

    // ── ACTION: ask ────────────────────────────────────────────────────────────
    if (action === 'ask') {
      const fieldRaw = formData.get('field') as string
      if (!fieldRaw) return NextResponse.json({ error: 'Missing field parameter' }, { status: 400 })
      let field
      try { field = JSON.parse(fieldRaw) } catch { return NextResponse.json({ error: 'Invalid field JSON' }, { status: 400 }) }
      const language = (formData.get('language') as string) || 'English'
      const businessName = (formData.get('businessName') as string) || ''
      const progress = formData.get('progress') as string || ''

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a friendly, professional assistant helping fill out a form. Speak in ${language}.
${businessName ? `Business: ${businessName}` : ''}
${progress ? `Progress: ${progress}` : ''}

Current field: "${field.label}" (${field.required ? 'Required' : 'Optional'})
Field type: ${field.type}
Hint: ${field.hint}
${field.options?.length ? `Options: ${field.options.join(', ')}` : ''}

Write a single, friendly, conversational question asking for this information.
- For checkbox: ask yes or no
- For date: mention preferred format (YYYY/MM/DD for Japan)
- For select: list the options briefly
- Keep it under 2 sentences
- Sound human, not robotic
Reply ONLY with the question, nothing else.`
        }]
      })

      const question = response.content[0].type === 'text' ? response.content[0].text.trim() : `Please enter: ${field.label}`
      return NextResponse.json({ question })
    }

    // ── ACTION: save-to-vault ──────────────────────────────────────────────────
    if (action === 'save-to-vault') {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: unknown) {
    console.error('Form fill API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
