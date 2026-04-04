import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { messages, contactName, userLanguage } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build transcript
    const transcript = messages
      .filter((m: { deleted_at?: string }) => !m.deleted_at)
      .slice(-50)
      .map((m: { sender_type: string; sender_name: string; message: string; created_at: string }) => {
        const who = m.sender_type === 'owner' ? 'You' : (m.sender_name || contactName || 'Contact');
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `[${time}] ${who}: ${m.message}`;
      })
      .join('\n');

    const LANGUAGE_NAMES: Record<string, string> = {
      en: 'English', ja: 'Japanese', ur: 'Urdu', ar: 'Arabic', bn: 'Bengali',
      pt: 'Portuguese', tl: 'Filipino', vi: 'Vietnamese', tr: 'Turkish',
      zh: 'Chinese', fr: 'French', nl: 'Dutch', es: 'Spanish',
      ps: 'Pashto', fa: 'Persian', hi: 'Hindi', ko: 'Korean', th: 'Thai',
      id: 'Indonesian', ne: 'Nepali', si: 'Sinhala',
    };
    const langName = LANGUAGE_NAMES[userLanguage || 'en'] || 'English';

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 300,
      system: `You summarize chat conversations for a multilingual business messaging app.
Write a brief, natural summary in ${langName} of what was discussed.
Format: Start with "Here's what you discussed:" then 2-4 key points as a natural sentence or short list.
Keep it under 100 words. Focus on: decisions made, things agreed on, important details, action items.
Don't include timestamps or names — just the substance.`,
      messages: [{
        role: 'user',
        content: `Summarize this conversation with ${contactName || 'my contact'}:\n\n${transcript}`,
      }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : 'Unable to summarize.';

    return NextResponse.json({ summary, messageCount: messages.length });
  } catch (error) {
    console.error('[summarize]', error);
    return NextResponse.json({ error: 'Failed to summarize conversation' }, { status: 500 });
  }
}
