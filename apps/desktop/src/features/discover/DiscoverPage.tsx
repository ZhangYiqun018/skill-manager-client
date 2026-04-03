import styles from "../../App.module.css";
import {
  agentLabel,
  copy,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type {
  DiscoveryGroup,
  DiscoveryPreset,
  DiscoveryRecord,
  IndexStatus,
} from "../../types";
import { LibraryDetailsPanel } from "../library/LibraryDetailsPanel";

type DiscoverPageProps = {
  adoptingSkillPaths: string[];
  discoveryGroups: DiscoveryGroup[];
  indexStatus: IndexStatus | null;
  language: Language;
  loading: boolean;
  onAdoptSelected: (paths: string[]) => void;
  onClearSelection: () => void;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  onRefreshIndex: () => void;
  onSelectPreset: (preset: DiscoveryPreset) => void;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
};

const presets: DiscoveryPreset[] = [
  "recommended",
  "project",
  "codex",
  "claude_code",
];

export function DiscoverPage({
  adoptingSkillPaths,
  discoveryGroups,
  indexStatus,
  language,
  loading,
  onAdoptSelected,
  onClearSelection,
  onOpenFolder,
  onOpenSkillFile,
  onRefreshIndex,
  onSelectPreset,
  onSelectSkill,
  onToggleSelection,
  previewContent,
  previewError,
  previewLoading,
  selectedPaths,
  selectedSkill,
}: DiscoverPageProps) {
  const text = copy[language];
  const selectedCount = selectedPaths.length;
  const adopting = adoptingSkillPaths.length > 0;

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.discoverTitle}</p>
          <h1 className={styles.pageTitle}>{text.discoverBody}</h1>
        </div>
      </header>

      <div className={styles.discoverGrid}>
        <article className={styles.discoverCard}>
          <p className={styles.sectionLabel}>{text.scanDiskTitle}</p>
          <h2 className={styles.panelTitle}>{text.scanDiskBody}</h2>
          <div className={styles.readout}>
            <span>{text.lastScanLabel}</span>
            <strong>
              {formatTimestamp(
                indexStatus?.last_refresh_unix_ms,
                language,
                text.neverScanned,
              )}
            </strong>
          </div>
          <button type="button" className={styles.primaryButton} onClick={onRefreshIndex}>
            {loading ? text.refreshingIndex : text.startScan}
          </button>
        </article>

        <article className={styles.discoverCard}>
          <p className={styles.sectionLabel}>{text.importFolderTitle}</p>
          <h2 className={styles.panelTitle}>{text.importFolderBody}</h2>
          <span className={styles.inlineTag}>{text.plannedNext}</span>
        </article>

        <article className={styles.discoverCard}>
          <p className={styles.sectionLabel}>{text.remoteSearchTitle}</p>
          <h2 className={styles.panelTitle}>{text.remoteSearchBody}</h2>
          <span className={styles.inlineTag}>{text.plannedNext}</span>
        </article>
      </div>

      <div className={styles.panelNote}>
        <strong>{text.adoptNoteTitle}</strong>
        <p>{text.adoptNoteBody}</p>

        <div className={styles.selectionToolbar}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.secondaryButton}
              onClick={() => onSelectPreset(preset)}
            >
              {presetLabel(preset, language)}
            </button>
          ))}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClearSelection}
          >
            {text.clearSelection}
          </button>
          <span className={styles.selectionSummary}>
            {selectedCount} {text.selectedCandidatesLabel}
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={selectedCount === 0 || adopting}
            onClick={() => onAdoptSelected(selectedPaths)}
          >
            {adopting ? text.adoptingSkill : `${text.adoptSelected} (${selectedCount})`}
          </button>
        </div>
      </div>

      <div className={styles.splitLayout}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.sectionLabel}>{text.discoveredSkillsTitle}</p>
              <h2 className={styles.panelTitle}>{text.discoveredSkillsBody}</h2>
            </div>
          </div>

          {discoveryGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{text.discoveredSkillsTitle}</strong>
              <p>{text.noDiscoveredSkills}</p>
            </div>
          ) : (
            <div className={styles.discoveryGroupList}>
              {discoveryGroups.map((group) => (
                <article key={group.family_key} className={styles.discoveryGroup}>
                  <div className={styles.discoveryGroupHeader}>
                    <div>
                      <strong>{group.display_name}</strong>
                      <div className={styles.groupMetaRow}>
                        <span className={styles.discoveryStateBadge}>
                          {groupKindLabel(group.kind, language)}
                        </span>
                        {group.duplicate_count > 0 ? (
                          <span className={styles.inlineTag}>
                            {group.duplicate_count} {text.duplicateCountLabel}
                          </span>
                        ) : null}
                        {group.variant_count > 1 ? (
                          <span className={styles.inlineTag}>
                            {group.variant_count} {text.variantCountLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => onAdoptSelected(group.recommended_paths)}
                      disabled={adopting}
                    >
                      {adopting ? text.adoptingSkill : `${text.adoptSkill} (${group.recommended_paths.length})`}
                    </button>
                  </div>

                  <div className={styles.skillList}>
                    {group.items.map((skill) => {
                      const checked = selectedPaths.includes(skill.path);
                      const isSelectedSkill = selectedSkill?.path === skill.path;

                      return (
                        <div
                          key={`discover-${skill.agent}-${skill.scope}-${skill.path}`}
                          className={
                            isSelectedSkill ? styles.selectableSkillRowActive : styles.selectableSkillRow
                          }
                        >
                          <label className={styles.selectionCheckbox}>
                            <input
                              checked={checked}
                              type="checkbox"
                              onChange={() => onToggleSelection(skill.path)}
                            />
                          </label>
                          <button
                            type="button"
                            className={isSelectedSkill ? styles.skillRowActive : styles.skillRow}
                            onClick={() => onSelectSkill(skill.path)}
                          >
                            <div className={styles.skillRowStripe} data-state="warning" />
                            <div className={styles.skillRowContent}>
                              <strong>{skill.display_name}</strong>
                              <p>{skill.path}</p>
                            </div>
                            <div className={styles.skillRowMeta}>
                              <span className={styles.badge}>
                                {scopeLabel(skill.scope, language)}
                              </span>
                              <span className={styles.agentBadge} data-agent={skill.agent}>
                                {agentLabel(skill.agent)}
                              </span>
                              <span className={styles.sourceBadge}>
                                {sourceLabel(skill.source_type, language)}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <LibraryDetailsPanel
          language={language}
          loading={previewLoading}
          onOpenFolder={onOpenFolder}
          onOpenSkillFile={onOpenSkillFile}
          previewContent={previewContent}
          previewError={previewError}
          relatedTargets={[]}
          selectedSkill={
            selectedSkill
              ? {
                  ...selectedSkill,
                  health_state: "warning",
                  warning_count: 0,
                }
              : null
          }
        />
      </div>
    </section>
  );
}

function presetLabel(preset: DiscoveryPreset, language: Language) {
  const text = copy[language];
  if (preset === "recommended") {
    return text.selectingRecommended;
  }
  if (preset === "project") {
    return text.selectingProject;
  }
  if (preset === "codex") {
    return text.selectingCodex;
  }
  return text.selectingClaude;
}

function groupKindLabel(kind: DiscoveryGroup["kind"], language: Language) {
  const text = copy[language];
  if (kind === "exact_duplicate") {
    return text.groupExactDuplicate;
  }
  if (kind === "variant") {
    return text.groupVariant;
  }
  return text.groupUnique;
}

function formatTimestamp(
  value: number | null | undefined,
  language: Language,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
