import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function AIChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) redirect('/chat');

  // Find existing AI bot chat
  const { data: botChat } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('is_bot_chat', true)
    .maybeSingle();

  if (botChat) {
    redirect(`/chat?convo=${botChat.id}`);
  }

  // Fallback — redirect to chat list
  redirect('/chat');
}
