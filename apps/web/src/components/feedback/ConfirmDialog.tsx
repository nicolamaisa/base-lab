import { useEffect, useId, useRef } from "react";

import { AlertTriangle, X } from "lucide-react";

import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;

  title: string;
  description: string;

  confirmLabel?: string;
  cancelLabel?: string;

  busy?: boolean;

  error?: string | null;

  tone?: "danger" | "primary";

  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,

  title,
  description,

  confirmLabel = "Confirm",
  cancelLabel = "Cancel",

  busy = false,

  error = null,

  tone = "danger",

  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();

  const descriptionId = useId();

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="confirmDialogBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        className="confirmDialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="confirmDialogHeader">
          <span className={`confirmDialogIcon confirmDialogIcon-${tone}`}>
            <AlertTriangle size={21} aria-hidden />
          </span>

          <div>
            <h2 id={titleId}>{title}</h2>

            <p id={descriptionId}>{description}</p>
          </div>

          <button
            type="button"
            className="confirmDialogClose"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {error ? (
          <div className="formError confirmDialogError" role="alert">
            {error}
          </div>
        ) : null}

        <footer className="confirmDialogActions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="secondaryButton"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={
              tone === "danger" ? "confirmDialogDangerButton" : "primaryButton"
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
