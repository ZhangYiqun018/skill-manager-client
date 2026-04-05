import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";
import styles from "../../App.module.css";
import { FilterPill } from "../../components/FilterPill";
import { SearchField } from "../../components/SearchField";
import { useToast } from "../../components/ToastProvider";
import {
  agentLabel,
  copy,
  friendlyErrorMessage,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type {
  AdoptionResolution,
  DiscoveryCandidate,
  DiscoveryGroup,
  DiscoveryPreset,
  DiscoveryRecord,
  DiscoveryReport,
  IndexStatus,
  RegistrySearchResponse,
  RegistrySkillResult,
  SkillComparison,
} from "../../types";
import { SkillPreviewPanel } from "../library/SkillPreviewPanel";

type ResolutionDraft = {
  sourcePath: string;
  candidate: DiscoveryCandidate;
  action: "merge" | "create_variant";
  mergeTargetPath: string | null;
  variantLabel: string;
};

type ResolutionState = {
  group: DiscoveryGroup;
  entries: ResolutionDraft[];
};

type DiscoverPageProps = {
  adoptingSkillPaths: string[];
  discoveryReport: DiscoveryReport;
  filterQuery: string;
  indexStatus: IndexStatus | null;
  language: Language;
  loading: boolean;
  onAdoptSelected: (paths: string[]) => Promise<void>;
  onApplyAdoptionResolutions: (resolutions: AdoptionResolution[]) => Promise<void>;
  onAdoptRegistrySkill: (
    skill: RegistrySkillResult,
    agent: "agent" | "codex" | "claude_code",
    scope: "global" | "project",
  ) => Promise<void>;
  onClearSelection: () => void;
  onCompareSkills: (leftPath: string, rightPath: string) => Promise<SkillComparison>;
  onImportFolder: (
    path: string,
    agent: "agent" | "codex" | "claude_code",
    scope: "global" | "project",
  ) => Promise<void>;
  onFilterQueryChange: (value: string) => void;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  onRefreshIndex: () => void;
  onSearchRegistry: (query: string) => Promise<RegistrySearchResponse>;
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
  "agent",
  "codex",
  "claude_code",
];

export function DiscoverPage({
  adoptingSkillPaths,
  discoveryReport,
  filterQuery,
  indexStatus,
  language,
  loading,
  onAdoptSelected,
  onApplyAdoptionResolutions,
  onAdoptRegistrySkill,
  onClearSelection,
  onCompareSkills,
  onImportFolder,
  onFilterQueryChange,
  onOpenFolder,
  onOpenSkillFile,
  onRefreshIndex,
  onSearchRegistry,
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
  const hasResults = discoveryReport.all_groups.length > 0;
  const [sourceAgent, setSourceAgent] = useState<"agent" | "codex" | "claude_code">("codex");
  const [sourceScope, setSourceScope] = useState<"global" | "project">("global");
  const [registryQuery, setRegistryQuery] = useState("");
  const [registryResults, setRegistryResults] = useState<RegistrySkillResult[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<unknown | null>(null);
  const [registryActionId, setRegistryActionId] = useState<string | null>(null);
  const [importingFolder, setImportingFolder] = useState(false);
  const { showToast } = useToast();
  const [resolutionState, setResolutionState] = useState<ResolutionState | null>(null);
  const [comparison, setComparison] = useState<SkillComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [applyingResolution, setApplyingResolution] = useState(false);

  const selectedGroups = useMemo(
    () =>
      discoveryReport.all_groups.filter((group) =>
        group.candidates.some((candidate) =>
          selectedPaths.includes(candidate.representative.path),
        ),
      ),
    [discoveryReport.all_groups, selectedPaths],
  );

  async function handleChooseFolder() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: text.importFolderTitle,
    });

    if (typeof selected !== "string") {
      return;
    }

    setImportingFolder(true);
    try {
      await onImportFolder(selected, sourceAgent, sourceScope);
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    } finally {
      setImportingFolder(false);
    }
  }

  async function handleSearchRegistry() {
    const query = registryQuery.trim();
    if (!query) {
      setRegistryResults([]);
      setRegistryError(null);
      return;
    }

    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const result = await onSearchRegistry(query);
      setRegistryResults(result.skills);
    } catch (error) {
      setRegistryError(error);
    } finally {
      setRegistryLoading(false);
    }
  }

  async function handleAdoptRegistrySkill(skill: RegistrySkillResult) {
    setRegistryActionId(skill.id);
    try {
      await onAdoptRegistrySkill(skill, sourceAgent, sourceScope);
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    } finally {
      setRegistryActionId(null);
    }
  }

  function needsResolution(group: DiscoveryGroup) {
    return group.kind === "variant" || group.existing_variants.length > 0;
  }

  function openResolution(group: DiscoveryGroup, paths: string[]) {
    const chosenCandidates = group.candidates.filter((candidate) =>
      paths.includes(candidate.representative.path),
    );
    const candidates = chosenCandidates.length > 0 ? chosenCandidates : group.candidates;

    const entries = candidates.map((candidate) => {
      const exactManaged = group.existing_variants.find(
        (variant) => variant.content_hash === candidate.content_hash,
      );

      return {
        sourcePath: candidate.representative.path,
        candidate,
        action: exactManaged ? "merge" : "create_variant",
        mergeTargetPath:
          exactManaged?.path ??
          group.existing_variants[0]?.path ??
          null,
        variantLabel:
          candidate.representative.variant_label ??
          candidate.suggested_version_label,
      } satisfies ResolutionDraft;
    });

    setResolutionState({ group, entries });
    setComparison(null);
    setComparisonError(null);
  }

  async function handleTopLevelAdopt() {
    if (selectedCount === 0) {
      return;
    }

    if (
      selectedGroups.length === 1 &&
      needsResolution(selectedGroups[0])
    ) {
      openResolution(selectedGroups[0], selectedPaths);
      return;
    }

    try {
      await onAdoptSelected(selectedPaths);
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    }
  }

  async function handleCompareCandidate(sourcePath: string, compareTargetPath: string | null) {
    if (!compareTargetPath) {
      setComparison(null);
      setComparisonError(text.compareEmptyBody);
      return;
    }

    setComparisonLoading(true);
    setComparisonError(null);

    try {
      const nextComparison = await onCompareSkills(sourcePath, compareTargetPath);
      setComparison(nextComparison);
    } catch (error: unknown) {
      setComparisonError(friendlyErrorMessage(error, language));
    } finally {
      setComparisonLoading(false);
    }
  }

  async function handleApplyResolution() {
    if (!resolutionState) {
      return;
    }

    setApplyingResolution(true);
    try {
      await onApplyAdoptionResolutions(
        resolutionState.entries.map((entry) => ({
          source_path: entry.sourcePath,
          action: entry.action,
          merge_target_path:
            entry.action === "merge" ? entry.mergeTargetPath : null,
          variant_label:
            entry.action === "create_variant" ? entry.variantLabel : null,
        })),
      );
      setResolutionState(null);
      setComparison(null);
      setComparisonError(null);
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    } finally {
      setApplyingResolution(false);
    }
  }

  const toolbarNeedsResolution =
    selectedGroups.length === 1 && needsResolution(selectedGroups[0]);
  const toolbarActionLabel =
    selectedCount === 0
      ? text.adoptSelected
      : toolbarNeedsResolution
        ? `${text.resolveVariants} (${selectedCount})`
        : `${text.adoptSelected} (${selectedCount})`;

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.discoverTitle}</p>
          <h1 className={styles.pageTitle}>{text.discoverBody}</h1>
        </div>
      </header>

      <section className={styles.intakeBar}>
        <div className={styles.intakeHeader}>
          <div>
            <p className={styles.sectionLabel}>{text.scanDiskTitle}</p>
            <p className={styles.helperText}>{text.scanDiskBody}</p>
          </div>
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
        </div>

        <SourceConfig
          agent={sourceAgent}
          language={language}
          onAgentChange={setSourceAgent}
          onScopeChange={setSourceScope}
          scope={sourceScope}
        />

        <div className={styles.intakeActions}>
          <button type="button" className={styles.primaryButton} onClick={onRefreshIndex}>
            {loading ? text.refreshingIndex : text.startScan}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void handleChooseFolder()}
          >
            {importingFolder ? text.importingFolder : text.chooseFolder}
          </button>
          <div className={styles.remoteSearchRow}>
            <input
              className={styles.searchField}
              onChange={(event) => setRegistryQuery(event.target.value)}
              placeholder={text.remoteSearchPlaceholder}
              value={registryQuery}
            />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleSearchRegistry()}
            >
              {registryLoading ? text.remoteSearchLoading : text.remoteSearchAction}
            </button>
          </div>
        </div>

        {registryError ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon}>📡</span>
            <strong>{text.offlineModeTitle}</strong>
            <p>{text.offlineModeBody}</p>
            <p style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--sm-text-secondary)" }}>
              {friendlyErrorMessage(registryError, language)}
            </p>
          </div>
        ) : registryResults.length > 0 ? (
          <div className={styles.registryList}>
            {registryResults.map((skill) => (
              <article key={skill.id} className={styles.registryResultCard}>
                <div className={styles.discoveryGroupHeader}>
                  <div>
                    <strong>{skill.name}</strong>
                    <p className={styles.helperText}>{skill.source}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={registryActionId === skill.id}
                    onClick={() => void handleAdoptRegistrySkill(skill)}
                  >
                    {registryActionId === skill.id
                      ? text.adoptingSkill
                      : text.remoteAdoptAction}
                  </button>
                </div>
                <div className={styles.groupMetaRow}>
                  <span className={styles.inlineTag}>{skill.id}</span>
                  <span className={styles.inlineTag}>
                    {skill.installs.toLocaleString()} {text.remoteInstallsLabel}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : registryQuery.trim() && !registryLoading ? (
          <div className={styles.emptyPanel}>{text.remoteNoResults}</div>
        ) : null}
      </section>

      <div className={styles.splitLayout}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.sectionLabel}>{text.discoveredSkillsTitle}</p>
              <h2 className={styles.panelTitle}>{text.discoveredSkillsBody}</h2>
            </div>
          </div>

          <div className={styles.sectionStack}>
            <SearchField
              ariaLabel={text.searchLabel}
              onChange={onFilterQueryChange}
              placeholder={text.searchPlaceholder}
              value={filterQuery}
            />

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
                {discoveryReport.summary.family_count} {text.summaryFamiliesLabel}
                {" · "}
                {discoveryReport.summary.variant_family_count} {text.summaryNeedsReviewLabel}
                {" · "}
                {selectedCount} {text.selectedCandidatesLabel}
              </span>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={selectedCount === 0 || adopting}
                onClick={() => void handleTopLevelAdopt()}
              >
                {adopting ? text.adoptingSkill : toolbarActionLabel}
              </button>
            </div>
          </div>

          {!hasResults ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon}>🔍</span>
              <strong>{text.emptyDiscoverTitle}</strong>
              <p>{text.emptyDiscoverBody}</p>
            </div>
          ) : (
            <div className={styles.sectionStack}>
              <DiscoverySection
                adoptingPaths={adoptingSkillPaths}
                groups={discoveryReport.variant_groups}
                intro={text.variantSectionBody}
                language={language}
                onSelectSkill={onSelectSkill}
                onToggleSelection={onToggleSelection}
                selectedPaths={selectedPaths}
                selectedSkill={selectedSkill}
                title={text.variantSectionTitle}
              />

              <DiscoverySection
                adoptingPaths={adoptingSkillPaths}
                groups={discoveryReport.exact_duplicate_groups}
                intro={text.exactDuplicateSectionBody}
                language={language}
                onSelectSkill={onSelectSkill}
                onToggleSelection={onToggleSelection}
                selectedPaths={selectedPaths}
                selectedSkill={selectedSkill}
                title={text.exactDuplicateSectionTitle}
              />

              <DiscoverySection
                adoptingPaths={adoptingSkillPaths}
                groups={discoveryReport.unique_groups}
                intro={text.uniqueSectionBody}
                language={language}
                onSelectSkill={onSelectSkill}
                onToggleSelection={onToggleSelection}
                selectedPaths={selectedPaths}
                selectedSkill={selectedSkill}
                title={text.uniqueSectionTitle}
              />
            </div>
          )}
        </section>

        <SkillPreviewPanel
          language={language}
          loading={previewLoading}
          onOpenFolder={onOpenFolder}
          onOpenSkillFile={onOpenSkillFile}
          previewContent={previewContent}
          previewError={previewError}
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

      {resolutionState ? (
        <ResolutionModal
          applying={applyingResolution}
          comparison={comparison}
          comparisonError={comparisonError}
          comparisonLoading={comparisonLoading}
          entries={resolutionState.entries}
          group={resolutionState.group}
          language={language}
          onApply={() => void handleApplyResolution()}
          onChangeAction={(sourcePath, action) => {
            setResolutionState((current) =>
              current
                ? {
                    ...current,
                    entries: current.entries.map((entry) =>
                      entry.sourcePath === sourcePath
                        ? { ...entry, action }
                        : entry,
                    ),
                  }
                : current,
            );
          }}
          onChangeMergeTarget={(sourcePath, mergeTargetPath) => {
            setResolutionState((current) =>
              current
                ? {
                    ...current,
                    entries: current.entries.map((entry) =>
                      entry.sourcePath === sourcePath
                        ? { ...entry, mergeTargetPath }
                        : entry,
                    ),
                  }
                : current,
            );
          }}
          onChangeVariantLabel={(sourcePath, variantLabel) => {
            setResolutionState((current) =>
              current
                ? {
                    ...current,
                    entries: current.entries.map((entry) =>
                      entry.sourcePath === sourcePath
                        ? { ...entry, variantLabel }
                        : entry,
                    ),
                  }
                : current,
            );
          }}
          onClose={() => {
            setResolutionState(null);
            setComparison(null);
            setComparisonError(null);
          }}
          onCompare={(sourcePath, compareTargetPath) =>
            void handleCompareCandidate(sourcePath, compareTargetPath)
          }
        />
      ) : null}
    </section>
  );
}

