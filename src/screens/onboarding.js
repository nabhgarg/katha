import { signInWithOtp, verifyOtp, updateDisplayName, getDisplayName, doSignOut as sbSignOut, getCurrentUser } from '../lib/supabase.js';
import { navTo } from '../lib/router.js';
import { storiesCacheClear } from '../lib/storage.js';
import { updateAuthUI, closeProfileSettings } from './profile.js';

let _pendingEmail = '';

export function resetOnboardScreen() {
  const form = document.getElementById('onboard-form');
  const otp = document.getElementById('onboard-otp');
  const btn = document.getElementById('onboard-submit-btn');
  const vbtn = document.getElementById('onboard-verify-btn');
  const inp = document.getElementById('onboard-email');
  const otpInp = document.getElementById('onboard-otp-input');
  if (form) form.style.display = 'block';
  if (otp) otp.style.display = 'none';
  if (btn) { btn.disabled = false; btn.textContent = 'Send code →'; }
  if (vbtn) { vbtn.disabled = false; vbtn.textContent = 'Verify →'; }
  if (inp) inp.value = '';
  if (otpInp) otpInp.value = '';
  _pendingEmail = '';
}

export async function submitOnboard() {
  const email = (document.getElementById('onboard-email')?.value || '').trim();
  const errEl = document.getElementById('onboard-error');
  if (!email.includes('@')) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  const btn = document.getElementById('onboard-submit-btn');
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const { error } = await signInWithOtp(email);
    if (error) throw error;
    _pendingEmail = email;
    document.getElementById('onboard-otp-phone').textContent = email;
    document.getElementById('onboard-form').style.display = 'none';
    document.getElementById('onboard-otp').style.display = 'block';
    setTimeout(() => document.getElementById('onboard-otp-input')?.focus(), 100);
  } catch (e) {
    const msg = (e.message || '').toLowerCase();
    if (msg.includes('rate') || msg.includes('limit') || msg.includes('429')) {
      errEl.textContent = 'Too many attempts. Please wait a few minutes and try again.';
    } else {
      errEl.textContent = 'Something went wrong. Please try again.';
    }
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Send code →';
  }
}

export async function submitOtp() {
  const token = (document.getElementById('onboard-otp-input')?.value || '').replace(/\D/g, '');
  const errEl = document.getElementById('onboard-otp-error');
  if (token.length !== 6) {
    errEl.textContent = 'Please enter the 6-digit code.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  const btn = document.getElementById('onboard-verify-btn');
  btn.disabled = true; btn.textContent = 'Verifying...';
  try {
    const { error } = await verifyOtp(_pendingEmail, token);
    if (error) throw error;
    if (!getDisplayName()) {
      navTo('name');
    } else {
      navTo('feed');
    }
    btn.disabled = false; btn.textContent = 'Verify →';
  } catch (e) {
    const msg = (e.message || '').toLowerCase();
    errEl.textContent = msg.includes('invalid') || msg.includes('expired')
      ? 'Incorrect or expired code. Please try again.'
      : 'Verification failed. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Verify →';
  }
}

export async function submitName() {
  const name = (document.getElementById('name-input')?.value || '').trim();
  if (!name) { document.getElementById('name-input').focus(); return; }
  localStorage.setItem('katha_display_name', name);
  updateAuthUI();
  navTo('feed');
  updateDisplayName(name);
}

export async function handleSignOut() {
  closeProfileSettings();
  await sbSignOut();
  storiesCacheClear();
  updateAuthUI();
  resetOnboardScreen();
  document.querySelectorAll('.feed-card.generated:not(.public)').forEach(c => c.remove());
  navTo('feed');
}
