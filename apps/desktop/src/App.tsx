import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import {
  loadSkillIndex,
  openInFinder,
  readSkillContent,
  refreshSkillIndex,
} from "./api";
import { TopBar } from "./components/TopBar";
import { DirectoriesTab } from "./features/directories/DirectoriesTab";
import { SettingsTab } from "./features/settings/SettingsTab";
import { SkillsTab } from "./features/skills/SkillsTab";
import { useLanguage } from "./hooks/useLanguage";
import { useSkillFilters } from "./hooks/useSkillFilters";
import { copy } from "./i18n";
import type {
  AgentFilter,
  AppTab,
  IndexedScanSummary,
  ScanSummary,
  ScopeFilter,
} from "./types";

function App() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language];

  const [activeTab, setActiveTab] = useState<AppTab>("skills");
  const [projectRoot, setProjectRoot] = useState("");
  const [draftProjectRoot, setDraftProjectRoot] = useState("");
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const [previewLoadingPath, setPreviewLoadingPath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const skills = summary?.skills ?? [];
  const warnings = summary?.warnings ?? [];
  const filteredSkills = useSkillFilters({
    skills,
    searchQuery,
    agentFilter,
    scopeFilter,
  });
  const busy = loading || refreshingIndex;

  const selectedSkill = useMemo(
    () =>
      filteredSkills.find((skill) => skill.path === selectedSkillPath) ??
      filteredSkills[0] ??
      null,
    [filteredSkills, selectedSkillPath],
  );

  const agentCounts = useMemo(
    () => ({
      all: skills.length,
      codex: skills.filter((skill) => skill.agent === "codex").length,
      claude_code: skills.filter((skill) => skill.agent === "claude_code").length,
    }),
    [skills],
  );

  const scopeCounts = useMemo(
    () => ({
      all: skills.length,
      global: skills.filter((skill) => skill.scope === "global").length,
      project: skills.filter((skill) => skill.scope === "project").length,
    }),
    [skills],
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    setPreviewError(null);

    if (selectedSkill && selectedSkill.path !== selectedSkillPath) {
      setSelectedSkillPath(selectedSkill.path);
    }
  }, [selectedSkill, selectedSkillPath]);

  useEffect(() => {
    if (!selectedSkill) {
      return;
    }

    if (previewCache[selectedSkill.skill_md]) {
      return;
    }

    let cancelled = false;
    setPreviewLoadingPath(selectedSkill.skill_md);
    setPreviewError(null);

    void readSkillContent(selectedSkill.skill_md, projectRoot || undefined)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setPreviewCache((current) => ({
          ...current,
          [selectedSkill.skill_md]: payload.content,
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
  }, [previewCache, projectRoot, selectedSkill, text.defaultPreviewError]);

  async function bootstrap(nextProjectRoot = projectRoot) {
    setError(null);
    setLoading(true);

    try {
      const snapshot = await loadSnapshot(nextProjectRoot);

      if (!snapshot.index.exists) {
        await refresh(nextProjectRoot, false);
        return;
      }

      setLoading(false);

      if (snapshot.index.stale) {
        void refresh(nextProjectRoot, true);
      }
    } catch (loadFailure) {
      setError(
        loadFailure instanceof Error ? loadFailure.message : text.defaultScanError,
      );
      await refresh(nextProjectRoot, false);
    }
  }

  async function loadSnapshot(nextProjectRoot = projectRoot) {
    const result = await loadSkillIndex(nextProjectRoot.trim() || undefined);
    applySnapshot(result);
    return result;
  }

  function applySnapshot(result: IndexedScanSummary) {
    setSummary(result.summary);
  }

  async function refresh(nextProjectRoot = projectRoot, background = false) {
    if (background) {
      setRefreshingIndex(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await refreshSkillIndex(nextProjectRoot.trim() || undefined);
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

  async function handleApplySettings() {
    const nextProjectRoot = draftProjectRoot.trim();
    setDraftProjectRoot(nextProjectRoot);
    setProjectRoot(nextProjectRoot);
    await bootstrap(nextProjectRoot);
  }

  async function handleClearProjectRoot() {
    setDraftProjectRoot("");
    setProjectRoot("");
    await bootstrap("");
  }

  async function handleOpenPath(path: string) {
    try {
      await openInFinder(path, projectRoot || undefined);
    } catch (openFailure) {
      setError(
        openFailure instanceof Error ? openFailure.message : text.defaultOpenError,
      );
    }
  }

  return (
    <main className={styles.appShell}>
      <TopBar
        activeTab={activeTab}
        language={language}
        onLanguageChange={setLanguage}
        onTabChange={setActiveTab}
      />

      {error ? (
        <section className={styles.errorBanner}>
          <strong>{text.scanFailedTitle}</strong>
          <span>{error}</span>
        </section>
      ) : null}

      {activeTab === "skills" ? (
        <SkillsTab
          agentCounts={agentCounts}
          agentFilter={agentFilter}
          filteredSkills={filteredSkills}
          language={language}
          loading={busy}
          onAgentFilterChange={setAgentFilter}
          onOpenFolder={() => selectedSkill && handleOpenPath(selectedSkill.path)}
          onOpenSkillFile={() => selectedSkill && handleOpenPath(selectedSkill.skill_md)}
          onRescan={() => void refresh(projectRoot, false)}
          onScopeFilterChange={setScopeFilter}
          onSearchQueryChange={setSearchQuery}
          onSelectSkill={setSelectedSkillPath}
          previewContent={selectedSkill ? previewCache[selectedSkill.skill_md] : undefined}
          previewError={previewError}
          previewLoading={selectedSkill?.skill_md === previewLoadingPath}
          scopeCounts={scopeCounts}
          scopeFilter={scopeFilter}
          searchQuery={searchQuery}
          selectedSkill={selectedSkill}
          totalSkills={skills.length}
          warningCount={warnings.length}
        />
      ) : null}

      {activeTab === "directories" ? (
        <DirectoriesTab
          language={language}
          onOpenDirectory={(path) => void handleOpenPath(path)}
          roots={summary?.roots ?? []}
          skills={skills}
          warnings={warnings}
        />
      ) : null}

      {activeTab === "settings" ? (
        <SettingsTab
          draftProjectRoot={draftProjectRoot}
          language={language}
          onApply={() => void handleApplySettings()}
          onClear={() => void handleClearProjectRoot()}
          onLanguageChange={setLanguage}
          onProjectRootChange={setDraftProjectRoot}
          projectRoot={projectRoot}
          saving={busy}
        />
      ) : null}
    </main>
  );
}

export default App;