type SourceConfigProps = {
  agent: "agent" | "codex" | "claude_code";
  language: Language;
  onAgentChange: (value: "agent" | "codex" | "claude_code") => void;
  onScopeChange: (value: "global" | "project") => void;
  scope: "global" | "project";
};

function SourceConfig({
  agent,
  language,
  onAgentChange,
  onScopeChange,
  scope,
}: SourceConfigProps) {
  const text = copy[language];

  return (
    <div className={styles.sectionStack}>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionLabel}>{text.sourceAgentLabel}</p>
        <div className={styles.pillGroup}>
          <FilterPill
            active={agent === "codex"}
            label={agentLabel("codex")}
            onClick={() => onAgentChange("codex")}
          />
          <FilterPill
            active={agent === "claude_code"}
            label={agentLabel("claude_code")}
            onClick={() => onAgentChange("claude_code")}
          />
          <FilterPill
            active={agent === "agent"}
            label={agentLabel("agent")}
            onClick={() => onAgentChange("agent")}
          />
        </div>
      </div>

      <div className={styles.sectionIntro}>
        <p className={styles.sectionLabel}>{text.sourceScopeLabel}</p>
        <div className={styles.pillGroup}>
          <FilterPill
            active={scope === "global"}
            label={scopeLabel("global", language)}
            onClick={() => onScopeChange("global")}
          />
          <FilterPill
            active={scope === "project"}
            label={scopeLabel("project", language)}
            onClick={() => onScopeChange("project")}
          />
        </div>
      </div>
    </div>
  );
}

