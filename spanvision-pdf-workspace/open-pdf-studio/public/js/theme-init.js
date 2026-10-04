// Synchronous pre-boot theme; full preferences live in Rust on desktop.
try {
  const key = 'spanvision-pdf-workspace.preferences';
  const p = JSON.parse(localStorage.getItem(key) ?? localStorage.getItem('pdfEditorPreferences') ?? '{}');
  let theme = p.theme || 'spanvision-mono';
  if (theme === 'system') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (theme === 'deep-forge') theme = 'warm-ember';
  document.documentElement.setAttribute('data-theme', theme);
} catch { document.documentElement.setAttribute('data-theme', 'spanvision-mono'); }
