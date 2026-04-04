import { useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import styles from "../../App.module.css";
import { installSkillToTarget } from "../../api/library";
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

type ContextMenuState = {
  x: number;
  y: number;
  skill: SkillItem;
} | null;

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

  const isDetailView = selectedSkill != null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [installingPath, setInstallingPath] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideMenu = (event.currentTarget as HTMLElement | null)?.querySelector(
        `[data-context-menu="true"]`,
      )?.contains(target);
      if (clickedInsideMenu) {
        return;
      }
      setContextMenu(null);
    }

    function handleScroll() {
      setContextMenu(null);
    }

    if (contextMenu) {
      window.addEventListener("click", handleClick, { capture: true });
      window.addEventListener("scroll", handleScroll, { capture: true });
    }

    return () => {
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [contextMenu]);

  async function handleContextMenuInstall(skill: SkillItem) {
    const selected = await openDialog({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") {
      return;
    }
    setInstallingPath(skill.path);
    try {
      await installSkillToTarget(skill.path, selected);
      window.alert(text.contextMenuInstallSuccess);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : text.contextMenuInstallFailed;
      window.alert(message);
    } finally {
      setInstallingPath(null);
      setContextMenu(null);
    }
  }

  return (
    <section className={styles.pageSection}>
      {!isDetailView ? (
        <>
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
            <div ref={galleryRef} className={styles.skillGalleryGrid}>
              {familyGroups.map((group, index) => {
                const representative = group.skills[0];
                const delay = Math.min(index * 40, 600);
                return (
                  <button
                    key={group.familyKey}
                    type="button"
                    className={styles.skillGalleryCard}
                    style={{ "--delay": `${delay}ms` } as React.CSSProperties}
                    onClick={() => onSelectSkill(representative.path)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, skill: representative });
                    }}
                  >
                    <div className={styles.skillCardHeader}>
                      <div
                        className={styles.skillCardIcon}
                        style={{ background: familyGradient(group.familyKey) }}
                        aria-hidden
                      >
                        {group.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                    <h3 className={styles.skillCardTitle}>{group.displayName}</h3>
                    <p className={styles.skillCardDescription}>
                      {representative.description ?? text.descriptionFallback}
                    </p>
                    <div className={styles.skillCardMeta}>
                      <span className={styles.badge}>
                        {scopeLabel(representative.scope, language)}
                      </span>
                      <span className={styles.agentBadge} data-agent={representative.agent}>
                        {agentLabel(representative.agent)}
                      </span>
                      {representative.source_type === "remote" ? (
                        <span className={styles.sourceBadge}>
                          {sourceLabel(representative.source_type, language)}
                        </span>
                      ) : null}
                      <span className={styles.badge}>
                        {group.skills.length} {text.variantCountLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {contextMenu ? (
            <div
              data-context-menu="true"
              className={styles.contextMenu}
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                minWidth: 180,
                background: "var(--sm-surface)",
                border: "1px solid var(--sm-border)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                padding: "6px 0",
              }}
            >
              <ContextMenuItem
                onClick={() => {
                  onSelectSkill(contextMenu.skill.path);
                  setContextMenu(null);
                }}
              >
                {text.viewDetails}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  onOpenPath(contextMenu.skill.path);
                  setContextMenu(null);
                }}
              >
                {text.openFolder}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={installingPath === contextMenu.skill.path}
                onClick={() => void handleContextMenuInstall(contextMenu.skill)}
              >
                {installingPath === contextMenu.skill.path
                  ? text.installingLabel
                  : text.installToCustomLocation}
              </ContextMenuItem>
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.detailViewFull}>
          <LibraryDetailsPanel
            familySkills={selectedFamilySkills}
            hasUpdateFor={hasUpdateFor}
            language={language}
            onBack={() => onSelectSkill("")}
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
      )}
    </section>
  );
}

function ContextMenuItem({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 14px",
        fontSize: "0.9rem",
        color: disabled ? "var(--sm-text-muted)" : "var(--sm-text)",
        background: "transparent",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--sm-surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
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

function familyGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h} 55% 55%), hsl(${h} 60% 40%))`;
}
