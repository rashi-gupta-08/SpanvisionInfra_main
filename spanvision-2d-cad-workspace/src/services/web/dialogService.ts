export interface WebDialogOptions {
  title: string;
  message?: string;
  input?: { label: string; value: string; suffix?: string };
  select?: { label: string; options: { value: string; label: string }[]; value: string };
  actions: { value: string; label: string; primary?: boolean }[];
}

export interface WebDialogRequest extends WebDialogOptions {
  id: number;
  resolve: (value: { action: string; input: string; selection: string } | null) => void;
}

let nextId = 0;
let current: WebDialogRequest | null = null;
const queue: WebDialogRequest[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function subscribeDialog(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getDialog = () => current;

export function requestWebDialog(options: WebDialogOptions) {
  return new Promise<{ action: string; input: string; selection: string } | null>(resolve => {
    const request = { ...options, id: ++nextId, resolve };
    if (current) queue.push(request);
    else { current = request; emit(); }
  });
}

export function finishWebDialog(result: { action: string; input: string; selection: string } | null) {
  const finished = current;
  current = queue.shift() ?? null;
  finished?.resolve(result);
  emit();
}

export function notifyWeb(message: string, error = false) {
  window.dispatchEvent(new CustomEvent('spanvision-notice', { detail: { message, error } }));
}
