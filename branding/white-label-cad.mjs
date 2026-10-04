import fs from 'node:fs';
import path from 'node:path';
import { root, files, write } from './common.mjs';

// Product presentation only. Protocol, storage and dependency identities stay stable.
for (const [directory, product] of [['SpanvisionCAD', 'CAD'], ['spanvision-2d-cad-workspace', '2D CAD']]) {
  const inputs = ['src', 'site', 'locales', 'packaging', 'web', 'snap', 'scripts', 'src-tauri', 'docs/readme']
    .flatMap(dir => files(path.join(directory, dir)));
  inputs.push(...['README.md', 'index.html', 'web-app.html'].map(file => path.join(root, directory, file)));
  for (const file of new Set(inputs)) {
    if (!fs.existsSync(file) || !/\.(md|tsx?|jsx?|json|rs|ftl|html|xml|desktop|plist|wxs|sh|nsh|nsi|yaml)$/.test(file)) continue;
    let source = fs.readFileSync(file, 'utf8');
    source = source.replaceAll(`geptechniek workspace · ${product}`, product).replaceAll('Spanvision infra', 'Spanvision Infra');
    if (file.endsWith('.ftl')) {
      source = source.split('\n').map(line => {
        const equals = line.indexOf('=');
        return equals < 0 ? line : line.slice(0, equals + 1) + line.slice(equals + 1).replace(/\bOCS\b/gi, 'CAD');
      }).join('\n');
    } else if (file.endsWith('.rs')) {
      for (const [before, after] of [
        ['"OCS Web"', '"CAD Web"'], ['"OCS Desktop"', '"CAD Desktop"'],
        ['"Opening OCS Discussions for help and questions..."', '"Opening CAD Discussions for help and questions..."'],
        ['"Opening OCS Web..."', '"Opening CAD Web..."'],
        ['Automation is stopped. Enable it in OCS.', 'Automation is stopped. Enable it in CAD.'],
      ]) source = source.replaceAll(before, after);
    }
    if (directory === 'spanvision-2d-cad-workspace') source = source.replaceAll('alt="GW"', 'alt={BRAND.mark}');
    write(path.relative(root, file), source);
  }
}

const manifestFile = path.join(root, 'SpanvisionCAD/brand.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
manifest.font_repository_url = null;
write('SpanvisionCAD/brand.json', JSON.stringify(manifest, null, 2) + '\n');

const templates = path.join(root, 'spanvision-2d-cad-workspace/templates');
for (const name of fs.readdirSync(templates)) {
  if (!name.startsWith('3BM-Tekenkader-') || !name.endsWith('.svg')) continue;
  const destination = path.join(templates, name.replace('3BM-Tekenkader-', 'CAD-Titleblock-'));
  if (fs.existsSync(destination)) throw new Error(`Template already exists: ${destination}`);
  fs.renameSync(path.join(templates, name), destination);
}

// Keep supplied correspondence recoverable, outside the active CAD sources and packages.
for (const [directory, names] of [
  ['SpanvisionCAD', ['docs/legal/upstream-history']],
  ['spanvision-2d-cad-workspace', ['CLAUDE.md', 'docs/UPSTREAM_README.md', 'docs/upstream-build', 'templates/.claude']],
]) {
  for (const name of names) {
    const source = path.resolve(root, directory, name);
    const destination = path.resolve(root, 'source-provenance', directory, name);
    if (!source.startsWith(root + path.sep) || !destination.startsWith(root + path.sep)) throw new Error('Archive path escaped the workspace');
    if (!fs.existsSync(source)) continue;
    if (fs.existsSync(destination)) throw new Error(`Archive already exists: ${destination}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(source, destination);
  }
}

function escape(value) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
for (const [directory, product, license, notice, output] of [
  ['SpanvisionCAD', 'CAD', 'LICENSE', 'NOTICE.md', 'site/legal.html'],
  ['spanvision-2d-cad-workspace', '2D CAD', 'LICENSE.md', 'NOTICE.md', 'public/legal.html'],
]) {
  const legalDirectory = directory === 'SpanvisionCAD' ? directory : `${directory}/public`;
  const notices = fs.readFileSync(path.join(root, legalDirectory, notice), 'utf8');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Legal and licenses — ${product} — Spanvision Infra</title>
<style>*{box-sizing:border-box}body{margin:0;background:#000;color:#eee;font:16px/1.65 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:48px 24px}header{display:flex;gap:16px;align-items:center;margin-bottom:36px}img{width:56px;height:56px}h1,h2{color:#fff;line-height:1.25}h1{font-size:28px;margin:0}header p{margin:4px 0;color:#999}a{color:#fff;text-underline-offset:4px}a:focus-visible{outline:2px solid #ffffff94;outline-offset:5px}.notice{background:#121212;border:1px solid #ffffff29;border-radius:12px;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere}nav{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}@media(max-width:480px){main{padding:28px 18px}.notice{padding:18px}h1{font-size:23px}}</style></head>
<body><main><header><img src="/assets/logo.svg" alt="CAD"><div><h1>Legal and licenses</h1><p>${product} — Spanvision Infra</p></div></header><nav><a href="${directory === 'SpanvisionCAD' ? '/app/' : '/'}">Return to ${product}</a><a href="/${license}">Full source license</a><a href="/${notice}">Attribution record</a></nav><h2>Copyright and source notices</h2><div class="notice">${escape(notices)}</div><p>This edition is maintained by Spanvision Infra. Original components retain their applicable licenses and copyright notices.</p></main></body></html>\n`;
  write(`${directory}/${output}`, directory === 'SpanvisionCAD' ? html : html.replace('/assets/logo.svg', '/logo.svg'));
}
console.log('CAD presentation cleaned; legal records and compatibility contracts retained.');
