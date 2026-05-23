import { getCurrentUser } from '../lib/supabase.js';
import { loadSavedStories, fetchStories, getCachedStories, getStoriesFetchTs, getStoriesTTL, recordPlayed, storiesCacheClear, fetchPublicStory } from '../lib/storage.js';
import { ST, CURRENT_STORY, setCurrentStory, setCurrentCreditMap } from '../lib/state.js';
import { SEED_CREDIT_MAP } from '../data/seed-story.js';
import { showScreen } from '../lib/router.js';
import { parseScriptStringToUiNodes } from '../lib/script-parser.js';
import { startStory, renderScene } from './player.js';

function _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const GENRE_COLORS = {
  MYTHOLOGY: { bg: 'rgba(255,176,32,0.16)', color: '#FFB020', border: 'rgba(255,176,32,0.35)', fallback: 'radial-gradient(ellipse at 40% 30%, rgba(255,176,32,0.22) 0%, transparent 60%), linear-gradient(135deg, #1a1200 0%, #08080F 100%)' },
  ROMANCE:   { bg: 'rgba(255,80,120,0.16)',  color: '#FF5078', border: 'rgba(255,80,120,0.35)',  fallback: 'radial-gradient(ellipse at 40% 50%, rgba(255,80,120,0.22) 0%, transparent 60%), linear-gradient(135deg, #1a0f15 0%, #08080F 100%)' },
  THRILLER:  { bg: 'rgba(80,160,255,0.16)',  color: '#50A0FF', border: 'rgba(80,160,255,0.35)',  fallback: 'radial-gradient(ellipse at 50% 30%, rgba(80,160,255,0.18) 0%, transparent 60%), linear-gradient(135deg, #0a0f1a 0%, #08080F 100%)' }
};

function _storyHookText(s) {
  const firstScene = s?.episodes?.[0]?.scenes?.[0];
  if (!firstScene) return '';
  if (firstScene.script) {
    const nodes = parseScriptStringToUiNodes(firstScene.script);
    const first = nodes.find(n => n.text && n.text.length > 8);
    return first ? first.text.slice(0, 120) : '';
  }
  return firstScene.narrator || firstScene.body || '';
}

