// Copy rather than move. A newer edition record always wins, including '{}'.
export const PREFERENCES_KEY = 'spanvision-pdf-workspace.preferences';
export function migratePreferences(storage) {
  try {
    const current = storage.getItem(PREFERENCES_KEY);
    if (current !== null) return current;
    const legacy = storage.getItem('pdfEditorPreferences');
    if (legacy === null) return null;
    const parsed = JSON.parse(legacy);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    storage.setItem(PREFERENCES_KEY, legacy);
    return legacy;
  } catch { return null; }
}
