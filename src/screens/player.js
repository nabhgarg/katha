import { ST, CURRENT_STORY, CURRENT_CREDIT_MAP } from '../lib/state.js';
import { getCurrentUser } from '../lib/supabase.js';
import { showScreen, navTo } from '../lib/router.js';
import { parseScriptStringToUiNodes } from '../lib/script-parser.js';
import { showToast } from '../lib/toast.js';

function _esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

export function startStory() {
  ST.ep = 0;
  ST.scene = 0;
  ST.choices = {};
  ST.branch = null;
  renderScene();
  showScreen('player');
}

function currentSceneList() {
  const ep = CURRENT_STORY.episodes[ST.ep];
  if (!ep) return null;
  if (ep.scenes) return ep.scenes;
  const prevChoice = ST.choices[ST.ep - 1];
  if (prevChoice === 'A' && ep.scenesA) return ep.scenesA;
  if (ep.scenesB) return ep.scenesB;
  return ep.scenesA || null;
}

export function renderScene() {
  const scenes = currentSceneList();
  if (!scenes) return;
  const s = scenes[ST.scene];
  if (!s) return;

  const img = document.getElementById('scene-img');
  if (img) {
    img.style.animation = 'none';
    void img.offsetHeight;
    const currentEp = CURRENT_STORY?.episodes?.[ST.ep];
    const displaySrc = s.img || currentEp?.image || (CURRENT_STORY && CURRENT_STORY.cover_img) || '';
    if (displaySrc) {
      img.src = displaySrc;
      img.style.display = '';
      img.style.filter = s.img ? '' : 'blur(4px) brightness(0.55)';
      img.style.transform = s.img ? '' : 'scale(1.08)';
    } else {
      img.src = '';
      img.style.display = 'none';
      img.style.filter = '';
      img.style.transform = '';
    }
    img.style.animation = 'kenBurns 8s ease-out forwards';
  }

  const hlEl = document.getElementById('sub-hl');
  const bodyEl = document.getElementById('sub-body');
  if (CURRENT_STORY && (CURRENT_STORY.version === 'v3' || CURRENT_STORY.version === 'v4') && s.script) {
    const nodes = parseScriptStringToUiNodes(s.script);
    let html = '';
    for (const n of nodes) {
      if (n.type === 'SCENE_CONTEXT') {
        html += `<span class="v3-scene-ctx">${_esc(n.text)}</span>`;
      } else if (n.type === 'CHARACTER_DIALOGUE') {
        const speakerMatch = n.text.match(/^([A-Z][A-Z\s]{1,18}):\s*"?(.+?)"?$/);
        if (speakerMatch) {
          html += `<span class="v3-speaker">${_esc(speakerMatch[1].trim())}</span>`;
          html += `<span class="v3-dialogue">${_esc(speakerMatch[2])}</span>`;
        } else {
          html += `<span class="v3-dialogue">${_esc(n.text)}</span>`;
        }
      } else if (n.type === 'ACTION_PROSE') {
        html += `<span class="v3-action">${_esc(n.text)}</span>`;
      }
    }
    hlEl.classList.add('v3-mode');
    hlEl.innerHTML = html || '—';
    bodyEl.textContent = '';
    bodyEl.style.display = 'none';
  } else {
    hlEl.classList.remove('v3-mode');
    bodyEl.style.display = '';
    const dialogueText = (s.dialogues && s.dialogues.length) ? s.dialogues.join('\n') : (s.script ? parseScriptStringToUiNodes(s.script).filter(n => n.type === 'CHARACTER_DIALOGUE').map(n => n.text).join('\n') : (s.hl || ''));
    hlEl.textContent = dialogueText;
    bodyEl.textContent = s.narrator || s.body || '';
  }

  const backBtn = document.getElementById('player-back-btn');
  if (backBtn) backBtn.style.visibility = (ST.scene === 0 && ST.ep === 0) ? 'hidden' : 'visible';

  renderEpDots();
  renderSceneProgress(scenes.length);
}

export function goBackScene() {
  if (ST.scene > 0) {
    ST.scene--;
    renderScene();
  } else if (ST.ep > 0) {
    ST.ep--;
    ST.branch = null;
    const scenes = currentSceneList();
    ST.scene = scenes ? scenes.length - 1 : 0;
    renderScene();
    showScreen('player');
  }
}

export function goBackFromChoice() {
  const scenes = currentSceneList();
  ST.scene = scenes ? scenes.length - 1 : 0;
  renderScene();
  showScreen('player');
}

function renderEpDots() {
  const wrap = document.getElementById('ep-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < CURRENT_STORY.episodes.length; i++) {
    const d = document.createElement('div');
    d.className = 'ep-dot';
    if (i < ST.ep) d.classList.add('done');
    if (i === ST.ep) d.classList.add('active');
    wrap.appendChild(d);
  }
}

