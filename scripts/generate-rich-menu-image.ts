/**
 * Generate the Rich Menu image (2500x1686 PNG) for LINE bot.
 * Run: npx ts-node scripts/generate-rich-menu-image.ts
 *
 * Creates an SVG and converts it to PNG using sharp.
 * Install if needed: npm install sharp
 */

import fs from 'fs';
import path from 'path';

// Generate SVG — reliable, no native deps needed
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2500" height="1686" viewBox="0 0 2500 1686">
  <defs>
    <style>
      text { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="2500" height="1686" fill="#0F172A"/>

  <!-- Row 1: Translate (left) -->
  <rect x="8" y="8" width="1234" height="827" rx="20" fill="#4F46E5"/>
  <text x="625" y="340" text-anchor="middle" fill="white" font-size="120">🌐</text>
  <text x="625" y="480" text-anchor="middle" fill="white" font-size="56" font-weight="700">Translate Now</text>
  <text x="625" y="550" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="36">Send any message</text>

  <!-- Row 1: Camera Translate (right) -->
  <rect x="1258" y="8" width="1234" height="827" rx="20" fill="#D97706"/>
  <text x="1875" y="340" text-anchor="middle" fill="white" font-size="120">📷</text>
  <text x="1875" y="480" text-anchor="middle" fill="white" font-size="56" font-weight="700">Camera Translate</text>
  <text x="1875" y="550" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="36">Scan any document</text>

  <!-- Row 2: Invoice (left) -->
  <rect x="8" y="851" width="817" height="827" rx="20" fill="#1E293B"/>
  <text x="416" y="1185" text-anchor="middle" fill="white" font-size="100">🧾</text>
  <text x="416" y="1320" text-anchor="middle" fill="white" font-size="44" font-weight="700">Invoice</text>
  <text x="416" y="1380" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="30">Create &amp; send</text>

  <!-- Row 2: Business Card (middle) -->
  <rect x="841" y="851" width="818" height="827" rx="20" fill="#1E293B"/>
  <text x="1250" y="1185" text-anchor="middle" fill="white" font-size="100">💳</text>
  <text x="1250" y="1320" text-anchor="middle" fill="white" font-size="44" font-weight="700">Biz Card</text>
  <text x="1250" y="1380" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="30">Scan &amp; save</text>

  <!-- Row 2: Open App (right) -->
  <rect x="1675" y="851" width="817" height="827" rx="20" fill="#059669"/>
  <text x="2083" y="1185" text-anchor="middle" fill="white" font-size="100">🚀</text>
  <text x="2083" y="1320" text-anchor="middle" fill="white" font-size="44" font-weight="700">Open App</text>
  <text x="2083" y="1380" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="30">evrywher.io</text>

  <!-- Bottom branding -->
  <text x="1250" y="1670" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="24" font-weight="500">Evrywher — AI Translation for Life in Japan</text>
</svg>`;

const outDir = path.resolve(__dirname);

// Save SVG
const svgPath = path.join(outDir, 'rich-menu-image.svg');
fs.writeFileSync(svgPath, svg);
console.log('SVG saved to', svgPath);

// Try to convert to PNG with sharp
async function convertToPng() {
  try {
    const sharp = require('sharp');
    const pngPath = path.join(outDir, 'rich-menu-image.png');
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    console.log('PNG saved to', pngPath);
    console.log('Done! Now run: npx ts-node scripts/register-line-rich-menu.ts');
  } catch {
    console.log('\nsharp not installed. To convert SVG to PNG:');
    console.log('  npm install sharp && npx ts-node scripts/generate-rich-menu-image.ts');
    console.log('\nOr convert the SVG manually:');
    console.log('  Open rich-menu-image.svg in browser → screenshot at 2500x1686');
    console.log('  Or use: npx svgexport rich-menu-image.svg rich-menu-image.png 2500:1686');
  }
}

convertToPng();
