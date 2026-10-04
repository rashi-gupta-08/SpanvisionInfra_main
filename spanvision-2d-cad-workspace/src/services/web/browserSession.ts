import { useAppStore } from '../../state/appStore';
import { getDocumentStoreIfExists } from '../../state/documentStore';
import { useReviewStore } from '../../state/reviewStore';
import { DRAFT_FIELDS, extractDraft, writeDraft, type BrowserDraft } from './draftStorage';
import { notifyWeb } from './dialogService';

export function restoreBrowserDraft(draft: BrowserDraft) {
  const before = useAppStore.getState();
  const emptyId = before.activeDocumentId;
  const wasEmpty = before.shapes.length === 0 && !before.isModified;
  if (before.documentOrder.includes(draft.id)) before.switchDocument(draft.id);
  else before.openDocument(draft.id, { ...draft.state, filePath: null, isModified: true });
  useAppStore.setState(state => {
    for (const key of DRAFT_FIELDS) {
      if (draft.state[key] !== undefined) Object.assign(state, { [key]: draft.state[key] });
    }
    state.currentFilePath = null;
    state.isModified = true;
    state.selectedShapeIds = [];
    state.drawingPoints = [];
    state.isDrawing = false;
    state.drawingPreview = null;
  });
  if (wasEmpty && emptyId !== draft.id) useAppStore.getState().closeDocument(emptyId);
  useReviewStore.getState().hydrate(draft.id, draft.markups || {});
}

export function startBrowserSession() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let pending = false;
  const persist = async () => {
    clearTimeout(timer);
    pending = false;
    const state = useAppStore.getState();
    const draft = extractDraft(state, useReviewStore.getState().byDocument[state.activeDocumentId]);
    window.dispatchEvent(new CustomEvent('spanvision-draft-status', { detail: 'Saving draft…' }));
    try {
      await writeDraft(draft);
      if (!stopped) window.dispatchEvent(new CustomEvent('spanvision-draft-status', { detail: 'Draft saved in this browser' }));
    } catch {
      window.dispatchEvent(new CustomEvent('spanvision-draft-status', { detail: 'Draft could not be saved' }));
      notifyWeb('Browser storage is unavailable or full. Download your project to keep your work.', true);
    }
  };
  const schedule = () => {
    if (!pending) window.dispatchEvent(new CustomEvent('spanvision-draft-status', { detail: 'Draft changes pending…' }));
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => { void persist(); }, 800);
  };
  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (state.activeDocumentId !== previous.activeDocumentId) {
      // Capture the old document before the new document is restored into appStore.
      void writeDraft(extractDraft(previous, useReviewStore.getState().byDocument[previous.activeDocumentId]))
        .catch(() => notifyWeb('Could not save the previous browser draft. Download your project.', true));
    }
    if (state.activeDocumentId !== previous.activeDocumentId || DRAFT_FIELDS.some(key => state[key] !== previous[key])) schedule();
  });
  const unsubscribeReview = useReviewStore.subscribe(schedule);
  const onVisibility = () => { if (document.visibilityState === 'hidden') void persist(); };
  const onUnload = (event: BeforeUnloadEvent) => {
    void persist();
    const state = useAppStore.getState();
    const unsaved = state.isModified || state.documentOrder.some(id => id !== state.activeDocumentId && getDocumentStoreIfExists(id)?.getState().isModified);
    if (unsaved) { event.preventDefault(); event.returnValue = ''; }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', onUnload);
  schedule();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    unsubscribeReview();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('beforeunload', onUnload);
  };
}
