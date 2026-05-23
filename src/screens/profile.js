import { getCurrentUser, getDisplayName } from '../lib/supabase.js';
import { loadSavedStories, loadPlayedStories } from '../lib/storage.js';
import { navTo } from '../lib/router.js';
import { setCurrentStory, setCurrentCreditMap } from '../lib/state.js';
import { SEED_CREDIT_MAP } from '../data/seed-story.js';
import { startStory } from './player.js';
import { playPublicStory } from './feed.js';

function _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

export function renderProfileHead() {
  const user = getCurrentUser();
  const name = getDisplayName() || 'Katha User';
  const email = user?.email || '';
  const initial = name.charAt(0).toUpperCase();
  const nameEl = document.getElementById('profile-display-name');
  const emailEl = document.getElementById('profile-email');
  const avatarEl = document.getElementById('profile-avatar');
  const guestBanner = document.getElementById('profile-guest-banner');

  if (user) {
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = initial;
    if (guestBanner) guestBanner.style.display = 'none';
  } else {
    if (nameEl) nameEl.textContent = 'Guest';
    if (emailEl) emailEl.textContent = 'Sign in to create & save stories';
    if (avatarEl) avatarEl.textContent = '?';
    if (guestBanner) guestBanner.style.display = 'block';
  }
}

export function renderProfileMyStories() {
  const grid = document.getElementById('my-stories-grid');
  if (!grid) return;
  const createBtn = grid.querySelector('.empty-card');
  grid.innerHTML = '';
  const stories = loadSavedStories();
  stories.forEach(entry => {
    const s = entry.story;
    const firstImg = s.cover_img || s.episodes?.[0]?.scenes?.[0]?.img || '';
    const card = document.createElement('div');
    card.className = 'story-card';
    card.onclick = () => {
      setCurrentStory(entry.story);
      setCurrentCreditMap(entry.creditMap || SEED_CREDIT_MAP);
      startStory();
    };
    card.innerHTML =
      (firstImg ? '<img class="story-card-img" src="' + firstImg + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<div class="story-card-grad"></div>' +
      '<div class="story-card-title">' + _esc(s.title) + '</div>';
    grid.appendChild(card);
  });
  if (createBtn) grid.appendChild(createBtn);
  else {
    const btn = document.createElement('button');
    btn.className = 'empty-card';
    btn.onclick = () => navTo('create');
    btn.innerHTML = '<span class="plus">+</span><span class="lbl">Create</span>';
    grid.appendChild(btn);
  }
  const statEl = document.getElementById('stat-created');
  if (statEl) statEl.textContent = stories.length;
}

export function renderProfilePlayed() {
  const grid = document.getElementById('played-stories-grid');
  if (!grid) return;
  const played = loadPlayedStories();
  grid.innerHTML = '';
  if (!played.length) {
    const emp = document.createElement('div');
    emp.id = 'played-empty';
    emp.style.cssText = 'grid-column:1/-1;padding:16px 0;color:#A0A0B8;font-size:13px;';
    emp.textContent = 'No stories played yet.';
    grid.appendChild(emp);
  } else {
    played.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.onclick = () => playPublicStory(entry.id);
      card.innerHTML =
        (entry.img ? '<img class="story-card-img" src="' + _esc(entry.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
        '<div class="story-card-grad"></div>' +
        '<div class="story-card-title">' + _esc(entry.title) + '</div>';
      grid.appendChild(card);
    });
  }
  const statEl = document.getElementById('stat-played');
  if (statEl) statEl.textContent = played.length;
}

export function openProfileSettings() {
  if (!getCurrentUser()) {
    navTo('onboard');
    return;
  }
  const name = getDisplayName();
  const email = getCurrentUser()?.email || '';
  const el = document.getElementById('settings-name-display');
  const em = document.getElementById('settings-email-display');
  if (el) el.textContent = name || 'Katha user';
  if (em) em.textContent = email;
  document.getElementById('profile-settings-sheet').style.display = 'block';
}

export function closeProfileSettings() {
  document.getElementById('profile-settings-sheet').style.display = 'none';
}

export function updateAuthUI() {
  const user = getCurrentUser();
  const statusEl = document.getElementById('auth-status-text');
  const loggedSec = document.getElementById('auth-loggedin-section');
  const name = getDisplayName();
  const identifier = user?.email || user?.phone || 'Not signed in';
  if (statusEl) statusEl.textContent = user ? (identifier + (name ? ' · ' + name : '')) : 'Not signed in';
  if (loggedSec) loggedSec.style.display = user ? 'block' : 'none';
}

export function updateDbStatusUI() {
  const el = document.getElementById('db-connection-status');
  if (!el) return;
  el.textContent = '✓ Connected';
  el.style.color = '#4CAF50';
}
