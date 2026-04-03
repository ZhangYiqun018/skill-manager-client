import styles from "../../App.module.css";
import { FilterPill } from "../../components/FilterPill";
import { copy, sourceLabel, scopeLabel, agentLabel, type Language } from "../../i18n";
import type {
  AgentFilter,
  ScopeFilter,
  SkillItem,
  SourceFilter,
  InstallTargetRecord,
} from "../../types";
import { LibraryDetailsPanel } from "./LibraryDetailsPanel";

type LibraryPageProps = {
  agentCounts: Record<AgentFilter, number>;
  agentFilter: AgentFilter;
  filteredSkills: SkillItem[];
  language: Language;
  loading: boolean;
  onAgentFilterChange: (filter: AgentFilter) => void;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  onRefreshIndex: () => void;
  onScopeFilterChange: (filter: ScopeFilter) => void;
  onSelectSkill: (skillPath: string) => void;
  onSourceFilterChange: (filter: SourceFilter) => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  relatedTargets: InstallTargetRecord[];
  scopeCounts: Record<ScopeFilter, number>;
  scopeFilter: ScopeFilter;
  selectedSkill: SkillItem | null;
  sourceCounts: Record<SourceFilter, number>;
  sourceFilter: SourceFilter;
  totalSkills: number;
  warningCount: number;
};

export function LibraryPage({
  agentCounts,
  agentFilter,
  filteredSkills,
  language,
  loading,
  onAgentFilterChange,
  onOpenFolder,
  onOpenSkillFile,
  onRefreshIndex,
  onScopeFilterChange,
  onSelectSkill,
  onSourceFilterChange,
  previewContent,
  previewError,
  previewLoading,
  relatedTargets,
  scopeCounts,
  scopeFilter,
  selectedSkill,
  sourceCounts,
  sourceFilter,
  totalSkills,
  warningCount,
}: LibraryPageProps) {
  const text = copy[language];

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.libraryTitle}</p>
          <h1 className={styles.pageTitle}>{text.libraryBody}</h1>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onRefreshIndex}>
          {loading ? text.refreshingIndex : text.refreshIndex}
        </button>
      </header>

      <div className={styles.filterStrip}>
        <div className={styles.pillGroup}>
          <FilterPill
            active={agentFilter === "all"}
            label={`${text.allAgents} (${agentCounts.all})`}
            onClick={() => onAgentFilterChange("all")}
          />
          <FilterPill
            active={agentFilter === "codex"}
            label={`${agentLabel("codex")} (${agentCounts.codex})`}
            onClick={() => onAgentFilterChange("codex")}
          />
          <FilterPill
            active={agentFilter === "claude_code"}
            label={`${agentLabel("claude_code")} (${agentCounts.claude_code})`}
            onClick={() => onAgentFilterChange("claude_code")}
          />
        </div>

        <div className={styles.pillGroup}>
          <FilterPill
            active={sourceFilter === "all"}
            label={`${text.allSources} (${sourceCounts.all})`}
            onClick={() => onSourceFilterChange("all")}
          />
          <FilterPill
            active={sourceFilter === "import"}
            label={`${sourceLabel("import", language)} (${sourceCounts.import})`}
            onClick={() => onSourceFilterChange("import")}
          />
          <FilterPill
            active={sourceFilter === "remote"}
            label={`${sourceLabel("remote", language)} (${sourceCounts.remote})`}
            onClick={() => onSourceFilterChange("remote")}
          />
        </div>

        <div className={styles.pillGroup}>
          <FilterPill
            active={scopeFilter === "all"}
            label={`${text.allScopes} (${scopeCounts.all})`}
            onClick={() => onScopeFilterChange("all")}
          />
          <FilterPill
            active={scopeFilter === "global"}
            label={`${scopeLabel("global", language)} (${scopeCounts.global})`}
            onClick={() => onScopeFilterChange("global")}
          />
          <FilterPill
            active={scopeFilter === "project"}
            label={`${scopeLabel("project", language)} (${scopeCounts.project})`}
            onClick={() => onScopeFilterChange("project")}
          />
        </div>
      </div>

      <div className={styles.inlineSummary}>
        {text.showing} {filteredSkills.length} {text.of} {totalSkills} {text.skills}
        {" · "}
        {warningCount} {text.warningsInline}
        {" · "}
        {text.indexedInventory}
      </div>

      <div className={styles.splitLayout}>
        <section className={styles.listPanel}>
          {filteredSkills.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{text.emptyLibraryTitle}</strong>
              <p>{text.emptyLibraryBody}</p>
            </div>
          ) : (
            <div className={styles.skillList}>
              {filteredSkills.map((skill) => (
                <button
                  key={`${skill.agent}-${skill.scope}-${skill.path}`}
                  type="button"
                  className={
                    selectedSkill?.path === skill.path
                      ? styles.skillRowActive
                      : styles.skillRow
                  }
                  onClick={() => onSelectSkill(skill.path)}
                >
                  <div className={styles.skillRowStripe} data-state={skill.health_state} />
                  <div className={styles.skillRowContent}>
                    <strong>{skill.display_name}</strong>
                    <p>{skill.description ?? text.descriptionFallback}</p>
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
          relatedTargets={relatedTargets}
          selectedSkill={selectedSkill}
        />
      </div>
    </section>
  );
}