export function renderFeedGenerated() {
  const reel = document.getElementById('feed-reel');
  if (!reel) return;
  reel.querySelectorAll('.feed-card.generated:not(.public)').forEach(c => c.remove());
  loadSavedStories().forEach(entry => {
    const s = entry.story;
    const gc = GENRE_COLORS[s.genre] || GENRE_COLORS.MYTHOLOGY;
    const firstImg = s.cover_img || s.episodes?.[0]?.scenes?.[0]?.img || '';
    const genreLabel = s.genre ? (s.genre.charAt(0) + s.genre.slice(1).toLowerCase()) : 'Story';
    const card = document.createElement('div');
    card.className = 'feed-card generated';
    card.innerHTML =
      '<div class="feed-fallback" style="background:' + gc.fallback + ';"></div>' +
      (firstImg ? '<img class="feed-bg" src="' + firstImg + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<div class="feed-grad"></div>' +
      '<div class="feed-content">' +
        '<div class="feed-top"><div class="feed-top-text">' +
          '<div class="feed-title">' + _esc(s.title) + '</div>' +
          '<div class="feed-badge" style="background:' + gc.bg + ';color:' + gc.color + ';border-color:' + gc.border + ';">' + _esc(genreLabel) + ' · 6 episodes</div>' +
        '</div></div>' +
        '<div class="feed-spacer"></div>' +
        '<div class="feed-bottom">' +
          '<div class="feed-hook">' + _esc(_storyHookText(s)) + '</div>' +
          '<div class="feed-meta"><span>6 episodes</span><span class="dot-sep"></span><span>AI generated</span></div>' +
          '<button class="btn-gold feed-play-btn">&#9654; Play Episode 1</button>' +
        '</div>' +
      '</div>';
    card.querySelector('.feed-play-btn').onclick = () => playSavedStory(entry.id);
    reel.insertBefore(card, reel.firstChild);
  });
}

function _renderFeedCards(data) {
  const reel = document.getElementById('feed-reel');
  const emptyEl = document.getElementById('feed-empty');
  if (!reel) return;
  reel.querySelectorAll('.feed-card.public').forEach(c => c.remove());
  if (!data?.length) {
    if (!reel.querySelector('.feed-card') && emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const user = getCurrentUser();
  data.slice(0, 20).forEach(row => {
    const s = row.story_data;
    if (!s?.title || !s?.genre) return;
    if (user && row.user_id === user.id) return;
    const gc = GENRE_COLORS[s.genre?.toUpperCase()] || GENRE_COLORS.MYTHOLOGY;
    const firstImg = s.cover_img || s.episodes?.[0]?.scenes?.[0]?.img || '';
    const genreLabel = s.genre ? (s.genre.charAt(0) + s.genre.slice(1).toLowerCase()) : 'Story';
    const creator = s._creator || 'Katha User';
    const card = document.createElement('div');
    card.className = 'feed-card public generated';
    card.innerHTML =
      '<div class="feed-fallback" style="background:' + gc.fallback + ';"></div>' +
      (firstImg ? '<img class="feed-bg" src="' + _esc(firstImg) + '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' : '') +
      '<div class="feed-grad"></div>' +
      '<div class="feed-content">' +
        '<div class="feed-top"><div class="feed-top-text">' +
          '<div class="feed-title">' + _esc(s.title) + '</div>' +
          '<div class="feed-badge" style="background:' + gc.bg + ';color:' + gc.color + ';border-color:' + gc.border + ';">' + _esc(genreLabel) + ' · 6 eps</div>' +
        '</div></div>' +
        '<div class="feed-spacer"></div>' +
        '<div class="feed-bottom">' +
          '<div class="feed-hook">' + _esc(_storyHookText(s)) + '</div>' +
          '<div class="feed-meta"><span>By ' + _esc(creator) + '</span><span class="dot-sep"></span><span>6 episodes</span></div>' +
          '<button class="btn-gold feed-play-btn">&#9654; Play Episode 1</button>' +
        '</div>' +
      '</div>';
    card.querySelector('.feed-play-btn').onclick = () => playPublicStory(row.id);
    reel.appendChild(card);
  });
}

export async function loadPublicFeed() {
  const reel = document.getElementById('feed-reel');
  const loadingEl = document.getElementById('feed-loading');
  const emptyEl = document.getElementById('feed-empty');
  if (!reel) return;

  const cached = getCachedStories();
  if (cached?.length) {
    if (loadingEl) loadingEl.style.display = 'none';
    _renderFeedCards(cached);
    if (Date.now() - getStoriesFetchTs() >= getStoriesTTL()) {
      fetchStories().then(fresh => { if (fresh) _renderFeedCards(fresh); });
    }
    return;
  }

  if (loadingEl) loadingEl.style.display = 'flex';
  if (emptyEl) emptyEl.style.display = 'none';
  const data = await fetchStories();
  if (loadingEl) loadingEl.style.display = 'none';
  _renderFeedCards(data);
}

export function _renderExploreGrid(data) {
  const grid = document.getElementById('explore-grid');
  const emptyEl = document.getElementById('explore-empty');
  if (!grid) return;
  if (!data?.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  grid.innerHTML = '';
  const byGenre = {};
  data.forEach(row => {
    const genre = (row.story_data?.genre || 'OTHER').toUpperCase();
    if (!byGenre[genre]) byGenre[genre] = [];
    byGenre[genre].push(row);
  });
  Object.entries(byGenre).forEach(([genre, rows]) => {
    const gc = GENRE_COLORS[genre] || GENRE_COLORS.MYTHOLOGY;
    const genreLabel = genre.charAt(0) + genre.slice(1).toLowerCase();
    const section = document.createElement('div');
    section.className = 'explore-section';
    const countText = rows.length + (rows.length === 1 ? ' story' : ' stories');
    section.innerHTML = '<div class="explore-section-head"><span class="explore-genre-name">' + _esc(genreLabel) + '</span><span class="explore-genre-count">' + countText + '</span></div><div class="explore-cards"></div>';
    const cardsEl = section.querySelector('.explore-cards');
    rows.forEach(row => {
      const s = row.story_data;
      const img = s?.cover_img || s?.episodes?.[0]?.scenes?.[0]?.img || '';
      const card = document.createElement('div');
      card.className = 'explore-card';
      card.style.cursor = 'pointer';
      card.innerHTML =
        (img ? '<img src="' + _esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' : '<div style="position:absolute;inset:0;background:' + gc.fallback + ';border-radius:inherit;"></div>') +
        '<div class="explore-card-grad"></div>' +
        '<div class="explore-card-info">' +
          '<div class="explore-card-badge" style="background:' + gc.bg + ';color:' + gc.color + ';">' + _esc(genreLabel) + '</div>' +
          '<div class="explore-card-title">' + _esc(s?.title || 'Untitled') + '</div>' +
          '<div class="explore-card-eps">6 eps · By ' + _esc(s?._creator || 'Katha User') + '</div>' +
        '</div>';
      card.onclick = () => playPublicStory(row.id);
      cardsEl.appendChild(card);
    });
    grid.appendChild(section);
  });
}

export async function loadExploreGrid() {
  const grid = document.getElementById('explore-grid');
  const loadingEl = document.getElementById('explore-loading');
  const emptyEl = document.getElementById('explore-empty');
  if (!grid) return;

  const cached = getCachedStories();
  if (cached?.length) {
    if (loadingEl) loadingEl.style.display = 'none';
    _renderExploreGrid(cached);
    if (Date.now() - getStoriesFetchTs() >= getStoriesTTL()) {
      fetchStories().then(fresh => { if (fresh) _renderExploreGrid(fresh); });
    }
    return;
  }

  if (loadingEl) loadingEl.style.display = grid.children.length === 0 ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = 'none';
  const data = await fetchStories();
  if (loadingEl) loadingEl.style.display = 'none';
  _renderExploreGrid(data);
}

export async function playPublicStory(rowId) {
  const s = await fetchPublicStory(rowId);
  if (!s) { alert('Story not found.'); return; }
  const user = getCurrentUser();
  if (user) recordPlayed(rowId, s.title || 'Untitled', s.cover_img || s.episodes?.[0]?.scenes?.[0]?.img || '');
  setCurrentStory(s);
  setCurrentCreditMap([]);
  ST.ep = 0; ST.scene = 0; ST.choices = {}; ST.branch = null;
  renderScene(); showScreen('player');
}

export function playSavedStory(id) {
  const entry = loadSavedStories().find(s => s.id === id);
  if (!entry) return;
  setCurrentStory(entry.story);
  setCurrentCreditMap(entry.creditMap || SEED_CREDIT_MAP);
  startStory();
}
