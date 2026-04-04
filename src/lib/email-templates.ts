/**
 * email-templates.ts
 * Evrywher transactional email templates — HTML, inline styles, mobile-responsive.
 * Compatible with Gmail, Outlook, Apple Mail, Yahoo Mail.
 *
 * Usage:
 *   import { welcomeEmail, trialExpiringEmail, inviteReceivedEmail } from '@/lib/email-templates';
 *   const { subject, html, text } = welcomeEmail({ name: 'Yuki' });
 *
 * Send via Resend, Postmark, SendGrid, or Supabase Auth hooks:
 *   await resend.emails.send({ from: 'hello@evrywher.io', to, ...welcomeEmail({ name }) });
 */

// ─── Shared constants ─────────────────────────────────────────────────────────

const BRAND = {
  indigo:      '#4F46E5',
  indigoDark:  '#4338CA',
  indigoLight: '#EEF2FF',
  amber:       '#F59E0B',
  amberLight:  '#FEF3C7',
  textDark:    '#0A0A0A',
  textMed:     '#374151',
  textLight:   '#6B7280',
  textMuted:   '#9CA3AF',
  border:      '#E5E7EB',
  bgPage:      '#F9FAFB',
  bgCard:      '#FFFFFF',
  green:       '#16A34A',
  red:         '#DC2626',
};

