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
