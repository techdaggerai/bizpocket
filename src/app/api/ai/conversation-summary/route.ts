import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireConversationInOrg, requireVerifiedProfile } from '@/lib/api-auth';

type SummaryMessage = {
  sender_name: string;
  message: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedProfile();
    if (!auth.ok) return auth.response;

    const { conversationId, orgId: requestedOrgId, messages } = await req.json();
    const orgId = auth.profile.organization_id;

    if (requestedOrgId && requestedOrgId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!conversationId || !Array.isArray(messages) || !messages.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conversationError = await requireConversationInOrg(auth.supabase, conversationId, orgId);
    if (conversationError) return conversationError;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const convoText = messages
      .map((m: SummaryMessage) => `${m.sender_name}: ${m.message}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Summarize this conversation between two people. Be concise.

Include:
1. Key topics discussed
2. Any decisions made
3. Relationship type (landlord, friend, colleague, customer, etc.)
4. Ongoing issues or follow-ups needed
5. Formality level used (formal/casual/mixed)

Conversation:
${convoText}

Respond in JSON only:
{
  "summary": "brief 2-3 sentence summary",
  "key_topics": ["topic1", "topic2"],
  "relationship_context": "landlord",
  "pending_items": ["follow up item"],
  "formality_level": "formal"
}

Return ONLY valid JSON.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Failed to parse summary' }, { status: 500 });
    }

    const { error: dbError } = await auth.supabase
      .from('conversation_summaries')
      .upsert({
        conversation_id: conversationId,
        org_id: orgId,
        summary: result.summary || '',
        message_count: messages.length,
        key_topics: result.key_topics || [],
        relationship_context: result.relationship_context || '',
        formality_level: result.formality_level || 'mixed',
        pending_items: result.pending_items || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id',
      });

    if (dbError) {
      console.error('[conversation-summary] DB error:', dbError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[conversation-summary]', error);
    return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireVerifiedProfile();
  if (!auth.ok) return auth.response;

  const conversationId = req.nextUrl.searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  const orgId = auth.profile.organization_id;
  const conversationError = await requireConversationInOrg(auth.supabase, conversationId, orgId);
  if (conversationError) return conversationError;

  const { data, error } = await auth.supabase
    .from('conversation_summaries')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ summary: null });
  }

  return NextResponse.json(data);
}
