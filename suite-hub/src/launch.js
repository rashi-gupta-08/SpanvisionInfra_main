import brand from './brand.json';
import { isLocalPreview, moduleUrl } from './module-url';
import { waitForBackend } from '../../deployment/service-readiness.mjs';
import './launch.css';

const id = new URL(location.href).searchParams.get('tool');
const module = brand.modules.find(tool => tool.id === id);
const splash = document.querySelector('.tool-splash');
const status = document.getElementById('splash-status');
const actions = document.getElementById('splash-actions');
const direct = document.getElementById('splash-direct');
const directLink = document.getElementById('splash-open');
let controller;

function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, milliseconds);
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
  });
}

async function waitForService(signal) {
  const started = performance.now();
  await waitForBackend(id, `/__suite/ready/${id}`, { signal, onWaiting() {
    status.textContent = performance.now() - started > 45000 ? 'The service is still starting. You can wait here or open the workspace directly.' : 'Preparing workspace. The service may need a moment to start…';
  } });
}

function updateAppearance() {
  const mode = window.SpanvisionAppearance.getMode();
  const mark = mode === 'light' ? '/spanvision-mark-light.svg' : '/spanvision-mark.svg';
  document.getElementById('splash-logo').src = mark;
  document.getElementById('company-favicon').href = mark;
}
updateAppearance();
window.addEventListener('spanvision:mode-change', updateAppearance);
window.addEventListener('spanvision:mode-observed', updateAppearance);
if (module) {
  document.getElementById('splash-title').textContent = module.label;
  document.title = `Opening ${module.label} — Spanvision Infra`;
}

async function openWorkspace() {
  controller?.abort();
  const request = controller = new AbortController();
  splash.dataset.state = 'loading';
  splash.setAttribute('aria-busy', 'true');
  actions.hidden = true;
  direct.hidden = true;
  directLink.removeAttribute('href');
  status.textContent = 'Opening workspace…';
  const started = performance.now();
  let stage = 'availability';
  let timeout = setTimeout(() => request.abort(), 12000);
  try {
    if (!module) throw new Error('This tool could not be found. Choose a tool from the workspace.');
    const response = await fetch('/__suite/status', { cache: 'no-store', signal: request.signal });
    if (!response.ok) throw new Error('Tool availability could not be checked. Please try again.');
    const manifest = await response.json();
    const state = Array.isArray(manifest.modules) ? manifest.modules.find(tool => tool.id === id) : null;
    if (!state?.available) throw new Error('This workspace is currently unavailable. Please try again shortly.');
    const url = moduleUrl(module, state, window.SpanvisionAppearance.getMode(), location.hostname);
    if (!url || (!isLocalPreview(location.hostname) && new URL(url).protocol !== 'https:')) throw new Error('This workspace has no valid deployment address.');
    if (!isLocalPreview(location.hostname) && ['bim', 'stl', 'fem'].includes(id)) {
      stage = 'startup';
      directLink.href = url;
      direct.hidden = false;
      status.textContent = 'Starting the service. You can wait here or open the workspace directly.';
      clearTimeout(timeout);
      timeout = setTimeout(() => request.abort(), 185000);
      await waitForService(request.signal);
    }
    await delay(Math.max(0, 700 - (performance.now() - started)), request.signal);
    if (request.signal.aborted) throw new Error('Tool availability took too long to respond. Please try again.');
    location.replace(url);
  } catch (error) {
    if (request !== controller) return;
    splash.dataset.state = 'error';
    splash.setAttribute('aria-busy', 'false');
    status.textContent = request.signal.aborted ? (stage === 'startup' ? 'The service is taking longer to start. Open the workspace directly or try again.' : 'Tool availability took too long to respond. Please try again.') : error.message;
    actions.hidden = false;
    document.getElementById('splash-retry').hidden = !module;
  } finally {
    clearTimeout(timeout);
  }
}
document.getElementById('splash-retry').addEventListener('click', openWorkspace);
window.addEventListener('pagehide', () => controller?.abort());
void openWorkspace();
