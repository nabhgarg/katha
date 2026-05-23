import { getSupabase } from '../lib/supabase.js';
import { showScreen } from '../lib/router.js';
import { showToast } from '../lib/toast.js';
import { saveGeneratedStory, storiesCacheClear } from '../lib/storage.js';
import { setCurrentStory, setCurrentCreditMap } from '../lib/state.js';
import { startStory } from './player.js';
import { renderProfileMyStories } from './profile.js';

let _pipelineRunning = false;
let _genPlaceholderActive = false;
let _stepTimers = [];
let _pipelineStartTime = 0;

const GEN_STEP_LABELS_V4 = [
  'Designing your story world',
  'Writing Episode 1',
  'Writing Episodes 2 & 3',
  'Writing Episodes 4 & 5',
  'Finishing your Katha',
  'Saving your Katha'
];

function _formatDuration(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's';
}

function initGenList(labels) {
  const list = document.getElementById('check-list');
  if (!list) return;
  list.innerHTML = (labels || GEN_STEP_LABELS_V4).map(s => `<li><span class="ck"></span><span class="ck-label">${s}</span><span class="ck-time" style="margin-left:auto;font-size:11px;color:#666;font-weight:400;"></span></li>`).join('');
  _stepTimers = new Array((labels || GEN_STEP_LABELS_V4).length).fill(null);
  _pipelineStartTime = Date.now();
}

function setGenItem(idx, state) {
  const list = document.getElementById('check-list');
  if (!list) return;
  const items = list.querySelectorAll('li');
  if (!items[idx]) return;
  const li = items[idx], ck = li.querySelector('.ck'), timeEl = li.querySelector('.ck-time');
  if (state === 'active') {
    li.classList.add('active');
    if (ck) ck.textContent = '·';
    _stepTimers[idx] = Date.now();
    _updateFloatingBanner(GEN_STEP_LABELS_V4[idx] || 'Working...');
  } else if (state === 'done') {
    li.classList.remove('active'); li.classList.add('done');
    if (ck) ck.textContent = '✓';
    if (timeEl && _stepTimers[idx]) {
      timeEl.textContent = _formatDuration(Date.now() - _stepTimers[idx]);
    }
  }
}

function setGenBadge(text) {
  const el = document.getElementById('gen-badge'); if (el) el.textContent = text;
}

function setGenEta(text) {
  const el = document.getElementById('gen-eta'); if (el) el.textContent = text;
}

function _updateFloatingBanner(stepText) {
  const banner = document.getElementById('gen-floating-banner');
  const textEl = document.getElementById('gen-banner-text');
  const stepEl = document.getElementById('gen-banner-step');
  if (!banner) return;
  if (textEl) textEl.textContent = 'Creating your story...';
  if (stepEl) {
    const elapsed = _formatDuration(Date.now() - _pipelineStartTime);
    stepEl.textContent = stepText + ' · ' + elapsed + ' elapsed';
  }
}

function _showFloatingBanner() {
  const banner = document.getElementById('gen-floating-banner');
  if (banner) banner.style.display = 'block';
}

function _hideFloatingBanner() {
  const banner = document.getElementById('gen-floating-banner');
  if (banner) banner.style.display = 'none';
}

export function returnToGenerating() {
  if (_pipelineRunning) showScreen('generating');
}

