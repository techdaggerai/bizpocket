import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  // ─── Auth ───
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ category: null }, { status: 200 });
  }

  let body: { description: string; categories: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ category: null }, { status: 400 });
  }

  const { description, categories } = body;
  if (!description || !categories?.length) {
    return NextResponse.json({ category: null }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Given this expense description: "${description}", suggest the most appropriate category from this list: ${categories.join(', ')}. Return ONLY the category name, nothing else.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const matched = categories.find((c) => c.toLowerCase() === text.toLowerCase()) || text;

    return NextResponse.json({ category: matched });
  } catch {
    return NextResponse.json({ category: null }, { status: 200 });
  }
}
