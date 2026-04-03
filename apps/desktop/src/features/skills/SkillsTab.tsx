import styles from "../../App.module.css";
import { agentLabel, copy, scopeLabel, type Language } from "../../i18n";
import type {
  AgentFilter,
  InstalledSkill,
  ScopeFilter,
} from "../../types";
import { SkillDetailsPanel } from "./SkillDetailsPanel";

type SkillsTabProps = {
  agentCounts: Record<AgentFilter, number>;
  agentFilter: AgentFilter;
  filteredSkills: InstalledSkill[];
  language: Language;
  loading: boolean;
  onAgentFilterChange: (filter: AgentFilter) => void;
  onOpenFolder: () => void;
  onOpenSkillFile: () => void;
  onRescan: () => void;
  onScopeFilterChange: (filter: ScopeFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectSkill: (skillPath: string) => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  scopeCounts: Record<ScopeFilter, number>;
  scopeFilter: ScopeFilter;
  searchQuery: string;
  selectedSkill: InstalledSkill | null;
  totalSkills: number;
  warningCount: number;
};

export function SkillsTab({
  agentCounts,
  agentFilter,
  filteredSkills,
  language,
  loading,
  onAgentFilterChange,
  onOpenFolder,
  onOpenSkillFile,
  onRescan,
  onScopeFilterChange,
  onSearchQueryChange,
  onSelectSkill,
  previewContent,
  previewError,
  previewLoading,
  scopeCounts,
  scopeFilter,
  searchQuery,
  selectedSkill,
  totalSkills,
  warningCount,
}: SkillsTabProps) {
  const text = copy[language];

  return (
    <section className={styles.pageSection}>
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.visuallyHidden}>{text.searchLabel}</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            placeholder={text.searchPlaceholder}
          />
        </label>
        <button type="button" className={styles.primaryButton} onClick={onRescan}>
          {loading ? text.rescanning : text.rescan}
        </button>
      </div>

      <div className={styles.filterStrip}>
        <div className={styles.pillGroup}>
          <FilterPill
            active={agentFilter === "all"}
            label={`${text.allAgents} (${agentCounts.all})`}
            onClick={() => onAgentFilterChange("all")}
          />
          <FilterPill
            active={agentFilter === "codex"}
            label={`${agentLabel("codex", language)} (${agentCounts.codex})`}
            onClick={() => onAgentFilterChange("codex")}
          />
          <FilterPill
            active={agentFilter === "claude_code"}
            label={`${agentLabel("claude_code", language)} (${agentCounts.claude_code})`}
            onClick={() => onAgentFilterChange("claude_code")}
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
      </div>

      <div className={styles.splitLayout}>
        <section className={styles.listPanel}>
          {filteredSkills.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{text.emptySkillsTitle}</strong>
              <p>{text.emptySkillsBody}</p>
              {searchQuery ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onSearchQueryChange("")}
                >
                  {text.clearSearch}
                </button>
              ) : null}
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
                  <div className={styles.skillRowContent}>
                    <strong>{skill.display_name}</strong>
                    <p>{skill.description ?? text.descriptionFallback}</p>
                  </div>
                  <div className={styles.skillRowMeta}>
                    <span className={styles.badge}>{scopeLabel(skill.scope, language)}</span>
                    <span className={styles.agentBadge}>
                      {agentLabel(skill.agent, language)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <SkillDetailsPanel
          language={language}
          loading={previewLoading}
          onOpenFolder={onOpenFolder}
          onOpenSkillFile={onOpenSkillFile}
          previewContent={previewContent}
          previewError={previewError}
          selectedSkill={selectedSkill}
        />
      </div>
    </section>
  );
}

type FilterPillProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function FilterPill({ active, label, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      className={active ? styles.filterPillActive : styles.filterPill}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
