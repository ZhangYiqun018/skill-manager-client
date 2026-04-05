import { createPortal } from "react-dom";
import badges from "../../styles/_badges.module.css";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import lists from "../../styles/_lists.module.css";
import panels from "../../styles/_panels.module.css";
import { agentLabel, copy, type Language } from "../../i18n";
import type { DiscoveryGroup, SkillComparison } from "../../types";
import type { ResolutionDraft } from "./types";

type ResolutionModalProps = {
  applying: boolean;
  comparison: SkillComparison | null;
  comparisonError: string | null;
  comparisonLoading: boolean;
  entries: ResolutionDraft[];
  group: DiscoveryGroup;
  language: Language;
  onApply: () => void;
  onChangeAction: (sourcePath: string, action: "merge" | "create_variant") => void;
  onChangeMergeTarget: (sourcePath: string, mergeTargetPath: string | null) => void;
  onChangeVariantLabel: (sourcePath: string, variantLabel: string) => void;
  onClose: () => void;
  onCompare: (sourcePath: string, compareTargetPath: string | null) => void;
};

export function ResolutionModal({
  applying,
  comparison,
  comparisonError,
  comparisonLoading,
  entries,
  group,
  language,
  onApply,
  onChangeAction,
  onChangeMergeTarget,
  onChangeVariantLabel,
  onClose,
  onCompare,
}: ResolutionModalProps) {
  const text = copy[language];

  return createPortal(
    <div className={panels.modalOverlay} role="presentation">
      <section className={panels.resolutionModal} role="dialog" aria-modal="true">
        <div className={panels.panelHeader}>
          <div>
            <p className={layout.sectionLabel}>{text.resolutionTitle}</p>
            <h2 className={panels.panelTitle}>{group.display_name}</h2>
            <p className={layout.helperText}>{text.resolutionBody}</p>
          </div>
          <div className={buttons.actionRow}>
            <button type="button" className={buttons.secondaryButton} onClick={onClose}>
              {text.closeResolution}
            </button>
            <button type="button" className={buttons.primaryButton} onClick={onApply}>
              {applying ? text.adoptingSkill : text.applyResolutionAction}
            </button>
          </div>
        </div>

        <div className={panels.resolutionGrid}>
          <section className={panels.resolutionPanel}>
            <div className={layout.sectionIntro}>
              <p className={layout.sectionLabel}>{text.selectedCandidatesTitle}</p>
            </div>
            <div className={cards.resolutionEntryList}>
              {entries.map((entry) => {
                const exactMatch = group.existing_variants.find(
                  (variant) => variant.content_hash === entry.candidate.content_hash
                );

                return (
                  <article key={entry.sourcePath} className={cards.resolutionEntry}>
                    <div className={cards.discoveryGroupHeader}>
                      <div>
                        <strong>{entry.candidate.representative.display_name}</strong>
                        <div className={layout.groupMetaRow}>
                          <span className={badges.inlineTag}>
                            {entry.candidate.content_hash.slice(0, 8)}
                          </span>
                          <span className={badges.inlineTag}>
                            {entry.candidate.suggested_version_label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={layout.resolutionChoiceRow}>
                      {exactMatch ? (
                        <button
                          type="button"
                          className={
                            entry.action === "merge" ? buttons.filterPillActive : buttons.filterPill
                          }
                          onClick={() => onChangeAction(entry.sourcePath, "merge")}
                        >
                          {text.mergeExactAction}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={
                          entry.action === "create_variant"
                            ? buttons.filterPillActive
                            : buttons.filterPill
                        }
                        onClick={() => onChangeAction(entry.sourcePath, "create_variant")}
                      >
                        {text.createVariantAction}
                      </button>
                    </div>

                    {entry.action === "merge" ? (
                      <div className={panels.resolutionBody}>
                        <span>{text.existingVariantsTitle}</span>
                        <select
                          className={forms.searchField}
                          value={entry.mergeTargetPath ?? ""}
                          onChange={(event) =>
                            onChangeMergeTarget(entry.sourcePath, event.target.value || null)
                          }
                        >
                          {group.existing_variants.map((variant) => (
                            <option key={variant.path} value={variant.path}>
                              {variant.variant_label?.trim() || variant.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className={panels.resolutionBody}>
                        <span>{text.variantLabelTitle}</span>
                        <input
                          className={forms.searchField}
                          value={entry.variantLabel}
                          onChange={(event) =>
                            onChangeVariantLabel(entry.sourcePath, event.target.value)
                          }
                        />
                      </div>
                    )}

                    <div className={buttons.actionRow}>
                      <button
                        type="button"
                        className={buttons.secondaryButton}
                        onClick={() =>
                          onCompare(
                            entry.sourcePath,
                            entry.mergeTargetPath ?? group.existing_variants[0]?.path ?? null
                          )
                        }
                        disabled={group.existing_variants.length === 0}
                      >
                        {text.compareAction}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={panels.resolutionPanel}>
            <div className={layout.sectionIntro}>
              <p className={layout.sectionLabel}>{text.existingVariantsTitle}</p>
              <p className={layout.helperText}>
                {group.existing_variants.length > 0
                  ? `${group.existing_variants.length} ${text.variantCountLabel}`
                  : text.originsEmptyBody}
              </p>
            </div>
            <div className={lists.variantFamilyList}>
              {group.existing_variants.length > 0 ? (
                group.existing_variants.map((variant) => (
                  <div key={variant.path} className={lists.variantFamilyButton}>
                    <strong>{variant.variant_label?.trim() || variant.display_name}</strong>
                    <span>{variant.content_hash.slice(0, 8)}</span>
                  </div>
                ))
              ) : (
                <div className={panels.emptyPanel}>{text.compareEmptyBody}</div>
              )}
            </div>
          </section>
        </div>

        <section className={panels.comparisonPanel}>
          <div className={layout.sectionIntro}>
            <p className={layout.sectionLabel}>{text.comparisonTitle}</p>
          </div>
          {comparisonLoading ? (
            <div className={panels.emptyPanel}>{text.loadingPreview}</div>
          ) : comparisonError ? (
            <div className={panels.emptyPanel}>{comparisonError}</div>
          ) : comparison ? (
            <div className={panels.comparisonGrid}>
              <article className={cards.comparisonCard}>
                <div className={badges.badgeRow}>
                  <span className={badges.agentBadge} data-agent={comparison.left.agent}>
                    {agentLabel(comparison.left.agent)}
                  </span>
                  <span className={badges.badge}>
                    {comparison.left.variant_label?.trim() || comparison.left.display_name}
                  </span>
                </div>
                <pre className={panels.previewContent}>{comparison.left_content}</pre>
              </article>
              <article className={cards.comparisonCard}>
                <div className={badges.badgeRow}>
                  <span className={badges.agentBadge} data-agent={comparison.right.agent}>
                    {agentLabel(comparison.right.agent)}
                  </span>
                  <span className={badges.badge}>
                    {comparison.right.variant_label?.trim() || comparison.right.display_name}
                  </span>
                </div>
                <pre className={panels.previewContent}>{comparison.right_content}</pre>
              </article>
              <article className={cards.comparisonMetaCard}>
                <strong>{text.commonFilesLabel}</strong>
                <div className={badges.scopeList}>
                  {comparison.common_files.map((file) => (
                    <span key={`common-${file}`} className={badges.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
              <article className={cards.comparisonMetaCard}>
                <strong>{text.leftOnlyFilesLabel}</strong>
                <div className={badges.scopeList}>
                  {comparison.left_only_files.map((file) => (
                    <span key={`left-${file}`} className={badges.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
              <article className={cards.comparisonMetaCard}>
                <strong>{text.rightOnlyFilesLabel}</strong>
                <div className={badges.scopeList}>
                  {comparison.right_only_files.map((file) => (
                    <span key={`right-${file}`} className={badges.scopeChip}>
                      {file}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <div className={panels.emptyPanel}>{text.compareEmptyBody}</div>
          )}
        </section>
      </section>
    </div>,
    document.body
  );
}
