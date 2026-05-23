import { getSupabase, getCurrentUser, getDisplayName } from './supabase.js';
import { showToast } from './toast.js';

export const STORIES_KEY = 'katha_stories_v1';
export const PLAYED_KEY = 'katha_played_v1';

const _STORIES_CACHE_KEY = 'katha_stories_cache_v1';
const _STORIES_TTL = 30000;

let _storiesData = null;
let _storiesFetchTs = 0;
let _storiesFetching = null;

export function storiesCacheClear() {
  _storiesData = null; _storiesFetchTs = 0;
  try { sessionStorage.removeItem(_STORIES_CACHE_KEY); } catch (_e) {}
}

function _storiesCacheLoad() {
  try {
    const raw = sessionStorage.getItem(_STORIES_CACHE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p?.rows?.length) return p; }
  } catch (_e) {}
  return null;
}

function _storiesCacheSave(rows) {
  try { sessionStorage.setItem(_STORIES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rows })); } catch (_e) {}
}

export function getCachedStories() {
  return _storiesData || _storiesCacheLoad()?.rows;
}

export function getStoriesFetchTs() { return _storiesFetchTs; }
export function getStoriesTTL() { return _STORIES_TTL; }

export async function fetchStories() {
  const sb = getSupabase();
  if (!sb) return null;
  if (_storiesData && Date.now() - _storiesFetchTs < _STORIES_TTL) return _storiesData;
  if (_storiesFetching) return _storiesFetching;
  _storiesFetching = (async () => {
    try {
      const { data, error } = await sb
        .from('stories')
        .select('id, story_data, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data?.length) {
        _storiesData = data;
        _storiesFetchTs = Date.now();
        _storiesCacheSave(data);
      }
      return _storiesData;
    } catch (e) {
      console.warn('Stories fetch error:', e);
      return _storiesData;
    } finally {
      _storiesFetching = null;
    }
  })();
  return _storiesFetching;
}

function _prepareForStorage(story) {
  const clone = JSON.parse(JSON.stringify(story));
  if (clone.cover_img && clone.cover_img.startsWith('data:'))
    clone.cover_img = '';
  return clone;
}

export function loadSavedStories() {
  try { return JSON.parse(localStorage.getItem(STORIES_KEY) || '[]'); }
  catch (_e) { return []; }
}

export function loadPlayedStories() {
  try { return JSON.parse(localStorage.getItem(PLAYED_KEY) || '[]'); }
  catch (_e) { return []; }
}

export function recordPlayed(rowId, title, img) {
  try {
    const played = loadPlayedStories().filter(p => p.id !== rowId);
    played.unshift({ id: rowId, title, img, ts: Date.now() });
    localStorage.setItem(PLAYED_KEY, JSON.stringify(played.slice(0, 20)));
  } catch (_e) { /* quota */ }
}

async function _uploadCoverToStorage(dataUrl) {
  const sb = getSupabase();
  const user = getCurrentUser();
  if (!sb || !user) return null;
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
    const storagePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('covers').upload(storagePath, blob, { contentType: mime, upsert: false });
    if (error) { console.warn('Cover upload error:', error.message); return null; }
    const { data } = sb.storage.from('covers').getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch (e) { console.warn('Cover upload failed:', e); return null; }
}

async function _uploadImageToStorage(imageSource) {
  const sb = getSupabase();
  const user = getCurrentUser();
  if (!sb || !user) return null;
  if (!imageSource) return null;
  try {
    let blob, ext;
    if (imageSource.startsWith('data:')) {
      const [header, b64] = imageSource.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: mime });
      ext = mime === 'image/jpeg' ? 'jpg' : 'png';
    } else if (imageSource.startsWith('http')) {
      const imgAbort = new AbortController();
      const imgTimeout = setTimeout(() => imgAbort.abort(), 15000);
      let res;
      try { res = await fetch(imageSource, { signal: imgAbort.signal }); }
      finally { clearTimeout(imgTimeout); }
      if (!res.ok) throw new Error('fetch failed ' + res.status);
      blob = await res.blob();
      ext = 'png';
    } else {
      return imageSource;
    }
    const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('covers').upload(storagePath, blob, { contentType: blob.type || 'image/png', upsert: false });
    if (error) { console.error('Episode image upload error:', error.message); return null; }
    const { data } = sb.storage.from('covers').getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch (e) { console.error('Episode image upload failed:', e.message); return null; }
}

async function _uploadEpisodeImagesToStorage(dbStory) {
  if (!dbStory?.episodes) return;
  await Promise.all(dbStory.episodes.map(async (ep) => {
    if (!ep.image) return;
    const url = await _uploadImageToStorage(ep.image);
    if (url) ep.image = url;
  }));
}

