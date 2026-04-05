import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import panels from "../../styles/_panels.module.css";
import {
  exportSkillsByTags,
  installSkillToTarget,
  loadSkillInstallStatuses,
} from "../../api/library";
import { FilterPill } from "../../components/FilterPill";
import { SearchField } from "../../components/SearchField";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/ToastProvider";
import { copy, scopeLabel, agentLabel, friendlyErrorMessage, type Language } from "../../i18n";
import type { AgentFilter, ScopeFilter, SkillInstallStatus, SkillItem } from "../../types";
import { InstallModal } from "./InstallModal";
import { LibraryDetailsPanel } from "./LibraryDetailsPanel";
import { SkillGalleryCard } from "./SkillGalleryCard";

type LibraryPageProps = {
  agentCounts: Record<AgentFilter, number>;
  agentFilter: AgentFilter;
  allTags: string[];
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
  onSetSkillTags: (skillMd: string, tags: string[]) => void;
  onTagFilterChange: (tags: string[]) => void;
  onUpdateVariantLabel: (skillPath: string, variantLabel: string) => void;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  searchQuery: string;
  scopeCounts: Record<ScopeFilter, number>;
  scopeFilter: ScopeFilter;
  selectedSkill: SkillItem | null;
  tagFilter: string[];
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
  allTags,
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
  onSetSkillTags,
  onTagFilterChange,
  onUpdateVariantLabel,
  previewContent,
  previewError,
  previewLoading,
  searchQuery,
  scopeCounts,
  scopeFilter,
  selectedSkill,
  tagFilter,
  hasUpdateFor,
  onUpdateSkill,
  updatingPath,
}: LibraryPageProps) {
  const text = copy[language];
  const { showToast } = useToast();
  const [showTagFilters, setShowTagFilters] = useState(false);
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
          variantRowTitle(left, language).localeCompare(variantRowTitle(right, language))
        ),
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [filteredSkills, language]);

  const selectedFamilySkills = useMemo(
    () =>
      selectedSkill
        ? (familyGroups.find((group) => group.familyKey === selectedSkill.family_key)?.skills ?? [
            selectedSkill,
          ])
        : [],
    [familyGroups, selectedSkill]
  );

  const isDetailView = selectedSkill != null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [modalSkill, setModalSkill] = useState<SkillItem | null>(null);
  const [installStatusMap, setInstallStatusMap] = useState<Record<string, SkillInstallStatus[]>>(
    {}
  );
  const galleryRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const representatives = familyGroups.map((g) => g.skills[0]);
    const missing = representatives.filter((skill) => !installStatusMap[skill.path]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (skill) => {
        try {
          const statuses = await loadSkillInstallStatuses(skill.path);
          return { path: skill.path, statuses } as const;
        } catch {
          return { path: skill.path, statuses: [] } as const;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setInstallStatusMap((prev) => {
        const next = { ...prev };
        for (const { path, statuses } of results) {
          next[path] = statuses;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [familyGroups, installStatusMap]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      const menu = document.querySelector(`[data-context-menu="true"]`);
      if (menu?.contains(target)) return;
      setContextMenu(null);

      if (showTagFilters && tagDropdownRef.current && !tagDropdownRef.current.contains(target)) {
        setShowTagFilters(false);
      }
    }

    function handleScroll() {
      setContextMenu(null);
      setShowTagFilters(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
        setShowTagFilters(false);
      }
    }

    if (contextMenu || showTagFilters) {
      window.addEventListener("click", handleClick, { capture: true });
      window.addEventListener("scroll", handleScroll, { capture: true });
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu, showTagFilters]);

  return (
    <section className={layout.pageSection}>
      {!isDetailView ? (
        <>
          <header className={layout.pageHeader}>
            <div>
              <p className={layout.sectionLabel}>{text.libraryTitle}</p>
              <h1 className={layout.pageTitle}>{text.libraryBody}</h1>
            </div>
          </header>

          <SearchField
            ariaLabel={text.searchLabel}
            onChange={onSearchQueryChange}
            placeholder={text.searchPlaceholder}
            value={searchQuery}
          />

          <div className={forms.filterStrip}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "var(--sm-radius-sm)",
                background: "var(--sm-bg-elevated)",
                border: "1px solid var(--sm-border)",
              }}
            >
              <div className={forms.pillGroup}>
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
                <FilterPill
                  active={agentFilter === "open_claw"}
                  label={`${agentLabel("open_claw")} (${agentCounts.open_claw})`}
                  onClick={() => onAgentFilterChange("open_claw")}
                />
              </div>

              <div className={forms.pillGroup}>
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

              {allTags.length > 0 ? (
                <div className={forms.pillGroup} style={{ position: "relative" }}>
                  <FilterPill
                    active={showTagFilters || tagFilter.length > 0}
                    label={`${text.filterByTag}${tagFilter.length > 0 ? ` (${tagFilter.length})` : ""} ${showTagFilters ? "▲" : "▼"}`}
                    onClick={() => setShowTagFilters((v) => !v)}
                  />
                  {showTagFilters ? (
                    <div
                      ref={tagDropdownRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        zIndex: 50,
                        minWidth: 220,
                        maxWidth: 320,
                        padding: "10px 14px",
                        borderRadius: "var(--sm-radius-sm)",
                        background: "var(--sm-surface)",
                        border: "1px solid var(--sm-border)",
                        boxShadow: "var(--sm-shadow-lg)",
                      }}
                    >
                      <div
                        className={forms.pillGroup}
                        style={{ marginBottom: tagFilter.length > 0 ? 10 : 0 }}
                      >
                        {allTags.map((tag) => (
                          <FilterPill
                            key={tag}
                            active={tagFilter.includes(tag)}
                            label={`#${tag}`}
                            onClick={() => {
                              onTagFilterChange(
                                tagFilter.includes(tag)
                                  ? tagFilter.filter((t) => t !== tag)
                                  : [...tagFilter, tag]
                              );
                            }}
                          />
                        ))}
                      </div>

                      {tagFilter.length > 0 ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className={buttons.secondaryButton}
                            style={{ padding: "6px 10px", fontSize: 12, flex: 1 }}
                            onClick={async () => {
                              const destination = await openDialog({ directory: true });
                              if (!destination) return;
                              try {
                                const count = await exportSkillsByTags(destination, tagFilter);
                                showToast(
                                  text.exportSuccess.replace("{count}", String(count)),
                                  "success"
                                );
                              } catch (error: unknown) {
                                showToast(friendlyErrorMessage(error, language), "error");
                              }
                            }}
                          >
                            {text.exportByTag}
                          </button>
                          <button
                            type="button"
                            className={buttons.secondaryButton}
                            style={{ padding: "6px 10px", fontSize: 12, flex: 1 }}
                            onClick={() => onTagFilterChange([])}
                          >
                            {text.clearSearch}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {filteredSkills.length === 0 ? (
            <EmptyState
              icon={
                searchQuery.trim() ||
                agentFilter !== "all" ||
                scopeFilter !== "all" ||
                tagFilter.length > 0
                  ? "search"
                  : "celebration"
              }
              title={
                searchQuery.trim() ||
                agentFilter !== "all" ||
                scopeFilter !== "all" ||
                tagFilter.length > 0
                  ? text.emptyLibraryTitle
                  : text.emptyLibraryWelcomeTitle
              }
              body={
                searchQuery.trim() ||
                agentFilter !== "all" ||
                scopeFilter !== "all" ||
                tagFilter.length > 0
                  ? text.noMatchingSkillsBody
                  : text.emptyLibraryWelcomeBody
              }
            >
              {!searchQuery.trim() &&
              agentFilter === "all" &&
              scopeFilter === "all" &&
              tagFilter.length === 0 ? (
                <>
                  <div className={layout.emptyStateActions}>
                    <button type="button" className={buttons.primaryButton} onClick={onScanDisk}>
                      {text.emptyLibraryScanAction}
                    </button>
                    <button
                      type="button"
                      className={buttons.secondaryButton}
                      onClick={onGoToDiscover}
                    >
                      {text.emptyLibraryDiscoverAction}
                    </button>
                  </div>
                  <p className={layout.firstRunHint}>{text.emptyLibraryFirstRunHint}</p>
                </>
              ) : null}
            </EmptyState>
          ) : (
            <div ref={galleryRef} className={cards.skillGalleryGrid}>
              {familyGroups.map((group, index) => {
                const representative = group.skills[0];
                const delay = Math.min(index * 40, 600);
                const groupTags = Array.from(new Set(group.skills.flatMap((s) => s.tags))).sort();
                return (
                  <SkillGalleryCard
                    key={group.familyKey}
                    group={group}
                    language={language}
                    delay={delay}
                    tags={groupTags}
                    onSelect={() => onSelectSkill(representative.path)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({ x: event.clientX, y: event.clientY, skill: representative });
                    }}
                    onInstall={(e) => {
                      e.stopPropagation();
                      setModalSkill(representative);
                    }}
                    onAddTag={(tag) => {
                      for (const skill of group.skills) {
                        if (!skill.tags.includes(tag)) {
                          onSetSkillTags(skill.skill_md, [...skill.tags, tag]);
                        }
                      }
                    }}
                    onTagClick={(tag) => {
                      setShowTagFilters(false);
                      onTagFilterChange([tag]);
                    }}
                    installTitle={text.installToCustomLocation}
                    installLabel={text.cardInstallAction}
                    variantCountLabel={text.variantCountLabel}
                    issuesLabel={text.issuesLabel}
                    hasUpdate={hasUpdateFor(representative.path)}
                    updateLabel={text.updateAvailable}
                    addTagLabel={text.addTagAction}
                    installStatuses={installStatusMap[representative.path] ?? []}
                    installedLabel={text.installedLabel}
                    installIssuesLabel={text.installIssuesLabel}
                  />
                );
              })}
            </div>
          )}

          {contextMenu
            ? createPortal(
                <div
                  data-context-menu="true"
                  role="menu"
                  className={panels.contextMenu}
                  style={{ top: contextMenu.y, left: contextMenu.x }}
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
                </div>,
                document.body
              )
            : null}
        </>
      ) : (
        <div className={panels.detailViewFull}>
          <LibraryDetailsPanel
            familySkills={selectedFamilySkills}
            hasUpdateFor={hasUpdateFor}
            language={language}
            onBack={() => onSelectSkill("")}
            onOpenPath={onOpenPath}
            onPromoteVariant={onPromoteVariant}
            onSelectSkill={onSelectSkill}
            onSetSkillTags={onSetSkillTags}
            onTagFilterChange={onTagFilterChange}
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
      className={panels.contextMenuItem}
      disabled={disabled}
      onClick={onClick}
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
