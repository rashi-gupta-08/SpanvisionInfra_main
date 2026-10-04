import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(await fs.readFile(path.join(root, 'branding/brand.json'), 'utf8'));
const staticTools = JSON.parse(await fs.readFile(path.join(root, 'qa/deployment/vercel-deployments.json'), 'utf8'));
const modules = [];
for (const tool of brand.modules) {
  let url = staticTools[tool.id]?.url;
  let platform = 'vercel';
  if (['bim', 'stl'].includes(tool.id)) {
    const service = JSON.parse(await fs.readFile(path.join(root, `qa/deployment/render-${tool.id}-create.log`), 'utf8'));
    if (service.serviceDetails.plan !== 'free') throw new Error('Unexpected Render billing plan');
    url = new URL(tool.path, service.serviceDetails.url).href;
    platform = 'render';
    const health = await fetch(new URL(tool.id === 'bim' ? '/health' : '/api/ping', url), { signal: AbortSignal.timeout(60000) });
    if (!health.ok) throw new Error(`${tool.id} backend health failed: ${health.status}`);
  }
  if (!url?.startsWith('https://')) throw new Error(`${tool.id} has no production URL`);
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error(`${tool.id} frontend failed: ${response.status}`);
  modules.push({ id: tool.id, label: tool.label, url, available: true, platform });
  console.log(`Verified ${tool.id}: ${url}`);
}
await fs.writeFile(path.join(root, 'deployment/production.json'), JSON.stringify({ organization: brand.organization, modules }, null, 2) + '\n');
