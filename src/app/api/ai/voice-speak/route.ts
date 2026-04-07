import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_VOICES: Record<string, string> = {
  ja: 'Xb7hH8MSUJpSbSDYk0k2',
  en: '21m00Tcm4TlvDq8ikWAM',
  ur: '21m00Tcm4TlvDq8ikWAM',
  ar: '21m00Tcm4TlvDq8ikWAM',
};

const FALLBACK_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel (English)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'Voice not configured' }, { status: 500 });

    const { text, voiceId, language } = await req.json();
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

    const resolvedVoiceId = voiceId || DEFAULT_VOICES[language] || FALLBACK_VOICE;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
      }),
    });

    if (!response.ok) return NextResponse.json({ error: 'Speech generation failed' }, { status: 500 });

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.byteLength.toString() },
    });
  } catch (error) {
    console.error('Voice speak error:', error);
    return NextResponse.json({ error: 'Speech generation failed' }, { status: 500 });
  }
}
