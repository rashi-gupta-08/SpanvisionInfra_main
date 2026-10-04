/** Build application and document icons from the Spanvision vector mark. */
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const logo = join(root, 'public', 'logo.svg');
const icons = join(root, 'src-tauri', 'icons');
const run = (input, output) => execFileSync(process.execPath, [cli, 'icon', input, '--output', output, '--ios-color', '#000000'], { cwd: root, stdio: 'inherit' });

run(logo, icons);
copyFileSync(join(icons, '128x128.png'), join(root, 'snap', 'gui', 'spanvision-2d-cad-workspace.png'));
const mark = readFileSync(logo, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const temporary = mkdtempSync(join(tmpdir(), 'spanvision-brand-icons-'));
for (const extension of ['o2d', 'dxf']) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <path d="M18 5h67l25 25v93H18z" fill="#eeeeee" stroke="#777777" stroke-width="2"/>
    <path d="M85 5v25h25" fill="#bbbbbb" stroke="#777777" stroke-width="2"/>
    <g transform="translate(36 36) scale(.8)">${mark}</g>
    <path d="M19 99h90v23H19z" fill="#121212"/>
    <text x="64" y="116" fill="#ffffff" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle">.${extension.toUpperCase()}</text>
  </svg>`;
  const input = join(icons, `${extension}-document.svg`);
  writeFileSync(input, svg);
  const output = join(temporary, extension);
  run(input, output);
  copyFileSync(join(output, 'icon.ico'), join(icons, `${extension}-document.ico`));
}
console.log('Spanvision application and document icons generated.');
