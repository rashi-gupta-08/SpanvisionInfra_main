import type { IViewState } from '../core/fem/types';

type Size = { width: number; height: number };
type Point = { x: number; y: number };

/** Fit model coordinates to the current workspace, including compact canvases. */
export function fitCanvasView(points: Iterable<Point>, size: Size): IViewState {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return { scale: 100, offsetX: size.width / 2, offsetY: size.height / 2 };
  const padding = Math.min(80, size.width * 0.15, size.height * 0.15);
  const scale = Math.max(0.01, Math.min(500,
    (size.width - padding * 2) / Math.max(maxX - minX, 0.1),
    (size.height - padding * 2) / Math.max(maxY - minY, 0.1)));
  return { scale, offsetX: size.width / 2 - (minX + maxX) / 2 * scale,
    offsetY: size.height / 2 + (minY + maxY) / 2 * scale };
}

/** Keep the point at the center of the workspace fixed when zooming. */
export function zoomCanvasView(view: IViewState, size: Size, factor: number): IViewState {
  const scale = Math.max(0.01, Math.min(500, view.scale * factor));
  const ratio = scale / view.scale;
  return { scale, offsetX: size.width / 2 - (size.width / 2 - view.offsetX) * ratio,
    offsetY: size.height / 2 - (size.height / 2 - view.offsetY) * ratio };
}