function showGenError(msg) {
  const el = document.getElementById('gen-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  setGenEta('');
  _hideFloatingBanner();
}

function showGeneratingCard() {
  _genPlaceholderActive = true;
  const grid = document.getElementById('my-stories-grid');
  if (!grid) return;
  const old = grid.querySelector('.gen-placeholder-card');
  if (old) old.remove();
  const card = document.createElement('div');
  card.className = 'gen-placeholder-card';
  card.id = 'gen-ph-card';
  card.innerHTML = '<div class="gen-placeholder-label">Generating…</div>';
  const createBtn = grid.querySelector('.empty-card');
  if (createBtn) grid.insertBefore(card, createBtn);
  else grid.appendChild(card);
  const statEl = document.getElementById('stat-created');
  if (statEl) {
    const cur = parseInt(statEl.textContent, 10) || 0;
    statEl.textContent = cur + 1;
  }
}

function clearGeneratingCard() {
  _genPlaceholderActive = false;
  const card = document.getElementById('gen-ph-card');
  if (card) card.remove();
}

export function updateCharCount() {
  const ta = document.getElementById('story-prompt');
  const cc = document.getElementById('char-count');
  if (ta && cc) cc.textContent = ta.value.length;
}

export function useIdea(btn) {
  const ta = document.getElementById('story-prompt');
  if (!ta) return;
  ta.value = btn.textContent.trim();
  updateCharCount();
  ta.focus();
}

async function runPipelineV4(userPrompt) {
  initGenList(GEN_STEP_LABELS_V4);
  document.getElementById('gen-error').style.display = 'none';
  showGeneratingCard();
  _showFloatingBanner();

  const sb = getSupabase();
  if (sb) { try { await sb.auth.getSession(); } catch (_e) {} }

  // Lazy-load heavy AI modules only when user actually creates a story
  const [pipeline, openai] = await Promise.all([
    import('../lib/pipeline.js'),
    import('../lib/openai.js')
  ]);
  const {
    stageArchitect, stageScenesV3, stageValidate, stageStoryState,
    extractBannedLinesV3, extractLastSentenceV3,
    buildCoverPromptV3, buildEpisodeImagePrompt,
    assembleStoryV3, assembleCreditsV3
  } = pipeline;
  const { oaiImage, pollinationsUrl } = openai;

  try {
    setGenItem(0, 'active');
    setGenEta('Estimated: 5–7 minutes total — browse other stories while you wait!');
    const blueprint = await stageArchitect(userPrompt);
    if (!blueprint?.episodes?.length) throw new Error('Architect returned no episodes — please try again.');
    if (blueprint.episodes.length < 6) throw new Error('Architect returned only ' + blueprint.episodes.length + ' episodes — please try again.');
    if (!blueprint.protagonist?.name) throw new Error('Architect returned no protagonist — please try again.');
    if (!blueprint.episodes[0]?.target_cliffhanger) throw new Error('Architect missing cliffhanger for Episode 1 — please try again.');
    setGenItem(0, 'done');
    const genLabel = blueprint.genre.charAt(0) + blueprint.genre.slice(1).toLowerCase();
    setGenBadge('✓ ' + genLabel + ' — writing your story...');

    setGenItem(1, 'active');
    setGenEta('Writing Episode 1...');
    const [ep1Result, coverImg] = await Promise.all([
      stageScenesV3({ blueprint, episodeNumber: 1, story_state: null, prev_last_sentence: null, choice_label: null, banned_lines: [] }),
      oaiImage(buildCoverPromptV3(blueprint)).catch(e => { console.warn('Cover failed (non-fatal):', e.message); return ''; })
    ]);
    if (!ep1Result?.scenes?.length) throw new Error('Episode 1 returned no scenes — please try again.');

    const [_validation, ep1Img] = await Promise.all([
      Promise.resolve(stageValidate(ep1Result, blueprint, 1)),
      oaiImage(buildEpisodeImagePrompt(blueprint, 1)).catch(e => { console.warn('Ep1 image failed (non-fatal):', e.message); return ''; })
    ]);
    if (_validation && !_validation.pass && _validation.target_node && _validation.revised_script) {
      const idx = _validation.target_node - 1;
      if (ep1Result.scenes[idx]) ep1Result.scenes[idx].script = _validation.revised_script;
    }
    setGenItem(1, 'done');

    let banned_lines = extractBannedLinesV3(ep1Result);
    let prev_last_sentence_a = extractLastSentenceV3(ep1Result);
    let prev_last_sentence_b = prev_last_sentence_a;
    const episodeResults = [ep1Result];
    const episodeImages = [ep1Img];

    let story_state_a = await stageStoryState(ep1Result, blueprint, 1, null).catch(() => null);
    let story_state_b = story_state_a;

    for (let n = 2; n <= 6; n++) {
      if (n === 2) { setGenItem(2, 'active'); setGenEta('Writing Episodes 2 & 3...'); }
      if (n === 4) { setGenItem(2, 'done'); setGenItem(3, 'active'); setGenEta('Writing Episodes 4 & 5...'); }
      if (n === 6) { setGenItem(3, 'done'); setGenItem(4, 'active'); setGenEta('Finishing your Katha...'); }

      const prevEpPlan = blueprint.episodes[n - 2];
      const prevChoiceA = prevEpPlan?.choice_a?.label || '';
      const prevChoiceB = prevEpPlan?.choice_b?.label || '';
      const currentBanned = [...banned_lines];

      let branchA, branchB;
      let epErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
          const calls = [];
          if (!branchA?.scenes?.length) calls.push(stageScenesV3({ blueprint, episodeNumber: n, story_state: story_state_a, prev_last_sentence: prev_last_sentence_a, choice_label: prevChoiceA, branch: 'a', banned_lines: currentBanned }).then(r => { branchA = r; }));
          if (!branchB?.scenes?.length) calls.push(stageScenesV3({ blueprint, episodeNumber: n, story_state: story_state_b, prev_last_sentence: prev_last_sentence_b, choice_label: prevChoiceB, branch: 'b', banned_lines: currentBanned }).then(r => { branchB = r; }));
          await Promise.all(calls);
          if (branchA?.scenes?.length && branchB?.scenes?.length) { epErr = null; break; }
          epErr = new Error(`Episode ${n} returned no scenes — please try again.`);
        } catch (e) {
          epErr = new Error(`Episode ${n} failed: ${e.message}`);
        }
      }
      if (epErr) throw epErr;

      episodeResults.push({ A: branchA, B: branchB });
      episodeImages.push(pollinationsUrl(buildEpisodeImagePrompt(blueprint, n)));

      banned_lines.push(...extractBannedLinesV3(branchA), ...extractBannedLinesV3(branchB));
      if (banned_lines.length > 72) banned_lines.splice(0, banned_lines.length - 72);
      prev_last_sentence_a = extractLastSentenceV3(branchA);
      prev_last_sentence_b = extractLastSentenceV3(branchB);

      [story_state_a, story_state_b] = await Promise.all([
        stageStoryState({ A: branchA, B: branchB }, blueprint, n, 'a').catch(() => story_state_a),
        stageStoryState({ A: branchA, B: branchB }, blueprint, n, 'b').catch(() => story_state_b)
      ]);
    }
    setGenItem(4, 'done');

    setGenItem(5, 'active');
    setGenEta('Saving your Katha...');

    const allEpsForAssembly = episodeResults.map((r, i) => {
      if (i === 0) return r;
      return { A: r.A, B: r.B };
    });
    const story = assembleStoryV3(blueprint, allEpsForAssembly, coverImg);
    story.version = 'v4';
    episodeImages.forEach((img, i) => { if (story.episodes[i] && img) story.episodes[i].image = img; });

    const creditMap = assembleCreditsV3(blueprint);

    setCurrentStory(story);
    setCurrentCreditMap(creditMap);

    // Optimistic save: returns immediately after localStorage, syncs in background
    await saveGeneratedStory(story, creditMap);
    setGenItem(5, 'done');

    clearGeneratingCard();
    _hideFloatingBanner();
    renderProfileMyStories();
    storiesCacheClear();

    const totalTime = _formatDuration(Date.now() - _pipelineStartTime);
    const onGeneratingScreen = document.getElementById('s-generating')?.classList.contains('active');
    if (onGeneratingScreen) {
      setGenEta('Done in ' + totalTime);
      setGenBadge('✓ ' + story.title + ' — tayyar hai!');
      setTimeout(() => { startStory(); }, 1500);
    } else {
      showToast(story.title + ' tayyar hai! (' + totalTime + ') Tap to read.', () => { startStory(); });
    }

  } catch (err) {
    console.error('V4 Pipeline error:', err);
    clearGeneratingCard();
    _hideFloatingBanner();
    renderProfileMyStories();
    const msg = err.message || 'unknown error';
    if (msg.includes('401') || msg.includes('JWT') || msg.includes('auth')) {
      showGenError('Session expired — please sign out and sign back in, then try again.');
    } else if (msg.includes('429') || msg.includes('rate')) {
      showGenError('Too many requests — please wait a minute and try again.');
    } else if (msg.includes('quota') || msg.includes('billing')) {
      showGenError('OpenAI quota issue — please check your billing and try again.');
    } else {
      showGenError('Something went wrong: ' + msg + '. Please try again.');
    }
  }
}

export function startGenerating() {
  if (_pipelineRunning) return;
  const prompt = (document.getElementById('story-prompt')?.value || '').trim();
  if (!prompt) { alert('Please describe your story idea first!'); return; }
  _pipelineRunning = true;
  showScreen('generating');
  runPipelineV4(prompt).finally(() => { _pipelineRunning = false; });
}
