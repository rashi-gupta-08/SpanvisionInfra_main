import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { root, brand } from '../../branding/common.mjs';

// Assemble a self-contained source snapshot without altering nested repositories.
const checkout = path.join(root, 'qa/publication/checkout');
if (!fs.existsSync(path.join(checkout, '.git'))) throw new Error('Clone the destination repository into qa/publication/checkout first.');
const allowed = new Set(['.gitignore', '.gitleaksignore', 'README.md', 'package.json', 'package-lock.json', 'branding', 'suite-hub', 'qa', 'source-provenance', ...brand.modules.map(module => module.directory.split('/')[0])]);
const git = (args, cwd = root) => execFileSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
const candidates = new Set();
function expand(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  if (fs.statSync(absolute).isFile()) { candidates.add(relative.replaceAll('\\', '/')); return; }
  if (!fs.existsSync(path.join(absolute, '.git'))) throw new Error(`Unexpected directory candidate: ${relative}`);
  const inner = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], absolute).toString().split('\0').filter(Boolean);
  for (const file of inner) expand(path.join(relative, file));
}
for (const file of git(['ls-files', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean)) {
  if (allowed.has(file.split('/')[0]) && !file.startsWith('qa/publication/checkout/')) expand(file);
}
const list = [...candidates].sort();
let ignoredFiles = [];
try {
  ignoredFiles = execFileSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], { cwd: root, input: list.join('\0') + '\0', maxBuffer: 64 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
} catch (error) {
  if (error.status !== 1) throw error;
}
const exclusions = new Set(ignoredFiles);
const selected = list.filter(file => !exclusions.has(file));
const files = [];
const groups = {};
for (const file of selected) {
  if (file.split('/').includes('.git') || path.isAbsolute(file) || file.split('/').includes('..')) throw new Error(`Unsafe candidate: ${file}`);
  const source = path.join(root, file);
  const destination = path.resolve(checkout, file);
  if (!destination.startsWith(checkout + path.sep)) throw new Error(`Destination escaped checkout: ${file}`);
  const data = fs.readFileSync(source);
  if (data.length >= 100 * 1024 * 1024) throw new Error(`File exceeds the regular Git upload limit: ${file}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data);
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (sha256 !== createHash('sha256').update(fs.readFileSync(destination)).digest('hex')) throw new Error(`Copy mismatch: ${file}`);
  files.push({ file, bytes: data.length, sha256 });
  const group = groups[file.split('/')[0]] ||= { files: 0, bytes: 0 };
  group.files++; group.bytes += data.length;
}
const result = { generatedAt: new Date().toISOString(), source: root, destination: checkout, groups, files };
fs.writeFileSync(path.join(root, 'qa/publication/upload-manifest.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), groups }, null, 2));
