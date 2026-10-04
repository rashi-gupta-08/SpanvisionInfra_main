export type CanvasBackground = "auto" | "light" | "mono";

export function resolveCanvasTone(mode: CanvasBackground, theme: string): "light" | "mono" {
  return mode === "auto" ? (theme === "spanvision-mono" ? "mono" : "light") : mode;
}

export function applyCanvasBackground(mode: CanvasBackground, theme: string) {
  document.documentElement.dataset.canvasTone = resolveCanvasTone(mode, theme);
  window.dispatchEvent(new Event("resize"));
}
