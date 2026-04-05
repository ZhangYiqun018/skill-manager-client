import badges from "../../styles/_badges.module.css";
import buttons from "../../styles/_buttons.module.css";
import layout from "../../styles/_layout.module.css";
import panels from "../../styles/_panels.module.css";
import { agentLabel, copy, scopeLabel, sourceLabel, type Language } from "../../i18n";
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
      <aside className={panels.detailsPanel}>
        <div className={panels.panelHeader}>
          <div>
            <p className={layout.sectionLabel}>{text.detailsTitle}</p>
            <h2 className={panels.panelTitle}>{text.detailsEmptyTitle}</h2>
          </div>
        </div>
        <div className={panels.emptyPanel}>{text.detailsEmptyBody}</div>
      </aside>
    );
  }

  return (
    <aside className={panels.detailsPanel}>
      <div className={panels.panelHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.detailsTitle}</p>
          <h2 className={panels.panelTitle}>{selectedSkill.display_name}</h2>
        </div>
        <div className={badges.badgeRow}>
          <span className={badges.badge}>{scopeLabel(selectedSkill.scope, language)}</span>
          <span className={badges.agentBadge} data-agent={selectedSkill.agent}>
            {agentLabel(selectedSkill.agent)}
          </span>
          <span className={badges.sourceBadge}>
            {sourceLabel(selectedSkill.source_type, language)}
          </span>
        </div>
      </div>

      <p className={layout.detailsDescription}>
        {selectedSkill.description ?? text.descriptionFallback}
      </p>

      <div className={buttons.actionRow}>
        <button type="button" className={buttons.secondaryButton} onClick={onOpenFolder}>
          {text.openFolder}
        </button>
        <button type="button" className={buttons.secondaryButton} onClick={onOpenSkillFile}>
          {text.openSkillFile}
        </button>
      </div>

      <section className={panels.metaSection}>
        <p className={layout.sectionLabel}>{text.metadataLabel}</p>
        <div className={layout.metaGrid}>
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

      <section className={panels.previewSection}>
        <div className={panels.previewHeader}>
          <p className={layout.sectionLabel}>{text.previewLabel}</p>
        </div>
        <div className={panels.previewFrame}>
          {loading ? (
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
    </aside>
  );
}
