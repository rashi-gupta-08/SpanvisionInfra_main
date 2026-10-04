import { createEffect, createSignal, onMount, onCleanup, Show } from 'solid-js';
import createGlobe from 'cobe';

// COBE by Shu Ding, adapted for Solid and the shared Spanvision appearance.
function palette(mode) {
  return mode === 'light'
    ? { dark: 0, baseColor: [0.93, 0.94, 0.95], glowColor: [0.96, 0.97, 0.98], markerColor: [0.14, 0.17, 0.21], mapBrightness: 6, mapBaseBrightness: 0.02 }
    : { dark: 1, baseColor: [0.85, 0.85, 0.85], glowColor: [0.07, 0.07, 0.07], markerColor: [1, 1, 1], mapBrightness: 6, mapBaseBrightness: 0.08 };
}

export default function Globe(props) {
  const [ready, setReady] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [reduced, setReduced] = createSignal(false);
  let canvas, viewport, globe, schedule = () => {}, phi = 0.4, theta = 0.25;

  createEffect(() => {
    const colors = palette(props.mode);
    if (globe) {
      globe.update(colors);
      schedule();
    }
  });
  createEffect(() => { reduced(); schedule(); });

  onMount(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(reducedMotion.matches);
    let frame = 0, previousTime = 0, visible = true, disposed = false, drag;
    const render = time => {
      frame = 0;
      if (disposed || !globe || !visible || document.hidden) return;
      const elapsed = previousTime ? Math.min(time - previousTime, 50) : 0;
      previousTime = time;
      if (!reduced() && !drag) phi += elapsed * 0.00008;
      globe.update({ phi, theta });
      if (!reduced() && !drag) frame = requestAnimationFrame(render);
    };
    schedule = () => {
      if (!frame && globe && visible && !document.hidden && !disposed) frame = requestAnimationFrame(render);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
    const resize = () => {
      if (!globe) return;
      const size = Math.round(viewport.clientWidth);
      globe.update({ width: size, height: size });
      schedule();
    };
    const motionChanged = event => setReduced(event.matches);
    const visibilityChanged = () => { stop(); schedule(); };
    const pointerDown = event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, phi, theta };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      stop();
    };
    const pointerMove = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const sensitivity = 4 / viewport.clientWidth;
      phi = drag.phi + (event.clientX - drag.x) * sensitivity;
      theta = Math.max(-0.8, Math.min(0.8, drag.theta + (event.clientY - drag.y) * sensitivity));
      schedule();
    };
    const pointerEnd = () => {
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      drag = undefined;
      canvas.classList.remove('is-dragging');
      previousTime = 0;
      schedule();
    };
    const keyDown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') phi -= 0.15;
      if (event.key === 'ArrowRight') phi += 0.15;
      if (event.key === 'ArrowUp') theta = Math.min(0.8, theta + 0.1);
      if (event.key === 'ArrowDown') theta = Math.max(-0.8, theta - 0.1);
      schedule();
    };
    const contextLost = event => {
      event.preventDefault(); stop(); globe?.destroy(); globe = undefined;
      setReady(false); setFailed(true);
    };
    const size = Math.round(viewport.clientWidth);
    try {
      // Explicitly detect unsupported browsers; COBE otherwise returns without a renderer.
      const context = { alpha: true, antialias: true };
      if (!canvas.getContext('webgl2', context) && !canvas.getContext('webgl', context)) throw new Error('WebGL unavailable');
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(devicePixelRatio || 1, 2), width: size, height: size,
        phi, theta, diffuse: 1.2, mapSamples: 14000, scale: 0.95,
        markers: [], ...palette(props.mode), context: { alpha: true, antialias: true },
      });
      setReady(true);
      schedule();
    } catch {
      globe?.destroy(); globe = undefined; setFailed(true);
    }
    // COBE's embedded map texture loads asynchronously, including when rotation is paused.
    const initialPaint = setTimeout(schedule, 200);
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      stop(); schedule();
    });
    intersection.observe(viewport);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd);
    canvas.addEventListener('lostpointercapture', pointerEnd);
    canvas.addEventListener('keydown', keyDown);
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibilityChanged);
    reducedMotion.addEventListener('change', motionChanged);
    onCleanup(() => {
      disposed = true; stop(); clearTimeout(initialPaint); observer.disconnect(); intersection.disconnect();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerEnd);
      canvas.removeEventListener('lostpointercapture', pointerEnd);
      canvas.removeEventListener('keydown', keyDown);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibilityChanged);
      reducedMotion.removeEventListener('change', motionChanged);
      globe?.destroy(); globe = undefined; schedule = () => {};
    });
  });

  return <figure class="company-globe" aria-label="Spanvision Infra globe" data-sv-reveal>
    <div class="globe-viewport" ref={viewport} data-globe-state={failed() ? 'fallback' : ready() ? 'ready' : 'loading'}>
      <canvas ref={canvas} class="globe-canvas" classList={{ 'is-ready': ready() }} tabindex={ready() ? 0 : -1} role="img" aria-label="Interactive globe. Drag or use the arrow keys to rotate." hidden={failed()}/>
      <Show when={failed()}>
        <svg class="globe-fallback" viewBox="0 0 300 300" role="img" aria-label="Globe illustration">
          <circle cx="150" cy="150" r="125"/><ellipse cx="150" cy="150" rx="68" ry="125"/>
          <path d="M25 150h250M42 87h216M42 213h216M150 25v250"/>
        </svg>
      </Show>
    </div>
  </figure>;
}
