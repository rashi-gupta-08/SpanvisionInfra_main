export const runtime = Object.freeze({
  native: typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__,
  get preview() { return !this.native; },
});
export const desktopRequired = "Use the desktop app for local speech processing, microphone capture, models, and voices.";
