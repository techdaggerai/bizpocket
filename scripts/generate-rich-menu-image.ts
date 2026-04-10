/**
 * Generate the Rich Menu image (2500x1686 PNG) for LINE bot.
 * Run: npx ts-node scripts/generate-rich-menu-image.ts
 *
 * Creates an SVG and converts it to PNG using sharp.
 * Layout: 2 rows x 3 columns = 6 buttons
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const W = 2500;
const H = 1686;
const COL_W = Math.floor(W / 3);
const ROW_H = Math.floor(H / 2);
const PAD = 8;
const R = 20;

function cell(col: number, row: number, emoji: string, label: string, sublabel: string, bg: string) {
  const x = col * COL_W + PAD;
  const y = row * ROW_H + PAD;
  const w = (col === 2 ? W - col * COL_W : COL_W) - PAD * 2;
  const h = ROW_H - PAD * 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${R}" fill="${bg}"/>
  <text x="${cx}" y="${cy - 60}" text-anchor="middle" fill="white" font-size="100">${emoji}</text>
  <text x="${cx}" y="${cy + 40}" text-anchor="middle" fill="white" font-size="48" font-weight="700">${label}</text>
  <text x="${cx}" y="${cy + 100}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="32">${sublabel}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      text { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0F172A"/>

  <!-- Grid lines -->
  <line x1="${COL_W}" y1="0" x2="${COL_W}" y2="${H}" stroke="#1E293B" stroke-width="1"/>
  <line x1="${COL_W * 2}" y1="0" x2="${COL_W * 2}" y2="${H}" stroke="#1E293B" stroke-width="1"/>
  <line x1="0" y1="${ROW_H}" x2="${W}" y2="${ROW_H}" stroke="#1E293B" stroke-width="1"/>

  <!-- Row 1 -->
  ${cell(0, 0, '📷', 'Scan &amp; Translate', 'Point at any text', '#4F46E5')}
  ${cell(1, 0, '🎤', 'Voice Translate', 'Speak &amp; hear', '#D97706')}
  ${cell(2, 0, '💬', 'Open Chat', 'Message anyone', '#059669')}

  <!-- Row 2 -->
  ${cell(0, 1, '🆘', 'Emergency Card', 'Offline SOS phrases', '#DC2626')}
  ${cell(1, 1, '📖', 'Learn Japanese', 'Words &amp; flashcards', '#0891B2')}
  ${cell(2, 1, '⚡', 'All Features', 'EvryAI toolkit', '#7C3AED')}

  <!-- Branding watermark -->
  <text x="${W / 2}" y="${H - 16}" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="22" font-weight="500">Evrywher — AI Translation for Life in Japan</text>
</svg>`;

const outDir = path.resolve(__dirname);

// Save SVG
const svgPath = path.join(outDir, 'rich-menu-image.svg');
fs.writeFileSync(svgPath, svg);
console.log('SVG saved to', svgPath);

// Convert to PNG with sharp
async function convertToPng() {
  try {
    const sharp = require('sharp');
    const pngPath = path.join(outDir, 'rich-menu-image.png');
    await sharp(Buffer.from(svg)).resize(W, H).png().toFile(pngPath);
    console.log('PNG saved to', pngPath);
    console.log('Done! Now run: npx ts-node scripts/register-line-rich-menu.ts');
  } catch {
    console.log('\nsharp not installed or failed. To convert SVG to PNG:');
    console.log('  npm install sharp && npx ts-node scripts/generate-rich-menu-image.ts');
    console.log('\nOr convert the SVG manually in browser at 2500x1686.');
  }
}

convertToPng();
