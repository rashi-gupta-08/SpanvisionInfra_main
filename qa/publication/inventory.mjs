import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, brand } from '../../branding/common.mjs';

const output = path.join(root, 'qa/publication');
fs.mkdirSync(output, { recursive: true });
const eligible = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
const rows = eligible.map(file => {
  try { const stat = fs.statSync(path.join(root, file)); return { file, bytes: stat.size, directory: stat.isDirectory() }; }
  catch (error) { return { file, error: error.code }; }
});
const groups = {};
for (const row of rows) {
  const key = row.file.split('/')[0];
  const group = groups[key] ||= { files: 0, bytes: 0 };
  group.files++; group.bytes += row.bytes || 0;
}
const skipped = new Set(['.git', 'node_modules', 'target', 'dist', '.venv', '__pycache__', '.pytest_cache', '.worktrees', 'build', '.cache']);
const metadata = [];
const links = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.name === '.git') { metadata.push(path.relative(root, absolute)); continue; }
    if (skipped.has(entry.name)) continue;
    if (entry.isSymbolicLink()) { links.push({ file: path.relative(root, absolute), target: fs.readlinkSync(absolute) }); continue; }
    if (entry.isDirectory()) walk(absolute);
  }
}
for (const directory of [...new Set(brand.modules.map(module => module.directory.split('/')[0])), 'suite-hub']) {
  const absolute = path.join(root, directory);
  if (fs.lstatSync(absolute).isSymbolicLink()) links.push({ file: directory, target: fs.readlinkSync(absolute) });
  walk(absolute);
}
const large = rows.filter(row => row.bytes > 5 * 1024 * 1024).sort((a, b) => b.bytes - a.bytes);
const sensitiveNames = rows.filter(row => /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|p12|pfx|key)|.*credentials.*|.*secret.*|.*token.*|.*\.db(?:-.*)?)$/i.test(row.file)).map(row => row.file);
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify({ generatedAt: new Date().toISOString(), groups, metadata, links, large, sensitiveNames, rows }, null, 2) + '\n');
console.log(JSON.stringify({ groups, metadata, links, large: large.slice(0, 60), sensitiveNames }, null, 2));
