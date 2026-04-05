import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";
import buttons from "../../styles/_buttons.module.css";
import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import panels from "../../styles/_panels.module.css";
import { EmptyState } from "../../components/EmptyState";
import { SearchField } from "../../components/SearchField";
import { useToast } from "../../components/ToastProvider";
import { agentLabel, copy, friendlyErrorMessage, type Language } from "../../i18n";
import type {
  AdoptionResolution,
  AgentKind,
  DiscoveryGroup,
  DiscoveryRecord,
  DiscoveryReport,
  IndexedScanSummary,
  IndexStatus,
  SkillComparison,
  SkillScope,
} from "../../types";
import { Tooltip } from "../../components/Tooltip";
import { SkillPreviewPanel } from "../library/SkillPreviewPanel";
import { DiscoveryGroupList } from "./DiscoverySection";
import { RegistryBrowser } from "./RegistryBrowser";
import { ResolutionModal } from "./ResolutionModal";
import { filterGroupsByAgentAndScope, sortGroupsByPriority } from "./report";
import type { ResolutionDraft, ResolutionState } from "./types";
import { formatTimestamp, groupNeedsResolution } from "./utils";

type DiscoverTab = "marketplace" | "local";

type DiscoverPageProps = {
  adoptingSkillPaths: string[];
  discoveryReport: DiscoveryReport;
  filterQuery: string;
  indexStatus: IndexStatus | null;
  language: Language;
  loading: boolean;
  onAdoptSelected: (paths: string[]) => Promise<void>;
  onApplyAdoptionResolutions: (resolutions: AdoptionResolution[]) => Promise<void>;
  onClearSelection: () => void;
  onCompareSkills: (leftPath: string, rightPath: string) => Promise<SkillComparison>;
  onImportFolder: (path: string, agent: AgentKind, scope: "global" | "project") => Promise<void>;
  onFilterQueryChange: (value: string) => void;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  onRefreshIndex: () => void;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  onSnapshotUpdate: (result: IndexedScanSummary) => void | Promise<void>;
  onAdoptedAndInstall: (skillName: string) => void;
  onAdoptedLater: () => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
};

