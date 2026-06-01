// add-sarvam-audio.mjs
// Adds Sarvam TTS audio to scenes in a stories JSON file that lack audio.
// Usage: node add-sarvam-audio.mjs stories-XXXX.json
// Saves output to stories-XXXX-with-audio.json ready for upload-to-supabase.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Buffer } from 'buffer';

const __dir = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dir, '.env'), 'utf8');
const SARVAM_KEY = envText.match(/SARVAM_API_KEY\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
if (!SARVAM_KEY) { console.error('No SARVAM_API_KEY in .env'); process.exit(1); }

const jsonFile = process.argv[2];
if (!jsonFile) {
  console.error('Usage: node add-sarvam-audio.mjs stories-XXXX.json');
  process.exit(1);
}

// ─── Sarvam TTS ──────────────────────────────────────────────────────────────

function scriptToTtsText(script) {
  if (!script) return '';
  return script.trim().split('\n').map(l => {
    const t = l.trim();
    if (!t) return '';
    if (t.startsWith('*') && t.endsWith('*')) return t.slice(1, -1).trim();
    return t.replace(/^([A-Z][A-Z\s.]+):\s*/, (_, name) =>
      name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') + ': '
    );
  }).filter(Boolean).join(' ');
}

function sceneBodyToTtsText(body) {
  if (!body) return '';
  return body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitIntoChunks(text, maxChars = 490) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) { chunks.push(remaining); break; }
    let cut = remaining.lastIndexOf('.', maxChars);
    if (cut < maxChars * 0.5) cut = remaining.lastIndexOf(' ', maxChars);
    if (cut <= 0) cut = maxChars;
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  return chunks.filter(Boolean);
}

function mergeWavBuffers(buffers) {
  if (buffers.length === 1) return buffers[0];
  const WAV_HEADER = 44;
  const pcmParts = buffers.map(b => b.slice(WAV_HEADER));
  const totalPcm = pcmParts.reduce((n, p) => n + p.length, 0);
  const header = Buffer.from(buffers[0].slice(0, WAV_HEADER));
  header.writeUInt32LE(totalPcm + 36, 4);
  header.writeUInt32LE(totalPcm, 40);
  return Buffer.concat([header, ...pcmParts]);
}

async function generateSceneAudio(text) {
  if (!text) return '';
  const chunks = splitIntoChunks(text);
  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': SARVAM_KEY },
      body: JSON.stringify({
        inputs: chunks,
        target_language_code: 'hi-IN',
        speaker: 'anushka',
        model: 'bulbul:v2',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: false,
      }),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`TTS HTTP ${res.status}: ${t.slice(0, 200)}`); }
    const { audios } = await res.json();
    if (!audios?.length) return '';
    const bufs = audios.map(b64 => Buffer.from(b64, 'base64'));
    return 'data:audio/wav;base64,' + mergeWavBuffers(bufs).toString('base64');
  } catch (e) {
    console.warn(`  [TTS] Audio failed: ${e.message}`);
    return '';
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const stories = JSON.parse(readFileSync(join(__dir, jsonFile), 'utf8'));
const arr = Array.isArray(stories) ? stories : stories.stories || [];
console.log(`Loaded ${arr.length} stories from ${jsonFile}\n`);

let totalScenes = 0, audioAdded = 0;

for (const story of arr) {
  console.log(`Processing: "${story.title}"`);
  const allScenes = [];
  for (const ep of (story.episodes || [])) {
    for (const key of ['scenes', 'scenesA', 'scenesB']) {
      if (ep[key]) allScenes.push(...ep[key]);
    }
  }
  totalScenes += allScenes.length;

  // Process 5 scenes in parallel to stay within rate limits
  const BATCH = 5;
  for (let i = 0; i < allScenes.length; i += BATCH) {
    const batch = allScenes.slice(i, i + BATCH);
    await Promise.all(batch.map(async (sc, j) => {
      if (sc.audio_url || sc.audio_b64) { return; } // already has audio
      const text = sc.script ? scriptToTtsText(sc.script) : sceneBodyToTtsText(sc.body || sc.hl || '');
      if (!text) return;
      const audio = await generateSceneAudio(text);
      if (audio) { sc.audio_b64 = audio; audioAdded++; }
      process.stdout.write(`  Scene ${i + j + 1}/${allScenes.length} ${audio ? '✓' : '✗'}\r`);
    }));
  }
  console.log(`  Done — ${allScenes.filter(s => s.audio_b64 || s.audio_url).length}/${allScenes.length} scenes have audio`);
}

const outFile = jsonFile.replace(/\.json$/, '-with-audio.json');
writeFileSync(join(__dir, outFile), JSON.stringify(Array.isArray(stories) ? arr : { ...stories, stories: arr }));
console.log(`\nTotal: ${audioAdded}/${totalScenes} scenes got new audio`);
console.log(`Saved → ${outFile}`);
console.log(`\nUpload with: node upload-to-supabase.mjs ${outFile}`);
