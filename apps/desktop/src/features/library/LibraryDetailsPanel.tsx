import styles from "../../App.module.css";
import {
  agentLabel,
  copy,
  healthLabel,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type { InstallTargetRecord, SkillItem } from "../../types";

type LibraryDetailsPanelProps = {
  language: Language;
  loading: boolean;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  previewContent?: string;
  previewError?: string | null;
  relatedTargets: InstallTargetRecord[];
  selectedSkill: SkillItem | null;
};

export function LibraryDetailsPanel({
  language,
  loading,
  onOpenFolder,
  onOpenSkillFile,
  previewContent,
  previewError,
  relatedTargets,
  selectedSkill,
}: LibraryDetailsPanelProps) {
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
            <strong>{selectedSkill.metadata.user_invocable ? "Yes" : "No"}</strong>
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
          {selectedSkill.project_root ? (
            <div>
              <span>{text.projectRootLabel}</span>
              <strong>{selectedSkill.project_root}</strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.metaSection}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.sectionLabel}>{text.installTargetsTitle}</p>
          </div>
        </div>
        {relatedTargets.length === 0 ? (
          <div className={styles.emptyPanel}>{text.noTargetsBody}</div>
        ) : (
          <div className={styles.targetList}>
            {relatedTargets.map((target) => (
              <div key={target.id} className={styles.targetRow}>
                <div>
                  <strong>{target.path}</strong>
                  <p>
                    {agentLabel(target.agent)} · {scopeLabel(target.scope, language)}
                  </p>
                </div>
                <span
                  className={
                    target.health_state === "healthy"
                      ? styles.statusHealthy
                      : target.health_state === "warning"
                        ? styles.statusWarning
                        : styles.statusMissing
                  }
                >
                  {healthLabel(target.health_state, language)}
                </span>
              </div>
            ))}
          </div>
        )}
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