async function _saveStoryToDb(story, creditMap) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialized');
  const { data: { session } } = await sb.auth.getSession();
  const userId = session?.user?.id || getCurrentUser()?.id;
  if (!userId) throw new Error('No active session — please sign in again');
  const safe = JSON.parse(JSON.stringify(story));
  const stripBase64 = (o) => {
    if (o && typeof o === 'object') {
      for (const k in o) {
        if (typeof o[k] === 'string' && o[k].startsWith('data:')) o[k] = '';
        else if (typeof o[k] === 'object') stripBase64(o[k]);
      }
    }
  };
  stripBase64(safe);
  const payloadLen = JSON.stringify(safe).length;
  if (payloadLen > 500000) throw new Error('Story payload too large: ' + payloadLen + ' bytes');
  const { error } = await sb.from('stories').insert({ user_id: userId, story_data: safe, credit_map: creditMap });
  if (error) throw new Error(error.message);
}

export async function loadStoriesFromDb() {
  const sb = getSupabase();
  const user = getCurrentUser();
  if (!sb || !user) return null;
  const { data, error } = await sb
    .from('stories').select('id, story_data, credit_map, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(10);
  if (error) { console.warn('DB load error:', error); return null; }
  return (data || []).map(r => ({ id: r.id, story: r.story_data, creditMap: r.credit_map, createdAt: new Date(r.created_at).getTime() }));
}

export async function syncFromDb(renderCallbacks) {
  const dbStories = await loadStoriesFromDb();
  if (!dbStories) return;
  const localPending = loadSavedStories().filter(s => s.pendingDbSave);
  const merged = [...localPending, ...dbStories];
  for (let maxKeep = merged.length; maxKeep >= 0; maxKeep--) {
    try {
      localStorage.setItem(STORIES_KEY, JSON.stringify(merged.slice(0, maxKeep)));
      break;
    } catch (_e) {
      if (maxKeep === 0) console.warn('_syncFromDb: localStorage full, skipping local cache');
    }
  }
  if (renderCallbacks) {
    renderCallbacks.renderFeedGenerated?.();
    renderCallbacks.renderProfileMyStories?.();
  }
}

// Phase 5: Optimistic save — returns immediately after localStorage, syncs in background
export async function saveGeneratedStory(story, creditMap) {
  const persistStory = _prepareForStorage(story);
  const localId = Date.now();
  const newEntry = { id: localId, story: persistStory, creditMap, createdAt: localId, pendingDbSave: true };
  for (let maxKeep = 4; maxKeep >= 0; maxKeep--) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORIES_KEY) || '[]').slice(0, maxKeep);
      saved.unshift(newEntry);
      localStorage.setItem(STORIES_KEY, JSON.stringify(saved));
      break;
    } catch (_e) {
      if (maxKeep === 0) console.warn('localStorage quota exceeded — story saved to DB only');
    }
  }

  // Background sync — upload images + save to DB without blocking UI
  _backgroundSync(story, creditMap, localId);
}

async function _backgroundSync(story, creditMap, localId) {
  const dbStory = JSON.parse(JSON.stringify(story));
  dbStory._creator = getDisplayName() || 'Katha User';

  // Upload cover + all episode images in parallel
  const uploadTasks = [];
  if (dbStory.cover_img?.startsWith('data:')) {
    uploadTasks.push(
      _uploadCoverToStorage(dbStory.cover_img).then(url => { dbStory.cover_img = url || ''; })
    );
  }
  if (dbStory.episodes) {
    dbStory.episodes.forEach((ep) => {
      if (!ep.image) return;
      uploadTasks.push(
        _uploadImageToStorage(ep.image).then(url => { if (url) ep.image = url; })
      );
    });
  }
  await Promise.all(uploadTasks);

  try {
    await _saveStoryToDb(dbStory, creditMap);
    try {
      const saved = JSON.parse(localStorage.getItem(STORIES_KEY) || '[]');
      const idx = saved.findIndex(e => e.id === localId);
      if (idx !== -1) { delete saved[idx].pendingDbSave; localStorage.setItem(STORIES_KEY, JSON.stringify(saved)); }
    } catch (_e) { /* next sync will clean up */ }
    storiesCacheClear();
  } catch (e) {
    console.warn('DB save failed:', e.message);
    showToast('Story saved locally but not synced — ' + (e.message || 'try signing in again'));
  }
}

export async function fetchPublicStory(rowId) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('stories').select('story_data').eq('id', rowId).single();
  if (error || !data) return null;
  return data.story_data;
}
