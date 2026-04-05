import layout from "../../../styles/_layout.module.css";
import panels from "../../../styles/_panels.module.css";
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
    <section className={panels.previewSection}>
      <div className={panels.previewHeader}>
        <p className={layout.sectionLabel}>{text.previewLabel}</p>
      </div>
      <div className={panels.previewFrame}>
        {previewLoading ? (
          <p className={panels.previewState}>{text.loadingPreview}</p>
        ) : previewError ? (
          <p className={panels.previewState}>{previewError}</p>
        ) : previewContent ? (
          <pre className={panels.previewContent}>{previewContent}</pre>
        ) : (
          <p className={panels.previewState}>{text.previewUnavailable}</p>
        )}
      </div>
    </section>
  );
}
