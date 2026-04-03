import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import {
  adoptSkills,
  loadLibrarySnapshot,
  openInFinder,
  readSkillContent,
  refreshLibrarySnapshot,
} from "./api";
import { ConfirmModal } from "./components/ConfirmModal";
import { TopBar } from "./components/TopBar";
import { DiscoverPage } from "./features/discover/DiscoverPage";
import { LibraryPage } from "./features/library/LibraryPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TargetsPage } from "./features/targets/TargetsPage";
import { useLanguage } from "./hooks/useLanguage";
import { useSkillFilters } from "./hooks/useSkillFilters";
import { copy } from "./i18n";
import type {
  AgentFilter,
  AppTab,
  DiscoveryGroup,
  DiscoveryPreset,
  DiscoveryRecord,
  IndexStatus,
  IndexedScanSummary,
  InstallTargetRecord,
  ScanSummary,
  SkillItem,
  ScopeFilter,
  SourceFilter,
} from "./types";

function App() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];

  const [activeTab, setActiveTab] = useState<AppTab>("library");
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [adoptingSkillPaths, setAdoptingSkillPaths] = useState<string[]>([]);
  const [scanConfirmOpen, setScanConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedLibrarySkillPath, setSelectedLibrarySkillPath] = useState<string | null>(null);
  const [selectedDiscoverySkillPath, setSelectedDiscoverySkillPath] = useState<string | null>(null);
  const [selectedDiscoveryPaths, setSelectedDiscoveryPaths] = useState<string[]>([]);
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const [previewLoadingPath, setPreviewLoadingPath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    searchQuery,
    agentFilter,
    scopeFilter,
    sourceFilter,
  });

  const discoveredSkills = useMemo<DiscoveryRecord[]>(
    () =>
      indexedSkills
        .filter((skill) => skill.source_type === "disk")
        .filter((skill) => {
          const normalizedQuery = searchQuery.trim().toLowerCase();
          if (normalizedQuery.length === 0) {
            return true;
          }

          const haystack = [
            skill.display_name,
            skill.description ?? "",
            skill.path,
            skill.family_key,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
        .map((skill) => ({
          ...skill,
          discovered_at: indexStatus?.last_refresh_unix_ms ?? null,
        })),
    [indexStatus?.last_refresh_unix_ms, indexedSkills, searchQuery],
  );

  const discoveryGroups = useMemo(
    () => buildDiscoveryGroups(discoveredSkills),
    [discoveredSkills],
  );

  const targets = useMemo<InstallTargetRecord[]>(
    () =>
      (summary?.roots ?? []).map((root) => {
        const rootWarnings = warnings.filter((warning) =>
          warning.path?.startsWith(root.base_dir),
        );
        const healthState = !root.exists
          ? "missing"
          : rootWarnings.length > 0
            ? "warning"
            : "healthy";

        return {
          id: `${root.agent}-${root.scope}-${root.base_dir}`,
          agent: root.agent,
          scope: root.scope,
          path: root.base_dir,
          exists: root.exists,
          health_state: healthState,
          skill_count: skills.filter((skill) => skill.source_root === root.base_dir).length,
        };
      }),
    [skills, summary?.roots, warnings],
  );

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
      discoveredSkills.find((skill) => skill.path === selectedDiscoverySkillPath) ??
      discoveredSkills[0] ??
      null,
    [discoveredSkills, selectedDiscoverySkillPath],
  );

  const activePreviewSkill =
    activeTab === "discover" ? selectedDiscoverySkill : selectedLibrarySkill;

  const relatedTargets = useMemo(
    () =>
      selectedLibrarySkill
        ? targets.filter((target) => target.path === selectedLibrarySkill.source_root)
        : [],
    [selectedLibrarySkill, targets],
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

  const sourceCounts = useMemo(
    () => ({
      all: librarySkills.length,
      disk: 0,
      import: librarySkills.filter((skill) => skill.source_type === "import").length,
      remote: librarySkills.filter((skill) => skill.source_type === "remote").length,
    }),
    [librarySkills],
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    setPreviewError(null);

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
    const validPaths = new Set(discoveredSkills.map((skill) => skill.path));
    setSelectedDiscoveryPaths((current) =>
      current.filter((path) => validPaths.has(path)),
    );
  }, [discoveredSkills]);

  useEffect(() => {
    if (!activePreviewSkill) {
      return;
    }

    if (previewCache[activePreviewSkill.skill_md]) {
      return;
    }

    let cancelled = false;
    setPreviewLoadingPath(activePreviewSkill.skill_md);
    setPreviewError(null);

    void readSkillContent(activePreviewSkill.skill_md)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setPreviewCache((current) => ({
          ...current,
          [activePreviewSkill.skill_md]: payload.content,
        }));
      })
      .catch((previewFailure: unknown) => {
        if (cancelled) {
          return;
        }

        setPreviewError(
          previewFailure instanceof Error
            ? previewFailure.message
            : text.defaultPreviewError,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoadingPath(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePreviewSkill, previewCache, text.defaultPreviewError]);

  async function bootstrap() {
    setError(null);
    setLoading(true);

    try {
      const snapshot = await loadSnapshot();
      applySnapshot(snapshot);
    } catch (loadFailure) {
      setError(
        loadFailure instanceof Error ? loadFailure.message : text.defaultScanError,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshot() {
    return loadLibrarySnapshot();
  }

  function applySnapshot(result: IndexedScanSummary) {
    setSummary(result.summary);
    setIndexStatus(result.index);
  }

  async function refresh(background = false) {
    if (background) {
      setRefreshingIndex(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await refreshLibrarySnapshot();
      applySnapshot(result);
    } catch (refreshFailure) {
      setError(
        refreshFailure instanceof Error
          ? refreshFailure.message
          : text.defaultScanError,
      );
    } finally {
      if (background) {
        setRefreshingIndex(false);
      } else {
        setLoading(false);
      }
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

  function handleToggleDiscoverySelection(path: string) {
    setSelectedDiscoveryPaths((current) =>
      current.includes(path)
        ? current.filter((value) => value !== path)
        : [...current, path],
    );
  }

  function handleSelectDiscoveryPreset(preset: DiscoveryPreset) {
    setSelectedDiscoveryPaths(buildPresetSelection(discoveryGroups, preset));
  }

  function handleClearDiscoverySelection() {
    setSelectedDiscoveryPaths([]);
  }

  async function handleAdoptPaths(paths: string[]) {
    if (paths.length === 0) {
      return;
    }

    setError(null);
    setAdoptingSkillPaths(paths);

    try {
      const selectedCandidates = discoveredSkills.filter((skill) =>
        paths.includes(skill.path),
      );
      const result = await adoptSkills(paths);
      applySnapshot(result);
      setSelectedDiscoveryPaths([]);

      const selectedFamilyKeys = new Set(selectedCandidates.map((skill) => skill.family_key));
      const selectedHashes = new Set(selectedCandidates.map((skill) => skill.content_hash));
      const adoptedSkill = result.summary.skills.find(
        (candidate) =>
          candidate.source_type !== "disk" &&
          selectedFamilyKeys.has(candidate.family_key) &&
          selectedHashes.has(candidate.content_hash),
      );

      if (adoptedSkill) {
        setSelectedLibrarySkillPath(adoptedSkill.path);
        setActiveTab("library");
      }
    } catch (adoptFailure) {
      setError(
        adoptFailure instanceof Error ? adoptFailure.message : text.defaultScanError,
      );
    } finally {
      setAdoptingSkillPaths([]);
    }
  }

  return (
    <main className={styles.appShell}>
      <TopBar
        activeTab={activeTab}
        healthCount={healthCount}
        language={language}
        onHealthClick={() => setActiveTab("targets")}
        onLanguageChange={setLanguage}
        onSearchQueryChange={setSearchQuery}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
      />

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
          loading={busy}
          onAgentFilterChange={setAgentFilter}
          onOpenFolder={() =>
            selectedLibrarySkill && handleOpenPath(selectedLibrarySkill.path)
          }
          onOpenSkillFile={() =>
            selectedLibrarySkill && handleOpenPath(selectedLibrarySkill.skill_md)
          }
          onRefreshIndex={handleRequestFullScan}
          onScopeFilterChange={setScopeFilter}
          onSelectSkill={setSelectedLibrarySkillPath}
          onSourceFilterChange={setSourceFilter}
          previewContent={
            selectedLibrarySkill
              ? previewCache[selectedLibrarySkill.skill_md]
              : undefined
          }
          previewError={previewError}
          previewLoading={selectedLibrarySkill?.skill_md === previewLoadingPath}
          relatedTargets={relatedTargets}
          scopeCounts={scopeCounts}
          selectedSkill={selectedLibrarySkill}
          sourceCounts={sourceCounts}
          sourceFilter={sourceFilter}
          totalSkills={librarySkills.length}
          warningCount={warnings.length}
          scopeFilter={scopeFilter}
        />
      ) : null}

      {activeTab === "discover" ? (
        <DiscoverPage
          adoptingSkillPaths={adoptingSkillPaths}
          discoveryGroups={discoveryGroups}
          indexStatus={indexStatus}
          language={language}
          loading={busy}
          onAdoptSelected={(paths) => void handleAdoptPaths(paths)}
          onClearSelection={handleClearDiscoverySelection}
          onOpenFolder={() =>
            selectedDiscoverySkill && handleOpenPath(selectedDiscoverySkill.path)
          }
          onOpenSkillFile={() =>
            selectedDiscoverySkill && handleOpenPath(selectedDiscoverySkill.skill_md)
          }
          onRefreshIndex={handleRequestFullScan}
          onSelectPreset={handleSelectDiscoveryPreset}
          onSelectSkill={setSelectedDiscoverySkillPath}
          onToggleSelection={handleToggleDiscoverySelection}
          previewContent={
            selectedDiscoverySkill
              ? previewCache[selectedDiscoverySkill.skill_md]
              : undefined
          }
          previewError={previewError}
          previewLoading={selectedDiscoverySkill?.skill_md === previewLoadingPath}
          selectedPaths={selectedDiscoveryPaths}
          selectedSkill={selectedDiscoverySkill}
        />
      ) : null}

      {activeTab === "targets" ? (
        <TargetsPage
          language={language}
          onOpenDirectory={(path) => void handleOpenPath(path)}
          onRefreshIndex={handleRequestFullScan}
          refreshing={busy}
          targets={targets}
          warnings={warnings}
        />
      ) : null}

      {activeTab === "settings" ? (
        <SettingsPage
          indexStatus={indexStatus}
          language={language}
          onLanguageChange={setLanguage}
          onRefreshIndex={handleRequestFullScan}
          refreshing={busy}
        />
      ) : null}

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

function buildDiscoveryGroups(skills: DiscoveryRecord[]): DiscoveryGroup[] {
  const familyGroups = new Map<string, DiscoveryRecord[]>();

  for (const skill of skills) {
    const existing = familyGroups.get(skill.family_key) ?? [];
    existing.push(skill);
    familyGroups.set(skill.family_key, existing);
  }

  return Array.from(familyGroups.entries())
    .map(([familyKey, items]) => {
      const sortedItems = [...items].sort((left, right) =>
        left.display_name
          .localeCompare(right.display_name)
          || left.content_hash.localeCompare(right.content_hash)
          || left.path.localeCompare(right.path),
      );
      const contentGroups = new Map<string, DiscoveryRecord[]>();
      for (const item of sortedItems) {
        const group = contentGroups.get(item.content_hash) ?? [];
        group.push(item);
        contentGroups.set(item.content_hash, group);
      }

      const variantCount = contentGroups.size;
      const duplicateCount = sortedItems.length - variantCount;
      const kind =
        variantCount === 1
          ? sortedItems.length === 1
            ? "unique"
            : "exact_duplicate"
          : "variant";

      return {
        family_key: familyKey,
        display_name: sortedItems[0]?.display_name ?? familyKey,
        kind,
        duplicate_count: duplicateCount,
        variant_count: variantCount,
        items: sortedItems,
        recommended_paths: Array.from(contentGroups.values()).map((group) => group[0].path),
      } satisfies DiscoveryGroup;
    })
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

function buildPresetSelection(
  groups: DiscoveryGroup[],
  preset: DiscoveryPreset,
): string[] {
  const selected = new Set<string>();

  for (const group of groups) {
    const contentGroups = new Map<string, DiscoveryRecord[]>();
    for (const item of group.items) {
      const items = contentGroups.get(item.content_hash) ?? [];
      items.push(item);
      contentGroups.set(item.content_hash, items);
    }

    for (const items of contentGroups.values()) {
      const match = items.find((item) => matchesPreset(item, preset));
      if (match) {
        selected.add(match.path);
      }
    }
  }

  return Array.from(selected);
}

function matchesPreset(skill: DiscoveryRecord, preset: DiscoveryPreset): boolean {
  if (preset === "recommended") {
    return true;
  }

  if (preset === "project") {
    return skill.scope === "project";
  }

  if (preset === "codex") {
    return skill.agent === "codex";
  }

  return skill.agent === "claude_code";
}
