'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PocketChatMark, PocketMark } from '@/components/Logo';

const greetings = [
  { to: 'やあ', lang: 'Japanese' }, { to: 'Hola', lang: 'Spanish' },
  { to: 'مرحبا', lang: 'Arabic' }, { to: '你好', lang: 'Chinese' },
  { to: 'سلام', lang: 'Urdu' }, { to: 'Olá', lang: 'Portuguese' },
  { to: 'Bonjour', lang: 'French' }, { to: 'Merhaba', lang: 'Turkish' },
];

export default function PocketChatLanding() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFade(false);
      timeout = setTimeout(() => { setIdx(i => (i + 1) % greetings.length); setFade(true); }, 200);
    }, 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const g = greetings[idx];

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PocketChatMark size={40} />
          <span style={{ fontSize: 18, fontWeight: 700 }}>Pocket<span style={{ color: '#F59E0B' }}>Chat</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#9ca3af', fontSize: 14, textDecoration: 'none' }}>Log in</Link>
          <Link href="/signup?mode=pocketchat" style={{ background: '#F59E0B', color: '#0a0a0a', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Get PocketChat free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}><PocketChatMark size={72} /></div>
        <p style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px', fontFamily: "'DM Sans', sans-serif" }}>Pocket<span style={{ color: '#F59E0B' }}>Chat</span></p>
        <div style={{ display: 'inline-flex', padding: '4px 16px', borderRadius: 100, border: '1px solid #333', marginBottom: 24 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>Voice calls · Voice messages · Text · All translated</span>
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700, lineHeight: 1.05, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
          Your business speaks<br/><span style={{ color: '#F59E0B', transition: 'opacity 0.2s', opacity: fade ? 1 : 0 }}>every language</span>
          <span style={{ fontSize: 16, color: '#9ca3af', marginLeft: 8, transition: 'opacity 0.2s', opacity: fade ? 1 : 0 }}>{g.to} · {g.lang}</span>
        </h1>
        <p style={{ fontSize: 18, color: '#9ca3af', maxWidth: 520, margin: '16px auto 40px', lineHeight: 1.6 }}>
          Instant translation chat for business. Text, voice, video — in 13 languages.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 60, flexWrap: 'wrap' }}>
          <Link href="/signup?mode=pocketchat" style={{ background: '#F59E0B', color: '#0a0a0a', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Start Free</Link>
          <a href="#features" style={{ background: 'transparent', color: 'white', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: 'none', border: '1px solid #333' }}>See it in action</a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', maxWidth: 600, margin: '0 auto' }}>
          {['English', 'Japanese', 'Urdu', 'Arabic', 'Bengali', 'Portuguese', 'Filipino', 'Vietnamese', 'Turkish', 'Chinese', 'French', 'Dutch', 'Spanish'].map((l, i) => (
            <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 100, border: '1px solid #333', color: '#9ca3af' }}>{l}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { title: 'Translated chat', desc: 'Type in your language. They read in theirs. 13 languages. Real-time. Nobody knows you don\'t speak their language.', color: '#818cf8', bg: 'rgba(79,70,229,0.15)', icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z' },
            { title: 'Voice messages translated', desc: 'Record in English. They hear it in Japanese. Tap "Hear translation" to play it in any language. With your voice — not a robot.', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2' },
            { title: 'Live translated calls', desc: 'Call anyone in any language. You speak English, they hear Japanese — in YOUR voice. Real-time AI translation with live subtitles.', color: '#4ade80', bg: 'rgba(34,197,94,0.15)', icon: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72', badge: 'NEW' },
            { title: 'Your AI assistant', desc: 'Create a bot that replies when you can\'t. Set rules in plain language. "When I\'m praying, tell them I\'ll respond in 30 minutes."', color: '#c084fc', bg: 'rgba(168,85,247,0.15)', icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01' },
            { title: 'QR code sharing', desc: 'Generate a QR code for your business. Customers scan and start chatting instantly — no app download, no signup, no friction.', color: '#f472b6', bg: 'rgba(236,72,153,0.15)', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z' },
            { title: 'Photo translation', desc: 'Snap a photo of any menu, sign, document, or label. AI reads the text and translates it instantly in your chat — 13 languages.', color: '#22d3ee', bg: 'rgba(6,182,212,0.15)', icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z' },
            { title: 'No app for your contacts', desc: 'Share a link. They chat from their browser. No download. No signup. Works from Instagram, WhatsApp, business cards — anywhere.', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#141414', borderRadius: 20, border: '1px solid #222', padding: 28, position: 'relative', overflow: 'hidden' }}>
              {f.badge && <div style={{ position: 'absolute', top: 12, right: 12, background: f.badge === 'EXCLUSIVE' ? '#ef4444' : '#22c55e', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100 }}>{f.badge}</div>}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>Ready to break the language barrier?</h2>
        <p style={{ fontSize: 16, color: '#9ca3af', margin: '0 0 32px' }}>Free forever. No credit card. Set up in 30 seconds.</p>
        <Link href="/signup?mode=pocketchat" style={{ background: '#F59E0B', color: '#0a0a0a', padding: '16px 40px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>Get PocketChat free</Link>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 40px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <a href="https://bizpocket.io" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <PocketMark variant="sm" />
          <span style={{ fontSize: 13, color: '#9ca3af' }}>Powered by <span style={{ color: '#818cf8', fontWeight: 600 }}>BizPocket</span></span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="/privacy" style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}>Privacy</a>
          <span style={{ color: '#6b7280' }}>·</span>
          <a href="/terms" style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}>Terms</a>
          <span style={{ color: '#6b7280' }}>·</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>© 2026 TechDagger Studio</span>
        </div>
      </footer>
    </div>
  );
}
