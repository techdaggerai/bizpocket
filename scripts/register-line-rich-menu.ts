/**
 * One-time script to register LINE Rich Menu for Evrywher bot.
 * Run: npx ts-node scripts/register-line-rich-menu.ts
 *
 * Requires:
 *   - LINE_CHANNEL_ACCESS_TOKEN in .env.local
 *   - scripts/rich-menu-image.png (2500x1686) — generate first with generate-rich-menu-image.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Missing LINE_CHANNEL_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const BASE = 'https://www.evrywher.io';

// 2 rows x 3 columns grid — each cell maps to an evrywher.io page
const COL_W = 833;
const COL_W_LAST = 834; // 833 + 833 + 834 = 2500
const ROW_H = 843;      // 843 + 843 = 1686

const richMenu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'Evrywher Main Menu',
  chatBarText: 'Menu',
  areas: [
    // Row 1
    { bounds: { x: 0, y: 0, width: COL_W, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/ai/camera` } },
    { bounds: { x: COL_W, y: 0, width: COL_W, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/ai/voice` } },
    { bounds: { x: COL_W * 2, y: 0, width: COL_W_LAST, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/chat` } },
    // Row 2
    { bounds: { x: 0, y: ROW_H, width: COL_W, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/emergency` } },
    { bounds: { x: COL_W, y: ROW_H, width: COL_W, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/learn` } },
    { bounds: { x: COL_W * 2, y: ROW_H, width: COL_W_LAST, height: ROW_H }, action: { type: 'uri' as const, uri: `${BASE}/ai` } },
  ],
};

async function main() {
  // Step 1: Create Rich Menu
  console.log('Step 1: Creating Rich Menu...');
  const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(richMenu),
  });

  if (!createRes.ok) {
    console.error('Failed to create Rich Menu:', await createRes.text());
    process.exit(1);
  }

  const { richMenuId } = await createRes.json();
  console.log('Rich Menu created:', richMenuId);

  // Step 2: Upload image
  const imagePath = path.resolve(__dirname, 'rich-menu-image.png');
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found at', imagePath);
    console.error('Generate it first: npx ts-node scripts/generate-rich-menu-image.ts');
    process.exit(1);
  }

  console.log('Step 2: Uploading Rich Menu image...');
  const imageBuffer = fs.readFileSync(imagePath);
  const uploadRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: imageBuffer,
    }
  );

  if (!uploadRes.ok) {
    console.error('Failed to upload image:', await uploadRes.text());
    process.exit(1);
  }
  console.log('Image uploaded successfully');

  // Step 3: Set as default for all users
  console.log('Step 3: Setting as default Rich Menu for all users...');
  const defaultRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  );

  if (!defaultRes.ok) {
    console.error('Failed to set default:', await defaultRes.text());
    process.exit(1);
  }

  console.log('\nDone! Rich Menu deployed.');
  console.log('Rich Menu ID:', richMenuId);
  console.log('\nButtons:');
  console.log('  [1] Scan & Translate  →', `${BASE}/ai/camera`);
  console.log('  [2] Voice Translate   →', `${BASE}/ai/voice`);
  console.log('  [3] Open Chat         →', `${BASE}/chat`);
  console.log('  [4] Emergency Card    →', `${BASE}/emergency`);
  console.log('  [5] Learn Japanese    →', `${BASE}/learn`);
  console.log('  [6] All Features      →', `${BASE}/ai`);
}

main().catch(console.error);