export function DiscoverPage({
  adoptingSkillPaths,
  discoveryReport,
  filterQuery,
  indexStatus,
  language,
  loading,
  onAdoptSelected,
  onApplyAdoptionResolutions,
  onClearSelection,
  onCompareSkills,
  onImportFolder,
  onFilterQueryChange,
  onOpenFolder,
  onOpenSkillFile,
  onRefreshIndex,
  onSelectSkill,
  onToggleSelection,
  onSnapshotUpdate,
  onAdoptedAndInstall,
  onAdoptedLater,
  previewContent,
  previewError,
  previewLoading,
  selectedPaths,
  selectedSkill,
}: DiscoverPageProps) {
  const text = copy[language];
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>("marketplace");
  const selectedCount = selectedPaths.length;
  const adopting = adoptingSkillPaths.length > 0;
  const [importingFolder, setImportingFolder] = useState(false);
  const { showToast } = useToast();
  const [resolutionState, setResolutionState] = useState<ResolutionState | null>(null);
  const [comparison, setComparison] = useState<SkillComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [applyingResolution, setApplyingResolution] = useState(false);

  // Filter state
  const [agentFilter, setAgentFilter] = useState<AgentKind | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<SkillScope | "all">("all");

  // Apply agent/scope filters then sort by priority
  const filteredGroups = useMemo(
    () =>
      sortGroupsByPriority(
        filterGroupsByAgentAndScope(discoveryReport.all_groups, agentFilter, scopeFilter)
      ),
    [discoveryReport.all_groups, agentFilter, scopeFilter]
  );

  const hasResults = filteredGroups.length > 0;

  // Summary stats from unfiltered report
  const readyCount =
    discoveryReport.unique_groups.length + discoveryReport.exact_duplicate_groups.length;
  const reviewCount = discoveryReport.variant_groups.length;
  const dupCount = discoveryReport.exact_duplicate_groups.length;

  // Determine if any selected group needs resolution
  const selectedGroups = useMemo(
    () =>
      filteredGroups.filter((group) =>
        group.candidates.some((candidate) => selectedPaths.includes(candidate.representative.path))
      ),
    [filteredGroups, selectedPaths]
  );

  const anySelectedNeedsResolution = selectedGroups.some(groupNeedsResolution);

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
      await onImportFolder(selected, "codex", "global");
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    } finally {
      setImportingFolder(false);
    }
  }

  function openResolution(group: DiscoveryGroup, paths: string[]) {
    const chosenCandidates = group.candidates.filter((candidate) =>
      paths.includes(candidate.representative.path)
    );
    const candidates = chosenCandidates.length > 0 ? chosenCandidates : group.candidates;

    const entries: ResolutionDraft[] = candidates.map((candidate) => {
      const exactManaged = group.existing_variants.find(
        (variant) => variant.content_hash === candidate.content_hash
      );

      return {
        sourcePath: candidate.representative.path,
        candidate,
        action: exactManaged ? "merge" : "create_variant",
        mergeTargetPath: exactManaged?.path ?? group.existing_variants[0]?.path ?? null,
        variantLabel: candidate.representative.variant_label ?? candidate.suggested_version_label,
      };
    });

    setResolutionState({ group, entries });
    setComparison(null);
    setComparisonError(null);
  }

  async function handleTopLevelAdopt() {
    if (selectedCount === 0) {
      return;
    }

    // If exactly one group selected and it needs resolution, open modal
    if (selectedGroups.length === 1 && groupNeedsResolution(selectedGroups[0])) {
      openResolution(selectedGroups[0], selectedPaths);
      return;
    }

    try {
      await onAdoptSelected(selectedPaths);
    } catch (error) {
      showToast(friendlyErrorMessage(error, language), "error");
    }
  }

  function handleAdoptGroup(group: DiscoveryGroup) {
    void onAdoptSelected(group.recommended_paths).catch((error) =>
      showToast(friendlyErrorMessage(error, language), "error")
    );
  }

  function handleResolveGroup(group: DiscoveryGroup) {
    openResolution(group, group.recommended_paths);
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
          merge_target_path: entry.action === "merge" ? entry.mergeTargetPath : null,
          variant_label: entry.action === "create_variant" ? entry.variantLabel : null,
        }))
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

  // Sticky adopt bar label
  const adoptBarLabel = anySelectedNeedsResolution
    ? `${text.discoveryReviewAndAdopt} (${selectedCount})`
    : `${text.adoptSelected} (${selectedCount})`;

  return (
    <section className={layout.pageSection}>
      <header className={layout.pageHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.discoverTitle}</p>
          <h1 className={layout.pageTitle}>{text.discoverBody}</h1>
        </div>
      </header>

      <div className={panels.detailTabBar}>
        <button
          type="button"
          className={discoverTab === "marketplace" ? panels.detailTabActive : panels.detailTab}
          onClick={() => setDiscoverTab("marketplace")}
        >
          {text.discoverTabMarketplace}
        </button>
        <button
          type="button"
          className={discoverTab === "local" ? panels.detailTabActive : panels.detailTab}
          onClick={() => setDiscoverTab("local")}
        >
          {text.discoverTabLocal}
        </button>
      </div>

      {discoverTab === "marketplace" ? (
        <RegistryBrowser
          language={language}
          onAdoptedAndInstall={onAdoptedAndInstall}
          onAdoptedLater={onAdoptedLater}
          onSnapshotUpdate={onSnapshotUpdate}
        />
      ) : (
        <>
          {/* Scan bar */}
          <section className={forms.intakeBar}>
            <div className={forms.intakeHeader}>
              <div>
                <p className={layout.sectionLabel}>{text.scanDiskTitle}</p>
                <p className={layout.helperText}>{text.scanDiskBody}</p>
              </div>
              <div className={layout.readout}>
                <span>{text.lastScanLabel}</span>
                <strong>
                  {formatTimestamp(indexStatus?.last_refresh_unix_ms, language, text.neverScanned)}
                </strong>
              </div>
            </div>
            <div className={forms.intakeActions}>
              <Tooltip content={text.tooltipStartScan} position="bottom">
                <button type="button" className={buttons.primaryButton} onClick={onRefreshIndex}>
                  {loading ? text.refreshingIndex : text.startScan}
                </button>
              </Tooltip>
              <Tooltip content={text.tooltipImportFolder} position="bottom">
                <button
                  type="button"
                  className={buttons.secondaryButton}
                  onClick={() => void handleChooseFolder()}
                >
                  {importingFolder ? text.importingFolder : text.chooseFolder}
                </button>
              </Tooltip>
            </div>
          </section>

          {/* Summary strip */}
          {discoveryReport.all_groups.length > 0 ? (
            <div className={layout.summaryStrip}>
              <span>
                {text.discoverySummaryFound.replace(
                  "{count}",
                  String(discoveryReport.summary.family_count)
                )}
              </span>
              <span>
                {readyCount} {text.discoveryReady}
              </span>
              <span> · </span>
              <span>
                {reviewCount} {text.discoveryNeedReview}
              </span>
              <span> · </span>
              <span>
                {dupCount} {text.discoveryHasDuplicates}
              </span>
            </div>
          ) : null}

          <div className={layout.splitLayout}>
            <section className={layout.listPanel}>
              {/* Filter bar */}
              <div className={layout.filterBar}>
                <SearchField
                  ariaLabel={text.searchLabel}
                  onChange={onFilterQueryChange}
                  placeholder={text.searchPlaceholder}
                  value={filterQuery}
                />
                <div className={layout.filterGroup}>
                  {(["all", "claude_code", "codex", "agent", "open_claw"] as const).map((agent) => (
                    <button
                      key={agent}
                      type="button"
                      className={
                        agentFilter === agent ? buttons.filterPillActive : buttons.filterPill
                      }
                      onClick={() => setAgentFilter(agent)}
                    >
                      {agent === "all" ? text.discoveryFilterAll : agentLabel(agent)}
                    </button>
                  ))}
                </div>
                <div className={layout.filterGroup}>
                  {(["all", "global", "project"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      className={
                        scopeFilter === scope ? buttons.filterPillActive : buttons.filterPill
                      }
                      onClick={() => setScopeFilter(scope)}
                    >
                      {scope === "all"
                        ? text.discoveryFilterAll
                        : scope === "global"
                          ? text.scopeGlobal
                          : text.scopeProject}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group list */}
              {!hasResults ? (
                <EmptyState
                  icon="search"
                  title={text.emptyDiscoverTitle}
                  body={text.emptyDiscoverBody}
                />
              ) : (
                <DiscoveryGroupList
                  adoptingPaths={adoptingSkillPaths}
                  groups={filteredGroups}
                  language={language}
                  onAdoptGroup={handleAdoptGroup}
                  onResolveGroup={handleResolveGroup}
                  onSelectSkill={onSelectSkill}
                  onToggleSelection={onToggleSelection}
                  selectedPaths={selectedPaths}
                  selectedSkill={selectedSkill}
                />
              )}

              {/* Sticky adopt bar */}
              {selectedCount > 0 ? (
                <div className={layout.stickyAdoptBar}>
                  <span>
                    {text.discoverySelectedCount.replace("{count}", String(selectedCount))}
                  </span>
                  <div className={buttons.actionRow}>
                    <button
                      type="button"
                      className={buttons.secondaryButton}
                      onClick={onClearSelection}
                    >
                      {text.discoveryClearAll}
                    </button>
                    <button
                      type="button"
                      className={buttons.primaryButton}
                      disabled={adopting}
                      onClick={() => void handleTopLevelAdopt()}
                    >
                      {adopting ? text.adoptingSkill : adoptBarLabel}
                    </button>
                  </div>
                </div>
              ) : null}
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
        </>
      )}

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
                      entry.sourcePath === sourcePath ? { ...entry, action } : entry
                    ),
                  }
                : current
            );
          }}
          onChangeMergeTarget={(sourcePath, mergeTargetPath) => {
            setResolutionState((current) =>
              current
                ? {
                    ...current,
                    entries: current.entries.map((entry) =>
                      entry.sourcePath === sourcePath ? { ...entry, mergeTargetPath } : entry
                    ),
                  }
                : current
            );
          }}
          onChangeVariantLabel={(sourcePath, variantLabel) => {
            setResolutionState((current) =>
              current
                ? {
                    ...current,
                    entries: current.entries.map((entry) =>
                      entry.sourcePath === sourcePath ? { ...entry, variantLabel } : entry
                    ),
                  }
                : current
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
