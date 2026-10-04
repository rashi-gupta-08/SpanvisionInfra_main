/**
 * ZoomHud — top-right chip with zoom% + Fit/Reset buttons.
 * Phase 7 of OpenAEC UI big-bang.
 */
import { useFEM } from "../../../context/FEMContext";
import { Maximize2, Plus, Minus, RotateCw } from "lucide-react";
import { fitCanvasView, zoomCanvasView } from '../../../lib/canvasView';

export function ZoomHud() {
  const { state, dispatch } = useFEM();
  const zoomPct = Math.round(state.viewState.scale);

  return (
    <div className="oa-mesh-hud oa-mesh-hud-tr">
      <div className="oa-mesh-hud-card oa-mesh-hud-card--mono">
        <button title="Zoom in" aria-label="Zoom in" onClick={() => dispatch({ type: 'SET_VIEW_STATE',
          payload: zoomCanvasView(state.viewState, state.canvasSize, 1.2) })}><Plus size={12} /></button>
        <strong>{zoomPct}%</strong>
        <button title="Zoom out" aria-label="Zoom out" onClick={() => dispatch({ type: 'SET_VIEW_STATE',
          payload: zoomCanvasView(state.viewState, state.canvasSize, 1 / 1.2) })}><Minus size={12} /></button>
        <button
          onClick={() => dispatch({ type: "SET_VIEW_STATE", payload: fitCanvasView(state.mesh.nodes.values(), state.canvasSize) })}
          title="Zoom to fit"
          aria-label="Zoom to fit"
        >
          <Maximize2 size={12} />
        </button>
        <button
          onClick={() => dispatch({ type: "SET_VIEW_STATE", payload: { scale: 100,
            offsetX: state.canvasSize.width / 2, offsetY: state.canvasSize.height / 2 } })}
          title="Reset view"
          aria-label="Reset view"
        >
          <RotateCw size={12} />
        </button>
      </div>
    </div>
  );
}
