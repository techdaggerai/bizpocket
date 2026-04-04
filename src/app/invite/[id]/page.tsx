import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params;
  const supabase = await createClient();

  // Fetch inviter's org + owner profile
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  let ownerName = 'Someone';
  if (org) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('name, full_name')
      .eq('organization_id', org.id)
      .eq('role', 'owner')
      .single();
    if (ownerProfile) {
      ownerName = ownerProfile.full_name || ownerProfile.name || 'Someone';
    }
  }

  const signupUrl = `/signup?mode=pocketchat&ref=${orgId}`;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <PocketChatMark size={72} />
        </div>

        {/* Brand */}
        <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">
          <EvryWherMark size="lg" />
        </h1>

        {/* Invite message */}
        <p className="text-[17px] text-[#374151] leading-relaxed mb-1">
          <span className="font-semibold text-[#0A0A0A]">{ownerName}</span> invited you to chat on Evrywher
        </p>
        <p className="text-sm text-[#9CA3AF] mb-8">
          AI-powered translation in 21 languages. Free forever.
        </p>

        {/* Features */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {['Real-time translation', 'Voice messages', '21 languages', 'Free'].map((f) => (
            <span key={f} className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#374151]">{f}</span>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={signupUrl}
          className="block w-full rounded-xl bg-[#4F46E5] py-3.5 text-base font-semibold text-white text-center hover:bg-[#4338CA] transition-colors"
        >
          Join Free
        </Link>

        <p className="mt-4 text-sm text-[#9CA3AF]">
          Already have an account?{' '}
          <Link href="/login?mode=pocketchat" className="text-[#4F46E5] font-medium hover:underline">Log in</Link>
        </p>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <Link href="/privacy" className="text-xs text-[#D1D5DB] hover:text-[#9CA3AF]">Privacy</Link>
          <span className="text-[#E5E7EB]">&middot;</span>
          <Link href="/terms" className="text-xs text-[#D1D5DB] hover:text-[#9CA3AF]">Terms</Link>
        </div>
      </div>
    </div>
  );
}