type DiscoverySectionProps = {
  adoptingPaths: string[];
  groups: DiscoveryGroup[];
  intro: string;
  language: Language;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
  title: string;
};

function DiscoverySection({
  adoptingPaths,
  groups,
  intro,
  language,
  onSelectSkill,
  onToggleSelection,
  selectedPaths,
  selectedSkill,
  title,
}: DiscoverySectionProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className={styles.sectionBlock}>
      <div className={styles.sectionIntro}>
        <p className={styles.sectionLabel}>{title}</p>
        <p className={styles.helperText}>{intro}</p>
      </div>

      <div className={styles.discoveryGroupList}>
        {groups.map((group) => {
          const groupBusy = group.recommended_paths.some((path) =>
            adoptingPaths.includes(path),
          );

          return (
            <article key={group.family_key} className={styles.discoveryGroup}>
              <div className={styles.discoveryGroupHeader}>
                <div>
                  <strong>{group.display_name}</strong>
                  <div className={styles.groupMetaRow}>
                    <span className={styles.discoveryStateBadge}>
                      {groupKindLabel(group.kind, language)}
                    </span>
                    <span className={styles.inlineTag}>
                      {group.occurrence_count} {copy[language].summaryOccurrencesLabel}
                    </span>
                    <span className={styles.inlineTag}>
                      {group.candidates.length} {copy[language].representativeCountLabel}
                    </span>
                    {group.existing_variants.length > 0 ? (
                      <span className={styles.inlineTag}>
                        {group.existing_variants.length} {copy[language].variantCountLabel}
                      </span>
                    ) : null}
                    {group.review_state === "needs_review" ? (
                      <span className={styles.inlineTag}>
                        {copy[language].reviewNeededLabel}
                      </span>
                    ) : null}
                    {groupBusy ? (
                      <span className={styles.inlineTag}>
                        {copy[language].adoptingSkill}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {group.existing_variants.length > 0 ? (
                <div className={styles.candidateMetaRow}>
                  {group.existing_variants.map((variant) => (
                    <span key={variant.path} className={styles.inlineTag}>
                      {variant.variant_label?.trim() || variant.display_name}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className={styles.skillList}>
                {group.candidates.map((candidate) => (
                  <DiscoveryCandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    language={language}
                    onSelectSkill={onSelectSkill}
                    onToggleSelection={onToggleSelection}
                    selectedPaths={selectedPaths}
                    selectedSkill={selectedSkill}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type DiscoveryCandidateRowProps = {
  candidate: DiscoveryCandidate;
  language: Language;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
};

function DiscoveryCandidateRow({
  candidate,
  language,
  onSelectSkill,
  onToggleSelection,
  selectedPaths,
  selectedSkill,
}: DiscoveryCandidateRowProps) {
  const text = copy[language];
  const skill = candidate.representative;
  const checked = selectedPaths.includes(skill.path);
  const isSelectedSkill = selectedSkill?.path === skill.path;

  return (
    <div
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
          <div className={styles.candidateMetaRow}>
            <span className={styles.inlineTag}>
              {text.suggestedVersionLabel}: {candidate.suggested_version_label}
            </span>
            <span className={styles.inlineTag}>
              {candidate.occurrence_count} {text.summaryOccurrencesLabel}
            </span>
            <span className={styles.inlineTag}>{candidate.content_hash.slice(0, 8)}</span>
          </div>
        </div>
        <div className={styles.skillRowMeta}>
          <span className={styles.badge}>{scopeLabel(skill.scope, language)}</span>
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
}

type ResolutionModalProps = {
  applying: boolean;
  comparison: SkillComparison | null;
  comparisonError: string | null;
  comparisonLoading: boolean;
  entries: ResolutionDraft[];
  group: DiscoveryGroup;
  language: Language;
  onApply: () => void;
  onChangeAction: (sourcePath: string, action: "merge" | "create_variant") => void;
  onChangeMergeTarget: (sourcePath: string, mergeTargetPath: string | null) => void;
  onChangeVariantLabel: (sourcePath: string, variantLabel: string) => void;
  onClose: () => void;
  onCompare: (sourcePath: string, compareTargetPath: string | null) => void;
};

function ResolutionModal({
  applying,
  comparison,
  comparisonError,
  comparisonLoading,
  entries,
  group,
  language,
  onApply,
  onChangeAction,
  onChangeMergeTarget,
  onChangeVariantLabel,
  onClose,
  onCompare,
}: ResolutionModalProps) {
  const text = copy[language];

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section className={styles.resolutionModal} role="dialog" aria-modal="true">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.sectionLabel}>{text.resolutionTitle}</p>
            <h2 className={styles.panelTitle}>{group.display_name}</h2>
            <p className={styles.helperText}>{text.resolutionBody}</p>
          </div>
          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              {text.closeResolution}
            </button>
            <button type="button" className={styles.primaryButton} onClick={onApply}>
              {applying ? text.adoptingSkill : text.applyResolutionAction}
            </button>
          </div>
        </div>

        <div className={styles.resolutionGrid}>
          <section className={styles.resolutionPanel}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>{text.selectedCandidatesTitle}</p>
            </div>
            <div className={styles.resolutionEntryList}>
              {entries.map((entry) => {
                const exactMatch = group.existing_variants.find(
                  (variant) => variant.content_hash === entry.candidate.content_hash,
                );

                return (
                  <article key={entry.sourcePath} className={styles.resolutionEntry}>
                    <div className={styles.discoveryGroupHeader}>
                      <div>
                        <strong>{entry.candidate.representative.display_name}</strong>
                        <div className={styles.groupMetaRow}>
                          <span className={styles.inlineTag}>
                            {entry.candidate.content_hash.slice(0, 8)}
                          </span>
                          <span className={styles.inlineTag}>
                            {entry.candidate.suggested_version_label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.resolutionChoiceRow}>
                      {exactMatch ? (
                        <button
                          type="button"
                          className={
                            entry.action === "merge"
                              ? styles.filterPillActive
                              : styles.filterPill
                          }
                          onClick={() => onChangeAction(entry.sourcePath, "merge")}
                        >
                          {text.mergeExactAction}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={
                          entry.action === "create_variant"
                            ? styles.filterPillActive
                            : styles.filterPill
                        }
                        onClick={() => onChangeAction(entry.sourcePath, "create_variant")}
                      >
                        {text.createVariantAction}
                      </button>
                    </div>

                    {entry.action === "merge" ? (
                      <div className={styles.resolutionBody}>
                        <span>{text.existingVariantsTitle}</span>
                        <select
                          className={styles.searchField}
                          value={entry.mergeTargetPath ?? ""}
                          onChange={(event) =>
                            onChangeMergeTarget(
                              entry.sourcePath,
                              event.target.value || null,
                            )
                          }
                        >
                          {group.existing_variants.map((variant) => (
                            <option key={variant.path} value={variant.path}>
                              {variant.variant_label?.trim() || variant.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className={styles.resolutionBody}>
                        <span>{text.variantLabelTitle}</span>
                        <input
                          className={styles.searchField}
                          value={entry.variantLabel}
                          onChange={(event) =>
                            onChangeVariantLabel(entry.sourcePath, event.target.value)
                          }
                        />
                      </div>
                    )}

                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          onCompare(
                            entry.sourcePath,
                            entry.mergeTargetPath ?? group.existing_variants[0]?.path ?? null,
                          )
                        }
                        disabled={group.existing_variants.length === 0}
                      >
                        {text.compareAction}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.resolutionPanel}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>{text.existingVariantsTitle}</p>
              <p className={styles.helperText}>
                {group.existing_variants.length > 0
                  ? `${group.existing_variants.length} ${text.variantCountLabel}`
                  : text.originsEmptyBody}
              </p>
            </div>
            <div className={styles.variantFamilyList}>
              {group.existing_variants.length > 0 ? (
                group.existing_variants.map((variant) => (
                  <div key={variant.path} className={styles.variantFamilyButton}>
                    <strong>{variant.variant_label?.trim() || variant.display_name}</strong>
                    <span>{variant.content_hash.slice(0, 8)}</span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyPanel}>{text.compareEmptyBody}</div>
              )}
            </div>
          </section>
        </div>

        <section className={styles.comparisonPanel}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionLabel}>{text.comparisonTitle}</p>
          </div>
          {comparisonLoading ? (
            <div className={styles.emptyPanel}>{text.loadingPreview}</div>
          ) : comparisonError ? (
            <div className={styles.emptyPanel}>{comparisonError}</div>
          ) : comparison ? (
            <div className={styles.comparisonGrid}>
              <article className={styles.comparisonCard}>
                <div className={styles.badgeRow}>
                  <span className={styles.agentBadge} data-agent={comparison.left.agent}>
                    {agentLabel(comparison.left.agent)}
                  </span>
                  <span className={styles.badge}>
                    {comparison.left.variant_label?.trim() || comparison.left.display_name}
                  </span>
                </div>
                <pre className={styles.previewContent}>{comparison.left_content}</pre>
              </article>
              <article className={styles.comparisonCard}>
                <div className={styles.badgeRow}>
                  <span className={styles.agentBadge} data-agent={comparison.right.agent}>
                    {agentLabel(comparison.right.agent)}
                  </span>
                  <span className={styles.badge}>
                    {comparison.right.variant_label?.trim() || comparison.right.display_name}
                  </span>
                </div>
                <pre className={styles.previewContent}>{comparison.right_content}</pre>
              </article>
              <article className={styles.comparisonMetaCard}>
                <strong>{text.commonFilesLabel}</strong>
                <div className={styles.scopeList}>
                  {comparison.common_files.map((file) => (
                    <span key={`common-${file}`} className={styles.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
              <article className={styles.comparisonMetaCard}>
                <strong>{text.leftOnlyFilesLabel}</strong>
                <div className={styles.scopeList}>
                  {comparison.left_only_files.map((file) => (
                    <span key={`left-${file}`} className={styles.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
              <article className={styles.comparisonMetaCard}>
                <strong>{text.rightOnlyFilesLabel}</strong>
                <div className={styles.scopeList}>
                  {comparison.right_only_files.map((file) => (
                    <span key={`right-${file}`} className={styles.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <div className={styles.emptyPanel}>{text.compareEmptyBody}</div>
          )}
        </section>
      </section>
    </div>
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
