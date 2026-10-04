import 'fake-indexeddb/auto';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../state/appStore';
import { useReviewStore } from '../../state/reviewStore';
import { getSetting, setSetting } from '../../utils/settings';
import { deleteDraft, extractDraft, listDrafts, readDraft, writeDraft, type MarkupStroke } from './draftStorage';
import { restoreBrowserDraft } from './browserSession';
import { finishWebDialog, getDialog } from './dialogService';
import { clearBrowserFileHandle, promptSaveBeforeClose, showSaveDialog, writeProjectFile } from '../file/fileService';
import { createProjectFile } from '../file/projectSnapshot';
import { applySavedProject } from '../file/saveCompletion';
import { getDocumentStoreIfExists } from '../../state/documentStore';
import { MarkupCanvas } from '../../components/tablet/MarkupCanvas';

const initial = useAppStore.getState();
const stroke: MarkupStroke = { id: 'review-test', type: 'pen', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: '#fff', width: 2, opacity: 1 };
afterEach(() => {
  cleanup();
  finishWebDialog(null);
  vi.restoreAllMocks();
  delete window.showSaveFilePicker;
  useAppStore.setState(initial, true);
  useReviewStore.setState({ byDocument: {} });
  localStorage.clear();
});

describe('browser preferences and recovery', () => {
  it('retains theme and canvas choices and tolerates corrupt preferences', async () => {
    await setSetting('uiTheme', 'light');
    await setSetting('whiteBackground', true);
    expect(await getSetting('uiTheme', 'spanvision-mono')).toBe('light');
    expect(await getSetting('whiteBackground', false)).toBe(true);
    localStorage.setItem('spanvision.settings.uiTheme', '{broken');
    expect(await getSetting('uiTheme', 'spanvision-mono')).toBe('spanvision-mono');
  });

  it('round trips independent drafts, markup, and project libraries', async () => {
    const first = extractDraft(initial, { [initial.activeDrawingId]: [stroke] });
    first.id = 'draft-a'; first.name = 'First';
    const second = { ...first, id: 'draft-b', name: 'Second', savedAt: first.savedAt + 1 };
    await Promise.all([writeDraft(first), writeDraft(second)]);
    expect((await listDrafts()).slice(0, 2).map(d => d.name)).toEqual(['Second', 'First']);
    const stored = await readDraft(first.id);
    expect(stored?.markups[initial.activeDrawingId]).toEqual([stroke]);
    expect(stored?.state.wallTypes).toEqual(initial.wallTypes);
    restoreBrowserDraft(stored!);
    expect(useAppStore.getState().activeDocumentId).toBe(first.id);
    expect(useAppStore.getState().currentFilePath).toBeNull();
    expect(useAppStore.getState().isModified).toBe(true);
    expect(useReviewStore.getState().byDocument[first.id][initial.activeDrawingId]).toEqual([stroke]);
    await deleteDraft(first.id); await deleteDraft(second.id);
    expect(await readDraft(first.id)).toBeUndefined();
  });

  it('keeps review markup and integration secrets out of .o2d', () => {
    useReviewStore.getState().hydrate(initial.activeDocumentId, { [initial.activeDrawingId]: [stroke] });
    const state = { ...initial, projectInfo: { ...initial.projectInfo, erpnext: { ...initial.projectInfo.erpnext, apiSecret: 'private' } } };
    const project = createProjectFile(state);
    expect(project.projectInfo?.erpnext.apiSecret).toBe('');
    expect(project.queries).toEqual(initial.queries.length ? initial.queries : undefined);
    expect(JSON.stringify(project)).not.toContain('review-test');
    expect(extractDraft(state).state.projectInfo.erpnext.apiSecret).toBe('');
  });
});

describe('browser save flow', () => {
  it('finishes the saved tab after a switch and retains edits made during a save', () => {
    useAppStore.getState().createNewDocument('First drawing');
    const snapshot = useAppStore.getState();
    const other = snapshot.createNewDocument('Other drawing');
    applySavedProject(snapshot, 'First.o2d');
    expect(useAppStore.getState().activeDocumentId).toBe(other);
    expect(useAppStore.getState().currentFilePath).toBeNull();
    expect(getDocumentStoreIfExists(snapshot.activeDocumentId)?.getState().filePath).toBe('First.o2d');
    const later = useAppStore.getState();
    useAppStore.setState({ projectInfo: { ...later.projectInfo, projectName: 'Edited during save' }, isModified: true });
    applySavedProject(later, 'Other.o2d');
    expect(useAppStore.getState().isModified).toBe(true);
  });
  it('writes each tab to its own chosen file and preserves a handle on cancellation', async () => {
    const firstWrite = vi.fn(), secondWrite = vi.fn();
    const handle = (name: string, write: ReturnType<typeof vi.fn>) => ({ name, createWritable: async () => ({ write, close: vi.fn() }) }) as unknown as FileSystemFileHandle;
    window.showSaveFilePicker = vi.fn().mockResolvedValueOnce(handle('first.o2d', firstWrite)).mockResolvedValueOnce(handle('second.o2d', secondWrite)).mockRejectedValueOnce(new DOMException('Canceled', 'AbortError'));
    await showSaveDialog('First', 'doc-a'); await showSaveDialog('Second', 'doc-b');
    expect(await showSaveDialog('First copy', 'doc-a')).toBeNull();
    await writeProjectFile('first.o2d', createProjectFile(initial), 'doc-a');
    expect(firstWrite).toHaveBeenCalledOnce(); expect(secondWrite).not.toHaveBeenCalled();
    await writeProjectFile('second.o2d', createProjectFile(initial), 'doc-b');
    expect(secondWrite).toHaveBeenCalledOnce();
    clearBrowserFileHandle('doc-a'); clearBrowserFileHandle('doc-b');
  });

  it('offers a named download when File System Access is unavailable', async () => {
    const pending = showSaveDialog('Floor plan', 'fallback');
    await waitFor(() => expect(getDialog()?.title).toBe('Download project'));
    finishWebDialog({ action: 'download', input: 'Floor plan', selection: '' });
    expect(await pending).toBe('Floor plan.o2d');
  });

  it('allows canceling a dirty tab close', async () => {
    const pending = promptSaveBeforeClose('Floor plan');
    expect(getDialog()?.actions.map(a => a.value)).toEqual(['cancel', 'discard', 'save']);
    finishWebDialog(null);
    expect(await pending).toBe('cancel');
  });
});

describe('review coordinates', () => {
  it('keeps stored strokes aligned through viewport changes', () => {
    useAppStore.setState({ viewport: { zoom: 2, offsetX: 100, offsetY: 50 } });
    const { container } = render(<MarkupCanvas active={false} tool="pen" color="#fff" width={2} strokes={[stroke]} onStrokesChange={() => {}} />);
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M 120 90 L 160 130');
    act(() => useAppStore.setState({ viewport: { zoom: 3, offsetX: 20, offsetY: 10 } }));
    expect(container.querySelector('path')?.getAttribute('d')).toBe('M 50 70 L 110 130');
    expect(stroke.points[0]).toEqual({ x: 10, y: 20 });
  });
});
