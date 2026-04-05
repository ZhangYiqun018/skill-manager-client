import badges from "../../styles/_badges.module.css";
import { agentLabel, sourceLabel, type Language } from "../../i18n";
import type { SkillItem } from "../../types";

export interface SkillGalleryCardProps {
  group: {
    familyKey: string;
    displayName: string;
    skills: SkillItem[];
  };
  language: Language;
  delay: number;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onInstall: (event: React.MouseEvent) => void;
  installTitle: string;
  installLabel: string;
  variantCountLabel: string;
  issuesLabel: string;
  hasUpdate?: boolean;
  updateLabel?: string;
}

export function SkillGalleryCard({
  group,
  language,
  delay,
  onSelect,
  onContextMenu,
  onInstall,
  installTitle,
  installLabel,
  variantCountLabel,
  issuesLabel,
  hasUpdate,
  updateLabel,
}: SkillGalleryCardProps) {
  const representative = group.skills[0];

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
