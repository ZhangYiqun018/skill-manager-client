import buttons from "../styles/_buttons.module.css";
import layout from "../styles/_layout.module.css";
import panels from "../styles/_panels.module.css";

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
    <div className={panels.modalOverlay} role="presentation">
      <div
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className={panels.modalCard}
        role="dialog"
      >
        <div className={panels.panelHeader}>
          <div>
            <h2 className={panels.panelTitle} id="confirm-modal-title">
              {title}
            </h2>
          </div>
        </div>

        <p className={layout.detailsDescription}>{body}</p>

        <div className={buttons.actionRow}>
          <button type="button" className={buttons.secondaryButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={buttons.primaryButton} onClick={onConfirm}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
