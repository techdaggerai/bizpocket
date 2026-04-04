import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'Voice cloning not configured' }, { status: 500 });

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const botName = (formData.get('botName') as string) || 'voice';
    if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    const elevenLabsForm = new FormData();
    elevenLabsForm.append('name', `pocketchat_${user.id}_${botName}`);
    elevenLabsForm.append('files', audioFile);
    elevenLabsForm.append('description', `Evrywyre voice clone for ${botName}`);

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: elevenLabsForm,
    });

    if (!response.ok) {
      console.error('ElevenLabs error:', await response.text());
      return NextResponse.json({ error: 'Voice cloning failed' }, { status: 500 });
    }

    const voiceData = await response.json();

    // Save voice_id to bot config
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', user.id).single();
    if (profile?.organization_id) {
      await supabase.from('pocket_bot_config').update({ voice_clone_id: voiceData.voice_id }).eq('organization_id', profile.organization_id);
    }

    return NextResponse.json({ voice_id: voiceData.voice_id, success: true });
  } catch (error) {
    console.error('Voice clone error:', error);
    return NextResponse.json({ error: 'Voice cloning failed' }, { status: 500 });
  }
}
