import assert from 'node:assert/strict';
import test from 'node:test';
import { moduleUrl } from '../suite-hub/src/module-url.js';
const tool = { port: 4220, path: '/' };
test('local preview continues to open the local tool in the chosen theme', () => {
  assert.equal(moduleUrl(tool, {}, 'light', '127.0.0.1'), 'http://127.0.0.1:4220/?appearance=light');
});
test('production uses its deployment URL and preserves other query parameters', () => {
  assert.equal(moduleUrl(tool, { url: 'https://tool.vercel.app/draw?project=one' }, 'dark', 'spanvision-infra.vercel.app'), 'https://tool.vercel.app/draw?project=one&appearance=dark');
});
test('production never opens a visitors localhost or insecure/missing deployments', () => {
  for (const url of [undefined, 'http://tool.example/', 'https://127.0.0.1:4220/']) {
    assert.equal(moduleUrl(tool, { url }, 'dark', 'spanvision-infra.vercel.app'), null);
  }
});
