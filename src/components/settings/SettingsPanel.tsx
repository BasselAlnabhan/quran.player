import { useEffect, useRef } from 'react';
import styles from './SettingsPanel.module.css';

const TEXT_SIZE_MIN = 1.0;
const TEXT_SIZE_MAX = 2.5;
const TEXT_SIZE_STEP = 0.125;

type Props = {
  open: boolean;
  onClose: () => void;
  textSizeRem: number;
  onTextSizeChange: (rem: number) => void;
};

export default function SettingsPanel({
  open,
  onClose,
  textSizeRem,
  onTextSizeChange,
}: Props) {
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

  // Round to 3 decimals then strip trailing zeros via numeric coercion.
  // Always show at least one decimal place so "1rem" becomes "1.0rem".
  function formatTextSize(rem: number): string {
    const trimmed = parseFloat(rem.toFixed(3));
    return `${Number.isInteger(trimmed) ? trimmed.toFixed(1) : trimmed}rem`;
  }

  // Round to 3 decimal places to guard against any accumulated float drift.
  function handleDecrease() {
    if (textSizeRem <= TEXT_SIZE_MIN) return;
    onTextSizeChange(Math.round((textSizeRem - TEXT_SIZE_STEP) * 1000) / 1000);
  }

  function handleIncrease() {
    if (textSizeRem >= TEXT_SIZE_MAX) return;
    onTextSizeChange(Math.round((textSizeRem + TEXT_SIZE_STEP) * 1000) / 1000);
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
        <div className={styles.content}>
          <div className={styles.controlRow}>
            <span className={styles.controlLabel}>Text size</span>
            {/* aria-live so screen readers announce the value change after each tap */}
            <span className={styles.controlValue} aria-live="polite">
              {formatTextSize(textSizeRem)}
            </span>
            <div className={styles.controlButtons}>
              <button
                type="button"
                className={styles.stepButton}
                aria-label="Decrease text size"
                disabled={textSizeRem <= TEXT_SIZE_MIN}
                onClick={handleDecrease}
              >
                &#x2212;
              </button>
              <button
                type="button"
                className={styles.stepButton}
                aria-label="Increase text size"
                disabled={textSizeRem >= TEXT_SIZE_MAX}
                onClick={handleIncrease}
              >
                &#x2B;
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