const FONT_STACK = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function wrapEmail(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Evrywher</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: ${BRAND.bgPage}; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { color: ${BRAND.indigo}; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-card { padding: 28px 20px !important; }
      .btn { display: block !important; text-align: center !important; }
      .hide-mobile { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgPage};font-family:${FONT_STACK};">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgPage};padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table class="email-wrapper" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;">
          <tr>
            <td class="email-card" style="background:${BRAND.bgCard};border-radius:20px;padding:40px 40px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table class="email-wrapper" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;margin-top:24px;">
          <tr>
            <td style="text-align:center;padding:0 20px 40px;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};font-family:${FONT_STACK};">
                Evrywher by <a href="https://evrywher.io" style="color:${BRAND.indigo};text-decoration:none;">TechDagger</a> · Made with ❤️ in Japan
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.textMuted};font-family:${FONT_STACK};">
                <a href="https://evrywher.io/privacy" style="color:${BRAND.textMuted};text-decoration:underline;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="https://evrywher.io/terms" style="color:${BRAND.textMuted};text-decoration:underline;">Terms</a>
                &nbsp;·&nbsp;
                <a href="{{unsubscribe_url}}" style="color:${BRAND.textMuted};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared components ────────────────────────────────────────────────────────

function logoHeader(): string {
  return `<!-- Logo -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
  <tr>
    <td align="center">
      <!-- Pocket logo mark: indigo rounded square with pocket + chat bubbles -->
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:${BRAND.indigo};border-radius:16px;width:52px;height:52px;text-align:center;vertical-align:middle;">
            <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 30 C20 24 24 20 30 20 L70 20 C76 20 80 24 80 30 L80 75 C80 81 76 85 70 85 L30 85 C24 85 20 81 20 75 Z" fill="rgba(255,255,255,0.2)"/>
              <path d="M20 30 C20 24 24 20 30 20 L70 20 C76 20 80 24 80 30 L76 40 C72 46 63 50 54 50 L46 50 C37 50 28 46 24 40 Z" fill="rgba(255,255,255,0.4)"/>
              <rect x="26" y="22" width="22" height="14" rx="5" fill="white" opacity="0.9"/>
              <rect x="52" y="30" width="22" height="14" rx="5" fill="${BRAND.amber}" opacity="0.95"/>
            </svg>
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <span style="font-family:${FONT_STACK};font-size:22px;font-weight:800;color:${BRAND.textDark};letter-spacing:-0.5px;">Evrywher</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function ctaButton(label: string, href: string, color = BRAND.indigo): string {
  return `<!-- CTA Button -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="20%" stroke="f" fillcolor="${color}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:700;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" class="btn" style="display:inline-block;background:${color};color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.2px;box-shadow:0 4px 16px rgba(79,70,229,0.3);">${label}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="height:1px;background:${BRAND.border};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

function tipCard(emoji: string, title: string, body: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
  <tr>
    <td style="background:${BRAND.indigoLight};border-radius:12px;padding:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;">
            <span style="font-size:22px;line-height:1;">${emoji}</span>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <p style="margin:0 0 3px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${BRAND.textDark};">${title}</p>
            <p style="margin:0;font-family:${FONT_STACK};font-size:13px;color:${BRAND.textLight};line-height:1.5;">${body}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function featureLossRow(icon: string, feature: string, detail: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
  <tr>
    <td style="width:32px;vertical-align:top;padding-top:1px;">
      <span style="font-size:18px;line-height:1;">${icon}</span>
    </td>
    <td style="padding-left:12px;vertical-align:top;">
      <p style="margin:0 0 2px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${BRAND.textDark};">${feature}</p>
      <p style="margin:0;font-family:${FONT_STACK};font-size:13px;color:${BRAND.textLight};line-height:1.4;">${detail}</p>
    </td>
  </tr>
</table>`;
}

// ─── Plain text helper ────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ( $1 )')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&zwnj;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

export interface WelcomeEmailOptions {
  name: string;
  /** Override the CTA URL (default: https://evrywher.io/chat) */
  ctaUrl?: string;
}

export function welcomeEmail({ name, ctaUrl = 'https://evrywher.io/chat' }: WelcomeEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Evrywher — You brought the missing E`;

  const body = `
${logoHeader()}

<!-- Headline -->
<h1 style="margin:0 0 12px;font-family:${FONT_STACK};font-size:28px;font-weight:800;color:${BRAND.textDark};letter-spacing:-0.8px;text-align:center;line-height:1.15;">
  Hey ${name}, welcome! 👋
</h1>
<p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:16px;color:${BRAND.textMed};text-align:center;line-height:1.6;">
  You just joined <strong>Evrywher</strong> — the chat app where language is never a barrier.<br>
  Type in yours. Your contacts read in theirs. AI does the rest.
</p>

<!-- Language showcase strip -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0">
        <tr>
          ${['🇬🇧 EN', '🇯🇵 JA', '🇦🇪 AR', '🇰🇷 KO', '🇧🇷 PT', '🇨🇳 ZH'].map(l =>
            `<td style="padding:0 4px;">
              <span style="display:inline-block;background:${BRAND.indigoLight};color:${BRAND.indigo};font-family:${FONT_STACK};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;">${l}</span>
            </td>`
          ).join('\n          ')}
        </tr>
      </table>
    </td>
  </tr>
</table>

${ctaButton('Start chatting →', ctaUrl)}

${divider()}

<!-- 3 Tips -->
<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.textMuted};">
  3 THINGS TO DO FIRST
</p>

${tipCard('💬', 'Chat with the AI Assistant', 'Your inbox comes with a built-in multilingual AI bot. Ask it anything — it speaks all 21 languages.')}
${tipCard('👤', 'Invite a friend or contact', 'Tap Contacts → Add contact or share your QR code. They don\'t need an account to reply!')}
${tipCard('🎙️', 'Send a voice message', 'Hold the mic button in any chat. Evrywher transcribes and translates it automatically.')}

${divider()}

<!-- Tagline -->
<p style="margin:0;font-family:${FONT_STACK};font-size:14px;color:${BRAND.textLight};text-align:center;line-height:1.6;">
  21 languages. Real-time AI. Zero friction.<br>
  <strong style="color:${BRAND.textDark};">Welcome to the world without language barriers.</strong>
</p>
`;

  const html = wrapEmail(body, `Welcome to Evrywher, ${name}! Start chatting in 21 languages with AI translation.`);

  return { subject, html, text: htmlToText(html) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — TRIAL EXPIRING
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrialExpiringEmailOptions {
  name: string;
  daysLeft: number;
  trialEndsDate: string;    // e.g. "April 7, 2026"
  upgradeUrl?: string;
  priceMonthly?: string;    // e.g. "¥1,980/mo"
}

export function trialExpiringEmail({
  name,
  daysLeft,
  trialEndsDate,
  upgradeUrl = 'https://evrywher.io/settings/upgrade',
  priceMonthly = '¥1,980/mo',
}: TrialExpiringEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Evrywher Pro trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

  const urgencyColor = daysLeft <= 1 ? BRAND.red : daysLeft <= 3 ? BRAND.amber : BRAND.indigo;

  const body = `
${logoHeader()}

<!-- Urgency banner -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="background:${urgencyColor};border-radius:12px;padding:14px 20px;text-align:center;">
      <p style="margin:0;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#ffffff;">
        ⏰ Your Pro trial ends on ${trialEndsDate}
      </p>
    </td>
  </tr>
</table>

<!-- Headline -->
<h1 style="margin:0 0 10px;font-family:${FONT_STACK};font-size:26px;font-weight:800;color:${BRAND.textDark};letter-spacing:-0.8px;text-align:center;line-height:1.2;">
  ${name}, don't lose your superpowers
</h1>
<p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:15px;color:${BRAND.textMed};text-align:center;line-height:1.6;">
  Your Evrywher Pro trial expires in <strong style="color:${urgencyColor};">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.<br>
  After that, these Pro features will be locked:
</p>

<!-- Feature loss list -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgPage};border-radius:14px;padding:20px;margin-bottom:24px;">
  <tr>
    <td>
      ${featureLossRow('✨', 'Unlimited AI Translations', 'Translate every message in all 21 languages, always.')}
      ${featureLossRow('🎙️', 'Voice message translation', 'Record → translate → playback in their language.')}
      ${featureLossRow('🤖', 'AI Assistant & Auto-replies', 'Your personal multilingual bot that never sleeps.')}
      ${featureLossRow('👥', 'Unlimited contacts & groups', 'No cap on how many people you chat with.')}
      ${featureLossRow('🏮', 'Cultural Intelligence notes', 'Understand the meaning behind the message.')}
      ${featureLossRow('📊', 'Priority support', '24h response time from the Evrywher team.')}
    </td>
  </tr>
</table>

<!-- CTA -->
${ctaButton(`Upgrade to Pro — ${priceMonthly}`, upgradeUrl, BRAND.indigo)}

<!-- No-pressure note -->
<p style="margin:-8px 0 24px;font-family:${FONT_STACK};font-size:13px;color:${BRAND.textMuted};text-align:center;">
  Cancel anytime. No contracts. Instant activation.
</p>

${divider()}

<!-- Free tier reassurance -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:${BRAND.amberLight};border-radius:12px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:#92400E;">
        💛 You keep your free plan
      </p>
      <p style="margin:0;font-family:${FONT_STACK};font-size:13px;color:#78350F;line-height:1.5;">
        Even after your trial, your Evrywher account stays active with basic chat. Your contacts, messages, and profile are safe.
      </p>
    </td>
  </tr>
</table>
`;

  const html = wrapEmail(body, `Your Evrywher Pro trial ends in ${daysLeft} days — upgrade to keep your translation superpowers.`);

  return { subject, html, text: htmlToText(html) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — INVITE RECEIVED
// ═══════════════════════════════════════════════════════════════════════════════

export interface InviteReceivedEmailOptions {
  inviterName: string;
  inviterLanguage?: string;    // e.g. "Japanese"
  inviterAvatarInitial?: string;
  recipientName?: string;
  inviteUrl: string;
  personalMessage?: string;    // Optional personal note from inviter
}

export function inviteReceivedEmail({
  inviterName,
  inviterLanguage = 'their language',
  inviterAvatarInitial,
  recipientName,
  inviteUrl,
  personalMessage,
}: InviteReceivedEmailOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${inviterName} invited you to chat on Evrywher`;
  const initial = inviterAvatarInitial || inviterName.charAt(0).toUpperCase();

  // Avatar colors — deterministic from name
  const avatarColors = ['#4F46E5', '#F59E0B', '#10B981', '#F43F5E', '#3B82F6', '#7C3AED'];
  let hash = 0;
  for (let i = 0; i < inviterName.length; i++) hash = inviterName.charCodeAt(i) + ((hash << 5) - hash);
  const avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

  const greeting = recipientName ? `Hey ${recipientName},` : 'Hey there,';

  const body = `
${logoHeader()}

<!-- Inviter avatar + name -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td align="center">
      <!-- Pocket-style avatar -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr>
          <td style="background:${avatarBg};border-radius:20px;width:72px;height:72px;text-align:center;vertical-align:middle;position:relative;">
            <span style="font-family:${FONT_STACK};font-size:28px;font-weight:700;color:#ffffff;">${initial}</span>
          </td>
        </tr>
      </table>
      <!-- Invite label -->
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:${BRAND.indigoLight};border-radius:999px;padding:6px 16px;">
            <span style="font-family:${FONT_STACK};font-size:13px;font-weight:700;color:${BRAND.indigo};">💬 Chat invite from ${inviterName}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Headline -->
<h1 style="margin:0 0 10px;font-family:${FONT_STACK};font-size:26px;font-weight:800;color:${BRAND.textDark};letter-spacing:-0.8px;text-align:center;line-height:1.2;">
  ${greeting}<br>you've been invited!
</h1>
<p style="margin:0 0 20px;font-family:${FONT_STACK};font-size:15px;color:${BRAND.textMed};text-align:center;line-height:1.65;">
  <strong>${inviterName}</strong> wants to chat with you on Evrywher — even if you speak different languages.
</p>

${personalMessage ? `<!-- Personal message -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="background:${BRAND.bgPage};border-left:3px solid ${avatarBg};border-radius:0 10px 10px 0;padding:14px 18px;">
      <p style="margin:0 0 4px;font-family:${FONT_STACK};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.textMuted};">
        Message from ${inviterName}
      </p>
      <p style="margin:0;font-family:${FONT_STACK};font-size:14px;color:${BRAND.textMed};line-height:1.6;font-style:italic;">
        "${personalMessage}"
      </p>
    </td>
  </tr>
</table>` : ''}

<!-- What is Evrywher -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="background:${BRAND.bgPage};border-radius:14px;padding:20px;">
      <p style="margin:0 0 14px;font-family:${FONT_STACK};font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.textMuted};">
        WHAT IS EVRYWHER?
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 0 10px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="font-size:16px;">✨</span></td>
                <td style="padding-left:10px;"><p style="margin:0;font-family:${FONT_STACK};font-size:14px;color:${BRAND.textMed};line-height:1.5;">Every message is <strong>automatically translated</strong> — you both read in your own language</p></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 10px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="font-size:16px;">🌐</span></td>
                <td style="padding-left:10px;"><p style="margin:0;font-family:${FONT_STACK};font-size:14px;color:${BRAND.textMed};line-height:1.5;">Supports <strong>21 languages</strong> including Japanese, Arabic, Korean, Hindi, and more</p></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 4px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="font-size:16px;">🆓</span></td>
                <td style="padding-left:10px;"><p style="margin:0;font-family:${FONT_STACK};font-size:14px;color:${BRAND.textMed};line-height:1.5;"><strong>Free to join</strong> — no credit card, no download required to get started</p></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${ctaButton(`Join free and chat with ${inviterName} →`, inviteUrl)}

<!-- Subtext -->
<p style="margin:-8px 0 24px;font-family:${FONT_STACK};font-size:13px;color:${BRAND.textMuted};text-align:center;">
  ${inviterName} writes in ${inviterLanguage}. You'll see it in your language. ✨
</p>

${divider()}

<!-- Social proof -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    ${[
      ['🇯🇵', 'Japanese'],
      ['🇦🇪', 'Arabic'],
      ['🇧🇷', 'Portuguese'],
      ['🇰🇷', 'Korean'],
      ['🇮🇳', 'Hindi'],
      ['🇨🇳', 'Chinese'],
    ].map(([flag, lang]) =>
      `<td style="text-align:center;padding:0 3px;">
        <span style="display:inline-block;background:${BRAND.bgPage};border-radius:8px;padding:8px 6px;font-size:11px;color:${BRAND.textMuted};font-family:${FONT_STACK};">
          ${flag}<br>${lang}
        </span>
      </td>`
    ).join('\n    ')}
  </tr>
</table>
<p style="margin:10px 0 0;font-family:${FONT_STACK};font-size:12px;color:${BRAND.textMuted};text-align:center;">
  +15 more languages supported
</p>
`;

  const html = wrapEmail(body, `${inviterName} wants to chat with you on Evrywher — AI translation messenger. Join free.`);

  return { subject, html, text: htmlToText(html) };
}

// ─── Type exports ─────────────────────────────────────────────────────────────

export type EmailTemplate =
  | ReturnType<typeof welcomeEmail>
  | ReturnType<typeof trialExpiringEmail>
  | ReturnType<typeof inviteReceivedEmail>;
