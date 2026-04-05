import badges from "../../styles/_badges.module.css";
import { agentLabel, sourceLabel, type Language } from "../../i18n";
import type { SkillInstallStatus, SkillItem } from "../../types";
import { useState } from "react";

export interface SkillGalleryCardProps {
  group: {
    familyKey: string;
    displayName: string;
    skills: SkillItem[];
  };
  language: Language;
  delay: number;
  tags: string[];
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onInstall: (event: React.MouseEvent) => void;
  onAddTag: (tag: string) => void;
  onTagClick: (tag: string) => void;
  installTitle: string;
  installLabel: string;
  variantCountLabel: string;
  issuesLabel: string;
  hasUpdate?: boolean;
  updateLabel?: string;
  addTagLabel?: string;
  installStatuses?: SkillInstallStatus[];
  installedLabel?: string;
  installIssuesLabel?: string;
}

export function SkillGalleryCard({
  group,
  language,
  delay,
  tags,
  onSelect,
  onContextMenu,
  onInstall,
  onAddTag,
  onTagClick,
  installTitle,
  installLabel,
  variantCountLabel,
  issuesLabel,
  hasUpdate,
  updateLabel,
  addTagLabel,
  installStatuses = [],
  installedLabel,
  installIssuesLabel,
}: SkillGalleryCardProps) {
  const representative = group.skills[0];
  const [addingTag, setAddingTag] = useState(false);
  const [draft, setDraft] = useState("");

  function commitTag() {
    const trimmed = draft.trim().toLowerCase();
    if (trimmed) {
      onAddTag(trimmed);
    }
    setDraft("");
    setAddingTag(false);
  }

  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - 3);

  const healthyCount = installStatuses.filter((s) => s.health_state === "healthy").length;
  const issueCount = installStatuses.filter((s) =>
    ["broken", "copied", "conflict"].includes(s.health_state)
  ).length;

  return (
    <div
      key={group.familyKey}
      role="button"
      tabIndex={0}
      className={badges.skillGalleryCard}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
        }
      }}
    >
      <button
        type="button"
        className={badges.cardInstallButton}
        onClick={onInstall}
        title={installTitle}
      >
        {installLabel}
      </button>
      <div className={badges.skillCardHeader}>
        <div
          className={badges.skillCardIcon}
          style={{ background: familyGradient(group.familyKey) }}
          aria-hidden
        >
          {group.displayName.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <h3 className={badges.skillCardTitle}>{group.displayName}</h3>
      <div className={badges.skillCardMeta}>
        {hasUpdate ? <span className={badges.updateBadge}>{updateLabel}</span> : null}
        <span className={badges.agentBadge} data-agent={representative.agent}>
          {agentLabel(representative.agent)}
        </span>
        {representative.source_type !== "disk" ? (
          <span className={badges.sourceBadge}>
            {sourceLabel(representative.source_type, language)}
          </span>
        ) : null}
        {representative.warning_count > 0 ? (
          <span className={badges.warningBadge}>
            {representative.warning_count} {issuesLabel}
          </span>
        ) : null}
        {group.skills.length > 1 ? (
          <span className={badges.badge}>
            {group.skills.length} {variantCountLabel}
          </span>
        ) : null}
        {healthyCount > 0 ? (
          <span
            className={badges.installedBadge}
            title={`${healthyCount} healthy install${healthyCount > 1 ? "s" : ""}`}
          >
            {installedLabel ?? "Installed"}
          </span>
        ) : null}
        {issueCount > 0 ? (
          <span
            className={badges.installIssueBadge}
            title={`${issueCount} install issue${issueCount > 1 ? "s" : ""}`}
          >
            {installIssuesLabel ?? "Install issues"}
          </span>
        ) : null}
      </div>

      <div
        className={badges.skillCardMeta}
        style={{ marginTop: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={badges.tagBadge}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(tag);
            }}
            title={`#${tag}`}
          >
            #{tag}
          </button>
        ))}
        {hiddenTagCount > 0 ? <span className={badges.badge}>+{hiddenTagCount}</span> : null}
        {addingTag ? (
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitTag();
              }
              if (e.key === "Escape") {
                setDraft("");
                setAddingTag(false);
              }
            }}
            onBlur={commitTag}
            placeholder={addTagLabel ?? "+"}
            style={{
              width: 80,
              padding: "1px 6px",
              fontSize: 12,
              borderRadius: 999,
              border: "1px solid var(--sm-border)",
              background: "var(--sm-bg)",
              color: "var(--sm-text)",
            }}
          />
        ) : (
          <button
            type="button"
            className={badges.tagAddButton}
            onClick={(e) => {
              e.stopPropagation();
              setAddingTag(true);
            }}
            title={addTagLabel ?? "Add tag"}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

function familyGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${hue} 60% 35%))`;
}
