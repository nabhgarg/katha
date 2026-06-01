// upload-to-supabase.mjs
// Signs in with email/password from .env and uploads all stories from a JSON file to Supabase.
//
// Usage:
//   node upload-to-supabase.mjs stories-<timestamp>.json
//
// Required .env keys:
//   SUPABASE_EMAIL=you@example.com
//   SUPABASE_PASSWORD=yourpassword

import { readFileSync } from 'fs';
import { Buffer } from 'buffer';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const SB_URL = 'https://vxpiktpczpnwbxzrlrfv.supabase.co';
const SB_KEY = 'sb_publishable_7AHJ_aL1DchcUjk9_0KiNQ_zewZxlbr';

const _args = process.argv.slice(2);
const jsonFile = _args.find(a => !a.startsWith('--'));
const EMAIL    = _args.find(a => !a.startsWith('--') && a !== jsonFile) || 'nabhgarg@gmail.com';
if (!jsonFile) {
  console.error('Usage: node upload-to-supabase.mjs stories-<timestamp>.json [email] [--otp=<code>]');
  process.exit(1);
}

function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, ans => { rl.close(); res(ans.trim()); }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const supabase = createClient(SB_URL, SB_KEY);

// Pass --otp=<code> to skip the send step and use an already-delivered OTP.
const OTP_FLAG = process.argv.find(a => a.startsWith('--otp='));
const PRESET_OTP  = OTP_FLAG ? OTP_FLAG.split('=')[1] : null;

async function main() {
  let token;
  if (PRESET_OTP) {
    token = PRESET_OTP;
    console.log(`Using supplied OTP (skipping send).\n`);
  } else {
    // Send OTP
    console.log(`Sending OTP to ${EMAIL}...`);
    const { error: otpErr } = await supabase.auth.signInWithOtp({ email: EMAIL });
    if (otpErr) { console.error('OTP send failed:', otpErr.message); process.exit(1); }
    console.log('OTP sent — check your email.\n');
    token = await prompt('Enter OTP: ');
  }

  const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({ email: EMAIL, token, type: 'email' });
  if (verifyErr) { console.error('OTP verify failed:', verifyErr.message); process.exit(1); }
  const userId = authData.user.id;
  console.log(`Signed in. User ID: ${userId}\n`);

  // Load stories
  const stories = JSON.parse(readFileSync(join(__dir, jsonFile), 'utf8'));
  console.log(`Uploading ${stories.length} stories from ${jsonFile}...\n`);

  let ok = 0, fail = 0;
  for (const story of stories) {
    // Upload base64 cover image to Supabase Storage and replace with public URL
    if (story.cover_img && story.cover_img.startsWith('data:')) {
      try {
        const match = story.cover_img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          const ext  = mime.split('/')[1] || 'jpg';
          const buf  = Buffer.from(match[2], 'base64');
          const path = `covers/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from('story-assets').upload(path, buf, { contentType: mime, upsert: false });
          if (upErr) {
            console.warn(`  IMG  "${story.title}" — storage upload failed: ${upErr.message}`);
            story.cover_img = '';
          } else {
            const { data: urlData } = supabase.storage.from('story-assets').getPublicUrl(path);
            story.cover_img = urlData.publicUrl;
            console.log(`  IMG  "${story.title}" — uploaded cover`);
          }
        }
      } catch (e) {
        console.warn(`  IMG  "${story.title}" — image error: ${e.message}`);
        story.cover_img = '';
      }
    }

    // Upload base64 scene audio to Supabase Storage and replace with public URLs
    let audioCount = 0;
    const allScenes = [];
    for (const ep of (story.episodes || [])) {
      for (const key of ['scenes', 'scenesA', 'scenesB']) {
        if (ep[key]) allScenes.push(...ep[key].map(sc => ({ sc, epRef: ep[key] })));
      }
    }
    await Promise.all(allScenes.map(async ({ sc }) => {
      if (!sc.audio_b64 || !sc.audio_b64.startsWith('data:audio')) return;
      try {
        const [header, b64] = sc.audio_b64.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'audio/wav';
        const ext  = mime === 'audio/mpeg' ? 'mp3' : 'wav';
        const buf  = Buffer.from(b64, 'base64');
        const path = `audio/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('story-assets').upload(path, buf, { contentType: mime, upsert: false });
        if (upErr) { console.warn(`  AUDIO upload failed: ${upErr.message}`); sc.audio_b64 = ''; return; }
        const { data: urlData } = supabase.storage.from('story-assets').getPublicUrl(path);
        sc.audio_url = urlData.publicUrl;
        sc.audio_b64 = '';
        audioCount++;
      } catch (e) { console.warn(`  AUDIO error: ${e.message}`); sc.audio_b64 = ''; }
    }));
    if (audioCount > 0) console.log(`  AUDIO "${story.title}" — ${audioCount} scenes uploaded`);

    const payload = JSON.stringify(story);
    if (payload.length > 500000) {
      console.warn(`  SKIP "${story.title}" — payload too large (${payload.length} bytes)`);
      fail++;
      continue;
    }
    const { error } = await supabase.from('stories').insert({
      user_id: userId,
      story_data: story,
      credit_map: [],
    });
    if (error) {
      console.error(`  FAIL "${story.title}" — ${error.message}`);
      fail++;
    } else {
      console.log(`  OK   "${story.title}" (${story.genre}, ${story.city})`);
      ok++;
    }
  }

  console.log(`\nDone. ${ok} uploaded, ${fail} failed.`);
  await supabase.auth.signOut();
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
