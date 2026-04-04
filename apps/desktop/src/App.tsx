import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import {
  compareSkills,
  openInFinder,
  promoteManagedSkillVariant,
  updateManagedSkillVariantLabel,
} from "./api";
import { ConfirmModal } from "./components/ConfirmModal";
import { TopBar } from "./components/TopBar";
import { DiscoverPage } from "./features/discover/DiscoverPage";
import { filterDiscoveryReport } from "./features/discover/report";
import { LibraryPage } from "./features/library/LibraryPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TargetsPage } from "./features/targets/TargetsPage";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useDiscoveryState } from "./hooks/useDiscoveryState";
import { useLanguage } from "./hooks/useLanguage";
import { useRemoteUpdates } from "./hooks/useRemoteUpdates";
import { useSkillFilters } from "./hooks/useSkillFilters";
import { useSkillPreview } from "./hooks/useSkillPreview";
import { copy } from "./i18n";
import type {
  AgentFilter,
  AppTab,
  IndexedScanSummary,
  InstallTargetRecord,
  ScopeFilter,
  SkillItem,
} from "./types";

function App() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];

  const {
    summary,
    discoveryReportRaw,
    indexStatus,
    loading,
    refreshingIndex,
    discoveryLoading,
    error,
    setError,
    bootstrap,
    refresh,
    applySnapshotWithDerived,
  } = useAppBootstrap();

  const [activeTab, setActiveTab] = useState<AppTab>("library");
  const [scanConfirmOpen, setScanConfirmOpen] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [selectedLibrarySkillPath, setSelectedLibrarySkillPath] = useState<string | null>(null);
  const [selectedDiscoverySkillPath, setSelectedDiscoverySkillPath] = useState<string | null>(null);

  const { hasUpdateFor, updateSkill, updatingPath } = useRemoteUpdates();

  const skills = summary?.skills ?? [];
  const warnings = summary?.warnings ?? [];
  const busy = loading || refreshingIndex;

  const indexedSkills = useMemo<SkillItem[]>(
    () =>
      skills.map((skill) => {
        const warningCount = warnings.filter(
          (warning) =>
            warning.path?.startsWith(skill.path) || warning.path === skill.skill_md,
        ).length;

        return {
          ...skill,
          health_state: warningCount > 0 ? "warning" : "healthy",
          warning_count: warningCount,
        };
      }),
    [skills, warnings],
  );

  const librarySkills = useMemo(
    () => indexedSkills.filter((skill) => skill.source_type !== "disk"),
    [indexedSkills],
  );

  const filteredSkills = useSkillFilters({
    skills: librarySkills,
    searchQuery: librarySearchQuery,
    agentFilter,
    scopeFilter,
    sourceFilter: "all",
  });

  const discoveryReport = useMemo(
    () => filterDiscoveryReport(discoveryReportRaw, discoverSearchQuery),
    [discoverSearchQuery, discoveryReportRaw],
  );

  const discoveryRepresentativeSkills = useMemo(
    () =>
      discoveryReport.all_groups.flatMap((group) =>
        group.candidates.map((candidate) => candidate.representative),
      ),
    [discoveryReport],
  );

  const targets = useMemo<InstallTargetRecord[]>(() => {
    const targetMap = new Map<
      string,
      {
        agent: InstallTargetRecord["agent"];
        scope: InstallTargetRecord["scope"];
        path: string;
        exists: boolean;
      }
    >();

    for (const root of summary?.roots ?? []) {
      targetMap.set(root.base_dir, {
        agent: root.agent,
        scope: root.scope,
        path: root.base_dir,
        exists: root.exists,
      });
    }

    for (const skill of skills) {
      if (skill.source_type === "import" || skill.source_root === skill.path) {
        continue;
      }

      if (skill.source_root.includes("/skill-manager/store/")) {
        continue;
      }

      targetMap.set(skill.source_root, {
        agent: skill.agent,
        scope: skill.scope,
        path: skill.source_root,
        exists: true,
      });
    }

    return Array.from(targetMap.values()).map((target) => {
      const rootWarnings = warnings.filter((warning) =>
        warning.path?.startsWith(target.path),
      );
      const healthState = !target.exists
        ? "missing"
        : rootWarnings.length > 0
          ? "warning"
          : "healthy";

      return {
        id: `${target.agent}-${target.scope}-${target.path}`,
        agent: target.agent,
        scope: target.scope,
        path: target.path,
        exists: target.exists,
        health_state: healthState,
        skill_count: skills.filter((skill) => skill.source_root === target.path).length,
      };
    });
  }, [skills, summary?.roots, warnings]);

  const healthCount = useMemo(
    () =>
      targets.filter((target) => target.health_state !== "healthy").length +
      warnings.length,
    [targets, warnings.length],
  );

  const selectedLibrarySkill = useMemo(
    () =>
      filteredSkills.find((skill) => skill.path === selectedLibrarySkillPath) ??
      filteredSkills[0] ??
      null,
    [filteredSkills, selectedLibrarySkillPath],
  );

  const selectedDiscoverySkill = useMemo(
    () =>
      discoveryRepresentativeSkills.find(
        (skill) => skill.path === selectedDiscoverySkillPath,
      ) ??
      discoveryRepresentativeSkills[0] ??
      null,
    [discoveryRepresentativeSkills, selectedDiscoverySkillPath],
  );

  const agentCounts = useMemo(
    () => ({
      all: librarySkills.length,
      codex: librarySkills.filter((skill) => skill.agent === "codex").length,
      claude_code: librarySkills.filter((skill) => skill.agent === "claude_code").length,
    }),
    [librarySkills],
  );

  const scopeCounts = useMemo(
    () => ({
      all: librarySkills.length,
      global: librarySkills.filter((skill) => skill.scope === "global").length,
      project: librarySkills.filter((skill) => skill.scope === "project").length,
    }),
    [librarySkills],
  );

  const activePreviewSkill =
    activeTab === "discover" ? selectedDiscoverySkill : selectedLibrarySkill;

  const { previewCache, previewLoadingPath, previewError } = useSkillPreview(activePreviewSkill);

  const discovery = useDiscoveryState({
    text,
    applySnapshotWithDerived,
    selectLibrarySkillFromSnapshot,
    discoveryReport,
    discoveryRepresentativeSkills,
  });

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (selectedLibrarySkill && selectedLibrarySkill.path !== selectedLibrarySkillPath) {
      setSelectedLibrarySkillPath(selectedLibrarySkill.path);
    }

    if (selectedDiscoverySkill && selectedDiscoverySkill.path !== selectedDiscoverySkillPath) {
      setSelectedDiscoverySkillPath(selectedDiscoverySkill.path);
    }
  }, [
    selectedDiscoverySkill,
    selectedDiscoverySkillPath,
    selectedLibrarySkill,
    selectedLibrarySkillPath,
  ]);

  useEffect(() => {
    const validPaths = new Set(
      discoveryRepresentativeSkills.map((skill) => skill.path),
    );
    discovery.setSelectedPaths((current) =>
      current.filter((path) => validPaths.has(path)),
    );
  }, [discoveryRepresentativeSkills]);

  function selectLibrarySkillFromSnapshot(
    result: IndexedScanSummary,
    predicate: (skill: SkillItem) => boolean,
  ) {
    const previousLibraryPaths = new Set(librarySkills.map((skill) => skill.path));
    const candidateSkills = result.summary.skills.filter(
      (skill): skill is SkillItem =>
        skill.source_type !== "disk" && predicate(skill as SkillItem),
    );
    const nextSelection =
      candidateSkills.find((skill) => !previousLibraryPaths.has(skill.path)) ??
      candidateSkills[0] ??
      null;

    if (nextSelection) {
      setSelectedLibrarySkillPath(nextSelection.path);
      setActiveTab("library");
    }
  }

  async function handleOpenPath(path: string) {
    try {
      await openInFinder(path);
    } catch (openFailure) {
      setError(
        openFailure instanceof Error ? openFailure.message : text.defaultOpenError,
      );
    }
  }

  function handleRequestFullScan() {
    setScanConfirmOpen(true);
  }

  async function handleConfirmFullScan() {
    setScanConfirmOpen(false);
    await refresh(false);
  }

  async function handleUpdateVariantLabel(path: string, variantLabel: string) {
    setError(null);

    try {
      const result = await updateManagedSkillVariantLabel(path, variantLabel);
      await applySnapshotWithDerived(result);
      setSelectedLibrarySkillPath(path);
    } catch (updateFailure) {
      setError(
        updateFailure instanceof Error
          ? updateFailure.message
          : text.defaultScanError,
      );
    }
  }

  async function handlePromoteVariant(path: string) {
    setError(null);

    try {
      const result = await promoteManagedSkillVariant(path);
      await applySnapshotWithDerived(result);
      setSelectedLibrarySkillPath(path);
    } catch (promotionFailure) {
      setError(
        promotionFailure instanceof Error
          ? promotionFailure.message
          : text.defaultScanError,
      );
    }
  }

  async function handleCompareSkills(leftPath: string, rightPath: string) {
    return compareSkills(leftPath, rightPath);
  }

  return (
    <main className={styles.appShell}>
      <TopBar
        activeTab={activeTab}
        healthCount={healthCount}
        language={language}
        onHealthClick={() => setActiveTab("targets")}
        onTabChange={setActiveTab}
      />

      <div className={styles.workspace}>
        {error ? (
          <section className={styles.errorBanner}>
            <strong>{text.scanFailedTitle}</strong>
            <span>{error}</span>
          </section>
        ) : null}

        {activeTab === "library" ? (
          <LibraryPage
            agentCounts={agentCounts}
            agentFilter={agentFilter}
            filteredSkills={filteredSkills}
            language={language}
            onAgentFilterChange={setAgentFilter}
            onOpenPath={(path) => void handleOpenPath(path)}
            onScopeFilterChange={setScopeFilter}
            onSearchQueryChange={setLibrarySearchQuery}
            onSelectSkill={setSelectedLibrarySkillPath}
            onPromoteVariant={(path) => void handlePromoteVariant(path)}
            onUpdateVariantLabel={(path, variantLabel) =>
              void handleUpdateVariantLabel(path, variantLabel)
            }
            previewContent={
              selectedLibrarySkill
                ? previewCache[selectedLibrarySkill.skill_md]
                : undefined
            }
            previewError={previewError}
            previewLoading={selectedLibrarySkill?.skill_md === previewLoadingPath}
            scopeCounts={scopeCounts}
            searchQuery={librarySearchQuery}
            selectedSkill={selectedLibrarySkill}
            scopeFilter={scopeFilter}
            hasUpdateFor={hasUpdateFor}
            onUpdateSkill={(path) => void updateSkill(path)}
            updatingPath={updatingPath}
          />
        ) : null}

        {activeTab === "discover" ? (
          <DiscoverPage
            adoptingSkillPaths={discovery.adoptingSkillPaths}
            discoveryReport={discoveryReport}
            indexStatus={indexStatus}
            language={language}
            filterQuery={discoverSearchQuery}
            loading={busy || discoveryLoading}
            onApplyAdoptionResolutions={(resolutions) =>
              void discovery.handleApplyAdoptionResolutions(resolutions)
            }
            onAdoptSelected={(paths) => void discovery.handleAdoptPaths(paths)}
            onAdoptRegistrySkill={(skill, agent, scope) =>
              discovery.handleAdoptRegistrySkill(skill, agent, scope)
            }
            onCompareSkills={handleCompareSkills}
            onClearSelection={discovery.clearSelection}
            onImportFolder={(path, agent, scope) =>
              discovery.handleImportFolder(path, agent, scope)
            }
            onOpenFolder={() =>
              selectedDiscoverySkill && handleOpenPath(selectedDiscoverySkill.path)
            }
            onOpenSkillFile={() =>
              selectedDiscoverySkill && handleOpenPath(selectedDiscoverySkill.skill_md)
            }
            onFilterQueryChange={setDiscoverSearchQuery}
            onRefreshIndex={handleRequestFullScan}
            onSearchRegistry={discovery.handleSearchRegistry}
            onSelectPreset={discovery.selectPreset}
            onSelectSkill={setSelectedDiscoverySkillPath}
            onToggleSelection={discovery.toggleSelection}
            previewContent={
              selectedDiscoverySkill
                ? previewCache[selectedDiscoverySkill.skill_md]
                : undefined
            }
            previewError={previewError}
            previewLoading={selectedDiscoverySkill?.skill_md === previewLoadingPath}
            selectedPaths={discovery.selectedPaths}
            selectedSkill={selectedDiscoverySkill}
          />
        ) : null}

        {activeTab === "targets" ? (
          <TargetsPage
            language={language}
            onOpenDirectory={(path) => void handleOpenPath(path)}
          />
        ) : null}

        {activeTab === "settings" ? (
          <SettingsPage
            indexStatus={indexStatus}
            language={language}
            onLanguageChange={setLanguage}
          />
        ) : null}
      </div>

      <ConfirmModal
        actionLabel={text.scanConfirmAction}
        body={text.scanConfirmBody}
        cancelLabel={text.scanCancel}
        open={scanConfirmOpen}
        onCancel={() => setScanConfirmOpen(false)}
        onConfirm={() => void handleConfirmFullScan()}
        title={text.scanConfirmTitle}
      />
    </main>
  );
}

export default App;
