import { useEffect, useRef, useCallback, useId, type ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  height?: number | string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({
  open,
  onClose,
  title,
  width = 480,
  height,
  className,
  children,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".modal-close-btn")) return;
    isDragging.current = true;
    const rect = dialogRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const siblings = Array.from(dialog.parentElement?.parentElement?.children || [])
      .filter(element => element !== dialog.parentElement) as HTMLElement[];
    const inertStates = siblings.map(element => element.inert);
    siblings.forEach(element => { element.inert = true; });
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
    )).filter(element => element.getClientRects().length > 0);
    (focusable()[0] || dialog).focus();
    const trap = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll(".modal-dialog");
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCloseRef.current(); }
      if (event.key !== "Tab") return;
      const items = focusable(); const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap, true);
    return () => {
      document.removeEventListener("keydown", trap, true);
      siblings.forEach((element, index) => { element.inert = inertStates[index]; });
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !dialogRef.current || !overlayRef.current) return;
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const dialogRect = dialogRef.current.getBoundingClientRect();
      let newX = e.clientX - overlayRect.left - dragOffset.current.x;
      let newY = e.clientY - overlayRect.top - dragOffset.current.y;
      newX = Math.max(0, Math.min(newX, overlayRect.width - dialogRect.width));
      newY = Math.max(0, Math.min(newY, overlayRect.height - dialogRect.height));
      dialogRef.current.style.left = newX + "px";
      dialogRef.current.style.top = newY + "px";
      dialogRef.current.style.transform = "none";
      dialogRef.current.style.position = "absolute";
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [open, onClose]);

  // Reset position when reopened
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.style.left = "50%";
      dialogRef.current.style.top = "50%";
      dialogRef.current.style.transform = "translate(-50%, -50%)";
      dialogRef.current.style.position = "absolute";
    }
  }, [open]);

  if (!open) return null;

  const style: React.CSSProperties = { width };
  if (height) style.height = height;

  return (
    <div className="modal-overlay" ref={overlayRef}>
      <div
        className={`modal-dialog${className ? ` ${className}` : ""}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={style}
      >
        <div className="modal-header" onMouseDown={handleHeaderMouseDown}>
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
