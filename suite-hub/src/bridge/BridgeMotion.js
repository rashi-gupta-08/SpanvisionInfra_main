export const INTRO_DURATION = 14;
export const DRIVE_DELAY = 1.5;
export const DRIVE_SPEED = 3.2;
export const TAU = Math.PI * 2;
export const START_ANGLE = -.52;
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// The simulation clock advances only while visible and playing. Camera mode
// changes never reset the drive; Replay is the explicit way to start again.
export class BridgeMotion {
  constructor(reduced = false) {
    this.elapsed = 0;
    this.orbitElapsed = 0;
    this.paused = reduced;
    this.mode = reduced ? 'free' : 'cinematic';
    this.intro = !reduced;
    this.introCompleted = reduced;
    this.orbitAngle = START_ANGLE;
  }
  advance(delta) {
    if (this.paused) return;
    this.elapsed += Math.max(0, delta);
    if (this.mode === 'cinematic') {
      this.orbitElapsed = Math.min(INTRO_DURATION, this.orbitElapsed + Math.max(0, delta));
      this.orbitAngle = START_ANGLE + TAU * smoothstep(this.orbitElapsed / INTRO_DURATION);
      if (this.orbitElapsed >= INTRO_DURATION) {
        this.mode = 'free';
        this.intro = false;
        this.introCompleted = true;
      }
    }
  }
  select(mode) {
    if (!['cinematic', 'free'].includes(mode)) return;
    this.mode = mode;
    this.intro = false;
    if (mode === 'cinematic') {
      this.orbitElapsed = 0;
      this.intro = true;
      this.introCompleted = false;
    }
  }
  replay() {
    this.elapsed = 0;
    this.orbitElapsed = 0;
    this.orbitAngle = START_ANGLE;
    this.intro = true;
    this.introCompleted = false;
    this.mode = 'cinematic';
    this.paused = false;
  }
  journey(length) {
    const duration = length / DRIVE_SPEED;
    const cycle = duration + 2.4;
    const driveElapsed = Math.max(0, this.elapsed - DRIVE_DELAY);
    const phase = driveElapsed % cycle;
    const distance = Math.min(phase * DRIVE_SPEED, length);
    // A brief stop and fade at the endpoint keep the car on the road. Its
    // return to the start is hidden while the wide camera stays in place.
    const fadeOut = 1 - clamp((phase - duration - .6) / .6);
    const fadeIn = driveElapsed >= cycle ? clamp(phase / .6) : 1;
    return { progress: distance / length, distance, moving: phase < duration && this.elapsed >= DRIVE_DELAY,
      opacity: this.elapsed < DRIVE_DELAY ? 1 : Math.min(fadeIn, fadeOut) };
  }
  snapshot(length) {
    return { mode: this.mode, paused: this.paused, intro: this.intro,
      introProgress: clamp(this.orbitElapsed / INTRO_DURATION),
      orbitAngle: this.orbitAngle, elapsed: this.elapsed, ...this.journey(length) };
  }
}
