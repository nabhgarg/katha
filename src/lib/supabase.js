import { createClient } from '@supabase/supabase-js';
import { SB_URL, SB_KEY, REDIRECT_URL } from '../config.js';

let _supabase = null;
let _currentUser = null;
let _signingOut = false;
let _cachedToken = '';

export function getSupabase() { return _supabase; }
export function getCurrentUser() { return _currentUser; }
export function setCurrentUser(u) { _currentUser = u; }
export function getCachedToken() { return _cachedToken; }
export function isSigningOut() { return _signingOut; }

export function initSupabase(onAuthChange) {
  try {
    _supabase = createClient(SB_URL, SB_KEY);
    _supabase.auth.onAuthStateChange(async (event, session) => {
      if (_signingOut && event !== 'SIGNED_OUT') return;
      const wasLoggedOut = !_currentUser;
      _currentUser = session?.user || null;
      _cachedToken = session?.access_token || '';
      if (onAuthChange) onAuthChange(event, session, wasLoggedOut);
    });
    return true;
  } catch (e) {
    console.error('Supabase init error:', e);
    return false;
  }
}

export async function getSession() {
  if (!_supabase) return null;
  const _noSession = { data: { session: null } };
  const result = await Promise.race([
    _supabase.auth.getSession().catch(() => _noSession),
    new Promise(r => setTimeout(() => r(_noSession), 3000))
  ]);
  return result.data.session;
}

export async function signInWithOtp(email) {
  return _supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: REDIRECT_URL }
  });
}

export async function verifyOtp(email, token) {
  return _supabase.auth.verifyOtp({ email, token, type: 'email' });
}

export async function updateDisplayName(name) {
  if (_supabase && _currentUser) {
    return _supabase.auth.updateUser({ data: { display_name: name } }).catch(() => {});
  }
}

export async function doSignOut() {
  _signingOut = true;
  try {
    if (_supabase) await _supabase.auth.signOut({ scope: 'local' });
  } catch (e) { console.warn('signOut error:', e); }
  Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
  _currentUser = null;
  _cachedToken = '';
  localStorage.removeItem('katha_display_name');
  localStorage.removeItem('katha_stories_v1');
  localStorage.removeItem('katha_played_v1');
  setTimeout(() => { _signingOut = false; }, 500);
}

export function getDisplayName() {
  return _currentUser?.user_metadata?.display_name || localStorage.getItem('katha_display_name') || '';
}
