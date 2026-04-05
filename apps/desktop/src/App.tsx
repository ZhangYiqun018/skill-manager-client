import { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { GuidePage } from "./features/guide/GuidePage";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useDiscoveryState } from "./hooks/useDiscoveryState";
import { useLanguage } from "./hooks/useLanguage";
import { useTheme } from "./hooks/useTheme";
import { useRemoteUpdates } from "./hooks/useRemoteUpdates";
import { useSkillFilters } from "./hooks/useSkillFilters";
import { useSkillPreview } from "./hooks/useSkillPreview";
import { copy, friendlyErrorMessage } from "./i18n";
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
  const { themeMode, setThemeMode } = useTheme();
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

  const busy = loading || refreshingIndex;

  const indexedSkills = useMemo<SkillItem[]>(
    () =>
      (summary?.skills ?? []).map((skill) => {
        const warningCount = (summary?.warnings ?? []).filter(
          (warning) =>
            warning.path?.startsWith(skill.path) || warning.path === skill.skill_md,
        ).length;

        return {
          ...skill,
          health_state: warningCount > 0 ? "warning" : "healthy",
          warning_count: warningCount,
        };
      }),
    [summary],
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

    for (const skill of summary?.skills ?? []) {
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
      const rootWarnings = (summary?.warnings ?? []).filter((warning) =>
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
        skill_count: (summary?.skills ?? []).filter((skill) => skill.source_root === target.path).length,
      };
    });
  }, [summary]);

  const healthCount = useMemo(
    () =>
      targets.filter((target) => target.health_state !== "healthy").length +
      (summary?.warnings ?? []).length,
    [targets, summary?.warnings],
  );

  const updateCount = useMemo(
    () => librarySkills.filter((s) => hasUpdateFor(s.path)).length,
    [librarySkills, hasUpdateFor],
  );

  const selectedLibrarySkill = useMemo(
    () =>
      filteredSkills.find((skill) => skill.path === selectedLibrarySkillPath) ??
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
      agent: librarySkills.filter((skill) => skill.agent === "agent").length,
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
    applySnapshotWithDerived,
    selectLibrarySkillFromSnapshot,
    discoveryReport,
    discoveryRepresentativeSkills,
  });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useLayoutEffect(() => {
    // Synchronize external selection changes into local path state
    if (selectedLibrarySkill && selectedLibrarySkill.path !== selectedLibrarySkillPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [discovery, discoveryRepresentativeSkills]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMeta = event.ctrlKey || event.metaKey;

      // Tab switching: Ctrl/Cmd + 1..5
      if (isMeta && event.key >= "1" && event.key <= "5") {
        event.preventDefault();
        const tabIndex = parseInt(event.key, 10) - 1;
        const tabs: AppTab[] = ["library", "discover", "targets", "settings", "guide"];
        const nextTab = tabs[tabIndex];
        if (nextTab) {
          setActiveTab(nextTab);
        }
        return;
      }

      // Focus search: Ctrl/Cmd + K
      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-tab-panel]"));
        const visiblePanel = panels.find((el) => el.style.display !== "none");
        const searchInput = visiblePanel?.querySelector<HTMLInputElement>("input[type='text']");
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Refresh index: Ctrl/Cmd + R
      if (isMeta && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void refresh(true);
        return;
      }

      // Tab navigation with arrow keys when focus is inside tablist
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const tabs: AppTab[] = ["library", "discover", "targets", "settings", "guide"];
        const activeElement = document.activeElement;
        const isInTablist = activeElement?.closest('[role="tablist"]') != null;
        if (isInTablist) {
          event.preventDefault();
          const currentIndex = tabs.indexOf(activeTab);
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
          setActiveTab(tabs[nextIndex]);
          // Move focus to the new tab button
          const tabButtons = document.querySelectorAll<HTMLButtonElement>("[role='tab']");
          tabButtons[nextIndex]?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, discovery, refresh]);

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
      setError(openFailure);
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
      setError(updateFailure);
    }
  }

  async function handlePromoteVariant(path: string) {
    setError(null);

    try {
      const result = await promoteManagedSkillVariant(path);
      await applySnapshotWithDerived(result);
      setSelectedLibrarySkillPath(path);
    } catch (promotionFailure) {
      setError(promotionFailure);
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
        onRefreshIndex={handleRequestFullScan}
        onGoToDiscover={() => setActiveTab("discover")}
        skillCount={librarySkills.length}
        updateCount={updateCount}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
      />

      <div className={styles.workspace}>
        {error ? (
          <section className={styles.errorBanner}>
            <strong>{text.scanFailedTitle}</strong>
            <span>{friendlyErrorMessage(error, language)}</span>
          </section>
        ) : null}

        <div data-tab-panel role="tabpanel" aria-hidden={activeTab !== "library"} style={{ display: activeTab === "library" ? "contents" : "none" }}>
          <LibraryPage
            agentCounts={agentCounts}
            agentFilter={agentFilter}
            filteredSkills={filteredSkills}
            language={language}
            onAgentFilterChange={setAgentFilter}
            onGoToDiscover={() => setActiveTab("discover")}
            onOpenPath={(path) => void handleOpenPath(path)}
            onPromoteVariant={(path) => void handlePromoteVariant(path)}
            onScanDisk={handleRequestFullScan}
            onScopeFilterChange={setScopeFilter}
            onSearchQueryChange={setLibrarySearchQuery}
            onSelectSkill={setSelectedLibrarySkillPath}
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
        </div>

        <div data-tab-panel role="tabpanel" aria-hidden={activeTab !== "discover"} style={{ display: activeTab === "discover" ? "contents" : "none" }}>
          <DiscoverPage
            adoptingSkillPaths={discovery.adoptingSkillPaths}
            discoveryReport={discoveryReport}
            indexStatus={indexStatus}
            language={language}
            filterQuery={discoverSearchQuery}
            loading={busy || discoveryLoading}
            onApplyAdoptionResolutions={(resolutions) =>
              discovery.handleApplyAdoptionResolutions(resolutions)
            }
            onAdoptSelected={(paths) => discovery.handleAdoptPaths(paths)}
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
        </div>

        <div data-tab-panel role="tabpanel" aria-hidden={activeTab !== "targets"} style={{ display: activeTab === "targets" ? "contents" : "none" }}>
          <TargetsPage
            language={language}
            onOpenDirectory={(path) => void handleOpenPath(path)}
          />
        </div>

        <div data-tab-panel role="tabpanel" aria-hidden={activeTab !== "settings"} style={{ display: activeTab === "settings" ? "contents" : "none" }}>
          <SettingsPage
            indexStatus={indexStatus}
            language={language}
            onLanguageChange={setLanguage}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
          />
        </div>

        <div data-tab-panel role="tabpanel" aria-hidden={activeTab !== "guide"} style={{ display: activeTab === "guide" ? "contents" : "none" }}>
          <GuidePage language={language} />
        </div>
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
