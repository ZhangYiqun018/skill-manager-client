import styles from "../../../App.module.css";
import { copy, type Language } from "../../../i18n";

type ContentTabProps = {
  language: Language;
  previewLoading: boolean;
  previewError?: string | null;
  previewContent?: string;
};

export function ContentTab({
  language,
  previewLoading,
  previewError,
  previewContent,
}: ContentTabProps) {
  const text = copy[language];

  return (
    <section className={styles.previewSection}>
      <div className={styles.previewHeader}>
        <p className={styles.sectionLabel}>{text.previewLabel}</p>
      </div>
      <div className={styles.previewFrame}>
        {previewLoading ? (
          <p className={styles.previewState}>{text.loadingPreview}</p>
        ) : previewError ? (
          <p className={styles.previewState}>{previewError}</p>
        ) : previewContent ? (
          <pre className={styles.previewContent}>{previewContent}</pre>
        ) : (
          <p className={styles.previewState}>{text.previewUnavailable}</p>
        )}
      </div>
    </section>
  );
}
