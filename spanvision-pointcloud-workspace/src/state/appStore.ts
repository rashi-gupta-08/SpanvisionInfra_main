/**
 * App Store — Minimal Zustand store for Pointcloud Workspace
 *
 * Contains only UI theme state + pointcloud state.
 */

import { loadAppearance, saveAppearance, type UITheme } from './appearance';
export { UI_THEMES, type UITheme } from './appearance';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  type PointcloudState,
  type PointcloudActions,
  initialPointcloudState,
  createPointcloudSlice,
} from './slices';

// ============================================================================
// UI Theme
// ============================================================================

export interface UIState {
  message: string | null;
  uiTheme: UITheme;
  canvasBackground: string | null;
  rightPanelOpen: boolean;
  showBAG3DPanel: boolean;
}

export interface UIActions {
  showMessage: (message: string | null) => void;
  setUITheme: (theme: UITheme) => void;
  setCanvasBackground: (color: string | null) => void;
  toggleRightPanel: () => void;
  setShowBAG3DPanel: (show: boolean) => void;
}

const initialUIState: UIState = {
  message: null,
  ...loadAppearance(),
  rightPanelOpen: true,
  showBAG3DPanel: false,
};

// ============================================================================
// Combined State
// ============================================================================

export type AppState = UIState & UIActions & PointcloudState & PointcloudActions;

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    ...initialUIState,
    ...initialPointcloudState,

    // UI actions
    showMessage: (message) => { set(s => { s.message = message; }); },
    setUITheme: (theme: UITheme) => {
      set((s) => { s.uiTheme = theme; });
      saveAppearance(get());
    },
    setCanvasBackground: (color) => {
      if (color !== null && !/^#[0-9a-f]{6}$/i.test(color)) return;
      set((s) => { s.canvasBackground = color; });
      saveAppearance(get());
    },
    toggleRightPanel: () => {
      set((s) => { s.rightPanelOpen = !s.rightPanelOpen; });
    },
    setShowBAG3DPanel: (show: boolean) => {
      set((s) => { s.showBAG3DPanel = show; });
    },

    // Pointcloud actions
    ...createPointcloudSlice(set as any, get as any),
  }))
);
