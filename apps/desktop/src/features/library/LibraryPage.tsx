import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../App.module.css";
import { installSkillToTarget } from "../../api/library";
import { FilterPill } from "../../components/FilterPill";
import { SearchField } from "../../components/SearchField";
import { useToast } from "../../components/ToastProvider";
import { copy, scopeLabel, agentLabel, friendlyErrorMessage, type Language } from "../../i18n";
import type {
  AgentFilter,
  ScopeFilter,
  SkillItem,
} from "../../types";
import { InstallModal } from "./InstallModal";
import { LibraryDetailsPanel } from "./LibraryDetailsPanel";
import { SkillGalleryCard } from "./SkillGalleryCard";

type LibraryPageProps = {
  agentCounts: Record<AgentFilter, number>;
  agentFilter: AgentFilter;
  filteredSkills: SkillItem[];
  language: Language;
  onAgentFilterChange: (filter: AgentFilter) => void;
  onGoToDiscover: () => void;
  onOpenPath: (path: string) => void;
  onPromoteVariant: (path: string) => void;
  onScanDisk: () => void;
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
  onGoToDiscover,
  onOpenPath,
  onPromoteVariant,
  onScanDisk,
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
  const { showToast } = useToast();
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
  const [modalSkill, setModalSkill] = useState<SkillItem | null>(null);
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
              <FilterPill
                active={agentFilter === "agent"}
                label={`${agentLabel("agent")} (${agentCounts.agent})`}
                onClick={() => onAgentFilterChange("agent")}
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
              <span className={styles.emptyStateIcon}>
                {searchQuery.trim() || agentFilter !== "all" || scopeFilter !== "all" ? "🔍" : "🎉"}
              </span>
              <strong>
                {searchQuery.trim() || agentFilter !== "all" || scopeFilter !== "all"
                  ? text.emptyLibraryTitle
                  : text.emptyLibraryWelcomeTitle}
              </strong>
              <p>
                {searchQuery.trim() || agentFilter !== "all" || scopeFilter !== "all"
                  ? text.noMatchingSkillsBody
                  : text.emptyLibraryWelcomeBody}
              </p>
              {!searchQuery.trim() && agentFilter === "all" && scopeFilter === "all" ? (
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className={styles.primaryButton} onClick={onScanDisk}>
                    {text.emptyLibraryScanAction}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={onGoToDiscover}>
                    {text.emptyLibraryDiscoverAction}
                  </button>
                </div>
              ) : null}
              {!searchQuery.trim() && agentFilter === "all" && scopeFilter === "all" ? (
                <p
                  style={{
                    marginTop: 16,
                    fontSize: "0.8rem",
                    color: "var(--sm-text-secondary)",
                    maxWidth: 400,
                    textAlign: "center",
                  }}
                >
                  {text.emptyLibraryFirstRunHint}
                </p>
              ) : null}
            </div>
          ) : (
            <div ref={galleryRef} className={styles.skillGalleryGrid}>
              {familyGroups.map((group, index) => {
                const representative = group.skills[0];
                const delay = Math.min(index * 40, 600);
                return (
                  <SkillGalleryCard
                    key={group.familyKey}
                    group={group}
                    language={language}
                    delay={delay}
                    onSelect={() => onSelectSkill(representative.path)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, skill: representative });
                    }}
                    onInstall={(e) => {
                      e.stopPropagation();
                      setModalSkill(representative);
                    }}
                    installTitle={text.installToCustomLocation}
                    installLabel={text.cardInstallAction}
                    variantCountLabel={text.variantCountLabel}
                    issuesLabel={text.issuesLabel}
                    hasUpdate={hasUpdateFor(representative.path)}
                    updateLabel={text.updateAvailable}
                  />
                );
              })}
            </div>
          )}

          {contextMenu ? (
            <div
              data-context-menu="true"
              role="menu"
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
                onClick={() => {
                  setModalSkill(contextMenu.skill);
                  setContextMenu(null);
                }}
              >
                {text.installToCustomLocation}
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

      {modalSkill ? (
        <InstallModal
          skill={modalSkill}
          language={language}
          onClose={() => setModalSkill(null)}
          onInstall={async (targetPath, targetAgents, targetMethod) => {
            const errors: string[] = [];
            for (const agent of targetAgents) {
              try {
                await installSkillToTarget(modalSkill.path, targetPath, agent, targetMethod);
              } catch (e) {
                errors.push(`${agentLabel(agent)}: ${friendlyErrorMessage(e, language)}`);
              }
            }
            if (errors.length === 0) {
              showToast(text.installSuccess, "success");
              setModalSkill(null);
            } else {
              showToast(`${text.installFailed}\n${errors.join("\n")}`, "error");
            }
          }}
        />
      ) : null}
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
      role="menuitem"
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
