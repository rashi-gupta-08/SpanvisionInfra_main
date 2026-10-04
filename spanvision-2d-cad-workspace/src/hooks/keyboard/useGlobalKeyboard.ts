import { isDesktopShell } from '../../utils/platform';
import { useEffect } from 'react';
import { useAppStore } from '../../state/appStore';
import { useFileOperations } from '../file/useFileOperations';

export function useGlobalKeyboard() {
  const { handleNew, handleOpen, handleSave, handleSaveAs } = useFileOperations();
  const { undo, redo, deleteSelectedShapes, selectedShapeIds, boundaryEditState,
    cancelBoundaryDrag, deselectBoundary, editorMode, viewportEditState,
    cancelViewportDrag, selectViewport, deselectAll, toggleTerminal,
    selectedWallSubElement, clearWallSubElement, setFeedbackDialogOpen } = useAppStore();
  // Global feedback shortcut (F1) - registered in capture phase so it works
  // even when dialogs or subscreens are open and have their own key handlers.
  useEffect(() => {
    const handleFeedbackShortcut = (e: KeyboardEvent) => {
      if (e.key === 'F1' && isDesktopShell()) {
        e.preventDefault();
        e.stopPropagation();
        setFeedbackDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handleFeedbackShortcut, true);
    return () => window.removeEventListener('keydown', handleFeedbackShortcut, true);
  }, [setFeedbackDialogOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-web-modal]')) return;
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            handleNew();
            break;

          case 'o':
            e.preventDefault();
            handleOpen();
            break;

          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;

          case 'z':
            e.preventDefault();
            undo();
            break;

          case 'y':
            e.preventDefault();
            redo();
            break;

          case '`':
            e.preventDefault();
            toggleTerminal();
            break;
        }
      }

      // Escape key - cancel drag or deselect
      if (e.key === 'Escape') {
        // Sheet mode: viewport editing
        if (editorMode === 'sheet') {
          if (viewportEditState.isDragging) {
            e.preventDefault();
            cancelViewportDrag();
          } else if (viewportEditState.selectedViewportId) {
            e.preventDefault();
            selectViewport(null);
          }
        }
        // Draft mode: boundary editing
        else if (editorMode === 'drawing') {
          if (boundaryEditState.activeHandle !== null) {
            e.preventDefault();
            cancelBoundaryDrag();
          } else if (boundaryEditState.isSelected) {
            e.preventDefault();
            deselectBoundary();
          } else if (selectedWallSubElement) {
            // Clear wall sub-element selection before deselecting the wall itself
            e.preventDefault();
            clearWallSubElement();
          } else if (selectedShapeIds.length > 0) {
            e.preventDefault();
            deselectAll();
          }
        }
      }

      // Delete key
      if (e.key === 'Delete' && selectedShapeIds.length > 0) {
        e.preventDefault();
        deleteSelectedShapes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNew, handleOpen, handleSave, handleSaveAs, undo, redo, deleteSelectedShapes, selectedShapeIds, boundaryEditState, cancelBoundaryDrag, deselectBoundary, editorMode, viewportEditState, cancelViewportDrag, selectViewport, deselectAll, toggleTerminal, selectedWallSubElement, clearWallSubElement]);
}
