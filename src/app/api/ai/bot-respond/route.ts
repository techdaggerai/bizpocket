import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, senderName, senderMessage, senderLanguage, orgId } = await req.json();
    if (!conversationId || !senderMessage || !orgId) {
      return NextResponse.json({ replied: false, reason: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const anthropic = getAnthropic();

    const { data: botConfig } = await supabase.from('pocket_bot_config').select('*').eq('organization_id', orgId).single();
    if (!botConfig || !botConfig.auto_reply_enabled || !botConfig.is_setup_complete) {
      return NextResponse.json({ replied: false, reason: 'Bot disabled' });
    }

    // Build rules text
    const rulesText = (botConfig.bot_rules || []).filter((r: { active: boolean }) => r.active).map((r: { trigger: string }, i: number) => `Rule ${i + 1}: ${r.trigger}`).join('\n');

    // Get recent messages for context
    const { data: recentMessages } = await supabase.from('messages').select('message, sender_type, sender_name').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(5);
    const chatHistory = (recentMessages || []).reverse().map((m) => `${m.sender_name}: ${m.message}`).join('\n');

    const systemPrompt = `You are "${botConfig.bot_name}", an AI assistant for a business on Evrywher.

PERSONALITY: ${botConfig.bot_personality || 'professional'}
${botConfig.bot_personality === 'professional' ? 'Be formal, business-appropriate, respectful.' : ''}
${botConfig.bot_personality === 'friendly' ? 'Be warm, casual, approachable, use a friendly tone.' : ''}
${botConfig.bot_personality === 'concise' ? 'Be very brief and direct. Short sentences only.' : ''}

OWNER'S AWAY MESSAGE: ${botConfig.away_message || 'I am currently unavailable.'}

CUSTOM RULES (follow these strictly):
${rulesText || 'No custom rules set.'}

INSTRUCTIONS:
- You are responding on behalf of the business owner who is currently unavailable
- Be helpful but honest — you are a bot, not the owner
- If someone asks something you cannot answer, say the owner will respond when available
- Keep responses short — 1 to 3 sentences max
- If a custom rule matches the situation, follow it exactly
- Never make up information about products, prices, or services unless specified in rules
- Respond in the SAME LANGUAGE as the incoming message (${senderLanguage || 'en'})

RECENT CONVERSATION:
${chatHistory}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: senderMessage }],
    });

    const botReply = response.content[0].type === 'text' ? response.content[0].text.trim() : 'I will let them know you messaged.';
    const botLang = botConfig.language || 'en';
    const translations: Record<string, string> = { [botLang]: botReply };

    // Translate if needed
    if (senderLanguage && senderLanguage !== botLang) {
      try {
        const tRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: `Translate this business message from ${botLang} to ${senderLanguage}. Output ONLY the translation, nothing else.`,
          messages: [{ role: 'user', content: botReply }],
        });
        const translated = tRes.content[0].type === 'text' ? tRes.content[0].text.trim() : botReply;
        translations[senderLanguage] = translated;
      } catch { /* fallback to original */ }
    }

    // Save bot reply
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: 'bot_' + orgId,
      sender_type: 'bot',
      sender_name: botConfig.bot_name,
      message: botReply,
      original_text: botReply,
      original_language: botLang,
      translations,
      message_type: 'text',
      organization_id: orgId,
    });

    // Update conversation last_message
    await supabase.from('conversations').update({ last_message: botReply, last_message_at: new Date().toISOString() }).eq('id', conversationId);

    return NextResponse.json({ replied: true, botName: botConfig.bot_name, botReply });
  } catch (error) {
    console.error('Bot response error:', error);
    return NextResponse.json({ replied: false, error: 'Bot failed' }, { status: 500 });
  }
}
