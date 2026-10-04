import { spawnSync } from 'node:child_process';

const listing = spawnSync('git', ['credential-manager', 'github', 'list'], { encoding: 'utf8', windowsHide: true });
if (listing.status !== 0) throw new Error('Could not list GitHub credential-manager accounts.');
for (const account of listing.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
  const result = spawnSync('git', ['-c', 'credential.interactive=never', 'credential', 'fill'], {
    input: `protocol=https\nhost=github.com\nusername=${account}\n\n`, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  if (result.status !== 0) { console.log(JSON.stringify({ account, credentialAvailable: false })); continue; }
  const credential = Object.fromEntries(result.stdout.split(/\r?\n/).filter(line => line.includes('=')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  if (!credential.password) { console.log(JSON.stringify({ account, credentialAvailable: false })); continue; }
  const response = await fetch('https://api.github.com/repos/spanvisioninfra-bot/SpanvisionInfra_main', {
    headers: { Authorization: `Bearer ${credential.password}`, Accept: 'application/vnd.github+json' },
  });
  const repo = await response.json();
  console.log(JSON.stringify({ account, status: response.status, canPush: repo.permissions?.push === true, defaultBranch: repo.default_branch }));
}
