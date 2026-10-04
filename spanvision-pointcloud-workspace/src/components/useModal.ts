import { useEffect, useRef, type RefObject } from 'react';

/** Native top-layer dialog plus keyboard containment and explicit focus restoration. */
export function useModal(ref: RefObject<HTMLDialogElement | null>, onClose: () => void, enabled = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!enabled || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const cancel = (event: Event) => { event.preventDefault(); closeRef.current(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(item => item.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', keydown);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('keydown', keydown);
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, enabled]);
}
