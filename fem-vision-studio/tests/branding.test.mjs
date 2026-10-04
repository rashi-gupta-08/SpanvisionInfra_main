import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTheme, getTheme, setTheme } from '../src/lib/theme.ts';
import { fitCanvasView, zoomCanvasView } from '../src/lib/canvasView.ts';

function browserStorage(value, blocked = false) {
  const values = new Map(value == null ? [] : [['fem2d-theme', value]]);
  globalThis.document = { documentElement: { dataset: {} } };
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem: key => { if (blocked) throw new Error('Storage blocked'); return values.get(key) ?? null; },
    setItem: (key, next) => { if (blocked) throw new Error('Storage blocked'); values.set(key, next); },
  };
  return values;
}

test('existing dark preferences migrate while saved light is retained', () => {
  for (const saved of [null, 'dark', 'openaec', 'spanvision-mono']) {
    const values = browserStorage(saved);
    initializeTheme();
    assert.equal(getTheme(), 'spanvision-mono');
    assert.equal(values.get('fem2d-theme'), 'spanvision-mono');
  }
  const values = browserStorage('light');
  initializeTheme();
  assert.equal(getTheme(), 'light');
  assert.equal(values.get('fem2d-theme'), 'light');
});

test('session appearance still works with storage unavailable', () => {
  browserStorage(null, true);
  assert.doesNotThrow(initializeTheme);
  assert.equal(getTheme(), 'spanvision-mono');
  assert.doesNotThrow(() => setTheme('light'));
  assert.equal(getTheme(), 'light');
});

test('theme changes notify subscribers after updating the document', () => {
  browserStorage('light');
  const observed = [];
  window.addEventListener('spanvision-theme-change', () => observed.push(getTheme()));
  setTheme('spanvision-mono'); setTheme('light');
  assert.deepEqual(observed, ['spanvision-mono', 'light']);
});

test('fit keeps the full model inside desktop, tablet and phone canvases', () => {
  const nodes = [{x:0,y:0},{x:0,y:5},{x:12,y:5},{x:12,y:0}];
  for (const size of [{width:880,height:687},{width:712,height:810},{width:334,height:630}]) {
    const view = fitCanvasView(nodes, size);
    for (const point of nodes) {
      const x = point.x * view.scale + view.offsetX;
      const y = -point.y * view.scale + view.offsetY;
      assert.ok(x > 0 && x < size.width && y > 0 && y < size.height);
    }
  }
  const empty = fitCanvasView([], {width:334,height:630});
  assert.deepEqual(empty, {scale:100,offsetX:167,offsetY:315});
});

test('zoom preserves the world point at the canvas center', () => {
  const size = {width:334,height:630};
  const before = {scale:21,offsetX:40,offsetY:367};
  const after = zoomCanvasView(before,size,1.2);
  assert.ok(Math.abs((size.width/2-before.offsetX)/before.scale - (size.width/2-after.offsetX)/after.scale) < 1e-10);
  assert.ok(Math.abs((size.height/2-before.offsetY)/before.scale - (size.height/2-after.offsetY)/after.scale) < 1e-10);
});
