import { PROXY_URL } from '../config.js';
import { getCachedToken } from './supabase.js';

function _safeJsonParse(raw) {
  const s = (raw || '').trim();
  const fenced = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return JSON.parse(fenced ? fenced[1].trim() : s);
}

export async function oaiChat(messages, model = 'gpt-5.4-mini', extra = {}) {
  const token = getCachedToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ type: 'chat', model, messages, ...extra }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(e.name === 'AbortError' ? 'Request timed out — please try again' : e.message);
  }
  clearTimeout(timer);
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || 'API error ' + res.status); }
  const d = await res.json();
  if (!d.choices?.[0]?.message?.content) throw new Error('Empty response from model');
  return _safeJsonParse(d.choices[0].message.content);
}

export function pollinationsUrl(prompt) {
  let h = 0;
  for (const c of prompt) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  const seed = Math.abs(h);
  return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt.slice(0, 500)) + '?nologo=true&width=1024&height=1024&model=flux&seed=' + seed;
}

async function _preloadImg(url) {
  return new Promise(resolve => {
    const i = new Image(); i.onload = () => resolve(url); i.onerror = () => resolve(url); i.src = url;
    setTimeout(() => resolve(url), 30000);
  });
}

export async function oaiImage(prompt) {
  const token = getCachedToken();
  if (token) {
    for (const model of ['gpt-image-1']) {
      try {
        const imgCtrl = new AbortController();
        const imgTimer = setTimeout(() => imgCtrl.abort(), 90000);
        let imgRes;
        try {
          imgRes = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ type: 'image', model, prompt, size: '1024x1024' }),
            signal: imgCtrl.signal
          });
        } finally { clearTimeout(imgTimer); }
        if (imgRes.ok) {
          const d = await imgRes.json();
          const b64 = d.data?.[0]?.b64_json;
          if (b64) return 'data:image/png;base64,' + b64;
          if (d.data?.[0]?.url) return d.data[0].url;
        }
      } catch (_e) { /* fall back to Pollinations */ }
    }
  }
  return await _preloadImg(pollinationsUrl(prompt));
}

export const IMG_STYLE = {
  MYTHOLOGY: {
    prefix: 'cinematic Indian mythology, dramatic golden hour light shafts, ancient stone and modern city contrast, epic scale, rich amber and deep shadow palette,',
    suffix: 'photorealistic, cinematic composition, no text, no faces, no watermark, mobile vertical format'
  },
  THRILLER: {
    prefix: 'atmospheric Indian urban noir, harsh sodium streetlights, deep shadows, high contrast, sense of dread, desaturated with one color accent,',
    suffix: 'photorealistic, cinematic composition, no text, no faces, no watermark, mobile vertical format'
  },
  ROMANCE: {
    prefix: 'warm Indian light, golden hour, soft bokeh background, intimate framing, bittersweet mood, Bollywood-adjacent but grounded,',
    suffix: 'photorealistic, cinematic composition, no text, no faces, no watermark, mobile vertical format'
  }
};
