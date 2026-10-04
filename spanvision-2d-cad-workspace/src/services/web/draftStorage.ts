import type { AppState } from '../../state/appStore';

export interface MarkupStroke {
  id: string;
  type: 'pen' | 'highlighter' | 'arrow' | 'text' | 'cloud';
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
  text?: string;
}

export const DRAFT_FIELDS = [
  'shapes', 'layers', 'drawings', 'sheets', 'activeDrawingId', 'activeSheetId', 'activeLayerId',
  'editorMode', 'viewport', 'drawingViewports', 'sheetViewports', 'parametricShapes', 'projectName',
  'projectInfo', 'unitSettings', 'currentStyle', 'defaultTextStyle', 'textStyles', 'activeTextStyleId',
  'customTitleBlockTemplates', 'customSheetTemplates', 'projectPatterns', 'wallTypes', 'wallSystemTypes',
  'slabTypes', 'pileTypes', 'projectStructure', 'queries', 'filledRegionTypes', 'savedPrintPresets',
] as const;

export type DraftState = Pick<AppState, typeof DRAFT_FIELDS[number]>;
export interface BrowserDraft {
  id: string;
  name: string;
  savedAt: number;
  state: DraftState;
  markups: Record<string, MarkupStroke[]>;
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('spanvision-cad', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('Close other CAD tabs to enable draft storage.')); };
  });
  return database;
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('drafts', mode);
    const request = action(tx.objectStore('drafts'));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? request.error ?? new Error('Draft storage is unavailable.'));
    tx.onerror = () => reject(tx.error ?? new Error('Could not save the draft.'));
  });
}

export async function listDrafts(): Promise<BrowserDraft[]> {
  const drafts = await transaction<BrowserDraft[]>('readonly', store => store.getAll());
  return drafts.filter(draft => draft.state?.shapes && draft.state?.drawings && draft.state?.layers)
    .sort((a, b) => b.savedAt - a.savedAt);
}
export async function readDraft(id: string): Promise<BrowserDraft | undefined> {
  return transaction('readonly', store => store.get(id));
}
let writes = Promise.resolve();
export function writeDraft(draft: BrowserDraft): Promise<void> {
  const write = writes.catch(() => {}).then(async () => {
    await transaction('readwrite', store => store.put(draft));
  });
  writes = write;
  return write;
}
export async function deleteDraft(id: string) {
  await writes.catch(() => {});
  await transaction('readwrite', store => store.delete(id));
}

export function extractDraft(state: AppState, markups: Record<string, MarkupStroke[]> = {}): BrowserDraft {
  const snapshot = Object.fromEntries(DRAFT_FIELDS.map(key => [key, state[key]])) as DraftState;
  // Drafts contain project data only. Never persist an integration secret.
  const cloned = JSON.parse(JSON.stringify(snapshot)) as DraftState;
  if (cloned.projectInfo?.erpnext) cloned.projectInfo.erpnext.apiSecret = '';
  return { id: state.activeDocumentId, name: state.projectName, savedAt: Date.now(), state: cloned, markups };
}

export async function migrateLegacyDraft() {
  const raw = localStorage.getItem('open2dstudio_autosave_v1');
  if (!raw) return;
  const old = JSON.parse(raw);
  if (!Array.isArray(old.shapes) || !Array.isArray(old.layers) || !Array.isArray(old.drawings)) return;
  if (!await readDraft('legacy-draft')) {
    if (old.projectInfo?.erpnext) old.projectInfo.erpnext.apiSecret = '';
    await writeDraft({ id: 'legacy-draft', name: old.projectName || 'Recovered drawing', savedAt: old.savedAt || Date.now(), state: old, markups: {} });
  }
  localStorage.removeItem('open2dstudio_autosave_v1');
}
