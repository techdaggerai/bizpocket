import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { existingRules?: { category: string; rule: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Fetch recent trades for context (if a trades table exists)
  let tradesContext = 'No trading history available yet.';
  try {
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (trades && trades.length > 0) {
      tradesContext = `Recent ${trades.length} trades:\n${trades
        .map((t: any) => `- ${t.symbol || 'N/A'} | ${t.side || t.direction || 'N/A'} | P&L: ${t.pnl ?? t.profit_loss ?? 'N/A'} | ${t.notes || ''}`)
        .join('\n')}`;
    }
  } catch {
    // trades table may not exist yet — that's fine
  }

  const existingRulesText = body.existingRules?.length
    ? `\nExisting rules (do NOT repeat these):\n${body.existingRules.map((r) => `- [${r.category}] ${r.rule}`).join('\n')}`
    : '';

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are Dagger AI, a trading discipline coach. Suggest 3-5 actionable trading rules based on the trader's history and common best practices. Each rule should be specific and enforceable.

Return ONLY valid JSON — no markdown, no code fences. Format:
{"suggestions":[{"category":"entry|exit|risk|psychology|custom","rule":"the rule text","weight":1-10,"reasoning":"why this rule helps"}]}`,
      messages: [
        {
          role: 'user',
          content: `Suggest trading rules for this trader.\n\n${tradesContext}${existingRulesText}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from potential markdown wrapper
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { suggestions: [] };
    }

    return NextResponse.json({ suggestions: parsed.suggestions || [] });
  } catch (err) {
    console.error('[Dagger AI] suggest-rules failed:', err);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
