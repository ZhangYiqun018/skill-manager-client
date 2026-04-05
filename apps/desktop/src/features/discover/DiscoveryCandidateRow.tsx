import badges from "../../styles/_badges.module.css";
import layout from "../../styles/_layout.module.css";
import lists from "../../styles/_lists.module.css";
import { agentLabel, copy, scopeLabel, type Language } from "../../i18n";
import type { DiscoveryCandidate, DiscoveryRecord } from "../../types";
import { truncatePath } from "./utils";

type DiscoveryCandidateRowProps = {
  candidate: DiscoveryCandidate;
  language: Language;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
};

export function DiscoveryCandidateRow({
  candidate,
  language,
  onSelectSkill,
  onToggleSelection,
  selectedPaths,
  selectedSkill,
}: DiscoveryCandidateRowProps) {
  const text = copy[language];
  const skill = candidate.representative;
  const checked = selectedPaths.includes(skill.path);
  const isSelectedSkill = selectedSkill?.path === skill.path;

  return (
    <div className={isSelectedSkill ? lists.selectableSkillRowActive : lists.selectableSkillRow}>
      <label className={lists.selectionCheckbox}>
        <input checked={checked} type="checkbox" onChange={() => onToggleSelection(skill.path)} />
      </label>
      <button
        type="button"
        className={isSelectedSkill ? lists.skillRowActive : lists.skillRow}
        onClick={() => onSelectSkill(skill.path)}
      >
        <div className={lists.skillRowStripe} data-state="warning" />
        <div className={lists.skillRowContent}>
          <strong>{skill.display_name}</strong>
          <p>{truncatePath(skill.path)}</p>
          {candidate.occurrence_count > 1 ? (
            <span className={`${layout.helperText} ${layout.textSmall}`}>
              {text.discoveryFoundNTimes.replace("{count}", String(candidate.occurrence_count))}
            </span>
          ) : null}
        </div>
        <div className={lists.skillRowMeta}>
          <span className={badges.badge}>{scopeLabel(skill.scope, language)}</span>
          <span className={badges.agentBadge} data-agent={skill.agent}>
            {agentLabel(skill.agent)}
          </span>
        </div>
      </button>
    </div>
  );
}
