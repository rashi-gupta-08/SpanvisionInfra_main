export function isLocalPreview(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function moduleUrl(module, state, mode, hostname) {
  const target = state?.url || (isLocalPreview(hostname) ? `http://127.0.0.1:${module.port}${module.path}` : null);
  if (!target) return null;
  const url = new URL(target);
  if (!isLocalPreview(hostname) && (url.protocol !== 'https:' || isLocalPreview(url.hostname))) return null;
  url.searchParams.set('appearance', mode === 'light' ? 'light' : 'dark');
  return url.href;
}
