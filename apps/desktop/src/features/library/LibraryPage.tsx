import { useMemo } from "react";
import styles from "../../App.module.css";
import { FilterPill } from "../../components/FilterPill";
import { SearchField } from "../../components/SearchField";
import { copy, scopeLabel, agentLabel, sourceLabel, type Language } from "../../i18n";
import type {
  AgentFilter,
  ScopeFilter,
  SkillItem,
} from "../../types";
import { LibraryDetailsPanel } from "./LibraryDetailsPanel";

type LibraryPageProps = {
  agentCounts: Record<AgentFilter, number>;
  agentFilter: AgentFilter;
  filteredSkills: SkillItem[];
  language: Language;
  onAgentFilterChange: (filter: AgentFilter) => void;
  onOpenPath: (path: string) => void;
  onPromoteVariant: (path: string) => void;
  onScopeFilterChange: (filter: ScopeFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectSkill: (skillPath: string) => void;
  onUpdateVariantLabel: (skillPath: string, variantLabel: string) => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  searchQuery: string;
  scopeCounts: Record<ScopeFilter, number>;
  scopeFilter: ScopeFilter;
  selectedSkill: SkillItem | null;
  hasUpdateFor: (path: string) => boolean;
  onUpdateSkill: (path: string) => void;
  updatingPath: string | null;
};

type LibraryFamilyGroup = {
  familyKey: string;
  displayName: string;
  skills: SkillItem[];
};

export function LibraryPage({
  agentCounts,
  agentFilter,
  filteredSkills,
  language,
  onAgentFilterChange,
  onOpenPath,
  onPromoteVariant,
  onScopeFilterChange,
  onSearchQueryChange,
  onSelectSkill,
  onUpdateVariantLabel,
  previewContent,
  previewError,
  previewLoading,
  searchQuery,
  scopeCounts,
  scopeFilter,
  selectedSkill,
  hasUpdateFor,
  onUpdateSkill,
  updatingPath,
}: LibraryPageProps) {
  const text = copy[language];
  const familyGroups = useMemo<LibraryFamilyGroup[]>(() => {
    const groups = new Map<string, LibraryFamilyGroup>();

    for (const skill of filteredSkills) {
      const familyKey = skill.family_key || skill.slug || skill.path;
      const existing = groups.get(familyKey);

      if (existing) {
        existing.skills.push(skill);
        continue;
      }

      groups.set(familyKey, {
        familyKey,
        displayName: skill.display_name,
        skills: [skill],
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        skills: [...group.skills].sort((left, right) =>
          variantRowTitle(left, language).localeCompare(variantRowTitle(right, language)),
        ),
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [filteredSkills, language]);

  const selectedFamilySkills = useMemo(
    () =>
      selectedSkill
        ? familyGroups.find((group) => group.familyKey === selectedSkill.family_key)?.skills ?? [
            selectedSkill,
          ]
        : [],
    [familyGroups, selectedSkill],
  );

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.libraryTitle}</p>
          <h1 className={styles.pageTitle}>{text.libraryBody}</h1>
        </div>
      </header>

      <SearchField
        ariaLabel={text.searchLabel}
        onChange={onSearchQueryChange}
        placeholder={text.searchPlaceholder}
        value={searchQuery}
      />

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

      <div className={styles.splitLayout}>
        <section className={styles.listPanel}>
          {filteredSkills.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon}>📁</span>
              <strong>{text.emptyLibraryTitle}</strong>
              <p>
                {searchQuery.trim()
                  ? text.noMatchingSkillsBody
                  : text.noSkillsInLibraryBody}
              </p>
            </div>
          ) : (
            <div className={styles.familyGroupList}>
              {familyGroups.map((group) => (
                <article key={group.familyKey} className={styles.familyGroupCard}>
                  <div className={styles.familyGroupHeader}>
                    <div>
                      <strong>{group.displayName}</strong>
                      <p className={styles.helperText}>
                        {group.skills.length} {text.variantCountLabel}
                      </p>
                    </div>
                  </div>

                  <div className={styles.skillList}>
                    {group.skills.map((skill) => (
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
                          <strong>{variantRowTitle(skill, language)}</strong>
                          <p>{skill.description ?? text.descriptionFallback}</p>
                          <div className={styles.groupMetaRow}>
                            {skill.variant_label ? (
                              <span className={styles.inlineTag}>
                                {text.variantLabelLabel}: {skill.variant_label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.skillRowMeta}>
                          <span className={styles.badge}>{scopeLabel(skill.scope, language)}</span>
                          <span className={styles.agentBadge} data-agent={skill.agent}>
                            {agentLabel(skill.agent)}
                          </span>
                          {skill.source_type === "remote" ? (
                            <span className={styles.sourceBadge}>
                              {sourceLabel(skill.source_type, language)}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <LibraryDetailsPanel
          familySkills={selectedFamilySkills}
          hasUpdateFor={hasUpdateFor}
          language={language}
          onOpenPath={onOpenPath}
          onPromoteVariant={onPromoteVariant}
          onSelectSkill={onSelectSkill}
          onUpdateSkill={onUpdateSkill}
          onUpdateVariantLabel={onUpdateVariantLabel}
          previewContent={previewContent}
          previewError={previewError}
          previewLoading={previewLoading}
          selectedSkill={selectedSkill}
          updatingPath={updatingPath}
        />
      </div>
    </section>
  );
}

function variantRowTitle(skill: SkillItem, language: Language): string {
  if (skill.variant_label?.trim()) {
    return skill.variant_label.trim();
  }

  return `${agentLabel(skill.agent)} · ${scopeLabel(skill.scope, language)} · ${shortHash(skill.content_hash)}`;
}

function shortHash(contentHash: string): string {
  return contentHash.slice(0, 8);
}
