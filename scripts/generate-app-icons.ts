/**
 * Generate app icons for iOS and Android from a 1024x1024 source.
 * Run: npx ts-node scripts/generate-app-icons.ts
 *
 * Generates the Evrywher logo programmatically (indigo square with rounded corners,
 * "Hi" + "やあ" chat bubbles) and resizes to all required sizes.
 *
 * Requires: npm install sharp
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZE = 1024;

// Generate the 1024x1024 source SVG
const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="220" fill="#4F46E5"/>
  <rect x="180" y="180" width="640" height="430" rx="110" fill="white" opacity="0.15"/>
  <path d="M180 180 Q512 40 820 180" stroke="white" stroke-width="34" fill="none" stroke-linecap="round" opacity="0.95"/>
  <path d="M200 660c0-56 44-100 100-100h136c56 0 100 44 100 100v44c0 56-44 100-100 100H360l-80 66v-66c-44-16-80-56-80-100v-44z" fill="white" opacity="0.95"/>
  <path d="M450 700c0-56 44-100 100-100h136c56 0 100 44 100 100v44c0 56-44 100-100 100H610l-80 66v-66c-44-16-80-56-80-100v-44z" fill="#F59E0B"/>
  <text x="364" y="770" font-size="120" font-weight="800" fill="#4338ca" text-anchor="middle" font-family="system-ui, sans-serif">Hi</text>
  <text x="636" y="810" font-size="108" font-weight="700" fill="white" text-anchor="middle" font-family="sans-serif">やあ</text>
</svg>`;

// iOS icon sizes (width in px)
const IOS_SIZES = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

// Android icon sizes (density → px)
const ANDROID_SIZES: { density: string; size: number }[] = [
  { density: 'mdpi', size: 48 },
  { density: 'hdpi', size: 72 },
  { density: 'xhdpi', size: 96 },
  { density: 'xxhdpi', size: 144 },
  { density: 'xxxhdpi', size: 192 },
];

async function main() {
  const sourceBuffer = Buffer.from(sourceSvg);

  // Generate 1024x1024 source PNG
  const sourcePng = await sharp(sourceBuffer).resize(SIZE, SIZE).png().toBuffer();
  const sourceOutPath = path.resolve(__dirname, 'app-icon-1024.png');
  fs.writeFileSync(sourceOutPath, sourcePng);
  console.log('Source icon saved:', sourceOutPath);

  // iOS icons
  const iosDir = path.resolve(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(iosDir)) {
    for (const size of IOS_SIZES) {
      const outPath = path.join(iosDir, `icon-${size}.png`);
      await sharp(sourcePng).resize(size, size).png().toFile(outPath);
      console.log(`iOS: ${size}x${size} → ${outPath}`);
    }

    // Write Contents.json
    const images = IOS_SIZES.map(size => ({
      filename: `icon-${size}.png`,
      idiom: 'universal',
      platform: 'ios',
      size: `${size}x${size}`,
    }));
    fs.writeFileSync(
      path.join(iosDir, 'Contents.json'),
      JSON.stringify({ images, info: { author: 'xcode', version: 1 } }, null, 2)
    );
    console.log('iOS Contents.json written');
  } else {
    console.log('iOS assets directory not found, skipping');
  }

  // Android icons
  const androidResDir = path.resolve(__dirname, '../android/app/src/main/res');
  if (fs.existsSync(androidResDir)) {
    for (const { density, size } of ANDROID_SIZES) {
      const dir = path.join(androidResDir, `mipmap-${density}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      await sharp(sourcePng).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
      await sharp(sourcePng).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
      console.log(`Android ${density}: ${size}x${size}`);
    }
  } else {
    console.log('Android res directory not found, skipping');
  }

  console.log('\nDone! Icons generated for iOS and Android.');
}

main().catch(console.error);
