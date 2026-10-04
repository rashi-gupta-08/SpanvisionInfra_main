// Apply appearance before rendering. Legacy keys remain readable by existing profiles.
(function () {
  const themes = ['spanvision-mono', 'light', 'dark'];
  function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function apply(theme, persist) {
    const value = themes.includes(theme) ? theme : 'spanvision-mono';
    document.documentElement.dataset.theme = value;
    if (persist) { try { localStorage.setItem('ofs_theme', value); } catch { /* Storage unavailable. */ } }
    const savedCanvas = read('ofs_canvas_background');
    const canvas = savedCanvas && /^#[a-f\d]{6}$/i.test(savedCanvas) ? savedCanvas : value === 'light' ? '#F5F5F4' : value === 'dark' ? '#2A2A32' : '#1B1B1B';
    document.documentElement.style.setProperty('--fw-canvas', canvas);
    const button = document.getElementById('theme-toggle');
    if (button) button.setAttribute('aria-label', 'Theme: ' + ({'spanvision-mono':'Spanvision Mono',light:'Light',dark:'Dark'})[value] + '. Change theme');
    window.dispatchEvent(new CustomEvent('fw-appearance-change', {detail:{theme:value,canvas}}));
    return value;
  }
  window.__fwAppearance = {apply, next() { return apply(themes[(themes.indexOf(document.documentElement.dataset.theme) + 1) % themes.length], true); }};
  apply(read('ofs_theme'), false);
})();

// Spanvision appearance bridge
window.addEventListener('spanvision:mode-change',()=>window.__fwAppearance.apply(document.documentElement.dataset.svMode === 'light' ? 'light' : 'spanvision-mono',true));
