import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const core = fileURLToPath(new URL('../ofs-wasm/', import.meta.url));
const output = fileURLToPath(new URL('../ui/public/wasm/', import.meta.url));
const result = spawnSync('wasm-pack', ['build', '--target', 'web', '--out-dir', 'pkg'], {
  cwd: core, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error || result.status !== 0) {
  console.error('Building the engine requires Rust, the wasm32-unknown-unknown target, and wasm-pack. The included engine supports npm run dev / npm run build without those tools.');
  process.exit(result.status || 1);
}
mkdirSync(output, { recursive: true });
for (const name of ['ofs_wasm.js', 'ofs_wasm_bg.wasm']) copyFileSync(`${core}/pkg/${name}`, `${output}/${name}`);
