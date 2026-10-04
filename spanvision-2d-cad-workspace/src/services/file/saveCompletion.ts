import { useAppStore, type AppState } from '../../state/appStore';
import { getDocumentStoreIfExists } from '../../state/documentStore';

/** Finish the document that initiated an asynchronous save, even after a tab switch. */
export function applySavedProject(snapshot: AppState, path: string): string {
  const name = path.split(/[/\\]/).pop()?.replace(/\.o2d$/i, '') || 'Untitled';
  const active = useAppStore.getState();
  const isActive = active.activeDocumentId === snapshot.activeDocumentId;
  const documentStore = getDocumentStoreIfExists(snapshot.activeDocumentId);
  const target = isActive ? active : documentStore?.getState();
  if (!target) return name;
  const unchanged = target.shapes === snapshot.shapes && target.layers === snapshot.layers
    && target.drawings === snapshot.drawings && target.sheets === snapshot.sheets
    && target.parametricShapes === snapshot.parametricShapes && target.projectInfo === snapshot.projectInfo
    && target.unitSettings === snapshot.unitSettings && target.textStyles === snapshot.textStyles;
  const isModified = target.isModified && !unchanged;
  if (isActive) useAppStore.setState({ currentFilePath: path, projectName: name, isModified });
  else documentStore?.setState({ filePath: path, projectName: name, isModified });
  return name;
}
