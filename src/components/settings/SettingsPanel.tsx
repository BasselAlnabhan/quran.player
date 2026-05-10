import { useEffect, useRef } from 'react';
import styles from './SettingsPanel.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export default function SettingsPanel({ open, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key — native <dialog> Escape handling only fires when
  // showModal() is used; we handle it manually because we use the open attribute.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Move focus to the close button when the panel opens so keyboard users
  // can dismiss immediately or Tab into panel content.
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  // Clicking directly on the dialog element (the backdrop area outside the
  // inner panel) closes. Clicks on .panel children bubble up but have a
  // different e.target, so they don't trigger this.
  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      open={open}
      onClick={handleDialogClick}
      className={styles.dialog}
      aria-labelledby="settings-title"
      aria-modal="true"
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id="settings-title" className={styles.title}>Settings</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            aria-label="Close settings"
            onClick={onClose}
          >
            &#x2715;
          </button>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </dialog>
  );
}
