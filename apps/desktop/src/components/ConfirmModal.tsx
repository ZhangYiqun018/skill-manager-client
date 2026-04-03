import styles from "../App.module.css";

type ConfirmModalProps = {
  actionLabel: string;
  body: string;
  cancelLabel: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmModal({
  actionLabel,
  body,
  cancelLabel,
  open,
  onCancel,
  onConfirm,
  title,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} role="presentation">
      <div
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className={styles.modalCard}
        role="dialog"
      >
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle} id="confirm-modal-title">
              {title}
            </h2>
          </div>
        </div>

        <p className={styles.detailsDescription}>{body}</p>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onConfirm}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
