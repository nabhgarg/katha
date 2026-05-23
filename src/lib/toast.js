let _toastTimer = null;
let _toastOnTap = null;

export function showToast(msg, onTap) {
  const el = document.getElementById('katha-toast');
  if (!el) return;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  _toastOnTap = onTap || null;
  el.textContent = msg;
  el.onclick = () => { hideToast(); if (_toastOnTap) _toastOnTap(); };
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(hideToast, 5000);
}

export function hideToast() {
  const el = document.getElementById('katha-toast');
  if (el) el.classList.remove('show');
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
}