function renderSceneProgress(total) {
  const wrap = document.getElementById('scene-progress');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const seg = document.createElement('div');
    seg.className = 'scene-seg';
    if (i < ST.scene) seg.classList.add('done');
    if (i === ST.scene) seg.classList.add('active');
    wrap.appendChild(seg);
  }
}

export function advanceScene() {
  const ep = CURRENT_STORY.episodes[ST.ep];
  const scenes = currentSceneList();
  if (!scenes) return;

  if (ST.scene < scenes.length - 1) {
    ST.scene++;
    renderScene();
    return;
  }

  if (ep.choice) {
    renderChoice();
    showScreen('choice');
  } else {
    renderEnd();
    showScreen('end');
  }
}

function renderChoice() {
  const ep = CURRENT_STORY.episodes[ST.ep];
  if (!ep || !ep.choice) return;
  const c = ep.choice;
  document.getElementById('choice-q').textContent = c.q;
  document.getElementById('choice-a-text').textContent = c.A.text;
  document.getElementById('choice-b-text').textContent = c.B.text;

  const coverImg = CURRENT_STORY.cover_img || '';
  document.getElementById('choice-a-bg').style.backgroundImage = coverImg ? "url('" + coverImg + "')" : '';
  document.getElementById('choice-b-bg').style.backgroundImage = coverImg ? "url('" + coverImg + "')" : '';

  const aH = document.getElementById('choice-a-half');
  const bH = document.getElementById('choice-b-half');
  aH.style.flex = '1';
  bH.style.flex = '1';
  aH.style.opacity = '1';
  bH.style.opacity = '1';
  aH.style.pointerEvents = '';
  bH.style.pointerEvents = '';
}

export function makeChoice(opt) {
  ST.choices[ST.ep] = opt;

  const aH = document.getElementById('choice-a-half');
  const bH = document.getElementById('choice-b-half');
  aH.style.pointerEvents = 'none';
  bH.style.pointerEvents = 'none';

  if (opt === 'A') {
    aH.style.flex = '1.4';
    bH.style.flex = '1';
    bH.style.opacity = '0.35';
  } else {
    bH.style.flex = '1.4';
    aH.style.flex = '1';
    aH.style.opacity = '0.35';
  }

  setTimeout(() => {
    ST.ep++;
    ST.scene = 0;
    if (ST.ep >= CURRENT_STORY.episodes.length) {
      renderEnd();
      showScreen('end');
      return;
    }
    const nextScenes = currentSceneList();
    if (nextScenes && nextScenes.length > 0) {
      renderScene();
      showScreen('player');
    } else if (CURRENT_STORY.version === 'v3') {
      showToast('Loading next episode...');
      const poll = setInterval(() => {
        const s = currentSceneList();
        if (s && s.length > 0) { clearInterval(poll); renderScene(); showScreen('player'); }
      }, 800);
      setTimeout(() => clearInterval(poll), 30000);
    } else {
      renderScene();
      showScreen('player');
    }
  }, 700);
}

export function renderEnd() {
  if (CURRENT_STORY) {
    const titleEl = document.querySelector('.end-title');
    const genreEl = document.querySelector('.end-genre');
    if (titleEl) titleEl.textContent = CURRENT_STORY.title || '';
    if (genreEl) genreEl.textContent = CURRENT_STORY.genre
      ? CURRENT_STORY.genre.charAt(0) + CURRENT_STORY.genre.slice(1).toLowerCase()
      : '';
  }
  const wrap = document.getElementById('end-credits');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < CURRENT_CREDIT_MAP.length; i++) {
    const opt = ST.choices[i];
    if (!opt) continue;
    const c = CURRENT_CREDIT_MAP[i];
    const block = document.createElement('div');
    block.className = 'credit-block';
    block.innerHTML =
      '<div class="credit-name">' + _esc(c.name) + '</div>' +
      '<div class="credit-beat">' + _esc(opt === 'A' ? c.A : c.B) + '</div>';
    wrap.appendChild(block);
  }
}

function buildShareText() {
  let out = 'I just finished "' + CURRENT_STORY.title + '" on Katha.\n\n';
  for (let i = 0; i < CURRENT_CREDIT_MAP.length; i++) {
    const opt = ST.choices[i];
    if (!opt) continue;
    const c = CURRENT_CREDIT_MAP[i];
    out += c.name + ' — ' + (opt === 'A' ? c.A : c.B) + '\n';
  }
  out += '\nWhat would your story be?';
  return out;
}

export function shareEnding() {
  const text = buildShareText();
  if (navigator.share) {
    navigator.share({ title: 'My Katha ending', text, url: window.location.href }).catch(() => {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!')).catch(() => alert(text));
  } else {
    alert(text);
  }
}
