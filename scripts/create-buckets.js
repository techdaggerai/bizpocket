/**
 * create-buckets.js
 * Run once to create Supabase Storage buckets.
 * Usage:  SUPABASE_SERVICE_KEY=<service_role_key> node scripts/create-buckets.js
 *
 * Get service_role key from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjbcsezbckcnptafsqnn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_KEY env variable');
  console.error('  export SUPABASE_SERVICE_KEY=eyJ...');
  console.error('  node scripts/create-buckets.js');
  process.exit(1);
}

const BUCKETS = [
  {
    id: 'documents',
    name: 'documents',
    public: true,
    fileSizeLimit: 52428800,  // 50 MB
  },
  {
    id: 'chat-images',
    name: 'chat-images',
    public: true,
    fileSizeLimit: 10485760,  // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  },
  {
    id: 'voice-messages',
    name: 'voice-messages',
    public: true,
    fileSizeLimit: 52428800,  // 50 MB
    allowedMimeTypes: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/m4a'],
  },
  {
    id: 'profile-photos',
    name: 'profile-photos',
    public: true,
    fileSizeLimit: 5242880,   // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  {
    id: 'bot-avatars',
    name: 'bot-avatars',
    public: true,
    fileSizeLimit: 5242880,   // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
];

async function createBucket(bucket) {
  const body = {
    id: bucket.id,
    name: bucket.name,
    public: bucket.public,
  };
  if (bucket.fileSizeLimit) body.file_size_limit = bucket.fileSizeLimit;
  if (bucket.allowedMimeTypes) body.allowed_mime_types = bucket.allowedMimeTypes;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`✅  Created: ${bucket.id}`);
  } else if (data.error === 'Duplicate' || data.message?.includes('already exists')) {
    console.log(`⏭️  Already exists: ${bucket.id}`);
  } else {
    console.error(`❌  Failed: ${bucket.id} — ${JSON.stringify(data)}`);
  }
}

async function main() {
  console.log(`\nCreating Supabase Storage buckets at ${SUPABASE_URL}...\n`);
  for (const bucket of BUCKETS) {
    await createBucket(bucket);
  }
  console.log('\nDone. Run the migration SQL in Supabase Dashboard > SQL Editor');
  console.log('File: supabase/migrations/20260404_storage_buckets.sql\n');
}

main().catch(console.error);
