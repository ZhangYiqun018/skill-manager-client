import badges from "../../styles/_badges.module.css";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import layout from "../../styles/_layout.module.css";
import lists from "../../styles/_lists.module.css";
import { copy, type Language } from "../../i18n";
import type { DiscoveryGroup, DiscoveryRecord } from "../../types";
import { groupActionLabel, groupNeedsResolution } from "./utils";
import { DiscoveryCandidateRow } from "./DiscoveryCandidateRow";

type DiscoveryGroupListProps = {
  adoptingPaths: string[];
  groups: DiscoveryGroup[];
  language: Language;
  onAdoptGroup: (group: DiscoveryGroup) => void;
  onResolveGroup: (group: DiscoveryGroup) => void;
  onSelectSkill: (skillPath: string) => void;
  onToggleSelection: (skillPath: string) => void;
  selectedPaths: string[];
  selectedSkill: DiscoveryRecord | null;
};

function actionBadgeClass(group: DiscoveryGroup): string {
  if (group.kind === "variant" || group.existing_variants.length > 0) {
    return badges.actionBadgeReview;
  }
  if (group.kind === "exact_duplicate") {
    return badges.actionBadgeDuplicate;
  }
  return badges.actionBadgeReady;
}

export function DiscoveryGroupList({
  adoptingPaths,
  groups,
  language,
  onAdoptGroup,
  onResolveGroup,
  onSelectSkill,
  onToggleSelection,
  selectedPaths,
  selectedSkill,
}: DiscoveryGroupListProps) {
  const text = copy[language];

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={lists.discoveryGroupList}>
      {groups.map((group) => {
        const groupBusy = group.recommended_paths.some((path) => adoptingPaths.includes(path));
        const needsResolution = groupNeedsResolution(group);

        return (
          <article key={group.family_key} className={cards.discoveryGroup}>
            <div className={cards.discoveryGroupHeader}>
              <div>
                <strong>{group.display_name}</strong>
                <div className={layout.groupMetaRow}>
                  <span className={actionBadgeClass(group)}>
                    {groupActionLabel(group, language)}
                  </span>
                  {group.occurrence_count > 1 ? (
                    <span className={badges.inlineTag}>
                      {text.discoveryFoundNTimes.replace("{count}", String(group.occurrence_count))}
                    </span>
                  ) : null}
                  {groupBusy ? (
                    <span className={badges.inlineTag}>{text.adoptingSkill}</span>
                  ) : null}
                </div>
              </div>
              <div>
                {needsResolution ? (
                  <button
                    type="button"
                    className={buttons.secondaryButton}
                    disabled={groupBusy}
                    onClick={() => onResolveGroup(group)}
                  >
                    {text.discoveryReviewVariants}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttons.secondaryButton}
                    disabled={groupBusy}
                    onClick={() => onAdoptGroup(group)}
                  >
                    {text.discoveryAdoptGroup}
                  </button>
                )}
              </div>
            </div>

            {group.existing_variants.length > 0 ? (
              <div className={layout.candidateMetaRow}>
                {group.existing_variants.map((variant) => (
                  <span key={variant.path} className={badges.inlineTag}>
                    {variant.variant_label?.trim() || variant.display_name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={lists.skillList}>
              {group.candidates.map((candidate) => (
                <DiscoveryCandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  language={language}
                  onSelectSkill={onSelectSkill}
                  onToggleSelection={onToggleSelection}
                  selectedPaths={selectedPaths}
                  selectedSkill={selectedSkill}
                />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
