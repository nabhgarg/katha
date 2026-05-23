export function parseScriptStringToUiNodes(scriptString) {
  const nodes = [];
  const pattern = /(\*[^*]+\*)|([^*]+)/g;
  let match;
  let firstActionSeen = false;
  while ((match = pattern.exec(scriptString)) !== null) {
    if (match[1]) {
      const action = match[1].replace(/\*/g, '').trim();
      if (action) {
        nodes.push({ type: firstActionSeen ? 'ACTION_PROSE' : 'SCENE_CONTEXT', text: action });
        firstActionSeen = true;
      }
    } else if (match[2]) {
      const lines = match[2].split('\n').map(l => l.trim()).filter(Boolean);
      for (const l of lines) if (l) nodes.push({ type: 'CHARACTER_DIALOGUE', text: l });
    }
  }
  return nodes;
}
