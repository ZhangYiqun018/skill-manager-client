import styles from "../../App.module.css";
import {
  agentLabel,
  copy,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type { SkillItem } from "../../types";

type SkillPreviewPanelProps = {
  language: Language;
  loading: boolean;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  previewContent?: string;
  previewError?: string | null;
  selectedSkill: SkillItem | null;
};

export function SkillPreviewPanel({
  language,
  loading,
  onOpenFolder,
  onOpenSkillFile,
  previewContent,
  previewError,
  selectedSkill,
}: SkillPreviewPanelProps) {
  const text = copy[language];

  if (!selectedSkill) {
    return (
      <aside className={styles.detailsPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.sectionLabel}>{text.detailsTitle}</p>
            <h2 className={styles.panelTitle}>{text.detailsEmptyTitle}</h2>
          </div>
        </div>
        <div className={styles.emptyPanel}>{text.detailsEmptyBody}</div>
      </aside>
    );
  }

  return (
    <aside className={styles.detailsPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.detailsTitle}</p>
          <h2 className={styles.panelTitle}>{selectedSkill.display_name}</h2>
        </div>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>{scopeLabel(selectedSkill.scope, language)}</span>
          <span className={styles.agentBadge} data-agent={selectedSkill.agent}>
            {agentLabel(selectedSkill.agent)}
          </span>
          <span className={styles.sourceBadge}>
            {sourceLabel(selectedSkill.source_type, language)}
          </span>
        </div>
      </div>

      <p className={styles.detailsDescription}>
        {selectedSkill.description ?? text.descriptionFallback}
      </p>

      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={onOpenFolder}>
          {text.openFolder}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onOpenSkillFile}>
          {text.openSkillFile}
        </button>
      </div>

      <section className={styles.metaSection}>
        <p className={styles.sectionLabel}>{text.metadataLabel}</p>
        <div className={styles.metaGrid}>
          <div>
            <span>{text.userInvocable}</span>
            <strong>{selectedSkill.metadata.user_invocable ? text.yesLabel : text.noLabel}</strong>
          </div>
          <div>
            <span>{text.installPath}</span>
            <strong>{selectedSkill.path}</strong>
          </div>
          <div>
            <span>{text.skillFile}</span>
            <strong>{selectedSkill.skill_md}</strong>
          </div>
          <div>
            <span>{text.sourceRoot}</span>
            <strong>{selectedSkill.source_root}</strong>
          </div>
        </div>
      </section>

      <section className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <p className={styles.sectionLabel}>{text.previewLabel}</p>
        </div>
        <div className={styles.previewFrame}>
          {loading ? (
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
    </aside>
  );
}
