import './styles/base.css';
import './styles/screens.css';
import './styles/components.css';

import { BUILD_LABEL } from './config.js';
import { initSupabase, getSession, setCurrentUser, getDisplayName, getCurrentUser } from './lib/supabase.js';
import { navTo, setOnNav } from './lib/router.js';
import { syncFromDb } from './lib/storage.js';

import { startStory, advanceScene, goBackScene, goBackFromChoice, makeChoice, shareEnding } from './screens/player.js';
import { renderFeedGenerated, loadPublicFeed, loadExploreGrid, playSavedStory, playPublicStory } from './screens/feed.js';
import { renderProfileMyStories, renderProfilePlayed, renderProfileHead, openProfileSettings, closeProfileSettings, updateAuthUI, updateDbStatusUI } from './screens/profile.js';
import { startGenerating, updateCharCount, useIdea, returnToGenerating } from './screens/create.js';
import { submitOnboard, submitOtp, submitName, handleSignOut, resetOnboardScreen } from './screens/onboarding.js';

// Expose functions that HTML onclick handlers need
Object.assign(window, {
  navTo,
  advanceScene,
  goBackScene,
  goBackFromChoice,
  makeChoice,
  shareEnding,
  startStory,
  startGenerating,
  updateCharCount,
  useIdea,
  submitOnboard,
  submitOtp,
  submitName,
  openProfileSettings,
  closeProfileSettings,
  doSignOut: handleSignOut,
  playSavedStory,
  playPublicStory,
  openLoginModal: () => navTo('onboard'),
  closeLoginModal: () => {},
  returnToGenerating,
  openSave: () => document.getElementById('overlay-save')?.classList.add('active'),
  closeSave: () => document.getElementById('overlay-save')?.classList.remove('active'),
});

const renderCallbacks = { renderFeedGenerated, renderProfileMyStories };

setOnNav((tab) => {
  if (tab === 'feed') { renderFeedGenerated(); loadPublicFeed(); }
  if (tab === 'explore') loadExploreGrid();
  if (tab === 'profile') {
    renderProfileMyStories();
    renderProfilePlayed();
    renderProfileHead();
    updateAuthUI();
    updateDbStatusUI();
  }
});

// Only navigate on real sign-in events, never on token refresh or session restore
initSupabase(async (event, session, wasLoggedOut) => {
  const user = session?.user || null;
  setCurrentUser(user);
  updateAuthUI();
  renderProfileHead();
  if (!user) return;
  await syncFromDb(renderCallbacks);
  if (event === 'SIGNED_IN' && wasLoggedOut) {
    if (!getDisplayName()) navTo('name');
    else navTo('feed');
  }
});

setTimeout(() => { loadPublicFeed(); loadExploreGrid(); }, 100);

window.addEventListener('load', async () => {
  const bl = document.getElementById('build-label');
  if (bl) bl.textContent = 'build ' + BUILD_LABEL;

  renderFeedGenerated();
  renderProfileMyStories();
  renderProfileHead();
  updateAuthUI();

  const [, session] = await Promise.all([
    new Promise(r => setTimeout(r, 1000)),
    getSession()
  ]);

  if (session?.user) {
    setCurrentUser(session.user);
    updateAuthUI();
    await syncFromDb(renderCallbacks);
    if (!getDisplayName()) navTo('name');
    else navTo('feed');
  } else {
    navTo('feed');
  }
});
