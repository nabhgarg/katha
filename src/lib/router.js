import { getCurrentUser } from './supabase.js';

let _genTimers = [];

export function clearGenTimers() {
  _genTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
  _genTimers = [];
}

export function addGenTimer(t) { _genTimers.push(t); }

export function showScreen(id) {
  if (id !== 'generating') clearGenTimers();
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById('s-' + id);
  if (target) {
    target.style.display = 'flex';
    target.classList.add('active');
  }
  const banner = document.getElementById('gen-floating-banner');
  if (banner && banner.style.display !== 'none') {
    banner.style.visibility = id === 'generating' ? 'hidden' : 'visible';
  }
}

let _onNav = null;
export function setOnNav(fn) { _onNav = fn; }

export function navTo(tab) {
  if (tab === 'create' && !getCurrentUser()) {
    navTo('onboard');
    return;
  }
  showScreen(tab);
  document.querySelectorAll('.bnav .nav-item').forEach(b => {
    if (b.dataset.tab === tab) b.classList.add('active');
    else b.classList.remove('active');
  });
  if (_onNav) _onNav(tab);
}
