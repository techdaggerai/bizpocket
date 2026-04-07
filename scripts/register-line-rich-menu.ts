/**
 * One-time script to register LINE Rich Menu for Evrywher bot.
 * Run: npx ts-node scripts/register-line-rich-menu.ts
 *
 * Requires:
 *   - LINE_CHANNEL_ACCESS_TOKEN in .env
 *   - scripts/rich-menu-image.png (2500x1686) — generate first with generate-rich-menu-image.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Missing LINE_CHANNEL_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const richMenu = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'Evrywher Menu',
  chatBarText: 'Menu',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: 'message', text: '/translate' },
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: 'message', text: '/scan' },
    },
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: { type: 'message', text: '/invoice' },
    },
    {
      bounds: { x: 833, y: 843, width: 834, height: 843 },
      action: { type: 'message', text: '/card' },
    },
    {
      bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: { type: 'uri', uri: 'https://evrywher.io' },
    },
  ],
};

async function main() {
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
  console.log('Step 3: Setting as default Rich Menu...');
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

  console.log('Rich Menu set as default for all users');
  console.log('Done! Rich Menu ID:', richMenuId);
}

main().catch(console.error);
