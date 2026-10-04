import type { AppState } from '../../state/appStore';
import type { ProjectFile } from './fileService';

/** Complete editable snapshot; review markup stays separate. */
export function createProjectFile(state: AppState): ProjectFile {
  const customRegionTypes = state.filledRegionTypes.filter(t => !t.isBuiltIn);
  return {
    version: 3,
    name: state.projectName,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    drawings: state.drawings,
    sheets: state.sheets,
    activeDrawingId: state.activeDrawingId,
    activeSheetId: state.activeSheetId,
    drawingViewports: state.drawingViewports,
    sheetViewports: state.sheetViewports,
    shapes: state.shapes,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    settings: {
      gridSize: state.gridSize,
      gridVisible: state.gridVisible,
      snapEnabled: state.snapEnabled,
    },
    savedPrintPresets: Object.keys(state.savedPrintPresets).length > 0 ? state.savedPrintPresets : undefined,
    filledRegionTypes: customRegionTypes.length > 0 ? customRegionTypes : undefined,
    projectInfo: {
      ...state.projectInfo,
      erpnext: { ...state.projectInfo.erpnext, apiSecret: '' },
    },
    unitSettings: state.unitSettings,
    parametricShapes: state.parametricShapes.length > 0 ? state.parametricShapes : undefined,
    textStyles: state.textStyles.length > 0 ? state.textStyles : undefined,
    customTitleBlockTemplates: state.customTitleBlockTemplates.length > 0 ? state.customTitleBlockTemplates : undefined,
    customSheetTemplates: state.customSheetTemplates.length > 0 ? state.customSheetTemplates : undefined,
    projectPatterns: state.projectPatterns.length > 0 ? state.projectPatterns : undefined,
    wallTypes: state.wallTypes.length > 0 ? state.wallTypes : undefined,
    wallSystemTypes: state.wallSystemTypes.length > 0 ? state.wallSystemTypes : undefined,
    projectStructure: state.projectStructure,
    slabTypes: state.slabTypes?.length > 0 ? state.slabTypes : undefined,
    pileTypes: state.pileTypes?.length > 0 ? state.pileTypes : undefined,
    queries: state.queries.length > 0 ? state.queries : undefined,
  };

}
